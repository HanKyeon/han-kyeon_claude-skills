'use strict';

// Contract test — FEEDBACK.md §2·§3 도입분 (0.29.0).
// §2 Draft-and-Confirm fast path: 빈 질문 대신 채워진 초안 제시, 신호 약하면 순차 인터뷰로.
// §3 의도 영속화: opt-in(명시 yes)일 때만 테스트 헤더 JSDoc, 소비자는 "있으면 활용".

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

test('tdd-first has Draft-and-Confirm fast path with safety conditions', () => {
  const body = read('skills/tdd-first/SKILL.md');
  assert.match(body, /Draft-and-Confirm|초안/, 'must have draft-and-confirm fast path');
  // safety: only when signal is sufficient — guessed-majority must fall back
  assert.match(body, /과반.*\[verified\]\/\[inferred\]|과반이.*verified/, 'fast path requires verified/inferred majority');
  assert.match(body, /\[guessed\].*순차|순차 인터뷰로/, 'guessed-majority falls back to sequential interview');
  // double-confirm prevention: draft card replaces Phase 1.5
  assert.match(body, /별도 출력하지 않|겸함|겸임/, 'draft yes must skip separate Phase 1.5 (no double confirm)');
  // escalation path exists
  assert.match(body, /전체 인터뷰|escalation/, 'user can escalate to full interview');
});

test('tdd-general inherits fast path explicitly', () => {
  const body = read('skills/tdd-general/SKILL.md');
  assert.match(body, /Draft-and-Confirm|채워진 초안/, 'tdd-general must state fast path inheritance');
});

test('intent header is written by default into the test file (no separate file)', () => {
  const body = read('skills/tdd-first/SKILL.md');
  // 사용자 결정: 작성 중인 테스트 파일의 일부이므로 질문 없이 기본 포함
  assert.match(body, /의도 헤더 기본 포함/, 'intent header is default at Phase 3 (no asking)');
  assert.match(body, /@intent/, 'structured tags (@intent/@happy/...)');
  assert.match(body, /JSDoc/, 'uses test-file header JSDoc (FE)');
  // 기본 위치는 테스트 파일 헤더 (별도 파일 여부는 사용자 재량 — 금지문 두지 않음)
  assert.match(body, /테스트 파일 상단/, 'default location is the test file header');
  // header sync at Phase 5
  assert.match(body, /의도 헤더.*일치하는지|헤더 갱신/, 'Phase 5 must sync header with final intent');
  // consumers remain optional
  assert.match(body, /없어도.*정상 동작|있으면.*읽는다/, 'consumers read only when present');
});

test('FE-side consumers read intent JSDoc only when present (있으면 활용)', () => {
  // 사용자 결정: JSDoc은 FE 친화 컨벤션 → FE 측 자산에만 (cfh-tc-gen 제외)
  const consumers = [
    'commands/cfh-review.md',
    'commands/cfh-refactor.md',
    'commands/cfh-tc.md',
  ];
  const missing = [];
  for (const file of consumers) {
    const body = read(file);
    const hasIntent = /의도 JSDoc/.test(body);
    const conditional = /있으면/.test(body);
    if (!hasIntent || !conditional) missing.push(`  - ${file}: intent=${hasIntent}, conditional=${conditional}`);
  }
  assert.deepEqual(missing, [], `\nFE consumers missing conditional intent-JSDoc wiring:\n${missing.join('\n')}`);
});

test('non-FE side uses 스택 관용 주석, not JSDoc (domain-leak guard)', () => {
  // 사용자 결정: non-FE도 의도 영속화는 동일하되 형식만 스택 관용 주석으로
  const tcGen = read('commands/cfh-tc-gen.md');
  assert.match(tcGen, /의도 주석/, 'cfh-tc-gen must read 의도 주석 (stack-idiomatic)');
  assert.ok(!/의도 JSDoc/.test(tcGen), 'cfh-tc-gen must NOT use JSDoc terminology (JS-only convention)');

  const refactorGen = read('commands/cfh-refactor-gen.md');
  assert.match(refactorGen, /의도 주석/, 'cfh-refactor-gen must read 의도 주석 as 보존할 행동 source');
  assert.ok(!/의도 JSDoc/.test(refactorGen), 'cfh-refactor-gen must NOT use JSDoc terminology');

  const general = read('skills/tdd-general/SKILL.md');
  assert.match(general, /의도 헤더/, 'tdd-general must include the intent header too (default)');
  assert.match(general, /기본 포함/, 'default — no asking');
  assert.match(general, /docstring|관용 주석|doc comment/, 'tdd-general format must be stack-idiomatic (docstring/doc comment)');
  assert.match(general, /JSDoc 대신|JS 컨벤션/, 'tdd-general must state why not JSDoc');
});
