'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { aggregateSession, aggregateAll, listSessions } = require('../lib/cost');

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-cost-test-'));
}

function writeJsonl(filePath, records) {
  fs.writeFileSync(filePath, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

function userTurn(text) {
  return {
    type: 'user',
    message: { role: 'user', content: text },
    timestamp: '2026-04-20T10:00:00.000Z',
  };
}

function assistantTurn({ model, input = 0, output = 0, cacheCreate = 0, cacheRead = 0 }) {
  return {
    type: 'assistant',
    message: {
      role: 'assistant',
      model,
      content: [{ type: 'text', text: 'response' }],
      usage: {
        input_tokens: input,
        output_tokens: output,
        cache_creation_input_tokens: cacheCreate,
        cache_read_input_tokens: cacheRead,
      },
    },
    timestamp: '2026-04-20T10:00:01.000Z',
  };
}

test('aggregateSession: sums tokens across assistant turns', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'session1.jsonl');
  writeJsonl(file, [
    userTurn('hi'),
    assistantTurn({ model: 'claude-opus-4-7', input: 100, output: 50, cacheRead: 1000 }),
    userTurn('thanks'),
    assistantTurn({ model: 'claude-opus-4-7', input: 50, output: 200, cacheRead: 2000, cacheCreate: 500 }),
  ]);

  const t = aggregateSession(file);
  assert.strictEqual(t.inputTokens, 150);
  assert.strictEqual(t.outputTokens, 250);
  assert.strictEqual(t.cacheReadTokens, 3000);
  assert.strictEqual(t.cacheCreationTokens, 500);
  assert.strictEqual(t.assistantTurns, 2);
  assert.strictEqual(t.userTurns, 2);
});

test('aggregateSession: skips synthetic model turns', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'session2.jsonl');
  writeJsonl(file, [
    userTurn('hi'),
    assistantTurn({ model: '<synthetic>', input: 999, output: 999 }),
    assistantTurn({ model: 'claude-opus-4-7', input: 10, output: 5 }),
  ]);
  const t = aggregateSession(file);
  assert.strictEqual(t.inputTokens, 10);
  assert.strictEqual(t.outputTokens, 5);
  assert.strictEqual(t.assistantTurns, 1);
});

test('aggregateSession: attributes turns to most recent /cfh-* command', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'session3.jsonl');
  writeJsonl(file, [
    userTurn('/cfh-plan add coupon'),
    assistantTurn({ model: 'claude-opus-4-7', input: 100, output: 200 }),
    userTurn('continue'),
    assistantTurn({ model: 'claude-opus-4-7', input: 50, output: 100 }),
    userTurn('/cfh-review'),
    assistantTurn({ model: 'claude-opus-4-7', input: 80, output: 60 }),
  ]);
  const t = aggregateSession(file);
  assert.ok(t.byCommand['/cfh-plan'], 'should attribute to /cfh-plan');
  assert.strictEqual(t.byCommand['/cfh-plan'].inputTokens, 150);
  assert.strictEqual(t.byCommand['/cfh-plan'].outputTokens, 300);
  assert.strictEqual(t.byCommand['/cfh-plan'].turns, 2);
  assert.ok(t.byCommand['/cfh-review'], 'should attribute to /cfh-review');
  assert.strictEqual(t.byCommand['/cfh-review'].inputTokens, 80);
});

test('aggregateSession: handles malformed lines gracefully', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'session4.jsonl');
  fs.writeFileSync(
    file,
    [
      JSON.stringify(userTurn('hi')),
      'not-json-garbage',
      JSON.stringify(assistantTurn({ model: 'claude-opus-4-7', input: 5 })),
      '',
      JSON.stringify(assistantTurn({ model: 'claude-opus-4-7', input: 7 })),
    ].join('\n')
  );
  const t = aggregateSession(file);
  assert.strictEqual(t.inputTokens, 12);
  assert.strictEqual(t.assistantTurns, 2);
});

test('aggregateSession: tracks per-model breakdown', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'session5.jsonl');
  writeJsonl(file, [
    userTurn('hi'),
    assistantTurn({ model: 'claude-opus-4-7', input: 10 }),
    assistantTurn({ model: 'claude-haiku-4-5', input: 3 }),
    assistantTurn({ model: 'claude-opus-4-7', input: 20 }),
  ]);
  const t = aggregateSession(file);
  assert.strictEqual(t.models['claude-opus-4-7'].inputTokens, 30);
  assert.strictEqual(t.models['claude-opus-4-7'].turns, 2);
  assert.strictEqual(t.models['claude-haiku-4-5'].inputTokens, 3);
  assert.strictEqual(t.models['claude-haiku-4-5'].turns, 1);
});

test('listSessions: filters by project substring (case-insensitive)', () => {
  const dir = mkTmpDir();
  const projects = path.join(dir, 'projects');
  fs.mkdirSync(path.join(projects, 'C--hankyeon-foo'), { recursive: true });
  fs.mkdirSync(path.join(projects, 'C--other-bar'), { recursive: true });
  writeJsonl(path.join(projects, 'C--hankyeon-foo', 's1.jsonl'), [userTurn('hi')]);
  writeJsonl(path.join(projects, 'C--other-bar', 's2.jsonl'), [userTurn('hi')]);

  const all = listSessions(dir);
  assert.strictEqual(all.length, 2);

  const filtered = listSessions(dir, 'hankyeon');
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].project, 'C--hankyeon-foo');

  const upperCase = listSessions(dir, 'HANKYEON');
  assert.strictEqual(upperCase.length, 1, 'case-insensitive match');
});

test('aggregateAll: combines multiple sessions and tracks day buckets', () => {
  const dir = mkTmpDir();
  const projects = path.join(dir, 'projects');
  fs.mkdirSync(path.join(projects, 'proj-a'), { recursive: true });
  writeJsonl(path.join(projects, 'proj-a', 's1.jsonl'), [
    userTurn('/cfh-plan'),
    assistantTurn({ model: 'claude-opus-4-7', input: 100, output: 50 }),
  ]);
  writeJsonl(path.join(projects, 'proj-a', 's2.jsonl'), [
    userTurn('/cfh-tdd'),
    assistantTurn({ model: 'claude-opus-4-7', input: 200, output: 100 }),
  ]);

  const grand = aggregateAll({ claudeDir: dir });
  assert.strictEqual(grand.sessions.length, 2);
  assert.strictEqual(grand.inputTokens, 300);
  assert.strictEqual(grand.outputTokens, 150);
  assert.ok(grand.byCommand['/cfh-plan']);
  assert.ok(grand.byCommand['/cfh-tdd']);
  assert.strictEqual(grand.byCommand['/cfh-plan'].sessions, 1);
  assert.strictEqual(grand.byCommand['/cfh-tdd'].sessions, 1);
  assert.ok(grand.byDay['2026-04-20'], 'day bucket should exist');
});

test('aggregateAll: --days filter excludes old sessions', () => {
  const dir = mkTmpDir();
  const projects = path.join(dir, 'projects', 'proj-a');
  fs.mkdirSync(projects, { recursive: true });

  const recentFile = path.join(projects, 'recent.jsonl');
  const oldFile = path.join(projects, 'old.jsonl');
  writeJsonl(recentFile, [userTurn('hi'), assistantTurn({ model: 'claude-opus-4-7', input: 10 })]);
  writeJsonl(oldFile, [userTurn('hi'), assistantTurn({ model: 'claude-opus-4-7', input: 999 })]);

  // backdate the old file
  const longAgo = new Date(Date.now() - 100 * 86400 * 1000);
  fs.utimesSync(oldFile, longAgo, longAgo);

  const grand = aggregateAll({ claudeDir: dir, days: 7 });
  assert.strictEqual(grand.sessions.length, 1, 'old session filtered out');
  assert.strictEqual(grand.inputTokens, 10);
});
