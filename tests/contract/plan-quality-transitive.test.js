'use strict';

// Contract test — cfh-plan 코드 품질 측정이 두 경로 모두에서 닿는지 (0.28.1).
// 경로1 위임(전이): cfh-plan → 위임 대상이 품질 기준을 실음.
// 경로2 직접 실행: cfh-plan 직접 실행 자가 점검이 crosscheck·test-quality에 연결.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

// 경로1 — 위임 전이: cfh-plan이 위임하는 자산들이 품질 기준을 실제로 싣는가.
test('전이: cfh-plan 위임 대상이 품질 기준을 싣는다', () => {
  const plan = read('commands/cfh-plan.md');
  // cfh-plan이 이 자산들로 위임함을 명시
  for (const target of ['/cfh-tdd', '/cfh-refactor', '/cfh-review']) {
    assert.ok(plan.includes(target), `cfh-plan must delegate to ${target}`);
  }
  // 각 위임 대상이 품질 기준을 실제로 보유 (전이 도달)
  assert.match(read('commands/cfh-refactor.md'), /structured-crosscheck|방향 제안|정량/,
    'cfh-refactor (delegation target) must carry quality criteria');
  assert.match(read('skills/tdd-first/SKILL.md'), /test-quality/,
    'cfh-tdd path (tdd-first) must carry test-quality');
  assert.match(read('commands/cfh-review.md'), /모델 차등|프로젝트 규칙/,
    'cfh-review (delegation target) must carry quality criteria');
});

// 경로2 — 직접 실행: cfh-plan 자체 자가 점검이 품질 도구에 연결.
test('직접 실행 경로 자가 점검이 crosscheck·test-quality에 연결', () => {
  const plan = read('commands/cfh-plan.md');
  // 직접 실행 자가 점검 블록 존재
  assert.match(plan, /직접 실행 시 자가 점검/, 'must have direct-exec self-check block');
  // 그 블록이 품질 도구를 가리킴
  assert.match(plan, /structured-crosscheck\.md/, 'direct-exec must wire structured-crosscheck');
  assert.match(plan, /test-quality\.md/, 'direct-exec must wire test-quality');
  // 위임 경로는 전이 적용임을 명시 (중복 출력 방지)
  assert.match(plan, /전이 적용|이미.*싣고/, 'must note delegation path applies criteria transitively');
});
