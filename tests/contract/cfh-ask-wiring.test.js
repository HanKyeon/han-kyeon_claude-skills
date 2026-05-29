'use strict';

// Contract test — cfh-ask experimental command (0.24.0).
// Light sanity wiring only (experimental asset, may be removed after evaluation):
// verifies it uses AskUserQuestion for answer collection, keeps explanation in
// text (recommendation-pattern), enforces the ≤4-option guard, and has a
// text fallback for subagent/no-tool environments.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ASK_PATH = path.join(REPO_ROOT, 'commands', 'cfh-ask.md');

test('cfh-ask exists and is marked experimental', () => {
  assert.ok(fs.existsSync(ASK_PATH), 'commands/cfh-ask.md must exist');
  const body = fs.readFileSync(ASK_PATH, 'utf8');
  assert.match(body, /experimental/i, 'must be flagged experimental (removal candidate)');
});

test('cfh-ask collects answers via AskUserQuestion but keeps explanation in text', () => {
  const body = fs.readFileSync(ASK_PATH, 'utf8');
  // Answer collection via the built-in tool
  assert.match(body, /AskUserQuestion/, 'must invoke AskUserQuestion for selection');
  // Explanation stays in text — reuses recommendation-pattern (no compression)
  assert.ok(
    body.includes('recommendation-pattern.md'),
    'must reference recommendation-pattern (full text explanation, not compressed)'
  );
  assert.match(body, /압축 금지|압축하지 않음/, 'must forbid compressing rationale into tool description');
});

test('cfh-ask enforces ≤4-option guard and text fallback', () => {
  const body = fs.readFileSync(ASK_PATH, 'utf8');
  // ≤4 option guard (AskUserQuestion hard cap)
  assert.match(body, /2~4|≤ ?4|4개/, 'must state the 2-4 option constraint');
  assert.match(body, /5개 이상|5개\+|초과/, 'must redirect when options exceed the cap');
  // Fallback for subagent / no-tool environments
  assert.match(body, /[Ff]allback/, 'must define a fallback path');
  assert.match(body, /서브에이전트|subagent/i, 'must note AskUserQuestion is unavailable in subagents');
});

test('cfh-ask handles mid-workflow invocation conditionally (no false return on standalone)', () => {
  const body = fs.readFileSync(ASK_PATH, 'utf8');
  // Mid-workflow return path exists
  assert.match(body, /워크플로 중간 호출/, 'must handle mid-workflow invocation');
  assert.match(body, /↩|복귀/, 'must define a return-to-workflow path');
  // Shared-context (no separate plumbing) is stated
  assert.match(body, /컨텍스트.*공유|공유.*컨텍스트|수집·전달 배관 없음|별도 "?수집/, 'must state shared-context (no separate transfer plumbing)');
  // Conditional: standalone must NOT emit a return message
  assert.match(body, /독립 호출/, 'must distinguish standalone invocation');
  assert.match(body, /강제하지 말|금지|skip/i, 'standalone must not emit false return guidance');
});
