'use strict';

// Contract test — confidence 마커 신호등 emoji 병기 컨벤션.
// 형식: emoji + 공백 + bracket tag (🟢 [verified] / 🟡 [inferred] / 🔴 [guessed]).
// bracket 토큰이 기계 기준(doctor·test)이므로 병기 후에도 [verified] 텍스트는 보존된다.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

test('단일 출처(confidence-tagging.md)가 신호등 병기 규칙을 정의', () => {
  const body = read('commands/references/confidence-tagging.md');
  // 세트 + 공백 형식
  assert.ok(body.includes('🟢 [verified]'), 'green + space + verified');
  assert.ok(body.includes('🟡 [inferred]'), 'yellow + space + inferred');
  assert.ok(body.includes('🔴 [guessed]'), 'red + space + guessed');
  assert.match(body, /공백 하나/, 'space-between rule stated');
  // 경계 규칙
  assert.match(body, /prose.*병기 안 함|백틱.*병기 안 함/, 'no pairing in prose/backtick mentions');
  assert.match(body, /bracket이 기준|\[verified\].*검사/, 'machine token stays bracket-based');
  assert.match(body, /전용 예약|재사용 금지/, 'traffic light reserved for confidence only');
});

test('출력 템플릿들이 병기 형식을 사용 (대표 4곳)', () => {
  for (const [file, why] of [
    ['commands/references/recommendation-pattern.md', '추천+이유 카드'],
    ['commands/cfh-plan.md', 'Q5·접근법 카드'],
    ['skills/tdd-first/SKILL.md', 'fast-path 초안 카드'],
    ['commands/references/structured-crosscheck.md', '크로스체크 출력'],
  ]) {
    const body = read(file);
    assert.ok(/🟢 \[verified|🟡 \[inferred|🔴 \[guessed/u.test(body), `${file} (${why}) must use paired markers`);
  }
});

test('기계 토큰 보존 — 병기 후에도 bracket 마커가 doctor 패턴에 걸린다', () => {
  // lib/doctor.js의 검사 패턴: /\[verified\]|\[inferred\]|\[guessed\]/
  const docPattern = /\[verified\]|\[inferred\]|\[guessed\]/;
  for (const file of ['commands/references/confidence-tagging.md', 'commands/cfh-plan.md']) {
    assert.ok(docPattern.test(read(file)), `${file}: bracket token must survive pairing`);
  }
});
