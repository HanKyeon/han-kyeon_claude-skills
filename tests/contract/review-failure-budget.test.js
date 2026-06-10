'use strict';

// Contract test — cfh-review 실패 예산 (asset-reviewer 패턴 이관).
// ① finding 인용 검증 ② 실행 실패 가시화 ③ 반복 지적 에스컬레이션 — 전부 bounded + 투명 보고.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const body = () =>
  fs.readFileSync(path.join(REPO_ROOT, 'commands', 'cfh-review.md'), 'utf8');

test('① finding 인용 검증 — Read 대조 + 1회 재시도 + 폐기 투명 보고', () => {
  const b = body();
  assert.match(b, /실패 예산|Failure Budget/, 'failure-budget section exists');
  assert.match(b, /file:line 인용을 Read로|인용을 Read로 실제 코드와 대조/, 'citations verified against real code via Read');
  assert.match(b, /1회 재시도/, 'bounded: exactly one retry');
  assert.match(b, /finding 폐기/, 'unverifiable findings are discarded');
  assert.match(b, /검증 실패로 제외/, 'discards are reported in REVIEW.md (transparency)');
});

test('② 서브에이전트 실행 실패 — 재시도 후 커버리지 구멍 가시화', () => {
  const b = body();
  assert.match(b, /리뷰되지 않음/, 'unreviewed axis is named in REVIEW.md');
  assert.match(b, /조용한 누락 금지/, 'silent omission forbidden');
  assert.match(b, /다른 축 결과의 재해석으로 채우지 말/, 'no faking coverage from other axes');
});

test('retro 환류: 서브에이전트는 REVIEW.md 직접 write 금지 (5/8 덮어쓰기 사고)', () => {
  const b = body();
  assert.match(b, /REVIEW\.md를 절대 직접 write|직접 write\/edit하지 말 것/, 'subagents must not write REVIEW.md');
  assert.match(b, /응답 텍스트로만 반환/, 'results returned as response text only');
  assert.match(b, /오케스트레이터가.*단독 수행|Step 5에서 단독/, 'orchestrator alone writes the file');
});

test('반복 지적 추적은 도입하지 않음 — run 간 상태 금지 (일회성 리포트 정책)', () => {
  const b = body();
  // 철회 근거: 반복 지적은 정직한 출력이고, run 사이 수렴 판단은 사람의 몫.
  // REVIEW.md는 재생성 리포트 — 직전 내용을 읽어 기억하는 건 뒷문 상태 유입.
  assert.match(b, /반복 지적.*추적은.*하지 않|반복 지적.*하지 않는다/, 'explicitly states no repeat-tracking');
  assert.match(b, /run 간 상태 없음|일회성 재생성/, 'one-shot regenerable report — no cross-run state');
  assert.ok(!b.includes('🔁'), 'no repeat-marker machinery');
});
