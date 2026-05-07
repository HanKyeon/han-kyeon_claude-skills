'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { aggregateSession, aggregateAll, inputSignature } = require('../lib/sentry');

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-sentry-test-'));
}

function writeJsonl(filePath, records) {
  fs.writeFileSync(filePath, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

function toolUseTurn(toolUses) {
  return {
    type: 'assistant',
    message: { content: toolUses.map((t, i) => ({ type: 'tool_use', id: t.id || `id-${i}`, name: t.name, input: t.input })) },
    timestamp: '2026-04-20T10:00:00Z',
  };
}

function toolResultTurn(results) {
  return {
    type: 'user',
    message: { content: results.map((r) => ({ type: 'tool_result', tool_use_id: r.tool_use_id, is_error: r.is_error || null, content: r.content || '' })) },
    timestamp: '2026-04-20T10:00:01Z',
  };
}

// --- aggregateSession ---

test('aggregateSession: counts tool calls and errors', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'session.jsonl');
  writeJsonl(file, [
    toolUseTurn([
      { id: 't1', name: 'Read', input: { file_path: '/foo' } },
      { id: 't2', name: 'Edit', input: { file_path: '/bar' } },
    ]),
    toolResultTurn([
      { tool_use_id: 't1', content: 'file contents here' },
      { tool_use_id: 't2', is_error: true, content: 'File has not been read yet' },
    ]),
  ]);

  const t = aggregateSession(file);
  assert.strictEqual(t.toolCalls, 2);
  assert.strictEqual(t.toolErrors, 1);
  assert.strictEqual(t.perTool['Edit'].errors, 1);
  assert.strictEqual(t.perTool['Read'].errors, 0);
  assert.strictEqual(t.errorSamples.length, 1);
  assert.strictEqual(t.errorSamples[0].tool, 'Edit');
});

test('aggregateSession: detects empty Read results', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'session.jsonl');
  writeJsonl(file, [
    toolUseTurn([{ id: 't1', name: 'Read', input: { file_path: '/empty' } }]),
    toolResultTurn([{ tool_use_id: 't1', content: '' }]),
  ]);

  const t = aggregateSession(file);
  assert.strictEqual(t.toolEmpty, 1);
  assert.strictEqual(t.perTool['Read'].empty, 1);
});

test('aggregateSession: detects repeated identical tool calls', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'session.jsonl');
  // 3 identical Edit calls in a row
  writeJsonl(file, [
    toolUseTurn([{ id: 't1', name: 'Edit', input: { file_path: '/x', old: 'a', new: 'b' } }]),
    toolResultTurn([{ tool_use_id: 't1', content: 'ok' }]),
    toolUseTurn([{ id: 't2', name: 'Edit', input: { file_path: '/x', old: 'a', new: 'b' } }]),
    toolResultTurn([{ tool_use_id: 't2', content: 'ok' }]),
    toolUseTurn([{ id: 't3', name: 'Edit', input: { file_path: '/x', old: 'a', new: 'b' } }]),
    toolResultTurn([{ tool_use_id: 't3', content: 'ok' }]),
  ]);

  const t = aggregateSession(file);
  // 2nd and 3rd are repeats of 1st → at least 2 repeats counted
  assert.ok(t.toolRepeated >= 2, `expected ≥2 repeats, got ${t.toolRepeated}`);
  assert.strictEqual(t.perTool['Edit'].calls, 3);
});

test('aggregateSession: different inputs not counted as repeats', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'session.jsonl');
  writeJsonl(file, [
    toolUseTurn([{ id: 't1', name: 'Read', input: { file_path: '/a' } }]),
    toolResultTurn([{ tool_use_id: 't1', content: 'x' }]),
    toolUseTurn([{ id: 't2', name: 'Read', input: { file_path: '/b' } }]),
    toolResultTurn([{ tool_use_id: 't2', content: 'x' }]),
  ]);

  const t = aggregateSession(file);
  assert.strictEqual(t.toolRepeated, 0);
});

test('aggregateSession: handles malformed lines gracefully', () => {
  const dir = mkTmpDir();
  const file = path.join(dir, 'session.jsonl');
  fs.writeFileSync(file, [
    JSON.stringify(toolUseTurn([{ id: 't1', name: 'Read', input: { f: '/x' } }])),
    'garbage line',
    '',
    JSON.stringify(toolResultTurn([{ tool_use_id: 't1', content: 'ok' }])),
  ].join('\n'));

  const t = aggregateSession(file);
  assert.strictEqual(t.toolCalls, 1);
});

// --- inputSignature ---

test('inputSignature: same keys same values → same sig', () => {
  const a = { file_path: '/x', old: 'a' };
  const b = { old: 'a', file_path: '/x' };
  assert.strictEqual(inputSignature(a), inputSignature(b));
});

test('inputSignature: different values → different sig', () => {
  const a = { file_path: '/x' };
  const b = { file_path: '/y' };
  assert.notStrictEqual(inputSignature(a), inputSignature(b));
});

test('inputSignature: long strings truncated for tolerance', () => {
  const a = { content: 'A'.repeat(300) + 'differ-end' };
  const b = { content: 'A'.repeat(300) + 'other-end' };
  // Truncated at 200 chars → both should look identical at signature level
  assert.strictEqual(inputSignature(a), inputSignature(b));
});

// --- aggregateAll ---

test('aggregateAll: combines sessions and per-tool', () => {
  const dir = mkTmpDir();
  const projects = path.join(dir, 'projects', 'proj-a');
  fs.mkdirSync(projects, { recursive: true });

  writeJsonl(path.join(projects, 's1.jsonl'), [
    toolUseTurn([{ id: 't1', name: 'Read', input: { f: '/x' } }]),
    toolResultTurn([{ tool_use_id: 't1', content: 'data' }]),
  ]);
  writeJsonl(path.join(projects, 's2.jsonl'), [
    toolUseTurn([{ id: 't2', name: 'Edit', input: { f: '/y' } }]),
    toolResultTurn([{ tool_use_id: 't2', is_error: true, content: 'err' }]),
  ]);

  const grand = aggregateAll({ claudeDir: dir });
  assert.strictEqual(grand.sessions.length, 2);
  assert.strictEqual(grand.toolCalls, 2);
  assert.strictEqual(grand.toolErrors, 1);
  assert.strictEqual(grand.perTool['Edit'].errors, 1);
});

test('aggregateAll: --days filter excludes old sessions', () => {
  const dir = mkTmpDir();
  const projects = path.join(dir, 'projects', 'proj-a');
  fs.mkdirSync(projects, { recursive: true });

  const recentFile = path.join(projects, 'recent.jsonl');
  const oldFile = path.join(projects, 'old.jsonl');
  writeJsonl(recentFile, [
    toolUseTurn([{ id: 't1', name: 'Read', input: { f: '/x' } }]),
    toolResultTurn([{ tool_use_id: 't1', content: 'x' }]),
  ]);
  writeJsonl(oldFile, [
    toolUseTurn([{ id: 't2', name: 'Edit', input: { f: '/y' } }]),
    toolResultTurn([{ tool_use_id: 't2', is_error: true, content: 'err' }]),
  ]);

  const longAgo = new Date(Date.now() - 100 * 86400 * 1000);
  fs.utimesSync(oldFile, longAgo, longAgo);

  const grand = aggregateAll({ claudeDir: dir, days: 7 });
  assert.strictEqual(grand.sessions.length, 1);
  assert.strictEqual(grand.toolErrors, 0, 'old error excluded');
});
