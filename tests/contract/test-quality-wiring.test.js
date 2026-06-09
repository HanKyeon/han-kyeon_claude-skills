'use strict';

// Contract test — Test Quality 원칙 (test-quality.md) wiring.
// Single source shared by tdd-first(FE) / tdd-general(BE) / cfh-tc / cfh-tc-gen.
// Role-split from anti-overfit-rules.md (which owns overfit defense).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REF = 'commands/references/test-quality.md';
const WIRED = [
  'skills/tdd-first/SKILL.md',
  'skills/tdd-general/SKILL.md',
  'commands/cfh-tc.md',
  'commands/cfh-tc-gen.md',
];

test('test-quality reference exists with the 6 principles', () => {
  const abs = path.join(REPO_ROOT, REF);
  assert.ok(fs.existsSync(abs), `${REF} must exist`);
  const body = fs.readFileSync(abs, 'utf8');
  // 3 gaps that cfh lacked
  assert.match(body, /피라미드/, 'pyramid — cheaper layer first');
  assert.match(body, /부작용 테스트/, 'side-effect tests (cleanup/race/unmount)');
  assert.match(body, /의도 명시|미커버 영역/, 'intent annotation / uncovered-area JSDoc');
  // 3 reinforced principles
  assert.match(body, /리트머스/, 'litmus — behavior-coupled, survives refactor');
  assert.match(body, /AAA|Arrange/, 'AAA structure');
  assert.match(body, /시간·랜덤·네트워크|시간.*고정/, 'freeze time/random/network');
});

test('test-quality has 생략 규칙 (skip requires a reason) + coverage as diagnostic', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, REF), 'utf8');
  // coverage = diagnostic (both 상한 and 하한)
  assert.match(body, /진단 도구/, 'coverage is a diagnostic tool, not a goal');
  assert.match(body, /상한/, 'upper bound — no trivial tests to pad %');
  assert.match(body, /하한|누락 신호/, 'lower bound — uncovered logic is a gap signal');
  // skip rule: not a default, needs a reason from the catalog
  assert.match(body, /생략.*기본값이 아니|기본값이 아니/, 'skipping is not the default');
  assert.match(body, /자명함/, 'skip reason: trivial');
  assert.match(body, /라이브러리.*보장|보장/, 'skip reason: library-guaranteed');
  assert.match(body, /더 싼 계층.*이미|이미.*검증/, 'skip reason: already covered at cheaper layer (not planned)');
  // behavior classification for gap visibility
  assert.match(body, /행동.*열거|행동 분류|테스트함.*생략|생략.*사유/, 'must classify changed behaviors as tested/skipped(reason)');
});

test('test-quality is role-split from anti-overfit (no duplication, points to it)', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, REF), 'utf8');
  assert.match(body, /anti-overfit-rules\.md/, 'must point to anti-overfit for overlap');
  assert.match(body, /역할 분리|겹치지 않는|오버핏.*별개|별개.*오버핏/, 'must state role-split from overfit defense');
});

test('test-quality is stack-aware (FE queries + BE neutral split)', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, REF), 'utf8');
  assert.match(body, /getByRole/, 'FE: query priority');
  assert.match(body, /userEvent/, 'FE: userEvent');
  assert.match(body, /N\/A|DOM 없|스택 무관/, 'BE: DOM N/A, stack-neutral core');
});

test('test-quality is wired into tdd-first/tdd-general/cfh-tc/cfh-tc-gen', () => {
  const missing = [];
  for (const file of WIRED) {
    const body = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
    if (!body.includes('test-quality.md')) missing.push(`  - ${file}`);
  }
  assert.deepEqual(missing, [], `\nAssets missing test-quality wiring:\n${missing.join('\n')}\n\nSee ${REF}.`);
});
