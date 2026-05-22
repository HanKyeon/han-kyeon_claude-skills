'use strict';

// Contract test — PROGRESS.md audit wiring (0.23.0).
// Verifies that the audit reference defines 6 axes + side-effect Adversary
// policy, cfh-progress-audit implements 2-tier flow with bounded round +
// [guessed] marker policy, and cfh-progress wires the conditional hint.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const REFERENCE_PATH = 'commands/references/progress-audit.md';
const AUDIT_CMD_PATH = 'commands/cfh-progress-audit.md';
const PROGRESS_CMD_PATH = 'commands/cfh-progress.md';

test('progress-audit reference defines 6 axes + side-effect Adversary policy', () => {
  const abs = path.join(REPO_ROOT, REFERENCE_PATH);
  assert.ok(fs.existsSync(abs), `${REFERENCE_PATH} must exist (0.23.0)`);
  const body = fs.readFileSync(abs, 'utf8');

  // 6 axes labels
  const expectedAxes = [
    /자기 충족성|self-sufficiency/i,
    /결정 근거|decision rationale/i,
    /다음 단계 명확성|next-step clarity/i,
    /미해결 추적|unresolved tracking/i,
    /모호 발화|ambiguous wording/i,
    /side-effect|side effect|외부 영역 영향/i,
  ];
  for (const re of expectedAxes) {
    assert.match(body, re, `Reference must define axis matching ${re}`);
  }

  // Adversary + Defender + bounded round
  assert.match(body, /Adversary/, 'must reference Adversary pattern');
  assert.match(body, /Defender/, 'must reference Defender inverse persona');
  assert.match(body, /bounded.*round|max.*round/i, 'must document bounded round policy');
  assert.match(body, /\[guessed\]/, 'must enforce [guessed] marker for side-effect');
  assert.match(body, /\[verified\]/, 'must document [verified] tier');
  assert.match(body, /\[inferred\]/, 'must document [inferred] tier');

  // side-effect 영역 카탈로그 (7 영역)
  const sideEffectAreas = [
    /다른 결정/, /다른 자산/, /인터페이스|계약/,
    /컨벤션|정책/, /의존성/, /migration|schema/, /환경|설정/,
  ];
  for (const re of sideEffectAreas) {
    assert.match(body, re, `Side-effect catalog must cover ${re}`);
  }

  // 안내 정책 — 3-stage signal
  const hasAllThreeStages =
    /\bstrong\b/i.test(body) && /\bmedium\b/i.test(body) && /\bweak\b/i.test(body);
  assert.ok(hasAllThreeStages, 'must define weak/medium/strong signal classification');
});

test('cfh-progress-audit implements 2-tier flow', () => {
  const abs = path.join(REPO_ROOT, AUDIT_CMD_PATH);
  assert.ok(fs.existsSync(abs), `${AUDIT_CMD_PATH} must exist`);
  const body = fs.readFileSync(abs, 'utf8');

  // Phase markers
  assert.match(body, /Phase 0|사전 검사/, 'must have Phase 0 pre-check');
  assert.match(body, /Phase 1.*Tier 1|Tier 1.*체크리스트/, 'must have Phase 1 Tier 1 checklist');
  assert.match(body, /Phase 2.*Tier 2|Tier 2.*Adversary/, 'must have Phase 2 Tier 2 Adversary');

  // Wiring
  assert.ok(body.includes('progress-audit.md'), 'must reference progress-audit.md');
  assert.ok(body.includes('adversary.md') || body.includes('Adversary'), 'must reference Adversary pattern');
  assert.match(body, /bounded.*round|max.*round|max 2 round/i, 'must enforce bounded round');
  assert.match(body, /\[guessed\]/, 'must require [guessed] marker');

  // Mode arguments
  assert.match(body, /tier1|tier2|full/, 'must document tier1/tier2/full modes');

  // PROGRESS.md 수정 금지 (사용자 yes 후만)
  assert.match(body, /수정.*금지|직접 수정 X|명시 yes/i, 'must declare no direct modification before user yes');

  // Answer options after Tier 1 + Tier 2
  assert.match(body, /yes.*Tier 2|Tier 2.*진행/, 'must offer Tier 2 opt-in');
  assert.match(body, /yes.*갱신|갱신 적용|갱신 권장/, 'must offer update opt-in');
});

test('cfh-progress wires conditional audit hint', () => {
  const abs = path.join(REPO_ROOT, PROGRESS_CMD_PATH);
  const body = fs.readFileSync(abs, 'utf8');

  // Reference link
  assert.ok(body.includes('progress-audit.md'), 'must reference progress-audit.md');

  // 3-stage signal classification
  const hasAllThreeStages =
    /\bstrong\b/i.test(body) && /\bmedium\b/i.test(body) && /\bweak\b/i.test(body);
  assert.ok(hasAllThreeStages, 'must define weak/medium/strong signal classification');

  // Audit command pointer
  assert.match(body, /\/cfh-progress-audit/, 'must point to /cfh-progress-audit');

  // Conditional (옵션) / 조건부 marker
  assert.match(body, /\(옵션\)|조건부/, 'must mark hint as optional');

  // Self-validation
  assert.match(body, /자가검증|slot ≠ purpose/, 'must reference self-validation policy');
});

test('reference lists adversary pattern + related references', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, REFERENCE_PATH), 'utf8');
  const relatedRefs = [
    'final-confirm.md',
    'confidence-tagging.md',
    'team-suggestion.md',
    'adversary.md',
  ];
  for (const ref of relatedRefs) {
    assert.ok(body.includes(ref), `Reference must mention related ${ref}`);
  }
});
