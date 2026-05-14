'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const HOOK_SCRIPT = path.join(__dirname, '..', 'scripts', 'cfh-sentry-hook.js');

function runHookWithFakeHome(eventJson) {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-sentry-hook-test-'));
  const result = spawnSync(process.execPath, [HOOK_SCRIPT], {
    input: JSON.stringify(eventJson),
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: fakeHome,
      USERPROFILE: fakeHome,
    },
  });
  return { fakeHome, result };
}

function runHookSeries(events) {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-sentry-hook-test-'));
  const stderrLines = [];
  for (const event of events) {
    const result = spawnSync(process.execPath, [HOOK_SCRIPT], {
      input: JSON.stringify(event),
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: fakeHome,
        USERPROFILE: fakeHome,
      },
    });
    // Always push (even empty) so indexes align with events
    stderrLines.push((result.stderr || '').trim());
  }
  return { fakeHome, stderrLines };
}

function loadFakeState(fakeHome) {
  const stateFile = path.join(fakeHome, '.claude', '.cfh-logs', 'sentry-state.json');
  if (!fs.existsSync(stateFile)) return null;
  return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
}

test('hook: writes state file on first event', () => {
  const event = {
    tool_name: 'Read',
    tool_input: { file_path: '/x' },
    tool_response: { content: 'ok' },
  };
  const { fakeHome, result } = runHookWithFakeHome(event);
  assert.strictEqual(result.status, 0);
  const state = loadFakeState(fakeHome);
  assert.ok(state, 'state file should be created');
  assert.strictEqual(state.recent.length, 1);
  assert.strictEqual(state.recent[0].tool, 'Read');
});

test('hook: does NOT warn on a single error', () => {
  const event = {
    tool_name: 'Edit',
    tool_input: { file_path: '/x' },
    tool_response: { is_error: true, content: 'fail' },
  };
  const { result } = runHookWithFakeHome(event);
  assert.strictEqual(result.stderr, '', 'no warning yet (need 3 consecutive)');
});

test('hook: warns after 3 consecutive errors', () => {
  const errEvent = {
    tool_name: 'Edit',
    tool_input: { file_path: '/x' },
    tool_response: { is_error: true, content: 'fail' },
  };
  const { stderrLines } = runHookSeries([errEvent, errEvent, errEvent]);
  // First 2 quiet, 3rd warns
  assert.strictEqual(stderrLines[0], '');
  assert.strictEqual(stderrLines[1], '');
  assert.match(stderrLines[2], /3회 연속 tool 에러/);
});

test('hook: warns on identical input loop', () => {
  // Same tool + same input 3 times (no errors, just loop)
  const okEvent = {
    tool_name: 'Bash',
    tool_input: { command: 'git status' },
    tool_response: { content: 'clean' },
  };
  const { stderrLines } = runHookSeries([okEvent, okEvent, okEvent]);
  assert.match(stderrLines[2], /동일 input 3회 반복/);
});

test('hook: different inputs reset the loop counter', () => {
  const a = { tool_name: 'Read', tool_input: { file_path: '/a' }, tool_response: { content: 'ok' } };
  const b = { tool_name: 'Read', tool_input: { file_path: '/b' }, tool_response: { content: 'ok' } };
  const { stderrLines, fakeHome } = runHookSeries([a, a, b, a]);
  // None should warn — sequence is a,a,b,a (no 3 in a row of same)
  for (const line of stderrLines) {
    assert.strictEqual(line, '', `expected silent, got: ${line}`);
  }
  const state = loadFakeState(fakeHome);
  assert.strictEqual(state.sameSigCount, 1, 'last signature was a, no consecutive run');
});

test('hook: empty Read x2 triggers warning', () => {
  const empty = {
    tool_name: 'Read',
    tool_input: { file_path: '/empty' },
    tool_response: { content: '' },
  };
  // Two identical empty reads — both empty AND same sig
  const { stderrLines } = runHookSeries([empty, empty]);
  // 2nd should warn (consecutiveEmptyReads=2)
  assert.match(stderrLines[1], /빈 Read|loop/);
});

test('hook: malformed input does not crash', () => {
  // Send garbage (not JSON)
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-sentry-hook-test-'));
  const result = spawnSync(process.execPath, [HOOK_SCRIPT], {
    input: 'not json',
    encoding: 'utf8',
    env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome },
  });
  assert.strictEqual(result.status, 0, 'must exit 0 to not block claude');
});

test('hook: error then success resets consecutive errors', () => {
  const err = { tool_name: 'Edit', tool_input: { f: '/x' }, tool_response: { is_error: true, content: 'fail' } };
  const ok = { tool_name: 'Read', tool_input: { f: '/y' }, tool_response: { content: 'ok' } };
  const { stderrLines, fakeHome } = runHookSeries([err, err, ok, err, err]);
  // No 3 consecutive errors → no warning for that pattern
  for (const line of stderrLines) {
    assert.ok(!/연속 tool 에러/.test(line), `should not warn consecutive errors, got: ${line}`);
  }
  const state = loadFakeState(fakeHome);
  assert.strictEqual(state.consecutiveErrors, 2, 'last 2 errors before reset');
});
