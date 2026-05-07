'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { getSkillsTargetDir, getProjectClaudeDir } = require('./paths');

const EVAL_HISTORY_DIR = path.join(os.homedir(), '.claude', '.cfh-logs', 'eval-history');
const TELEMETRY_FILE = path.join(os.homedir(), '.claude', '.cfh-logs', 'telemetry.json');

const VALID_ASSERTION_TYPES = new Set(['contains', 'not_contains', 'regex', 'judge']);

const JUDGE_PROMPT_TEMPLATE = (criterion, output) => `You are evaluating whether an AI response satisfies a specific criterion.

Response to evaluate:
"""
${output}
"""

Criterion: ${criterion}

Did the response satisfy the criterion? Reply on a single line in exactly one of these formats:
  YES: <one-line reason>
  NO: <one-line reason>

Be strict — only YES if the response clearly meets the criterion.`;

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
        return;
      }
      if (a.type === 'judge') {
        // judge type uses `criterion`, not `value`
        if (typeof a.criterion !== 'string' || !a.criterion.trim()) {
          issues.push({ severity: 'error', message: `assertion[${i}] judge.criterion must be non-empty string (${rawCase.name})` });
        }
        if (a.criterion && a.criterion.length > 500) {
          issues.push({ severity: 'error', message: `assertion[${i}] judge.criterion too long (>500 chars) — keep concise (${rawCase.name})` });
        }
        if (a.model !== undefined && (typeof a.model !== 'string' || !a.model.trim())) {
          issues.push({ severity: 'error', message: `assertion[${i}] judge.model must be string when provided (${rawCase.name})` });
        }
        return;
      }
      // Non-judge types: require value
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

function createJudgeFn({ binary = 'claude', defaultModel = 'claude-haiku-4-5', timeoutMs = 60000 } = {}) {
  return function judgeFn(criterion, output, opts = {}) {
    const model = opts.model || defaultModel;
    const prompt = JUDGE_PROMPT_TEMPLATE(criterion, output || '');
    const args = ['--print', '--model', model];
    let result;
    try {
      result = spawnSync(binary, args, {
        input: prompt,
        encoding: 'utf8',
        timeout: timeoutMs,
      });
    } catch (err) {
      return { pass: false, reason: `judge spawn error: ${err.message}` };
    }
    if (result.error) {
      return { pass: false, reason: `judge spawn error: ${result.error.message}` };
    }
    if (result.status !== 0) {
      const stderr = (result.stderr || '').slice(0, 200);
      return { pass: false, reason: `judge exited ${result.status}: ${stderr}` };
    }
    const verdict = (result.stdout || '').trim();
    // Parse: expect "YES: ..." or "NO: ..." at start
    const match = verdict.match(/^(YES|NO)\s*[:\-]?\s*(.*)$/im);
    if (!match) {
      return { pass: false, reason: `judge verdict unparseable: "${verdict.slice(0, 100)}"` };
    }
    const isYes = match[1].toUpperCase() === 'YES';
    const reasonText = (match[2] || '').slice(0, 200) || verdict.slice(0, 200);
    return {
      pass: isYes,
      reason: isYes ? `judge: ${reasonText}` : `judge said NO: ${reasonText}`,
      verdict,
      model,
    };
  };
}

function runAssertion(assertion, output, judgeFn = null) {
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
    case 'judge':
      if (!judgeFn) {
        return { pass: false, reason: 'judge assertion needs --enable-judge (LLM call required)' };
      }
      return judgeFn(assertion.criterion, out, { model: assertion.model });
    default:
      return { pass: false, reason: `unknown assertion type: ${assertion.type}` };
  }
}

function runCase(testCase, executor, judgeFn = null) {
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
    const r = runAssertion(a, output, judgeFn);
    const recorded = { type: a.type, pass: r.pass, reason: r.reason };
    if (a.type === 'judge') {
      recorded.criterion = a.criterion;
      if (r.verdict) recorded.verdict = r.verdict.slice(0, 300);
      if (r.model) recorded.model = r.model;
    } else {
      recorded.value = a.value;
    }
    result.assertions.push(recorded);
  }

  result.pass = result.assertions.every((a) => a.pass);
  return result;
}

// --- Persistence (eval-history) ---

function isTelemetryEnabled() {
  try {
    const cfg = JSON.parse(fs.readFileSync(TELEMETRY_FILE, 'utf8'));
    return cfg.enabled === true;
  } catch {
    return false;
  }
}

function persistEvalRun({ skill, mode, results, isAB, summary }) {
  if (!isTelemetryEnabled()) return null;
  const skillDir = path.join(EVAL_HISTORY_DIR, skill);
  try { fs.mkdirSync(skillDir, { recursive: true }); } catch { return null; }
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${ts}.json`;
  const filePath = path.join(skillDir, filename);
  const record = {
    timestamp: new Date().toISOString(),
    skill,
    mode,
    isAB: !!isAB,
    summary,
    results: results.map((r) => {
      // Strip large output content to keep history file small (~10KB cap per case)
      if (r.treatment && r.baseline) {
        return {
          name: r.name,
          treatment: { pass: r.treatment.pass, skipped: r.treatment.skipped, error: r.treatment.error, assertions: r.treatment.assertions },
          baseline: { pass: r.baseline.pass, skipped: r.baseline.skipped, error: r.baseline.error, assertions: r.baseline.assertions },
          diff: r.diff,
        };
      }
      return {
        name: r.name,
        pass: r.pass,
        skipped: r.skipped,
        error: r.error,
        assertions: r.assertions,
      };
    }),
  };
  try {
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
    return filePath;
  } catch {
    return null;
  }
}

function readEvalHistory(skill, { limit = 10 } = {}) {
  const skillDir = path.join(EVAL_HISTORY_DIR, skill);
  if (!fs.existsSync(skillDir)) return [];
  let files;
  try {
    files = fs.readdirSync(skillDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();
  } catch {
    return [];
  }
  const records = [];
  for (const f of files.slice(0, limit)) {
    try {
      const content = fs.readFileSync(path.join(skillDir, f), 'utf8');
      records.push(JSON.parse(content));
    } catch {
      // skip corrupt records
    }
  }
  return records;
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

function runCaseWithBaseline(testCase, executor, skillName, judgeFn = null) {
  const treatment = runCase(testCase, executor, judgeFn);
  const baseline = runCase(makeBaselineCase(testCase, skillName), executor, judgeFn);
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

// --- Description variants comparison (A/B/C of trigger keywords) ---

function loadVariants(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`variants file not found: ${filePath}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`variants JSON parse error: ${err.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('variants file must be a JSON array of {name, description} objects');
  }
  for (const v of parsed) {
    if (!v || typeof v !== 'object') {
      throw new Error('each variant must be an object');
    }
    if (typeof v.name !== 'string' || !v.name.trim()) {
      throw new Error('each variant must have a non-empty name');
    }
    if (typeof v.description !== 'string' || !v.description.trim()) {
      throw new Error(`variant "${v.name}" must have a non-empty description`);
    }
  }
  return parsed;
}

function runVariantsComparison({ skill, cases, variants }) {
  // Lazy require to avoid circular dependency at module load
  const { scoreSkill, tokenizeQuery } = require('./trace');

  const variantResults = variants.map((v) => ({
    name: v.name,
    description: v.description,
    perCase: [],
    totalScore: 0,
    triggerWins: 0,
  }));

  // For each case, compute trace score for each variant
  for (const c of cases) {
    const tokens = tokenizeQuery(c.prompt);
    const caseScores = variantResults.map((v) => {
      const result = scoreSkill(tokens, v.description);
      return { name: v.name, score: result.score, hits: result.hits, penalties: result.penalties };
    });
    // Find winner (highest score)
    const max = Math.max(...caseScores.map((s) => s.score));
    for (const cs of caseScores) {
      cs.isWinner = cs.score === max && max > 0;
    }
    // Track per-variant
    for (const cs of caseScores) {
      const variant = variantResults.find((v) => v.name === cs.name);
      variant.perCase.push({ caseName: c.name, ...cs });
      variant.totalScore += cs.score;
      if (cs.isWinner) variant.triggerWins++;
    }
  }

  return variantResults;
}

function reportVariants({ skill, cases, variantResults }) {
  const lines = [];
  lines.push('');
  lines.push(`📊 Description variants comparison — ${skill}`);
  lines.push(`  Cases: ${cases.length} · Variants: ${variantResults.length}`);
  lines.push('  Method: trace keyword scoring (no LLM call). For real eval, run cfh eval --executor claude per variant.');
  lines.push('');

  // Aggregate table
  lines.push('Aggregate scores:');
  lines.push('');
  const aggRows = variantResults.map((v) => [
    v.name,
    v.totalScore.toFixed(1),
    `${v.triggerWins}/${cases.length}`,
    (v.description || '').slice(0, 60) + ((v.description || '').length > 60 ? '…' : ''),
  ]);
  const widths = [
    Math.max('variant'.length, ...aggRows.map((r) => r[0].length)),
    Math.max('total'.length, ...aggRows.map((r) => r[1].length)),
    Math.max('wins'.length, ...aggRows.map((r) => r[2].length)),
    Math.max('description'.length, ...aggRows.map((r) => r[3].length)),
  ];
  const fmtRow = (cells) => cells.map((c, i) => String(c ?? '').padEnd(widths[i])).join('  ');
  lines.push(fmtRow(['variant', 'total', 'wins', 'description']));
  lines.push(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of aggRows) lines.push(fmtRow(row));
  lines.push('');

  // Per-case detail
  lines.push('Per case:');
  lines.push('');
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    lines.push(`  ${c.name}`);
    for (const v of variantResults) {
      const cs = v.perCase[i];
      const marker = cs.isWinner ? '★' : ' ';
      const hits = cs.hits.length ? `+[${cs.hits.join(',')}]` : '';
      const pens = cs.penalties.length ? `−[${cs.penalties.join(',')}]` : '';
      lines.push(`    ${marker} ${v.name.padEnd(20)} score=${cs.score.toFixed(1)}  ${hits} ${pens}`);
    }
    lines.push('');
  }

  // Recommendation
  const sorted = [...variantResults].sort((a, b) => b.totalScore - a.totalScore);
  const winner = sorted[0];
  const runnerUp = sorted[1];
  lines.push('Recommendation:');
  lines.push('');
  if (winner && runnerUp && winner.totalScore > runnerUp.totalScore * 1.1) {
    lines.push(`  ✅ "${winner.name}" wins by ${(winner.totalScore - runnerUp.totalScore).toFixed(1)} points (${(((winner.totalScore - runnerUp.totalScore) / runnerUp.totalScore) * 100).toFixed(0)}% over runner-up)`);
  } else if (winner) {
    lines.push(`  ⚠ "${winner.name}" leads but margin is small (≤10%) — keyword scoring may be inconclusive. Consider running --executor claude per variant for real signal.`);
  } else {
    lines.push('  No variants scored — check eval cases include relevant keywords.');
  }
  lines.push('');
  lines.push('Note: This is keyword-only signal. For real behavior comparison, manually swap SKILL.md description to each variant + cfh eval --executor claude.');

  return lines.join('\n');
}

// --- JUnit XML reporter ---

function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildJUnitXml(skillBuckets, { isAB = false } = {}) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  const totalTests = skillBuckets.reduce((s, b) => s + b.results.length, 0);
  let totalFailures = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  for (const b of skillBuckets) {
    for (const r of b.results) {
      if (isAB) {
        const t = r.treatment;
        if (t.skipped) totalSkipped++;
        else if (t.error) totalErrors++;
        else if (!t.pass) totalFailures++;
      } else {
        if (r.skipped) totalSkipped++;
        else if (r.error) totalErrors++;
        else if (!r.pass) totalFailures++;
      }
    }
  }

  lines.push(`<testsuites name="cfh eval" tests="${totalTests}" failures="${totalFailures}" errors="${totalErrors}" skipped="${totalSkipped}">`);

  for (const b of skillBuckets) {
    const sFail = b.results.filter((r) => isAB ? (!r.treatment.pass && !r.treatment.skipped && !r.treatment.error) : (!r.pass && !r.skipped && !r.error)).length;
    const sErr = b.results.filter((r) => isAB ? r.treatment.error : r.error).length;
    const sSkip = b.results.filter((r) => isAB ? r.treatment.skipped : r.skipped).length;
    lines.push(`  <testsuite name="${escapeXml(b.name)}" tests="${b.results.length}" failures="${sFail}" errors="${sErr}" skipped="${sSkip}">`);

    for (const r of b.results) {
      const tcResult = isAB ? r.treatment : r;
      const tcName = escapeXml(r.name || tcResult.name);
      lines.push(`    <testcase classname="${escapeXml(b.name)}" name="${tcName}">`);
      if (tcResult.skipped) {
        lines.push(`      <skipped message="${escapeXml(tcResult.note || 'dry-run')}"/>`);
      } else if (tcResult.error) {
        lines.push(`      <error message="${escapeXml(tcResult.error)}">${escapeXml(tcResult.error)}</error>`);
      } else if (!tcResult.pass) {
        const failedAssertions = (tcResult.assertions || []).filter((a) => !a.pass);
        const reasons = failedAssertions.map((a) => `${a.type}: ${a.reason}`).join('\n');
        lines.push(`      <failure message="${escapeXml(failedAssertions[0]?.reason || 'assertion failed')}">${escapeXml(reasons)}</failure>`);
      }
      // Attach A/B diff as system-out for context
      if (isAB && r.diff) {
        lines.push(`      <system-out>diff=${escapeXml(r.diff.label)} (delta=${r.diff.delta})</system-out>`);
      }
      lines.push(`    </testcase>`);
    }
    lines.push('  </testsuite>');
  }
  lines.push('</testsuites>');
  return lines.join('\n');
}

// --- Top-level command ---

function countJudgeAssertions(skills) {
  let count = 0;
  for (const s of skills) {
    for (const c of s.cases) {
      for (const a of c.assertions) {
        if (a.type === 'judge') count++;
      }
    }
  }
  return count;
}

function evalCmd({ skill, target, project, list, dryRun, manual, executor, json, baseline, report, output, variants, enableJudge, judgeModel } = {}) {
  const { skills, issues } = listEvals({ skill, target, project });

  // Variants mode (description A/B/C comparison via trace scoring)
  if (variants) {
    if (!skill) {
      console.error('--variants requires a skill name. Usage: cfh eval <skill> --variants <file>');
      process.exitCode = 1;
      return;
    }
    if (skills.length === 0 || !skills[0].cases.length) {
      console.error(`No eval cases found for skill "${skill}". Add cases to ~/.claude/skills/${skill}/evals/ first.`);
      process.exitCode = 1;
      return;
    }
    let variantList;
    try {
      variantList = loadVariants(variants);
    } catch (err) {
      console.error(`variants load error: ${err.message}`);
      process.exitCode = 1;
      return;
    }
    const target = skills[0];
    const variantResults = runVariantsComparison({
      skill: target.name,
      cases: target.cases,
      variants: variantList,
    });
    if (json) {
      process.stdout.write(JSON.stringify({ skill: target.name, variants: variantResults }, null, 2) + '\n');
      return;
    }
    console.log(reportVariants({ skill: target.name, cases: target.cases, variantResults }));
    return;
  }

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

  // Judge assertion handling (semantic eval, opt-in)
  const judgeCount = countJudgeAssertions(skills);
  let judgeFn = null;
  if (judgeCount > 0) {
    if (!enableJudge) {
      console.log('');
      console.log(`⚠ Found ${judgeCount} judge assertion(s) but --enable-judge not set.`);
      console.log('  Judge assertions need LLM calls (default model: claude-haiku-4-5, ≈500 tokens each).');
      console.log('  Re-run with --enable-judge to evaluate them, or remove judge assertions.');
      console.log('  Continuing — judge assertions will fail with "needs --enable-judge" reason.');
    } else {
      const totalCases = skills.reduce((n, s) => n + s.cases.length, 0);
      const calls = baseline ? judgeCount * 2 : judgeCount;
      const estTokens = calls * 500;
      console.log('');
      console.log(`💡 Judge assertions enabled — ${judgeCount} assertion(s) across ${totalCases} case(s).`);
      console.log(`   Estimated extra LLM calls: ${calls} (${baseline ? 'A/B doubles judge calls' : 'single mode'})`);
      console.log(`   Rough cost: ~${estTokens.toLocaleString()} tokens (Haiku-class).`);
      console.log(`   Verify after via: cfh cost --days 1`);
      console.log('');
      judgeFn = createJudgeFn({ defaultModel: judgeModel || 'claude-haiku-4-5' });
    }
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
        const pair = runCaseWithBaseline(c, exec, s.name, judgeFn);
        bucket.results.push(pair);
        allResults.push({ skill: s.name, ...pair });
      }
      skillBuckets.push(bucket);
    }

    // Persist per-skill if not pure dry-run
    const persistedAB = [];
    if (!mode.startsWith('dry-run')) {
      for (const s of skillBuckets) {
        const summary = {
          treatmentPass: s.results.filter((p) => p.treatment.pass).length,
          baselinePass: s.results.filter((p) => p.baseline.pass).length,
          helped: s.results.filter((p) => p.diff.delta === 1).length,
          regressed: s.results.filter((p) => p.diff.delta === -1).length,
          total: s.results.length,
        };
        const filePath = persistEvalRun({ skill: s.name, mode, results: s.results, isAB: true, summary });
        if (filePath) persistedAB.push(filePath);
      }
    }

    if (report === 'junit') {
      const xml = buildJUnitXml(skillBuckets, { isAB: true });
      if (output) {
        fs.writeFileSync(output, xml);
        console.log(`JUnit report written: ${output}`);
      } else {
        process.stdout.write(xml + '\n');
      }
      // Still set exit code based on regressed
      const regressed = allResults.filter((p) => p.diff?.delta === -1).length;
      if (regressed > 0) process.exitCode = 1;
      return;
    }

    if (json) {
      process.stdout.write(JSON.stringify({ mode, results: allResults, issues, persisted: persistedAB }, null, 2) + '\n');
      return;
    }

    const reportObj = reportABRun({ skills: skillBuckets, results: allResults, mode });
    console.log(reportObj.text);
    if (issues.length) {
      console.log('\nIssues:');
      for (const i of issues) console.log(`  [${i.severity}] ${i.message}`);
    }
    if (persistedAB.length) {
      console.log('');
      console.log(`History saved: ${persistedAB.length} file(s) → ~/.claude/.cfh-logs/eval-history/`);
    }
    if (reportObj.counts.regressed > 0) process.exitCode = 1;
    return;
  }

  for (const s of skills) {
    const bucket = { name: s.name, results: [] };
    for (const c of s.cases) {
      const r = runCase(c, exec, judgeFn);
      bucket.results.push(r);
      allResults.push({ skill: s.name, ...r });
    }
    skillBuckets.push(bucket);
  }

  // Persist per-skill if not pure dry-run
  const persisted = [];
  if (!mode.startsWith('dry-run')) {
    for (const s of skillBuckets) {
      const summary = {
        pass: s.results.filter((r) => r.pass).length,
        fail: s.results.filter((r) => !r.pass && !r.skipped && !r.error).length,
        error: s.results.filter((r) => r.error).length,
        skipped: s.results.filter((r) => r.skipped).length,
        total: s.results.length,
      };
      const filePath = persistEvalRun({ skill: s.name, mode, results: s.results, isAB: false, summary });
      if (filePath) persisted.push(filePath);
    }
  }

  if (report === 'junit') {
    const xml = buildJUnitXml(skillBuckets, { isAB: false });
    if (output) {
      fs.writeFileSync(output, xml);
      console.log(`JUnit report written: ${output}`);
    } else {
      process.stdout.write(xml + '\n');
    }
    const failed = allResults.filter((r) => !r.pass && !r.skipped).length;
    if (failed > 0) process.exitCode = 1;
    return;
  }

  if (json) {
    process.stdout.write(JSON.stringify({ mode, results: allResults, issues, persisted }, null, 2) + '\n');
    return;
  }

  const reportObj = reportRun({ skills: skillBuckets, results: allResults, mode });
  console.log(reportObj.text);

  if (issues.length) {
    console.log('Issues:');
    for (const i of issues) console.log(`  [${i.severity}] ${i.message}`);
  }

  if (persisted.length) {
    console.log('');
    console.log(`History saved: ${persisted.length} file(s) → ~/.claude/.cfh-logs/eval-history/`);
  }

  if (reportObj.counts.fail > 0 || reportObj.counts.err > 0) {
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
  persistEvalRun,
  readEvalHistory,
  isTelemetryEnabled,
  loadVariants,
  runVariantsComparison,
  buildJUnitXml,
  createJudgeFn,
  countJudgeAssertions,
  JUDGE_PROMPT_TEMPLATE,
  buildBaselinePrompt,
  makeBaselineCase,
  diffPair,
  dryRunExecutor,
  manualExecutor,
  claudeExecutor,
};
