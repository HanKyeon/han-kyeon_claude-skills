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
