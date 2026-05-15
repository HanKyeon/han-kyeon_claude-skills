'use strict';

// Contract test — PLAN § 7.8.3 (Track 7 0.16.3).
// Detects regressions of the 7.5 fix (a11y default → alternatives).
// If a new meta-asset PR reintroduces the FE-implicit "보안·성능·a11y·타입·도메인"
// default, this test fails — permanent lint gate.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Exact phrase that signals the pre-7.5 default (FE assumption baked in).
// Allowed alternatives (post-7.5): "보안·성능·접근성(a11y) / 일관성 / ..." etc.
const FORBIDDEN_DEFAULT = '보안·성능·a11y·타입·도메인';

// Files where the FE-implicit default historically appeared.
// Other usages of "a11y" alone are fine — we only ban this specific 5-axis tuple.
const META_ASSET_FILES = [
  'skills/asset-factory/SKILL.md',
  'skills/cfh-harness/SKILL.md',
  'commands/cfh-team.md',
  'commands/cfh-make.md',
  'commands/cfh-new.md',
  'skills/asset-factory/references/classification-tree.md',
  'skills/asset-factory/references/delegation-map.md',
  'commands/references/recommendation-pattern.md',
];

test('meta assets do not bake in the FE-implicit a11y default tuple', () => {
  const offenders = [];
  for (const rel of META_ASSET_FILES) {
    const abs = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const body = fs.readFileSync(abs, 'utf8');
    if (body.includes(FORBIDDEN_DEFAULT)) {
      offenders.push(rel);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `\nMeta-asset files reintroduced the pre-7.5 FE-implicit default "${FORBIDDEN_DEFAULT}":\n` +
      offenders.map((f) => `  - ${f}`).join('\n') +
      `\n\nFix: replace with alternatives (FE: a11y·타입·UX / BE: consistency·idempotency·latency / ML: fairness·robustness).` +
      `\nSee PLAN.md § 7.5.`
  );
});

test('meta assets include at least one non-FE axis alternative (post-7.5 marker)', () => {
  // Loose positive check: at least one of the alternatives words should appear
  // somewhere in the meta-asset corpus so the 7.5 framing stays visible.
  const ALTERNATIVES = ['consistency', 'idempotency', 'fairness', 'robustness'];
  const corpus = META_ASSET_FILES
    .map((rel) => {
      const abs = path.join(REPO_ROOT, rel);
      return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
    })
    .join('\n');
  const found = ALTERNATIVES.filter((w) => corpus.toLowerCase().includes(w));
  assert.ok(
    found.length > 0,
    `\nNo non-FE axis alternative found in meta-asset corpus. ` +
      `Expected at least one of: ${ALTERNATIVES.join(', ')}. ` +
      `\nSee PLAN.md § 7.5.`
  );
});
