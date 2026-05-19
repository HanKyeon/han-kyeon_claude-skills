'use strict';

// Contract test — Agent Communication Mode wiring (0.21.0).
// Verifies that multi-agent assets reference commands/references/agent-team-modes.md
// and include explicit mode selection step (subagent vs teams).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const MODE_SELECTION_ASSETS = [
  { file: 'skills/cfh-harness/SKILL.md', label: 'cfh-harness (Phase 2.5)' },
  { file: 'commands/cfh-team.md', label: 'cfh-team (Phase 2.5)' },
  { file: 'commands/cfh-review.md', label: 'cfh-review (Step 2.7)' },
];

const REFERENCE_PATH = 'commands/references/agent-team-modes.md';

test('agent-team-modes reference exists with required sections', () => {
  const abs = path.join(REPO_ROOT, REFERENCE_PATH);
  assert.ok(fs.existsSync(abs), `${REFERENCE_PATH} must exist (0.21.0)`);
  const body = fs.readFileSync(abs, 'utf8');

  // Spot-check key sections
  assert.match(body, /subagent.*teams|두 mode/, 'must describe subagent vs teams difference');
  assert.match(body, /CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS/, 'must reference experimental flag');
  assert.match(body, /bounded.*round|max-round/i, 'must document bounded round policy');
  assert.match(body, /패턴별.*추천|자동 추천 룰/, 'must document per-pattern recommendation');
  assert.match(body, /Fallback|fallback/, 'must document fallback policy');
  assert.match(body, /토큰 budget|token budget/i, 'must include token budget guide');
});

test('multi-agent assets wire mode selection + reference', () => {
  const missing = [];
  for (const { file, label } of MODE_SELECTION_ASSETS) {
    const abs = path.join(REPO_ROOT, file);
    assert.ok(fs.existsSync(abs), `${file} must exist`);
    const body = fs.readFileSync(abs, 'utf8');

    const hasModeStep = /Communication Mode|mode 선택|mode Selection/i.test(body);
    const referencesFile = body.includes('agent-team-modes.md');
    const hasFlagMention = /CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS/.test(body);
    const hasRecommendation = /(추천 mode|recommendation.*mode|subagent.*teams)/.test(body);

    if (!hasModeStep || !referencesFile || !hasFlagMention || !hasRecommendation) {
      missing.push(
        `  - ${label} (${file}): modeStep=${hasModeStep}, ` +
          `reference=${referencesFile}, flag=${hasFlagMention}, recommendation=${hasRecommendation}`
      );
    }
  }
  assert.deepEqual(
    missing,
    [],
    `\nMulti-agent assets missing mode selection wiring:\n${missing.join('\n')}\n\n` +
      `See ${REFERENCE_PATH} (single source).`
  );
});

test('reference lists all applied assets', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, REFERENCE_PATH), 'utf8');
  // Reference's "적용 자산" section must list the assets
  const expectedNames = ['cfh-harness', 'cfh-review'];
  for (const name of expectedNames) {
    assert.ok(
      body.includes(name),
      `Reference must list asset "${name}" in 적용 자산 table.`
    );
  }
});
