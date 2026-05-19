'use strict';

// Contract test — Final Intent Confirm wiring (0.20.0).
// Verifies that each carry-out asset wires the final-confirm pattern (Phase X
// 직전 단계) and references commands/references/final-confirm.md. This is a
// *document pattern* test — actual LLM behavior is validated externally.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Tier 1 + Tier 2 carry-out assets (0.20.0 first round).
const FINAL_CONFIRM_ASSETS = [
  // Tier 1
  { file: 'commands/cfh-plan.md', label: 'cfh-plan (Phase 2→3)' },
  { file: 'commands/cfh-grill.md', label: 'cfh-grill (Phase 3 종료 직전)' },
  // Tier 2
  { file: 'skills/tdd-first/SKILL.md', label: 'tdd-first (Phase 1→2)' },
  { file: 'skills/tdd-general/SKILL.md', label: 'tdd-general (Phase 1→2)' },
  { file: 'commands/cfh-tc.md', label: 'cfh-tc (Phase 2→3)' },
  { file: 'commands/cfh-tc-gen.md', label: 'cfh-tc-gen (Phase 2→3)' },
];

const REFERENCE_PATH = 'commands/references/final-confirm.md';

test('Final Intent Confirm reference exists with required sections', () => {
  const abs = path.join(REPO_ROOT, REFERENCE_PATH);
  assert.ok(fs.existsSync(abs), `${REFERENCE_PATH} must exist (0.20.0)`);
  const body = fs.readFileSync(abs, 'utf8');
  // Spot-check key sections of the reference
  assert.match(body, /최종 종합/, 'must describe purpose as 최종 종합');
  assert.match(body, /답변 종합|합산 대상/, 'must have 답변 종합 section');
  assert.match(body, /모호 발화/, 'must have 모호 발화 handling');
  assert.match(body, /답변 간 충돌|충돌·gap/, 'must check 답변 간 충돌·gap');
  assert.match(body, /yes.*정정.*처음부터|yes.*정정.*pass/, 'must document answer options');
  assert.match(body, /자가검증/, 'must reference 자가검증 spirit');
});

test('all Tier 1+2 carry-out assets wire Final Intent Confirm', () => {
  const missing = [];
  for (const { file, label } of FINAL_CONFIRM_ASSETS) {
    const abs = path.join(REPO_ROOT, file);
    assert.ok(fs.existsSync(abs), `${file} must exist`);
    const body = fs.readFileSync(abs, 'utf8');

    const hasFinalConfirmLabel = /Final Intent Confirm|최종.*Confirm|최종.*확인|최종 의도 해석/.test(body);
    const referencesFile = body.includes('final-confirm.md');
    const hasAnswerOptions = /(yes.*정정.*처음부터|yes.*정정.*pass|정정 <)/.test(body);

    if (!hasFinalConfirmLabel || !referencesFile || !hasAnswerOptions) {
      missing.push(
        `  - ${label} (${file}): label=${hasFinalConfirmLabel}, ` +
          `reference=${referencesFile}, answerOptions=${hasAnswerOptions}`
      );
    }
  }
  assert.deepEqual(
    missing,
    [],
    `\nCarry-out assets missing Final Intent Confirm wiring:\n${missing.join('\n')}\n\n` +
      `See ${REFERENCE_PATH} (single source).`
  );
});

test('Final Intent Confirm asset list is documented in reference', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, REFERENCE_PATH), 'utf8');
  // Reference must list all 6 carry-out assets in its "적용 자산" section.
  // For skills/<name>/SKILL.md, use the parent directory name as asset name.
  // For commands/<name>.md, use the file basename.
  for (const { file } of FINAL_CONFIRM_ASSETS) {
    const m = file.match(/^skills\/([^/]+)\/SKILL\.md$/);
    const assetName = m ? m[1] : path.basename(file, '.md');
    const found = body.includes(assetName);
    assert.ok(
      found,
      `Reference must list asset "${assetName}" in 적용 자산 table (got missing).`
    );
  }
});
