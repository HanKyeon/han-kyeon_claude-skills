'use strict';

// Contract test — Structured Data Cross-check wiring (0.26.0).
// Verifies the single-source reference exists with required sections, and that
// cfh-plan / cfh-refactor / cfh-refactor-gen / cfh-grill wire it.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REF_PATH = 'commands/references/structured-crosscheck.md';

const WIRED_ASSETS = [
  'commands/cfh-plan.md',
  'commands/cfh-refactor.md',
  'commands/cfh-refactor-gen.md',
  'commands/cfh-grill.md',
];

test('structured-crosscheck reference exists with required sections', () => {
  const abs = path.join(REPO_ROOT, REF_PATH);
  assert.ok(fs.existsSync(abs), `${REF_PATH} must exist (0.26.0)`);
  const body = fs.readFileSync(abs, 'utf8');

  // 3-step flow
  assert.match(body, /LLM 추론/, 'must describe step ① LLM 추론');
  assert.match(body, /기계 추출|Grep/, 'must describe step ② 기계 추출 (Grep)');
  assert.match(body, /크로스체크/, 'must describe step ③ 크로스체크');

  // severity branching (false-positive avoidance)
  assert.match(body, /severity|high|medium|low/i, 'must define severity branching');
  assert.match(body, /\[verified\]/, 'must promote to [verified]');

  // structured data is optional ("있으면 활용")
  assert.match(body, /있으면/, 'must state structured data is optional (있으면 활용)');
  assert.match(body, /dependency-cruiser|madge|import graph|tsconfig/i, 'must list optional structured data sources');

  // limits MUST be stated (over-confidence guard)
  assert.match(body, /한계/, 'must have a 한계 (limits) section');
  assert.match(body, /동적 import|리플렉션|정적/, 'must warn grep is static (misses dynamic)');
  assert.match(body, /완결성 보장|참고용/, 'must state "not completeness guarantee / 참고용"');

  // self-validation (slot != purpose)
  assert.match(body, /slot ≠ purpose|생략|침묵/, 'must allow skipping when no grep target');
});

test('crosscheck is wired into plan/refactor/refactor-gen/grill', () => {
  const missing = [];
  for (const file of WIRED_ASSETS) {
    const abs = path.join(REPO_ROOT, file);
    assert.ok(fs.existsSync(abs), `${file} must exist`);
    const body = fs.readFileSync(abs, 'utf8');

    const refsFile = body.includes('structured-crosscheck.md');
    const hasCrosscheck = /정형 데이터 크로스체크|크로스체크/.test(body);
    const hasGrep = /[Gg]rep/.test(body);
    const hasLimit = /한계|정적|참고용/.test(body);

    if (!refsFile || !hasCrosscheck || !hasGrep || !hasLimit) {
      missing.push(
        `  - ${file}: ref=${refsFile}, crosscheck=${hasCrosscheck}, grep=${hasGrep}, limit=${hasLimit}`
      );
    }
  }
  assert.deepEqual(
    missing,
    [],
    `\nAssets missing structured-crosscheck wiring:\n${missing.join('\n')}\n\nSee ${REF_PATH}.`
  );
});

test('reference lists its applied assets', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, REF_PATH), 'utf8');
  for (const name of ['cfh-plan', 'cfh-refactor', 'cfh-grill']) {
    assert.ok(body.includes(name), `Reference must list applied asset "${name}"`);
  }
});

// 0.26.0 — sdk-ai-workflow 도입: 2순위 모델 차등.
// (3순위 non-Breaking은 cfh 기본 정신·기존 자산과 중복이라 철회·제거함.)

test('cfh-review documents model tiering as recommendation (not forced)', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, 'commands/cfh-review.md'), 'utf8');
  assert.match(body, /모델 차등|모델 tier/i, 'must document model tiering');
  assert.match(body, /권장/, 'must frame as 권장 (recommendation)');
  assert.match(body, /강제 못|강제 아님|한계|과대평가/, 'must state it is not forced (env-dependent)');
});
