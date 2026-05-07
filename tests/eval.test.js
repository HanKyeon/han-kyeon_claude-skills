'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  validateCase,
  loadCasesFromFile,
  listEvals,
  runAssertion,
  runCase,
  runCaseWithBaseline,
  buildBaselinePrompt,
  makeBaselineCase,
  diffPair,
  dryRunExecutor,
  loadVariants,
  runVariantsComparison,
  buildJUnitXml,
  countJudgeAssertions,
  JUDGE_PROMPT_TEMPLATE,
} = require('../lib/eval');

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-eval-test-'));
}

// --- runAssertion ---

test('runAssertion: contains pass', () => {
  const r = runAssertion({ type: 'contains', value: 'Phase 1' }, 'starting Phase 1 Intent Interview');
  assert.strictEqual(r.pass, true);
  assert.strictEqual(r.reason, null);
});

test('runAssertion: contains fail', () => {
  const r = runAssertion({ type: 'contains', value: 'Phase 1' }, 'no phases here');
  assert.strictEqual(r.pass, false);
  assert.match(r.reason, /missing/);
});

test('runAssertion: not_contains pass', () => {
  const r = runAssertion({ type: 'not_contains', value: 'TypeError' }, 'all good');
  assert.strictEqual(r.pass, true);
});

test('runAssertion: not_contains fail', () => {
  const r = runAssertion({ type: 'not_contains', value: 'TypeError' }, 'TypeError happened');
  assert.strictEqual(r.pass, false);
  assert.match(r.reason, /forbidden/);
});

test('runAssertion: regex pass', () => {
  const r = runAssertion({ type: 'regex', value: 'Phase\\s+\\d' }, 'Phase 1 starting');
  assert.strictEqual(r.pass, true);
});

test('runAssertion: regex fail', () => {
  const r = runAssertion({ type: 'regex', value: '^begin' }, 'middle of text');
  assert.strictEqual(r.pass, false);
});

test('runAssertion: invalid regex returns fail with reason', () => {
  const r = runAssertion({ type: 'regex', value: '[invalid' }, 'anything');
  assert.strictEqual(r.pass, false);
  assert.match(r.reason, /invalid regex/);
});

test('runAssertion: unknown type fails', () => {
  const r = runAssertion({ type: 'magic', value: 'x' }, 'output');
  assert.strictEqual(r.pass, false);
  assert.match(r.reason, /unknown/);
});

// --- validateCase ---

test('validateCase: valid case has no errors', () => {
  const issues = validateCase({
    name: 'x',
    prompt: 'do thing',
    assertions: [{ type: 'contains', value: 'foo' }],
  }, 'src');
  assert.strictEqual(issues.length, 0);
});

test('validateCase: missing name reported', () => {
  const issues = validateCase({ prompt: 'p', assertions: [{ type: 'contains', value: 'x' }] }, 'src');
  assert.ok(issues.find((i) => /name/.test(i.message)));
});

test('validateCase: empty assertions reported', () => {
  const issues = validateCase({ name: 'x', prompt: 'p', assertions: [] }, 'src');
  assert.ok(issues.find((i) => /assertions/.test(i.message)));
});

test('validateCase: invalid assertion type reported', () => {
  const issues = validateCase({
    name: 'x',
    prompt: 'p',
    assertions: [{ type: 'bogus', value: 'y' }],
  }, 'src');
  assert.ok(issues.find((i) => /bogus/.test(i.message)));
});

test('validateCase: invalid regex reported', () => {
  const issues = validateCase({
    name: 'x',
    prompt: 'p',
    assertions: [{ type: 'regex', value: '[bad' }],
  }, 'src');
  assert.ok(issues.find((i) => /regex/.test(i.message)));
});

test('validateCase: skill_should_trigger non-string reported', () => {
  const issues = validateCase({
    name: 'x',
    prompt: 'p',
    assertions: [{ type: 'contains', value: 'y' }],
    skill_should_trigger: 123,
  }, 'src');
  assert.ok(issues.find((i) => /skill_should_trigger/.test(i.message)));
});

// --- loadCasesFromFile ---

test('loadCasesFromFile: single object', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'a.json');
  fs.writeFileSync(file, JSON.stringify({
    name: 'one', prompt: 'p',
    assertions: [{ type: 'contains', value: 'x' }],
  }));
  const { cases, issues } = loadCasesFromFile(file);
  assert.strictEqual(cases.length, 1);
  assert.strictEqual(issues.length, 0);
});

test('loadCasesFromFile: array of objects', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'b.json');
  fs.writeFileSync(file, JSON.stringify([
    { name: 'one', prompt: 'p', assertions: [{ type: 'contains', value: 'x' }] },
    { name: 'two', prompt: 'q', assertions: [{ type: 'regex', value: 'foo' }] },
  ]));
  const { cases } = loadCasesFromFile(file);
  assert.strictEqual(cases.length, 2);
});

test('loadCasesFromFile: malformed JSON returns issues', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'bad.json');
  fs.writeFileSync(file, '{not json');
  const { cases, issues } = loadCasesFromFile(file);
  assert.strictEqual(cases.length, 0);
  assert.ok(issues.find((i) => /JSON parse/.test(i.message)));
});

// --- listEvals ---

test('listEvals: discovers eval cases per skill', () => {
  const dir = mkTmpDir();
  const skillA = path.join(dir, 'skill-a', 'evals');
  fs.mkdirSync(skillA, { recursive: true });
  fs.writeFileSync(path.join(skillA, 'c1.json'), JSON.stringify({
    name: 'c1', prompt: 'p', assertions: [{ type: 'contains', value: 'x' }],
  }));
  fs.mkdirSync(path.join(dir, 'skill-b'), { recursive: true });

  const { skills } = listEvals({ target: dir });
  const a = skills.find((s) => s.name === 'skill-a');
  assert.ok(a, 'skill-a should be listed');
  assert.strictEqual(a.cases.length, 1);
  // skill-b has no evals/, should not appear unless filtering for it
  const b = skills.find((s) => s.name === 'skill-b');
  assert.ok(!b, 'skill-b should not appear when no skill filter');
});

test('listEvals: skill filter matches only that skill', () => {
  const dir = mkTmpDir();
  fs.mkdirSync(path.join(dir, 'skill-a', 'evals'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'skill-a', 'evals', 'c.json'), JSON.stringify({
    name: 'c', prompt: 'p', assertions: [{ type: 'contains', value: 'x' }],
  }));
  fs.mkdirSync(path.join(dir, 'skill-b', 'evals'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'skill-b', 'evals', 'c.json'), JSON.stringify({
    name: 'c', prompt: 'p', assertions: [{ type: 'contains', value: 'y' }],
  }));
  const { skills } = listEvals({ target: dir, skill: 'skill-a' });
  assert.strictEqual(skills.length, 1);
  assert.strictEqual(skills[0].name, 'skill-a');
});

// --- runCase ---

test('runCase: all assertions pass', () => {
  const tc = {
    name: 't',
    prompt: 'p',
    assertions: [
      { type: 'contains', value: 'Phase' },
      { type: 'not_contains', value: 'Error' },
      { type: 'regex', value: '\\d' },
    ],
  };
  const r = runCase(tc, () => 'Phase 1 starting');
  assert.strictEqual(r.pass, true);
  assert.strictEqual(r.skipped, false);
  assert.strictEqual(r.assertions.length, 3);
});

test('runCase: any failing assertion fails the case', () => {
  const tc = {
    name: 't',
    prompt: 'p',
    assertions: [
      { type: 'contains', value: 'Phase' },
      { type: 'contains', value: 'NeverPresent' },
    ],
  };
  const r = runCase(tc, () => 'Phase 1');
  assert.strictEqual(r.pass, false);
});

test('runCase: skill_should_trigger adds an assertion', () => {
  const tc = {
    name: 't',
    prompt: 'p',
    skill_should_trigger: 'tdd-first',
    assertions: [{ type: 'contains', value: 'Phase' }],
  };
  const passing = runCase(tc, () => 'tdd-first activated, Phase 1');
  assert.strictEqual(passing.pass, true);
  const failing = runCase(tc, () => 'no skill, Phase 1');
  assert.strictEqual(failing.pass, false);
  assert.ok(failing.assertions.find((a) => a.type === 'skill_should_trigger' && !a.pass));
});

test('runCase: dry-run executor marks as skipped', () => {
  const tc = {
    name: 't',
    prompt: 'p',
    assertions: [{ type: 'contains', value: 'x' }],
  };
  const r = runCase(tc, dryRunExecutor());
  assert.strictEqual(r.skipped, true);
  assert.strictEqual(r.pass, false);
});

test('runCase: executor throwing is captured as error', () => {
  const tc = {
    name: 't',
    prompt: 'p',
    assertions: [{ type: 'contains', value: 'x' }],
  };
  const r = runCase(tc, () => { throw new Error('boom'); });
  assert.strictEqual(r.pass, false);
  assert.match(r.error, /boom/);
});

test('runCase: rejects async executors', () => {
  const tc = {
    name: 't',
    prompt: 'p',
    assertions: [{ type: 'contains', value: 'x' }],
  };
  const r = runCase(tc, () => Promise.resolve('async output'));
  assert.strictEqual(r.pass, false);
  assert.match(r.error, /Promise/);
});

test('runCase: preserves meta from executor', () => {
  const tc = {
    name: 't',
    prompt: 'p',
    assertions: [{ type: 'contains', value: 'x' }],
  };
  const r = runCase(tc, () => ({ output: 'x', meta: { outputChars: 1, durationMs: 10 } }));
  assert.strictEqual(r.pass, true);
  assert.deepStrictEqual(r.meta, { outputChars: 1, durationMs: 10 });
});

// --- A/B baseline ---

test('buildBaselinePrompt: prepends anti-trigger instruction with skill name', () => {
  const baseline = buildBaselinePrompt('TDD로 짜줘', 'tdd-first');
  assert.ok(baseline.includes('"tdd-first"'));
  assert.ok(baseline.includes('Do NOT'));
  assert.ok(baseline.endsWith('TDD로 짜줘'));
});

test('makeBaselineCase: returns new case with _baseline flag and modified prompt', () => {
  const tc = {
    name: 't',
    prompt: 'do thing',
    assertions: [{ type: 'contains', value: 'x' }],
  };
  const baseline = makeBaselineCase(tc, 'my-skill');
  assert.strictEqual(baseline._baseline, true);
  assert.notStrictEqual(baseline.prompt, tc.prompt);
  assert.strictEqual(baseline.name, 't');
  assert.deepStrictEqual(baseline.assertions, tc.assertions);
});

test('diffPair: skill helped (treatment pass, baseline fail)', () => {
  const d = diffPair({ pass: true }, { pass: false });
  assert.strictEqual(d.delta, 1);
  assert.match(d.label, /helped/);
});

test('diffPair: skill regressed (treatment fail, baseline pass)', () => {
  const d = diffPair({ pass: false }, { pass: true });
  assert.strictEqual(d.delta, -1);
  assert.match(d.label, /regressed/);
});

test('diffPair: both pass → no diff', () => {
  const d = diffPair({ pass: true }, { pass: true });
  assert.strictEqual(d.delta, 0);
});

test('diffPair: both fail → no diff', () => {
  const d = diffPair({ pass: false }, { pass: false });
  assert.strictEqual(d.delta, 0);
});

test('diffPair: error or skip → null delta', () => {
  assert.strictEqual(diffPair({ skipped: true }, { pass: true }).delta, null);
  assert.strictEqual(diffPair({ pass: true }, { error: 'x' }).delta, null);
});

test('runCaseWithBaseline: skill that helps shows +1 delta', () => {
  const tc = {
    name: 't',
    prompt: 'TDD로 만들어줘',
    assertions: [{ type: 'contains', value: 'Phase' }],
  };
  const stub = (c) => c._baseline ? 'general response' : 'Phase 1 starting';
  const pair = runCaseWithBaseline(tc, stub, 'tdd-first');
  assert.strictEqual(pair.diff.delta, 1);
  assert.strictEqual(pair.treatment.pass, true);
  assert.strictEqual(pair.baseline.pass, false);
});

test('runCaseWithBaseline: skill that regresses shows -1 delta', () => {
  const tc = {
    name: 't',
    prompt: 'simple question',
    assertions: [{ type: 'contains', value: 'simple answer' }],
  };
  // Treatment: skill takes over and gives elaborate answer (no "simple answer")
  // Baseline: gives simple direct answer
  const stub = (c) => c._baseline ? 'simple answer here' : 'Phase 1 Intent Interview';
  const pair = runCaseWithBaseline(tc, stub, 'tdd-first');
  assert.strictEqual(pair.diff.delta, -1);
});

test('runCaseWithBaseline: both runs pass → no diff', () => {
  const tc = {
    name: 't',
    prompt: 'p',
    assertions: [{ type: 'contains', value: 'always' }],
  };
  const stub = () => 'always there';
  const pair = runCaseWithBaseline(tc, stub, 'whatever');
  assert.strictEqual(pair.diff.delta, 0);
});

// --- Variants ---

test('loadVariants: rejects non-array', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'v.json');
  fs.writeFileSync(file, JSON.stringify({ name: 'a', description: 'x' }));
  assert.throws(() => loadVariants(file), /array/);
});

test('loadVariants: rejects missing name', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'v.json');
  fs.writeFileSync(file, JSON.stringify([{ description: 'x' }]));
  assert.throws(() => loadVariants(file), /name/);
});

test('loadVariants: rejects missing description', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'v.json');
  fs.writeFileSync(file, JSON.stringify([{ name: 'a' }]));
  assert.throws(() => loadVariants(file), /description/);
});

test('loadVariants: accepts well-formed list', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'v.json');
  fs.writeFileSync(file, JSON.stringify([
    { name: 'a', description: 'TDD frontend React' },
    { name: 'b', description: 'TDD any framework' },
  ]));
  const v = loadVariants(file);
  assert.strictEqual(v.length, 2);
  assert.strictEqual(v[0].name, 'a');
});

test('runVariantsComparison: produces per-case scores and a winner', () => {
  const cases = [
    { name: 'fe-case', prompt: 'TDD react component', assertions: [{ type: 'contains', value: 'x' }] },
  ];
  const variants = [
    { name: 'narrow', description: 'react component TDD' },
    { name: 'wide', description: 'general TDD' },
  ];
  const results = runVariantsComparison({ skill: 'tdd-first', cases, variants });
  assert.strictEqual(results.length, 2);
  // narrow has more matching keywords (react, component, TDD) — should win
  const narrow = results.find((r) => r.name === 'narrow');
  const wide = results.find((r) => r.name === 'wide');
  assert.ok(narrow.totalScore > wide.totalScore, `narrow should outscore wide; got narrow=${narrow.totalScore}, wide=${wide.totalScore}`);
});

test('runVariantsComparison: detects anti-trigger penalty', () => {
  const cases = [
    { name: 'be-case', prompt: 'fastapi TDD backend', assertions: [{ type: 'contains', value: 'x' }] },
  ];
  const variants = [
    { name: 'no-anti', description: 'TDD any framework' },
    { name: 'with-anti', description: 'react TDD. Do NOT trigger fastapi' },
  ];
  const results = runVariantsComparison({ skill: 'tdd-first', cases, variants });
  const withAnti = results.find((r) => r.name === 'with-anti');
  // with-anti should be penalized for having "fastapi" in negative section
  assert.ok(withAnti.totalScore < 1, `with-anti should be penalized; got ${withAnti.totalScore}`);
});

// --- JUnit XML ---

test('buildJUnitXml: produces valid structure with passing case', () => {
  const buckets = [{
    name: 'tdd-first',
    results: [{
      name: 'happy',
      pass: true,
      skipped: false,
      error: null,
      assertions: [{ type: 'contains', pass: true }],
    }],
  }];
  const xml = buildJUnitXml(buckets);
  assert.match(xml, /<\?xml version="1.0"/);
  assert.match(xml, /<testsuites/);
  assert.match(xml, /name="tdd-first"/);
  assert.match(xml, /name="happy"/);
  // No <failure>, <skipped>, <error> elements for a passing case
  assert.ok(!/<failure/.test(xml));
});

test('buildJUnitXml: emits failure element with reason', () => {
  const buckets = [{
    name: 's',
    results: [{
      name: 'broken',
      pass: false,
      skipped: false,
      error: null,
      assertions: [
        { type: 'contains', value: 'x', pass: false, reason: 'output missing: "x"' },
      ],
    }],
  }];
  const xml = buildJUnitXml(buckets);
  assert.match(xml, /<failure/);
  assert.match(xml, /output missing/);
});

test('buildJUnitXml: emits skipped element for dry-run cases', () => {
  const buckets = [{
    name: 's',
    results: [{ name: 'skip-case', pass: false, skipped: true, error: null, assertions: [], note: 'dry-run' }],
  }];
  const xml = buildJUnitXml(buckets);
  assert.match(xml, /<skipped/);
  assert.match(xml, /dry-run/);
});

// --- Judge assertions (semantic eval) ---

test('validateCase: judge type requires criterion', () => {
  const issues = validateCase({
    name: 'x',
    prompt: 'p',
    assertions: [{ type: 'judge' }],
  }, 'src');
  assert.ok(issues.find((i) => /criterion/.test(i.message)));
});

test('validateCase: judge type accepts valid criterion', () => {
  const issues = validateCase({
    name: 'x',
    prompt: 'p',
    assertions: [{ type: 'judge', criterion: 'Did the response cover edge cases?' }],
  }, 'src');
  assert.deepStrictEqual(issues, []);
});

test('validateCase: judge.criterion length cap', () => {
  const longCriterion = 'a'.repeat(600);
  const issues = validateCase({
    name: 'x',
    prompt: 'p',
    assertions: [{ type: 'judge', criterion: longCriterion }],
  }, 'src');
  assert.ok(issues.find((i) => /too long/.test(i.message)));
});

test('runAssertion: judge without judgeFn fails with hint', () => {
  const r = runAssertion(
    { type: 'judge', criterion: 'is the response polite' },
    'some output',
    null
  );
  assert.strictEqual(r.pass, false);
  assert.match(r.reason, /enable-judge/);
});

test('runAssertion: judge calls judgeFn with criterion + output', () => {
  let captured = null;
  const stubJudge = (criterion, output, opts) => {
    captured = { criterion, output, model: opts?.model };
    return { pass: true, reason: 'judge: looks good' };
  };
  const r = runAssertion(
    { type: 'judge', criterion: 'is concise', model: 'claude-haiku-4-5' },
    'short answer',
    stubJudge
  );
  assert.strictEqual(r.pass, true);
  assert.strictEqual(captured.criterion, 'is concise');
  assert.strictEqual(captured.output, 'short answer');
  assert.strictEqual(captured.model, 'claude-haiku-4-5');
});

test('runAssertion: judge YES verdict passes, NO fails', () => {
  const yesJudge = () => ({ pass: true, reason: 'judge: explicit YES' });
  const noJudge = () => ({ pass: false, reason: 'judge said NO: missing context' });

  const yes = runAssertion({ type: 'judge', criterion: 'x' }, 'out', yesJudge);
  const no = runAssertion({ type: 'judge', criterion: 'x' }, 'out', noJudge);

  assert.strictEqual(yes.pass, true);
  assert.strictEqual(no.pass, false);
  assert.match(no.reason, /NO/);
});

test('runCase: judge assertion pass tracked as judge type with criterion', () => {
  const tc = {
    name: 'tc',
    prompt: 'p',
    assertions: [{ type: 'judge', criterion: 'is helpful' }],
  };
  const judge = () => ({ pass: true, reason: 'judge: helpful', verdict: 'YES: helpful' });
  const r = runCase(tc, () => 'output', judge);
  assert.strictEqual(r.pass, true);
  assert.strictEqual(r.assertions[0].type, 'judge');
  assert.strictEqual(r.assertions[0].criterion, 'is helpful');
  assert.match(r.assertions[0].verdict, /YES/);
});

test('countJudgeAssertions: counts across skills and cases', () => {
  const skills = [
    {
      name: 's1', cases: [
        { assertions: [{ type: 'contains', value: 'x' }, { type: 'judge', criterion: 'a' }] },
        { assertions: [{ type: 'judge', criterion: 'b' }, { type: 'judge', criterion: 'c' }] },
      ]
    },
    {
      name: 's2', cases: [
        { assertions: [{ type: 'regex', value: 'x' }] },
      ]
    },
  ];
  assert.strictEqual(countJudgeAssertions(skills), 3);
});

test('JUDGE_PROMPT_TEMPLATE: includes criterion and output', () => {
  const prompt = JUDGE_PROMPT_TEMPLATE('be concise', 'sample answer');
  assert.match(prompt, /be concise/);
  assert.match(prompt, /sample answer/);
  assert.match(prompt, /YES:/);
  assert.match(prompt, /NO:/);
});

test('buildJUnitXml: A/B mode reports treatment as primary', () => {
  const buckets = [{
    name: 's',
    results: [{
      name: 'ab-case',
      treatment: { pass: false, skipped: false, error: null, assertions: [{ type: 'contains', pass: false, reason: 'missing' }] },
      baseline: { pass: true, skipped: false, error: null, assertions: [] },
      diff: { delta: -1, label: 'skill regressed' },
    }],
  }];
  const xml = buildJUnitXml(buckets, { isAB: true });
  assert.match(xml, /<failure/);
  assert.match(xml, /system-out/);
  assert.match(xml, /skill regressed/);
});
