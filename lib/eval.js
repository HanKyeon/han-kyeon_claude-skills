'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getSkillsTargetDir, getProjectClaudeDir } = require('./paths');

const VALID_ASSERTION_TYPES = new Set(['contains', 'not_contains', 'regex']);

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function validateCase(rawCase, source) {
  const issues = [];
  if (!isObject(rawCase)) {
    issues.push({ severity: 'error', message: `case must be an object (in ${source})` });
    return issues;
  }
  if (typeof rawCase.name !== 'string' || !rawCase.name.trim()) {
    issues.push({ severity: 'error', message: `case.name missing or empty (in ${source})` });
  }
  if (typeof rawCase.prompt !== 'string' || !rawCase.prompt.trim()) {
    issues.push({ severity: 'error', message: `case.prompt missing or empty (${rawCase.name || source})` });
  }
  if (!Array.isArray(rawCase.assertions) || rawCase.assertions.length === 0) {
    issues.push({ severity: 'error', message: `case.assertions must be a non-empty array (${rawCase.name || source})` });
  } else {
    rawCase.assertions.forEach((a, i) => {
      if (!isObject(a)) {
        issues.push({ severity: 'error', message: `assertion[${i}] must be object (${rawCase.name})` });
        return;
      }
      if (!VALID_ASSERTION_TYPES.has(a.type)) {
        issues.push({ severity: 'error', message: `assertion[${i}].type "${a.type}" invalid (${rawCase.name}). expected: ${[...VALID_ASSERTION_TYPES].join('|')}` });
      }
      if (typeof a.value !== 'string' || a.value.length === 0) {
        issues.push({ severity: 'error', message: `assertion[${i}].value must be non-empty string (${rawCase.name})` });
      }
      if (a.type === 'regex') {
        try {
          new RegExp(a.value);
        } catch (err) {
          issues.push({ severity: 'error', message: `assertion[${i}].value not a valid regex (${rawCase.name}): ${err.message}` });
        }
      }
    });
  }
  if (rawCase.skill_should_trigger !== undefined && typeof rawCase.skill_should_trigger !== 'string') {
    issues.push({ severity: 'error', message: `case.skill_should_trigger must be string (${rawCase.name})` });
  }
  return issues;
}

function loadCasesFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    return { cases: [], issues: [{ severity: 'error', message: `JSON parse error in ${filePath}: ${err.message}` }] };
  }
  const items = Array.isArray(parsed) ? parsed : [parsed];
  const issues = [];
  const cases = [];
  items.forEach((c, idx) => {
    const localIssues = validateCase(c, `${path.basename(filePath)}[${idx}]`);
    issues.push(...localIssues);
    if (localIssues.length === 0) {
      cases.push({ ...c, _source: filePath });
    }
  });
  return { cases, issues };
}

function listEvals({ skill, target, project } = {}) {
  const sources = [];
  if (project) {
    const projDir = getProjectClaudeDir();
    if (fs.existsSync(projDir)) {
      sources.push(path.join(projDir, 'skills'));
    }
  } else {
    sources.push(getSkillsTargetDir(target));
  }

  const skills = [];
  const allIssues = [];

  for (const root of sources) {
    if (!fs.existsSync(root)) continue;
    const entries = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory());
    for (const entry of entries) {
      if (skill && entry.name !== skill) continue;
      const evalsDir = path.join(root, entry.name, 'evals');
      if (!fs.existsSync(evalsDir)) {
        if (skill) {
          allIssues.push({ severity: 'info', message: `skill "${entry.name}" has no evals/ directory` });
        }
        continue;
      }
      const files = fs
        .readdirSync(evalsDir)
        .filter((f) => f.endsWith('.json'));
      const cases = [];
      for (const f of files) {
        const fp = path.join(evalsDir, f);
        const result = loadCasesFromFile(fp);
        cases.push(...result.cases);
        allIssues.push(...result.issues);
      }
      if (cases.length || skill) {
        skills.push({
          name: entry.name,
          path: path.join(root, entry.name),
          evalsDir,
          cases,
        });
      }
    }
  }

  return { skills, issues: allIssues };
}

function runAssertion(assertion, output) {
  const out = output ?? '';
  switch (assertion.type) {
    case 'contains':
      return { pass: out.includes(assertion.value), reason: out.includes(assertion.value) ? null : `output missing: "${assertion.value}"` };
    case 'not_contains':
      return { pass: !out.includes(assertion.value), reason: !out.includes(assertion.value) ? null : `output contains forbidden: "${assertion.value}"` };
    case 'regex':
      try {
        const re = new RegExp(assertion.value);
        const pass = re.test(out);
        return { pass, reason: pass ? null : `regex /${assertion.value}/ did not match` };
      } catch (err) {
        return { pass: false, reason: `invalid regex: ${err.message}` };
      }
    default:
      return { pass: false, reason: `unknown assertion type: ${assertion.type}` };
  }
}

function runCase(testCase, executor) {
  const result = {
    name: testCase.name,
    source: testCase._source,
    prompt: testCase.prompt,
    assertions: [],
    output: null,
    skipped: false,
    pass: false,
    error: null,
  };

  let output;
  let meta = null;
  try {
    const exec = executor(testCase);
    if (exec && typeof exec.then === 'function') {
      throw new Error('executor returned a Promise; use runCaseAsync for async executors');
    }
    if (exec && exec.skipped) {
      result.skipped = true;
      result.output = exec.output ?? null;
      result.note = exec.note ?? null;
      return result;
    }
    if (typeof exec === 'string') {
      output = exec;
    } else if (exec) {
      output = exec.output;
      meta = exec.meta || null;
    }
  } catch (err) {
    result.error = err.message;
    return result;
  }

  result.output = output ?? '';
  if (meta) result.meta = meta;

  if (testCase.skill_should_trigger) {
    const triggered = (output ?? '').toLowerCase().includes(testCase.skill_should_trigger.toLowerCase());
    result.assertions.push({
      type: 'skill_should_trigger',
      value: testCase.skill_should_trigger,
      pass: triggered,
      reason: triggered ? null : `expected skill "${testCase.skill_should_trigger}" reference in output`,
    });
  }

  for (const a of testCase.assertions) {
    const r = runAssertion(a, output);
    result.assertions.push({ type: a.type, value: a.value, pass: r.pass, reason: r.reason });
  }

  result.pass = result.assertions.every((a) => a.pass);
  return result;
}

// --- Baseline (A/B) ---

function buildBaselinePrompt(originalPrompt, skillName) {
  // Soft anti-trigger: instruct Claude not to invoke the skill, use general knowledge.
  // This is a SOFT baseline — relies on instruction-following, not enforcement.
  // For hard baseline (skill dir isolation), see future Phase C work.
  const prefix = `[BASELINE MODE — for evaluation only]\nDo NOT invoke or reference the skill named "${skillName}". Treat this as if that skill does not exist on your system. Use only general knowledge to respond.\n\n---\n\n`;
  return prefix + originalPrompt;
}

function makeBaselineCase(testCase, skillName) {
  return {
    ...testCase,
    prompt: buildBaselinePrompt(testCase.prompt, skillName),
    _baseline: true,
  };
}

function diffPair(treatment, baseline) {
  // +1: skill helped (treatment pass, baseline fail)
  // -1: skill regressed (treatment fail, baseline pass)
  //  0: no diff (both pass or both fail)
  if (treatment.skipped || baseline.skipped) return { delta: null, label: 'skipped' };
  if (treatment.error || baseline.error) return { delta: null, label: 'error' };
  if (treatment.pass && !baseline.pass) return { delta: 1, label: 'skill helped' };
  if (!treatment.pass && baseline.pass) return { delta: -1, label: 'skill regressed' };
  if (treatment.pass && baseline.pass) return { delta: 0, label: 'both pass' };
  return { delta: 0, label: 'both fail' };
}

function runCaseWithBaseline(testCase, executor, skillName) {
  const treatment = runCase(testCase, executor);
  const baseline = runCase(makeBaselineCase(testCase, skillName), executor);
  return {
    name: testCase.name,
    source: testCase._source,
    treatment,
    baseline,
    diff: diffPair(treatment, baseline),
  };
}

// --- Executors ---

function dryRunExecutor() {
  return () => ({ skipped: true, note: 'dry-run: prompt not sent', output: '' });
}

function manualExecutor(read = readFromStdin) {
  return (testCase) => {
    process.stderr.write(`\n--- MANUAL CASE: ${testCase.name} ---\n`);
    process.stderr.write(`Prompt:\n${testCase.prompt}\n\n`);
    process.stderr.write('Paste claude output, then Ctrl-D (EOF) to finish:\n');
    const output = read();
    return { output };
  };
}

function readFromStdin() {
  // Synchronous read of all of stdin until EOF
  const buf = [];
  const fd = 0;
  const chunkSize = 4096;
  const tmp = Buffer.alloc(chunkSize);
  while (true) {
    let bytes;
    try {
      bytes = fs.readSync(fd, tmp, 0, chunkSize, null);
    } catch {
      break;
    }
    if (!bytes) break;
    buf.push(Buffer.from(tmp.slice(0, bytes)));
  }
  return Buffer.concat(buf).toString('utf8');
}

function claudeExecutor({ binary = 'claude', extraArgs = [], timeoutMs = 120000 } = {}) {
  return (testCase) => {
    const args = ['--print', ...extraArgs];
    const startedAt = Date.now();
    const result = spawnSync(binary, args, {
      input: testCase.prompt,
      encoding: 'utf8',
      timeout: timeoutMs,
    });
    const durationMs = Date.now() - startedAt;
    if (result.error) {
      throw new Error(`failed to spawn "${binary}": ${result.error.message}`);
    }
    if (result.status !== 0) {
      const stderr = (result.stderr || '').slice(0, 500);
      throw new Error(`claude exited ${result.status}: ${stderr}`);
    }
    const output = result.stdout || '';
    return {
      output,
      meta: {
        durationMs,
        outputChars: output.length,
        // Token usage parsing from --print output is not stable across CLI versions.
        // For now we report char count as a rough cost proxy.
      },
    };
  };
}

// --- Reporting ---

function fmtCaseLine(r) {
  const status = r.skipped ? '⏭  skip' : r.error ? '❗ err ' : r.pass ? '✅ pass' : '❌ fail';
  return `${status}  ${r.name}`;
}

function reportRun({ skills, results, mode }) {
  const lines = [];
  lines.push('');
  lines.push(`📐 Skill eval — ${results.length} case(s) across ${skills.length} skill(s) — mode: ${mode}`);
  lines.push('');

  let pass = 0;
  let fail = 0;
  let skip = 0;
  let err = 0;

  for (const skillBucket of skills) {
    lines.push(`▼ ${skillBucket.name}  (${skillBucket.results.length} cases)`);
    for (const r of skillBucket.results) {
      lines.push('  ' + fmtCaseLine(r));
      if (!r.pass && !r.skipped) {
        for (const a of r.assertions) {
          if (!a.pass) lines.push(`     ↳ ${a.type}: ${a.reason}`);
        }
        if (r.error) lines.push(`     ↳ error: ${r.error}`);
      }
      if (r.skipped) skip++;
      else if (r.error) err++;
      else if (r.pass) pass++;
      else fail++;
    }
    lines.push('');
  }

  lines.push(`Summary: ${pass} pass, ${fail} fail, ${err} error, ${skip} skip`);

  // Cost approximation (only counts cases where executor returned meta)
  const totalChars = results.reduce((sum, r) => sum + (r.meta?.outputChars || 0), 0);
  const totalDurMs = results.reduce((sum, r) => sum + (r.meta?.durationMs || 0), 0);
  if (totalChars > 0) {
    lines.push('');
    lines.push(`Cost (approx — output chars):  ${totalChars.toLocaleString()} chars across ${results.filter((r) => r.meta).length} runs`);
    if (totalDurMs > 0) {
      lines.push(`Total duration:                ${(totalDurMs / 1000).toFixed(1)}s`);
    }
    lines.push('  (정확한 토큰은 cfh cost로 사후 확인)');
  }

  return { text: lines.join('\n'), counts: { pass, fail, err, skip } };
}

function fmtABLine(pair) {
  const t = pair.treatment;
  const b = pair.baseline;
  const tStatus = t.skipped ? 'skip' : t.error ? 'err ' : t.pass ? 'pass' : 'fail';
  const bStatus = b.skipped ? 'skip' : b.error ? 'err ' : b.pass ? 'pass' : 'fail';
  const delta = pair.diff.delta;
  const arrow = delta === 1 ? '⬆ +1 helped' : delta === -1 ? '⬇ -1 regressed' : delta === 0 ? '— no diff' : `· ${pair.diff.label}`;
  return `${tStatus}/${bStatus}  ${arrow}  ${pair.name}`;
}

function reportABRun({ skills, results, mode }) {
  const lines = [];
  lines.push('');
  lines.push(`📐 Skill eval (A/B) — ${results.length} case(s) across ${skills.length} skill(s) — mode: ${mode}`);
  lines.push('  Treatment: skill enabled. Baseline: soft anti-trigger (instruction-based).');
  lines.push('');

  let helped = 0, regressed = 0, noDiff = 0, inconclusive = 0;

  for (const skillBucket of skills) {
    lines.push(`▼ ${skillBucket.name}  (${skillBucket.results.length} cases)`);
    lines.push('  T/B    diff           name');
    for (const pair of skillBucket.results) {
      lines.push('  ' + fmtABLine(pair));
      const d = pair.diff.delta;
      if (d === 1) helped++;
      else if (d === -1) regressed++;
      else if (d === 0) noDiff++;
      else inconclusive++;
    }
    lines.push('');
  }

  const tPass = results.filter((p) => p.treatment.pass).length;
  const bPass = results.filter((p) => p.baseline.pass).length;
  const net = helped - regressed;
  lines.push('A/B Summary:');
  lines.push(`  Treatment pass rate: ${tPass}/${results.length}`);
  lines.push(`  Baseline pass rate:  ${bPass}/${results.length}`);
  lines.push(`  Skill helped:        ${helped} cases`);
  lines.push(`  Skill regressed:     ${regressed} cases`);
  lines.push(`  No diff:             ${noDiff} cases`);
  if (inconclusive) lines.push(`  Inconclusive:        ${inconclusive} cases (skip/error)`);
  lines.push(`  Net effect:          ${net >= 0 ? '+' : ''}${net}`);

  // Cost across both runs
  const totalChars = results.reduce((sum, p) => sum + (p.treatment.meta?.outputChars || 0) + (p.baseline.meta?.outputChars || 0), 0);
  const totalDur = results.reduce((sum, p) => sum + (p.treatment.meta?.durationMs || 0) + (p.baseline.meta?.durationMs || 0), 0);
  const llmCalls = results.reduce((sum, p) => sum + (p.treatment.meta ? 1 : 0) + (p.baseline.meta ? 1 : 0), 0);
  if (totalChars > 0) {
    lines.push('');
    lines.push(`Cost (approx — output chars):  ${totalChars.toLocaleString()} chars across ${llmCalls} LLM calls (${results.length} cases × 2)`);
    if (totalDur > 0) lines.push(`Total duration:                ${(totalDur / 1000).toFixed(1)}s`);
    lines.push('  (정확한 토큰은 cfh cost로 사후 확인)');
  }

  return { text: lines.join('\n'), counts: { helped, regressed, noDiff, inconclusive, net } };
}

// --- Top-level command ---

function evalCmd({ skill, target, project, list, dryRun, manual, executor, json, baseline } = {}) {
  const { skills, issues } = listEvals({ skill, target, project });

  if (list) {
    const lines = [];
    lines.push('');
    if (issues.length) {
      for (const i of issues) lines.push(`  [${i.severity}] ${i.message}`);
      lines.push('');
    }
    if (skills.length === 0) {
      lines.push('No eval cases found.');
      lines.push('');
      lines.push('To add cases:');
      lines.push('  mkdir -p ~/.claude/skills/<skill>/evals/');
      lines.push('  echo \'{"name":"...","prompt":"...","assertions":[...]}\' > ~/.claude/skills/<skill>/evals/case-1.json');
      console.log(lines.join('\n'));
      return;
    }
    for (const s of skills) {
      lines.push(`▼ ${s.name}  (${s.cases.length} cases @ ${s.evalsDir})`);
      for (const c of s.cases) {
        lines.push(`  - ${c.name}  [${c.assertions.length} assertions]${c.tags ? '  ' + c.tags.map((t) => '#' + t).join(' ') : ''}`);
      }
      lines.push('');
    }
    console.log(lines.join('\n'));
    return;
  }

  // Pick executor
  let exec;
  let mode;
  if (dryRun) {
    exec = dryRunExecutor();
    mode = 'dry-run';
  } else if (manual) {
    exec = manualExecutor();
    mode = 'manual';
  } else if (executor === 'claude') {
    exec = claudeExecutor();
    mode = 'claude (subprocess)';
  } else {
    // Default: dry-run with explicit notice, to avoid accidental token spend
    exec = dryRunExecutor();
    mode = 'dry-run (default; pass --executor claude or --manual to actually run)';
  }

  const skillBuckets = [];
  const allResults = [];

  if (baseline) {
    if (mode.startsWith('dry-run')) {
      mode = mode.replace('dry-run', 'dry-run + baseline');
    } else {
      mode += ' + baseline (A/B)';
    }
    for (const s of skills) {
      const bucket = { name: s.name, results: [] };
      for (const c of s.cases) {
        const pair = runCaseWithBaseline(c, exec, s.name);
        bucket.results.push(pair);
        allResults.push({ skill: s.name, ...pair });
      }
      skillBuckets.push(bucket);
    }

    if (json) {
      process.stdout.write(JSON.stringify({ mode, results: allResults, issues }, null, 2) + '\n');
      return;
    }

    const report = reportABRun({ skills: skillBuckets, results: allResults, mode });
    console.log(report.text);
    if (issues.length) {
      console.log('\nIssues:');
      for (const i of issues) console.log(`  [${i.severity}] ${i.message}`);
    }
    if (report.counts.regressed > 0) process.exitCode = 1;
    return;
  }

  for (const s of skills) {
    const bucket = { name: s.name, results: [] };
    for (const c of s.cases) {
      const r = runCase(c, exec);
      bucket.results.push(r);
      allResults.push({ skill: s.name, ...r });
    }
    skillBuckets.push(bucket);
  }

  if (json) {
    process.stdout.write(JSON.stringify({ mode, results: allResults, issues }, null, 2) + '\n');
    return;
  }

  const report = reportRun({ skills: skillBuckets, results: allResults, mode });
  console.log(report.text);

  if (issues.length) {
    console.log('Issues:');
    for (const i of issues) console.log(`  [${i.severity}] ${i.message}`);
  }

  if (report.counts.fail > 0 || report.counts.err > 0) {
    process.exitCode = 1;
  }
}

module.exports = {
  evalCmd,
  listEvals,
  loadCasesFromFile,
  validateCase,
  runAssertion,
  runCase,
  runCaseWithBaseline,
  buildBaselinePrompt,
  makeBaselineCase,
  diffPair,
  dryRunExecutor,
  manualExecutor,
  claudeExecutor,
};
