'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const SLASH_CMD_REGEX = /\/cfh-[a-z][a-z0-9-]*/;

function listSessions(claudeDir, projectFilter) {
  const projectsDir = path.join(claudeDir, 'projects');
  if (!fs.existsSync(projectsDir)) return [];
  const projects = fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory());
  const sessions = [];
  for (const proj of projects) {
    if (projectFilter && !proj.name.toLowerCase().includes(projectFilter.toLowerCase())) continue;
    const projPath = path.join(projectsDir, proj.name);
    let files;
    try {
      files = fs.readdirSync(projPath).filter((f) => f.endsWith('.jsonl'));
    } catch {
      continue;
    }
    for (const f of files) {
      const fp = path.join(projPath, f);
      let stat;
      try { stat = fs.statSync(fp); } catch { continue; }
      sessions.push({
        project: proj.name,
        sessionId: f.replace(/\.jsonl$/, ''),
        path: fp,
        mtime: stat.mtime,
      });
    }
  }
  return sessions.sort((a, b) => b.mtime - a.mtime);
}

function parseLine(line) {
  try { return JSON.parse(line); } catch { return null; }
}

function extractUserText(obj) {
  const c = obj?.message?.content;
  if (!c) return '';
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c
      .filter((p) => p && p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('\n');
  }
  return '';
}

function emptyAggregate() {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    turns: 0,
  };
}

function addInto(target, source) {
  target.inputTokens += source.inputTokens;
  target.outputTokens += source.outputTokens;
  target.cacheCreationTokens += source.cacheCreationTokens;
  target.cacheReadTokens += source.cacheReadTokens;
  target.turns += source.turns;
}

function aggregateSession(sessionPath) {
  const totals = {
    ...emptyAggregate(),
    assistantTurns: 0,
    userTurns: 0,
    models: {},
    byCommand: {},
    firstTime: null,
    lastTime: null,
  };

  let lastUserCommand = null;
  let lines;
  try {
    lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
  } catch {
    return totals;
  }

  for (const line of lines) {
    if (!line.trim()) continue;
    const obj = parseLine(line);
    if (!obj) continue;

    const ts = obj.timestamp || obj.message?.created_at;
    if (ts) {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        if (!totals.firstTime) totals.firstTime = d;
        totals.lastTime = d;
      }
    }

    if (obj.type === 'user') {
      totals.userTurns++;
      const text = extractUserText(obj);
      const m = text && text.match(SLASH_CMD_REGEX);
      if (m) lastUserCommand = m[0];
      continue;
    }

    if (obj.type !== 'assistant' || !obj.message) continue;
    const model = obj.message.model || 'unknown';
    if (model === '<synthetic>') continue;

    totals.assistantTurns++;
    const u = obj.message.usage || {};
    const turn = {
      inputTokens: u.input_tokens || 0,
      outputTokens: u.output_tokens || 0,
      cacheCreationTokens: u.cache_creation_input_tokens || 0,
      cacheReadTokens: u.cache_read_input_tokens || 0,
      turns: 1,
    };

    addInto(totals, turn);

    if (!totals.models[model]) totals.models[model] = emptyAggregate();
    addInto(totals.models[model], turn);

    if (lastUserCommand) {
      if (!totals.byCommand[lastUserCommand]) totals.byCommand[lastUserCommand] = emptyAggregate();
      addInto(totals.byCommand[lastUserCommand], turn);
    }
  }

  return totals;
}

function getCommitTimestamp(commitHash, cwd = process.cwd()) {
  try {
    const out = execSync(`git -C "${cwd}" show -s --format=%cI ${commitHash}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    const d = new Date(out);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function aggregateAll({ claudeDir, project, days, sessionId }) {
  const sessions = listSessions(claudeDir, project);
  const cutoff = days ? Date.now() - days * 86400000 : null;
  const filtered = sessions.filter((s) => {
    if (sessionId && !s.sessionId.startsWith(sessionId)) return false;
    if (cutoff && s.mtime.getTime() < cutoff) return false;
    return true;
  });

  const grand = {
    sessions: [],
    ...emptyAggregate(),
    models: {},
    byCommand: {},
    byDay: {},
  };

  for (const sess of filtered) {
    const t = aggregateSession(sess.path);
    grand.sessions.push({
      project: sess.project,
      sessionId: sess.sessionId,
      ...t,
    });
    addInto(grand, {
      inputTokens: t.inputTokens,
      outputTokens: t.outputTokens,
      cacheCreationTokens: t.cacheCreationTokens,
      cacheReadTokens: t.cacheReadTokens,
      turns: t.assistantTurns,
    });

    for (const [model, m] of Object.entries(t.models)) {
      if (!grand.models[model]) grand.models[model] = emptyAggregate();
      addInto(grand.models[model], m);
    }
    for (const [cmd, c] of Object.entries(t.byCommand)) {
      if (!grand.byCommand[cmd]) grand.byCommand[cmd] = { ...emptyAggregate(), sessions: 0 };
      addInto(grand.byCommand[cmd], c);
      grand.byCommand[cmd].sessions++;
    }
    if (t.lastTime) {
      const day = t.lastTime.toISOString().slice(0, 10);
      if (!grand.byDay[day]) grand.byDay[day] = emptyAggregate();
      addInto(grand.byDay[day], {
        inputTokens: t.inputTokens,
        outputTokens: t.outputTokens,
        cacheCreationTokens: t.cacheCreationTokens,
        cacheReadTokens: t.cacheReadTokens,
        turns: t.assistantTurns,
      });
    }
  }

  return grand;
}

function fmtNum(n) {
  return Number(n).toLocaleString();
}

function fmtTable(headers, rows) {
  const widths = headers.map((h, i) =>
    Math.max(String(h).length, ...rows.map((r) => String(r[i] ?? '').length))
  );
  const fmtRow = (cells) =>
    cells.map((c, i) => String(c ?? '').padEnd(widths[i])).join('  ');
  const sep = widths.map((w) => '-'.repeat(w)).join('  ');
  return [fmtRow(headers), sep, ...rows.map(fmtRow)].join('\n');
}

function totalInputWithCache(o) {
  return o.inputTokens + o.cacheCreationTokens + o.cacheReadTokens;
}

function compareSinceCommit({ claudeDir, project, sinceCommit, cwd = process.cwd() }) {
  const commitTs = getCommitTimestamp(sinceCommit, cwd);
  if (!commitTs) {
    throw new Error(`commit "${sinceCommit}" not found in ${cwd} (or not a git repo)`);
  }
  const sessions = listSessions(claudeDir, project);
  const before = [];
  const after = [];
  for (const s of sessions) {
    if (s.mtime.getTime() < commitTs.getTime()) before.push(s);
    else after.push(s);
  }

  const aggGroup = (sessList) => {
    const grand = {
      sessions: sessList.length,
      ...emptyAggregate(),
      byCommand: {},
    };
    for (const sess of sessList) {
      const t = aggregateSession(sess.path);
      addInto(grand, {
        inputTokens: t.inputTokens,
        outputTokens: t.outputTokens,
        cacheCreationTokens: t.cacheCreationTokens,
        cacheReadTokens: t.cacheReadTokens,
        turns: t.assistantTurns,
      });
      for (const [cmd, c] of Object.entries(t.byCommand)) {
        if (!grand.byCommand[cmd]) grand.byCommand[cmd] = emptyAggregate();
        addInto(grand.byCommand[cmd], c);
      }
    }
    return grand;
  };

  return {
    commit: sinceCommit,
    commitTimestamp: commitTs.toISOString(),
    before: aggGroup(before),
    after: aggGroup(after),
  };
}

function reportSinceCommit(comparison) {
  const lines = [];
  lines.push('');
  lines.push(`📈 Cost since-commit comparison`);
  lines.push(`  Commit:    ${comparison.commit}`);
  lines.push(`  Timestamp: ${comparison.commitTimestamp}`);
  lines.push('');

  const totalIn = (g) => g.inputTokens + g.cacheCreationTokens + g.cacheReadTokens;
  const beforeIn = totalIn(comparison.before);
  const afterIn = totalIn(comparison.after);
  const inDelta = afterIn - beforeIn;
  const inPct = beforeIn ? ((inDelta / beforeIn) * 100).toFixed(1) : 'n/a';
  const outDelta = comparison.after.outputTokens - comparison.before.outputTokens;
  const outPct = comparison.before.outputTokens ? ((outDelta / comparison.before.outputTokens) * 100).toFixed(1) : 'n/a';

  lines.push(`  Sessions:  ${comparison.before.sessions} (before) → ${comparison.after.sessions} (after)`);
  lines.push('');
  lines.push(`  Input+cache:  ${fmtNum(beforeIn)} → ${fmtNum(afterIn)}    (${inDelta >= 0 ? '+' : ''}${fmtNum(inDelta)}, ${inPct}%)`);
  lines.push(`  Output:       ${fmtNum(comparison.before.outputTokens)} → ${fmtNum(comparison.after.outputTokens)}    (${outDelta >= 0 ? '+' : ''}${fmtNum(outDelta)}, ${outPct}%)`);
  lines.push('');

  // Per-command delta (top changes)
  const allCmds = new Set([...Object.keys(comparison.before.byCommand), ...Object.keys(comparison.after.byCommand)]);
  const cmdRows = [];
  for (const cmd of allCmds) {
    const b = comparison.before.byCommand[cmd] || emptyAggregate();
    const a = comparison.after.byCommand[cmd] || emptyAggregate();
    const bi = totalIn(b);
    const ai = totalIn(a);
    const delta = ai - bi;
    cmdRows.push({ cmd, before: bi, after: ai, delta, turnsBefore: b.turns, turnsAfter: a.turns });
  }
  cmdRows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  if (cmdRows.length) {
    lines.push('Top changes by command (input+cache):');
    lines.push('');
    const headers = ['command', 'before', 'after', 'delta', 'turns'];
    const tableRows = cmdRows.slice(0, 10).map((r) => [
      r.cmd,
      fmtNum(r.before),
      fmtNum(r.after),
      `${r.delta >= 0 ? '+' : ''}${fmtNum(r.delta)}`,
      `${r.turnsBefore}→${r.turnsAfter}`,
    ]);
    lines.push(fmtTable(headers, tableRows));
    lines.push('');
  }

  // Verdict
  if (inPct !== 'n/a' && Math.abs(parseFloat(inPct)) >= 20) {
    if (parseFloat(inPct) > 0) {
      lines.push(`⚠ 의미 있는 토큰 증가 (${inPct}%) — 회귀 의심. ${cmdRows[0]?.cmd ? `\`${cmdRows[0].cmd}\`이 가장 큰 기여 (${cmdRows[0].delta >= 0 ? '+' : ''}${fmtNum(cmdRows[0].delta)}).` : ''}`);
    } else {
      lines.push(`✅ 의미 있는 토큰 감소 (${inPct}%) — 효율 개선 확인.`);
    }
  } else if (inPct !== 'n/a') {
    lines.push(`기여도 작음 (${inPct}% 변화). 노이즈 가능성.`);
  }

  return lines.join('\n');
}

function cost(opts) {
  const { target, project, days, by, sessionId, json, sinceCommit } = opts || {};
  const claudeDir = target ? path.resolve(target) : path.join(os.homedir(), '.claude');

  if (sinceCommit) {
    let comparison;
    try {
      comparison = compareSinceCommit({ claudeDir, project, sinceCommit });
    } catch (err) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    if (json) {
      process.stdout.write(JSON.stringify(comparison, null, 2) + '\n');
      return;
    }
    console.log(reportSinceCommit(comparison));
    return;
  }

  const data = aggregateAll({ claudeDir, project, days, sessionId });

  if (json) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    return;
  }

  console.log('');
  const filterLabel =
    [
      days ? `last ${days}d` : null,
      project ? `project~"${project}"` : null,
      sessionId ? `session=${sessionId.slice(0, 8)}` : null,
    ]
      .filter(Boolean)
      .join(', ') || 'all sessions';
  console.log(`📊 Cost telemetry — ${data.sessions.length} sessions (${filterLabel})`);
  console.log('');
  console.log(`  Total input (incl. cache):  ${fmtNum(totalInputWithCache(data))}`);
  console.log(`    cache read:               ${fmtNum(data.cacheReadTokens)}`);
  console.log(`    cache creation:           ${fmtNum(data.cacheCreationTokens)}`);
  console.log(`    fresh input:              ${fmtNum(data.inputTokens)}`);
  console.log(`  Total output:               ${fmtNum(data.outputTokens)}`);
  console.log('');

  const view = by || 'command';

  if (view === 'command') {
    const rows = Object.entries(data.byCommand)
      .map(([cmd, c]) => [cmd, totalInputWithCache(c), c.outputTokens, c.turns, c.sessions])
      .sort((a, b) => b[1] - a[1])
      .map((r) => [r[0], fmtNum(r[1]), fmtNum(r[2]), r[3], r[4]]);
    console.log(rows.length ? 'By slash command:\n' : 'By slash command: (no /cfh-* commands detected)\n');
    if (rows.length) console.log(fmtTable(['command', 'input+cache', 'output', 'turns', 'sessions'], rows));
    console.log('');
  }

  if (view === 'day') {
    const rows = Object.entries(data.byDay)
      .map(([day, d]) => [day, fmtNum(totalInputWithCache(d)), fmtNum(d.outputTokens), d.turns])
      .sort((a, b) => a[0].localeCompare(b[0]));
    console.log(rows.length ? 'By day:\n' : 'By day: (no data)\n');
    if (rows.length) console.log(fmtTable(['day', 'input+cache', 'output', 'turns'], rows));
    console.log('');
  }

  if (view === 'model') {
    const rows = Object.entries(data.models)
      .map(([m, mu]) => [m, totalInputWithCache(mu), mu.outputTokens, mu.turns])
      .sort((a, b) => b[1] - a[1])
      .map((r) => [r[0], fmtNum(r[1]), fmtNum(r[2]), r[3]]);
    console.log(rows.length ? 'By model:\n' : 'By model: (no data)\n');
    if (rows.length) console.log(fmtTable(['model', 'input+cache', 'output', 'turns'], rows));
    console.log('');
  }

  if (view === 'session') {
    const rows = data.sessions.slice(0, 20).map((s) => [
      s.sessionId.slice(0, 8),
      s.project.length > 30 ? '…' + s.project.slice(-27) : s.project,
      fmtNum(totalInputWithCache(s)),
      fmtNum(s.outputTokens),
      s.assistantTurns,
      s.lastTime ? new Date(s.lastTime).toISOString().slice(0, 16).replace('T', ' ') : '',
    ]);
    console.log(rows.length ? 'Recent sessions (top 20):\n' : 'Recent sessions: (no data)\n');
    if (rows.length) console.log(fmtTable(['id', 'project', 'input+cache', 'output', 'turns', 'last'], rows));
    console.log('');
  }

  console.log('Note: 단위는 토큰. 가격은 모델·테넌트마다 다르므로 외부 가격표 대조 필요.');
  console.log('Tip:  --by [command|day|model|session]  --days N  --match <substr>  --session <id>  --json');
}

module.exports = {
  cost,
  aggregateSession,
  aggregateAll,
  listSessions,
  compareSinceCommit,
  getCommitTimestamp,
};
