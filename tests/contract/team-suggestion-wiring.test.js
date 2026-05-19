'use strict';

// Contract test — Team Suggestion wiring (0.22.0).
// Verifies that assets reference commands/references/team-suggestion.md,
// include 3-stage signal definitions (weak/medium/strong) and the
// `why teams` lazy-load command. cfh-grill is the "B policy" full-default
// exception. Adversary pattern is wired into harness catalog.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// A. Fast assets — 3-stage hint + lazy load
const FAST_ASSETS = [
  { file: 'commands/cfh-debug.md', label: 'cfh-debug (Phase 3.5)' },
  { file: 'commands/cfh-tdd.md', label: 'cfh-tdd' },
  { file: 'commands/cfh-tdd-gen.md', label: 'cfh-tdd-gen' },
  { file: 'commands/cfh-refactor.md', label: 'cfh-refactor (Step 8)' },
  { file: 'commands/cfh-refactor-gen.md', label: 'cfh-refactor-gen (Step 8)' },
];

// B. Deep asset — full default
const DEEP_ASSETS = [
  { file: 'commands/cfh-grill.md', label: 'cfh-grill (Phase 3 종료)' },
];

const REFERENCE_PATH = 'commands/references/team-suggestion.md';
const ADVERSARY_PATH = 'skills/cfh-harness/references/patterns/adversary.md';
const HARNESS_PATH = 'skills/cfh-harness/SKILL.md';
const CFH_TEAM_PATH = 'commands/cfh-team.md';

test('team-suggestion reference exists with both A and B policies', () => {
  const abs = path.join(REPO_ROOT, REFERENCE_PATH);
  assert.ok(fs.existsSync(abs), `${REFERENCE_PATH} must exist (0.22.0)`);
  const body = fs.readFileSync(abs, 'utf8');

  // Spot-check required sections
  assert.match(body, /weak.*medium.*strong|3단계/i, 'must define 3-stage signals');
  assert.match(body, /why teams/, 'must document `why teams` lazy load');
  assert.match(body, /빠른 자산|fast assets/i, 'must describe policy A (fast assets)');
  assert.match(body, /깊이 자산|deep assets|예외/i, 'must describe policy B (deep exception)');
  assert.match(body, /자가검증|slot ≠ purpose/, 'must reference self-validation');
  assert.match(body, /본 워크플로 영향 없음|영향 0/, 'must declare no-impact on current workflow');
});

test('Adversary pattern (7th) exists with required sections', () => {
  const abs = path.join(REPO_ROOT, ADVERSARY_PATH);
  assert.ok(fs.existsSync(abs), `${ADVERSARY_PATH} must exist (0.22.0)`);
  const body = fs.readFileSync(abs, 'utf8');

  assert.match(body, /확증 편향|confirmation bias/i, 'must describe confirmation bias problem');
  assert.match(body, /Adversary.*Defender|반론.*옹호/, 'must define Adversary-Defender separation');
  assert.match(body, /bounded.*round|max-round/i, 'must document bounded round policy');
  assert.match(body, /debug|security audit|legal/i, 'must list typical use cases');
});

test('cfh-harness catalog includes 7 patterns with Adversary', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, HARNESS_PATH), 'utf8');
  const expected = [
    'Pipeline', 'Fan-out', 'Expert Pool', 'Producer-Reviewer',
    'Supervisor', 'Hierarchical', 'Adversary',
  ];
  for (const name of expected) {
    assert.ok(
      body.includes(name),
      `cfh-harness SKILL.md must list pattern "${name}"`
    );
  }
});

test('cfh-team includes Adversary row in pattern table', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, CFH_TEAM_PATH), 'utf8');
  assert.match(body, /\*\*Adversary\*\*/, 'cfh-team must list Adversary pattern with bold');
});

test('fast assets wire 3-stage hints + why teams + reference', () => {
  const missing = [];
  for (const { file, label } of FAST_ASSETS) {
    const abs = path.join(REPO_ROOT, file);
    assert.ok(fs.existsSync(abs), `${file} must exist`);
    const body = fs.readFileSync(abs, 'utf8');

    const referencesFile = body.includes('team-suggestion.md');
    const hasWhyTeams = /why teams/.test(body);
    // 3-stage signal definition can appear across multiple lines.
    // Accept if all three strength labels appear in the asset body OR
    // an explicit "신호 분류" / "신호 강도" / "signal strength" marker exists.
    const hasAllThreeStages =
      /\bstrong\b/i.test(body) &&
      /\bmedium\b/i.test(body) &&
      /\bweak\b/i.test(body);
    const hasSignalMarker = /신호 분류|신호 강도|signal strength|signal classification/i.test(body);
    const hasSignalDef = hasAllThreeStages || hasSignalMarker;
    const hasOptionalMarker = /\(옵션\).*team|Team Suggestion|Team 활용/.test(body);

    if (!referencesFile || !hasWhyTeams || !hasSignalDef || !hasOptionalMarker) {
      missing.push(
        `  - ${label} (${file}): ref=${referencesFile}, ` +
          `whyTeams=${hasWhyTeams}, signal=${hasSignalDef}, marker=${hasOptionalMarker}`
      );
    }
  }
  assert.deepEqual(
    missing,
    [],
    `\nFast assets missing team suggestion wiring:\n${missing.join('\n')}\n\n` +
      `See ${REFERENCE_PATH} § A.`
  );
});

test('deep assets (cfh-grill) wire full default + reference', () => {
  const missing = [];
  for (const { file, label } of DEEP_ASSETS) {
    const body = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');

    const referencesFile = body.includes('team-suggestion.md');
    const hasFullSection = /Team 활용 가치|Team Suggestion|full 제안|full default|💡 Team/.test(body);
    const hasOptIntoTeam = /\/cfh-team|\/cfh-make/.test(body);

    if (!referencesFile || !hasFullSection || !hasOptIntoTeam) {
      missing.push(
        `  - ${label} (${file}): ref=${referencesFile}, ` +
          `full=${hasFullSection}, optIn=${hasOptIntoTeam}`
      );
    }
  }
  assert.deepEqual(
    missing,
    [],
    `\nDeep assets missing full team suggestion wiring:\n${missing.join('\n')}\n\n` +
      `See ${REFERENCE_PATH} § B (exception policy).`
  );
});
