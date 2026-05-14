'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_FILE = path.join(os.homedir(), '.claude', '.cfh-logs', 'sentry-state.json');
const HOOK_SOURCE = path.join(__dirname, '..', 'scripts', 'cfh-sentry-hook.js');
const HOOK_TARGET = path.join(os.homedir(), '.claude', 'scripts', 'cfh-sentry-hook.js');

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
    try { files = fs.readdirSync(projPath).filter((f) => f.endsWith('.jsonl')); } catch { continue; }
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

function inputSignature(input) {
  // Stable rough signature for detecting loops.
  // Use sorted keys + truncated values to make small noise tolerated.
  if (!input || typeof input !== 'object') return JSON.stringify(input);
  const keys = Object.keys(input).sort();
  return JSON.stringify(keys.map((k) => {
    const v = input[k];
    const s = typeof v === 'string' ? v.slice(0, 200) : v;
    return [k, s];
  }));
}

function aggregateSession(sessionPath, opts = {}) {
  const { emptyReadThreshold = 2 } = opts;
  const totals = {
    toolCalls: 0,
    toolErrors: 0,
    toolEmpty: 0,
    toolRepeated: 0,
    perTool: {}, // name -> { calls, errors, empty, repeated }
    errorSamples: [], // { tool, input, errorContent, ts }
    emptyReadSamples: [], // { tool, input, ts }
    repeatedSamples: [], // { tool, repeats, input, ts }
  };

  let lines;
  try { lines = fs.readFileSync(sessionPath, 'utf8').split('\n'); }
  catch { return totals; }

  // First pass: build map of tool_use_id → { name, input, ts }
  const toolUses = new Map();
  // Track recent same-input calls for loop detection
  const recentByTool = new Map(); // tool name -> [{ sig, ts }]

  for (const line of lines) {
    if (!line.trim()) continue;
    const obj = parseLine(line);
    if (!obj) continue;
    const ts = obj.timestamp || obj.message?.created_at;

    if (obj.type === 'assistant' && Array.isArray(obj.message?.content)) {
      for (const part of obj.message.content) {
        if (part?.type !== 'tool_use') continue;
        const tname = part.name || 'unknown';
        toolUses.set(part.id, { name: tname, input: part.input, ts });

        if (!totals.perTool[tname]) totals.perTool[tname] = { calls: 0, errors: 0, empty: 0, repeated: 0 };
        totals.perTool[tname].calls++;
        totals.toolCalls++;

        // Loop detection: same tool + same input within last 3 calls of the same tool
        const sig = inputSignature(part.input);
        const recent = recentByTool.get(tname) || [];
        const matchCount = recent.filter((r) => r.sig === sig).length;
        if (matchCount >= 1) {
          // Already saw same input — count as repeated
          totals.toolRepeated++;
          totals.perTool[tname].repeated++;
          if (totals.repeatedSamples.length < 10) {
            totals.repeatedSamples.push({ tool: tname, repeats: matchCount + 1, input: part.input, ts });
          }
        }
        recent.push({ sig, ts });
        if (recent.length > 5) recent.shift();
        recentByTool.set(tname, recent);
      }
    }

    if (obj.type === 'user' && Array.isArray(obj.message?.content)) {
      for (const part of obj.message.content) {
        if (part?.type !== 'tool_result') continue;
        const ref = toolUses.get(part.tool_use_id);
        if (!ref) continue;
        const tname = ref.name;
        if (!totals.perTool[tname]) totals.perTool[tname] = { calls: 0, errors: 0, empty: 0, repeated: 0 };

        const isError = part.is_error === true;
        const content = part.content;
        const contentText = typeof content === 'string' ? content
          : Array.isArray(content) ? content.map((c) => c?.text || '').join('') : '';

        if (isError) {
          totals.toolErrors++;
          totals.perTool[tname].errors++;
          if (totals.errorSamples.length < 10) {
            totals.errorSamples.push({
              tool: tname,
              input: ref.input,
              errorContent: contentText.slice(0, 300),
              ts: ref.ts,
            });
          }
        }
        // Empty Read detection: Read tool with very short content
        if (tname === 'Read' && !isError && contentText.length <= emptyReadThreshold) {
          totals.toolEmpty++;
          totals.perTool[tname].empty++;
          if (totals.emptyReadSamples.length < 10) {
            totals.emptyReadSamples.push({ tool: tname, input: ref.input, ts: ref.ts });
          }
        }
      }
    }
  }

  return totals;
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
    toolCalls: 0,
    toolErrors: 0,
    toolEmpty: 0,
    toolRepeated: 0,
    perTool: {},
    errorSamples: [],
    emptyReadSamples: [],
    repeatedSamples: [],
  };

  for (const sess of filtered) {
    const t = aggregateSession(sess.path);
    grand.sessions.push({
      project: sess.project,
      sessionId: sess.sessionId,
      mtime: sess.mtime,
      toolCalls: t.toolCalls,
      toolErrors: t.toolErrors,
      toolEmpty: t.toolEmpty,
      toolRepeated: t.toolRepeated,
    });
    grand.toolCalls += t.toolCalls;
    grand.toolErrors += t.toolErrors;
    grand.toolEmpty += t.toolEmpty;
    grand.toolRepeated += t.toolRepeated;
    for (const [tname, c] of Object.entries(t.perTool)) {
      if (!grand.perTool[tname]) grand.perTool[tname] = { calls: 0, errors: 0, empty: 0, repeated: 0 };
      grand.perTool[tname].calls += c.calls;
      grand.perTool[tname].errors += c.errors;
      grand.perTool[tname].empty += c.empty;
      grand.perTool[tname].repeated += c.repeated;
    }
    grand.errorSamples.push(...t.errorSamples.slice(0, 3).map((s) => ({ ...s, sessionId: sess.sessionId })));
    grand.emptyReadSamples.push(...t.emptyReadSamples.slice(0, 2).map((s) => ({ ...s, sessionId: sess.sessionId })));
    grand.repeatedSamples.push(...t.repeatedSamples.slice(0, 2).map((s) => ({ ...s, sessionId: sess.sessionId })));
  }

  return grand;
}

function fmtNum(n) { return Number(n).toLocaleString(); }

function fmtTable(headers, rows) {
  const widths = headers.map((h, i) =>
    Math.max(String(h).length, ...rows.map((r) => String(r[i] ?? '').length))
  );
  const fmtRow = (cells) =>
    cells.map((c, i) => String(c ?? '').padEnd(widths[i])).join('  ');
  const sep = widths.map((w) => '-'.repeat(w)).join('  ');
  return [fmtRow(headers), sep, ...rows.map(fmtRow)].join('\n');
}

function trimInputForDisplay(input, maxLen = 80) {
  if (!input) return '';
  const s = JSON.stringify(input);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '…';
}

function readSentryState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function sentryLive({ json } = {}) {
  const state = readSentryState();
  if (!state) {
    if (json) {
      process.stdout.write(JSON.stringify({ active: false, reason: 'no state file — install the PostToolUse hook first' }) + '\n');
      return;
    }
    console.log('');
    console.log('🚨 cfh sentry --live');
    console.log('');
    console.log('  No sentry-state.json found — the PostToolUse hook is not installed (or hasn\'t fired yet).');
    console.log('');
    console.log('  Install:');
    console.log('    cfh sentry --install-hook');
    console.log('');
    console.log('  After install, start a new Claude Code session — state will accumulate as tools run.');
    return;
  }

  if (json) {
    process.stdout.write(JSON.stringify(state, null, 2) + '\n');
    return;
  }

  console.log('');
  console.log('🚨 cfh sentry --live (PostToolUse hook state)');
  console.log('');
  console.log(`  Recent tool calls tracked:    ${state.recent?.length || 0}`);
  console.log(`  Consecutive errors:           ${state.consecutiveErrors || 0}`);
  console.log(`  Same-input repeats (current): ${state.sameSigCount || 0}`);
  console.log(`  Empty Reads (consecutive):    ${state.consecutiveEmptyReads || 0}`);
  console.log('');

  if (state.recent && state.recent.length) {
    const last = state.recent[state.recent.length - 1];
    const ts = new Date(last.ts).toISOString().slice(11, 19);
    const status = last.isError ? '✖ error' : last.isEmptyRead ? '○ empty' : '✓ ok';
    console.log(`  Last call: ${last.tool}  ${status}  @ ${ts}`);
  }

  if (state.lastBreaches && state.lastBreaches.length) {
    console.log('');
    console.log(`  Recent breaches (last ${Math.min(state.lastBreaches.length, 5)}):`);
    console.log('');
    for (const b of state.lastBreaches.slice(-5).reverse()) {
      const ts = new Date(b.ts).toISOString().slice(0, 19).replace('T', ' ');
      console.log(`    ${ts}  ${b.tool}`);
      for (const w of b.warnings) {
        console.log(`      ↳ ${w}`);
      }
    }
  } else {
    console.log('');
    console.log('  No threshold breaches detected.');
  }
  console.log('');
  console.log('Note: 신호이지 결론 아님. 의도된 retry·polling이 loop로 잡힐 수 있음.');
}

function sentryInstallHook({ yes = false } = {}) {
  console.log('');
  console.log('🚨 cfh sentry --install-hook');
  console.log('');

  // Step 1: copy script
  if (!fs.existsSync(HOOK_SOURCE)) {
    console.error(`  ✖ Hook source not found at ${HOOK_SOURCE}`);
    console.error('     Reinstall the package: npm install -g @han-kyeon/claude-skills');
    process.exitCode = 1;
    return;
  }
  try {
    fs.mkdirSync(path.dirname(HOOK_TARGET), { recursive: true });
    fs.copyFileSync(HOOK_SOURCE, HOOK_TARGET);
    console.log(`  ✓ Copied hook script: ${HOOK_TARGET}`);
  } catch (err) {
    console.error(`  ✖ Failed to copy hook: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  // Step 2: print settings.json snippet (don't auto-edit — too risky)
  const settingsFile = path.join(os.homedir(), '.claude', 'settings.json');
  console.log('');
  console.log('  Next: add to your ~/.claude/settings.json under "hooks.PostToolUse":');
  console.log('');
  const snippet = {
    PostToolUse: [
      {
        hooks: [
          {
            type: 'command',
            command: `node "${HOOK_TARGET}"`,
          },
        ],
      },
    ],
  };
  console.log('    ' + JSON.stringify(snippet, null, 2).split('\n').join('\n    '));
  console.log('');

  if (fs.existsSync(settingsFile)) {
    console.log(`  Settings file: ${settingsFile}`);
    console.log('  (Edit manually — auto-merge avoided to prevent destroying your config.)');
  } else {
    console.log(`  Settings file does not exist yet: ${settingsFile}`);
    console.log('  Create it with the snippet above wrapped in {"hooks": ...}.');
  }
  console.log('');
  console.log('  After editing settings.json, start a new Claude Code session.');
  console.log('  Verify with: cfh sentry --live');
}

function sentry(opts) {
  const { target, project, days, tool, sessionId, json, live, installHook } = opts || {};

  if (installHook) {
    sentryInstallHook({});
    return;
  }
  if (live) {
    sentryLive({ json });
    return;
  }

  const claudeDir = target ? path.resolve(target) : path.join(os.homedir(), '.claude');
  const data = aggregateAll({ claudeDir, project, days, sessionId });

  if (json) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    return;
  }

  console.log('');
  const filterLabel = [
    days ? `last ${days}d` : null,
    project ? `project~"${project}"` : null,
    sessionId ? `session=${sessionId.slice(0, 8)}` : null,
    tool ? `tool=${tool}` : null,
  ].filter(Boolean).join(', ') || 'all sessions';

  console.log(`🚨 Tool failure sensor — ${data.sessions.length} sessions (${filterLabel})`);
  console.log('');
  console.log(`  Total tool calls:    ${fmtNum(data.toolCalls)}`);
  console.log(`  Errors:              ${fmtNum(data.toolErrors)} (${data.toolCalls ? ((data.toolErrors / data.toolCalls) * 100).toFixed(1) : '0.0'}%)`);
  console.log(`  Empty reads:         ${fmtNum(data.toolEmpty)}`);
  console.log(`  Repeated identical:  ${fmtNum(data.toolRepeated)}`);
  console.log('');

  // Per-tool table
  const perToolRows = Object.entries(data.perTool)
    .filter(([t]) => !tool || t === tool)
    .filter(([, c]) => c.errors + c.empty + c.repeated > 0 || tool)
    .map(([t, c]) => [
      t,
      c.calls,
      c.errors,
      c.empty || '—',
      c.repeated || '—',
      c.calls ? `${((c.errors / c.calls) * 100).toFixed(1)}%` : '0.0%',
    ])
    .sort((a, b) => b[2] - a[2]);

  if (perToolRows.length) {
    console.log('Per tool (sorted by errors):');
    console.log('');
    console.log(fmtTable(['tool', 'calls', 'errors', 'empty', 'repeats', 'err%'], perToolRows));
    console.log('');
  } else {
    console.log('Per tool: no failures detected.');
    console.log('');
  }

  // Error samples
  if (data.errorSamples.length) {
    console.log('Recent errors (top 5):');
    console.log('');
    for (const s of data.errorSamples.slice(0, 5)) {
      console.log(`  ${s.tool}  [${s.sessionId.slice(0, 8)}]`);
      console.log(`    input:  ${trimInputForDisplay(s.input, 100)}`);
      console.log(`    error:  ${(s.errorContent || '').replace(/\n/g, ' ').slice(0, 120)}`);
      console.log('');
    }
  }

  if (data.repeatedSamples.length) {
    console.log('Recent repeated calls (potential loops, top 3):');
    console.log('');
    for (const s of data.repeatedSamples.slice(0, 3)) {
      console.log(`  ${s.tool}  ×${s.repeats}  [${s.sessionId.slice(0, 8)}]`);
      console.log(`    input:  ${trimInputForDisplay(s.input, 100)}`);
      console.log('');
    }
  }

  console.log('Tip:  --by command  --days N  --match <substr>  --tool <name>  --json');
  console.log('Note: 빈 읽기·반복 호출은 헛수고일 수도, 의도된 retry일 수도 — 신호이지 결론 아님.');
}

module.exports = {
  sentry,
  aggregateSession,
  aggregateAll,
  inputSignature,
  readSentryState,
  sentryLive,
  sentryInstallHook,
};
