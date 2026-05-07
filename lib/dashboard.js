'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const { aggregateAll: aggregateCost } = require('./cost');
const { aggregateAll: aggregateSentry } = require('./sentry');
const { listEvals, readEvalHistory, isTelemetryEnabled } = require('./eval');
const { getSkillsTargetDir } = require('./paths');

function fmtNum(n) { return Number(n).toLocaleString(); }

function buildDashboard({ days = 30, match, target } = {}) {
  const claudeDir = path.join(os.homedir(), '.claude');
  const lines = [];
  const now = new Date().toISOString();

  lines.push('# Skill Harness Dashboard');
  lines.push('');
  lines.push(`Generated: ${now}`);
  lines.push(`Window:    last ${days}d${match ? ` · project~"${match}"` : ''}`);
  lines.push('');

  // --- Skill inventory ---
  const skillsRoot = target || getSkillsTargetDir();
  let totalSkills = 0;
  let skillsWithEvals = 0;
  let totalEvalCases = 0;
  const skillEvalMap = new Map();

  if (fs.existsSync(skillsRoot)) {
    const evalsResult = listEvals({ target: target ? path.dirname(skillsRoot) : undefined });
    for (const s of evalsResult.skills) {
      skillEvalMap.set(s.name, s.cases.length);
      if (s.cases.length > 0) {
        skillsWithEvals++;
        totalEvalCases += s.cases.length;
      }
    }
    try {
      const allEntries = fs.readdirSync(skillsRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory());
      totalSkills = allEntries.length;
      for (const e of allEntries) {
        if (!skillEvalMap.has(e.name)) skillEvalMap.set(e.name, 0);
      }
    } catch {
      /* ignore */
    }
  }

  lines.push('## Overview');
  lines.push('');
  lines.push(`- Skills installed: **${totalSkills}**`);
  lines.push(`- Skills with evals: **${skillsWithEvals}** / ${totalSkills} (${totalSkills ? Math.round((skillsWithEvals / totalSkills) * 100) : 0}%)`);
  lines.push(`- Total eval cases: **${totalEvalCases}**`);
  lines.push(`- Telemetry: ${isTelemetryEnabled() ? '✅ enabled' : '⚪ disabled (cfh log --enable)'}`);
  lines.push('');

  // --- Cost ---
  const cost = aggregateCost({ claudeDir, days, project: match });
  const totalIn = cost.inputTokens + cost.cacheCreationTokens + cost.cacheReadTokens;
  lines.push('## Cost (transcript-derived)');
  lines.push('');
  lines.push(`- Sessions: **${cost.sessions.length}**`);
  lines.push(`- Total input (incl. cache): **${fmtNum(totalIn)}** tokens`);
  lines.push(`- Total output: **${fmtNum(cost.outputTokens)}** tokens`);
  lines.push(`- Cache hit rate: **${totalIn ? ((cost.cacheReadTokens / totalIn) * 100).toFixed(1) : '0.0'}%**`);
  lines.push('');

  const cmdRows = Object.entries(cost.byCommand)
    .map(([cmd, c]) => [cmd, c.inputTokens + c.cacheCreationTokens + c.cacheReadTokens, c.outputTokens, c.turns])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (cmdRows.length) {
    lines.push('### Top 10 commands by cost');
    lines.push('');
    lines.push('| command | input+cache | output | turns |');
    lines.push('|---|---:|---:|---:|');
    for (const [cmd, ic, out, turns] of cmdRows) {
      lines.push(`| \`${cmd}\` | ${fmtNum(ic)} | ${fmtNum(out)} | ${turns} |`);
    }
    lines.push('');
  }

  // --- Sentry ---
  const sentry = aggregateSentry({ claudeDir, days, project: match });
  const errPct = sentry.toolCalls ? ((sentry.toolErrors / sentry.toolCalls) * 100).toFixed(1) : '0.0';
  lines.push('## Tool failure sensor');
  lines.push('');
  lines.push(`- Tool calls: **${fmtNum(sentry.toolCalls)}**`);
  lines.push(`- Errors: **${fmtNum(sentry.toolErrors)}** (${errPct}%)`);
  lines.push(`- Empty reads: ${fmtNum(sentry.toolEmpty)}`);
  lines.push(`- Repeated identical: ${fmtNum(sentry.toolRepeated)}`);
  lines.push('');

  const toolRows = Object.entries(sentry.perTool)
    .filter(([, c]) => c.errors > 0)
    .map(([t, c]) => [t, c.calls, c.errors, c.calls ? `${((c.errors / c.calls) * 100).toFixed(1)}%` : '0.0%'])
    .sort((a, b) => b[2] - a[2])
    .slice(0, 10);
  if (toolRows.length) {
    lines.push('### Top failing tools');
    lines.push('');
    lines.push('| tool | calls | errors | err% |');
    lines.push('|---|---:|---:|---:|');
    for (const [tool, calls, errors, pct] of toolRows) {
      lines.push(`| \`${tool}\` | ${calls} | ${errors} | ${pct} |`);
    }
    lines.push('');
  }

  // --- Eval coverage + history ---
  lines.push('## Eval coverage');
  lines.push('');
  if (skillEvalMap.size === 0) {
    lines.push('_No skills installed._');
    lines.push('');
  } else {
    lines.push('| skill | cases | last run |');
    lines.push('|---|---:|---|');
    const sortedSkills = [...skillEvalMap.entries()].sort();
    for (const [name, count] of sortedSkills) {
      const history = readEvalHistory(name, { limit: 1 });
      const last = history[0]
        ? `${history[0].timestamp.slice(0, 16).replace('T', ' ')} (${history[0].mode})`
        : '_never_';
      lines.push(`| \`${name}\` | ${count || '—'} | ${last} |`);
    }
    lines.push('');
  }

  // --- Eval trend (per skill last 5 runs) ---
  const skillsWithHistory = [...skillEvalMap.keys()]
    .map((name) => ({ name, history: readEvalHistory(name, { limit: 5 }) }))
    .filter((s) => s.history.length > 0);

  if (skillsWithHistory.length) {
    lines.push('### Eval trend (last 5 runs per skill)');
    lines.push('');
    for (const { name, history } of skillsWithHistory) {
      lines.push(`**${name}**`);
      lines.push('');
      lines.push('| timestamp | mode | result |');
      lines.push('|---|---|---|');
      for (const h of history) {
        const ts = h.timestamp.slice(0, 16).replace('T', ' ');
        let resultCol;
        if (h.isAB && h.summary) {
          resultCol = `T:${h.summary.treatmentPass}/${h.summary.total} · B:${h.summary.baselinePass}/${h.summary.total} · helped:${h.summary.helped} regressed:${h.summary.regressed}`;
        } else if (h.summary) {
          resultCol = `${h.summary.pass}/${h.summary.total} pass · ${h.summary.fail} fail · ${h.summary.error} err`;
        } else {
          resultCol = '—';
        }
        lines.push(`| ${ts} | ${h.mode} | ${resultCol} |`);
      }
      lines.push('');
    }
  } else {
    lines.push('_No persisted eval history. Run `cfh eval <skill> --executor claude` (with telemetry enabled) to start collecting._');
    lines.push('');
  }

  // --- Footer ---
  lines.push('---');
  lines.push('');
  lines.push('Generated by `cfh dashboard`. Underlying tools: `cfh cost`, `cfh sentry`, `cfh eval`, `cfh evolve`.');
  return lines.join('\n');
}

function dashboardCmd({ days, match, target, output } = {}) {
  const md = buildDashboard({
    days: days ? Number(days) : 30,
    match,
    target,
  });
  if (output) {
    fs.writeFileSync(output, md);
    console.log(`Dashboard written: ${output}`);
    return;
  }
  process.stdout.write(md + '\n');
}

module.exports = {
  dashboardCmd,
  buildDashboard,
};
