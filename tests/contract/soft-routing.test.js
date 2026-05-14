'use strict';

// Contract test — PLAN § 9 (Track 9, 0.18.0).
// Verifies that each stack-paired command body wires the soft-routing
// suggestion block (Phase 0a) and references commands/references/soft-routing.md.
// This is a *document pattern* test — actual LLM behavior is validated externally
// via `cfh dev eval --executor claude --baseline` (PLAN § 9.7 GATE A).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { traceScores } = require('../../lib/trace');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PAIRED_COMMANDS = [
  { file: 'commands/cfh-tdd.md', opposite: '/cfh-tdd-gen' },
  { file: 'commands/cfh-tdd-gen.md', opposite: '/cfh-tdd' },
  { file: 'commands/cfh-tc.md', opposite: '/cfh-tc-gen' },
  { file: 'commands/cfh-tc-gen.md', opposite: '/cfh-tc' },
  { file: 'commands/cfh-refactor.md', opposite: '/cfh-refactor-gen' },
  { file: 'commands/cfh-refactor-gen.md', opposite: '/cfh-refactor' },
];

test('each stack-paired command body wires Phase 0a soft suggestion', () => {
  const missing = [];
  for (const { file, opposite } of PAIRED_COMMANDS) {
    const body = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
    const hasPhase0a = /Phase 0a.*Stack misroute suggestion/.test(body);
    const referencesOpposite = body.includes(opposite);
    const referencesSoftRouting = body.includes('commands/references/soft-routing.md');
    if (!hasPhase0a || !referencesOpposite || !referencesSoftRouting) {
      missing.push(
        `  - ${file}: phase0a=${hasPhase0a}, opposite=${referencesOpposite}, reference=${referencesSoftRouting}`
      );
    }
  }
  assert.deepEqual(
    missing,
    [],
    `\nPaired commands missing Phase 0a soft suggestion wiring:\n${missing.join('\n')}\n\nSee PLAN.md § 9.3 + commands/references/soft-routing.md.`
  );
});

test('cfh-plan Phase 2 approach card includes stack signal recommendation', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, 'commands/cfh-plan.md'), 'utf8');
  assert.ok(
    body.includes('Stack signal'),
    'cfh-plan.md must include "Stack signal" section in Phase 2 approach card.'
  );
  assert.ok(
    body.includes('soft-routing.md'),
    'cfh-plan.md must reference commands/references/soft-routing.md.'
  );
});

test('soft-routing.md reference exists with heuristic + decision rules', () => {
  const ref = path.join(REPO_ROOT, 'commands/references/soft-routing.md');
  assert.ok(fs.existsSync(ref), 'commands/references/soft-routing.md must exist (Track 9 0.18.0)');
  const body = fs.readFileSync(ref, 'utf8');
  // Spot-check the key sections
  assert.match(body, /FE 신호/, 'must list FE keyword heuristic');
  assert.match(body, /non-FE 신호/, 'must list non-FE keyword heuristic');
  assert.match(body, /yes \/ switch \/ explain/i, 'must document user answer options');
  assert.match(body, /자가검증/, 'must reference self-validation (PLAN § 0.15.2 spirit)');
  assert.match(body, /confidence marker/i, 'must document confidence marker rules');
});

test('traceScores library API is exported and callable', () => {
  // Smoke test: traceScores returns an array (possibly empty if no skills installed)
  const scores = traceScores({ utterance: 'TDD로 새 컴포넌트' });
  assert.ok(Array.isArray(scores), 'traceScores must return an array');
  // If skills are present, top should have a numeric score
  if (scores.length > 0) {
    assert.equal(typeof scores[0].score, 'number', 'each score entry must have numeric score');
    assert.equal(typeof scores[0].name, 'string', 'each score entry must have name');
  }
});

test('traceScores handles empty/invalid input gracefully', () => {
  assert.deepEqual(traceScores({ utterance: '' }), [], 'empty utterance → empty array');
  assert.deepEqual(traceScores({ utterance: null }), [], 'null utterance → empty array');
  assert.deepEqual(traceScores({}), [], 'missing utterance → empty array');
});
