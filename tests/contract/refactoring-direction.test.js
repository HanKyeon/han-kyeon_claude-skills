'use strict';

// Contract test — refactoring-strategy 방향 제안 (대안 탐색 + 정량 비교 + 트레이드오프).
// Applied to cfh-refactor / cfh-refactor-gen via the shared refactoring-strategy skill.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILL = path.join(REPO_ROOT, 'skills', 'refactoring-strategy', 'SKILL.md');

test('refactoring-strategy has 방향 제안 (대안 탐색)', () => {
  const body = fs.readFileSync(SKILL, 'utf8');
  assert.match(body, /방향 제안|대안 탐색/, 'must have direction-proposal / alternative-exploration section');
  assert.match(body, /답습/, 'must say "검토 before 답습 (do not blindly follow current structure)"');
  assert.match(body, /의도적 선택/, 'must respect intentional existing choices');
  assert.match(body, /행동 보존|기능 변경이 아니/, 'must preserve behavior (approach alternative, not feature change)');
});

test('공통 정량 카탈로그 — 스택 무관 6지표 (번들·성능은 제외=스택별)', () => {
  const body = fs.readFileSync(SKILL, 'utf8');
  // 공통(stack-neutral) metrics in the skill
  assert.match(body, /영향 범위/, 'impact scope');
  assert.match(body, /복잡도/, 'complexity');
  assert.match(body, /중복 제거/, 'duplication (the key refactor motive)');
  assert.match(body, /결합도|의존 방향/, 'coupling / dependency direction');
  assert.match(body, /테스트/, 'test count');
  // 타입 안전성: 공통 개념이되 표현은 언어 일반화 (TS 전용 X)
  assert.match(body, /타입 안전성/, 'type safety (concept)');
  assert.match(body, /escape hatch|언어별|정적 타입 언어/, 'type safety generalized beyond TS');
  // 번들·성능은 스택별로 분리됨 → 공통 SKILL은 포인터만
  assert.match(body, /스택별 지표|cfh-refactor.*FE|cfh-refactor-gen.*BE/, 'stack-specific metrics pointed to FE/BE commands');
});

test('스택별 정량 — FE는 cfh-refactor, BE는 cfh-refactor-gen', () => {
  const fe = fs.readFileSync(path.join(REPO_ROOT, 'commands/cfh-refactor.md'), 'utf8');
  const be = fs.readFileSync(path.join(REPO_ROOT, 'commands/cfh-refactor-gen.md'), 'utf8');
  // FE: 번들·리렌더·tsc
  assert.match(fe, /번들|INP|CLS|리렌더|tsc/, 'cfh-refactor must carry FE metrics (bundle/INP/리렌더/tsc)');
  // BE: p95·throughput·mypy/go/rust
  assert.match(be, /p95|throughput|N\+1|mypy|clippy|go vet/, 'cfh-refactor-gen must carry BE metrics (latency/throughput/mypy etc)');
});

test('ceremony 방지 — 조건부 + 추정/실측 마커', () => {
  const body = fs.readFileSync(SKILL, 'utf8');
  assert.match(body, /조건부|해당하는 지표만|해당 시만/, 'conditional — pick only relevant metrics');
  assert.match(body, /slot ≠ purpose|생략/, 'skip when irrelevant (slot != purpose)');
  assert.match(body, /\[verified\][\s\S]*\[guessed\]|\[guessed\][\s\S]*추정/, 'measured=[verified] else [guessed] estimate');
});

test('트레이드오프 + 현행 유지 동등 선택지', () => {
  const body = fs.readFileSync(SKILL, 'utf8');
  assert.match(body, /트레이드오프/, 'must state trade-off (gain vs give up)');
  assert.match(body, /현행 유지.*동등|동등.*선택지/, 'must offer "keep as-is" as an equal option');
  assert.match(body, /최종 선택은 사용자|선택은 사용자/, 'final choice is the user\'s');
  assert.match(body, /버그·보안|보안 결함|룰 위반/, 'exception: bugs/security/rule-violations fixed without comparison');
});
