'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const { compareSinceCommit, getCommitTimestamp } = require('../lib/cost');

function mkTmpClaude() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-cost-since-test-'));
}

function writeSession(claudeDir, project, sessionId, mtime, tokens = 100) {
  const projDir = path.join(claudeDir, 'projects', project);
  fs.mkdirSync(projDir, { recursive: true });
  const filePath = path.join(projDir, `${sessionId}.jsonl`);
  const content = [
    JSON.stringify({ type: 'user', message: { content: '/cfh-plan test' }, timestamp: mtime.toISOString() }),
    JSON.stringify({
      type: 'assistant',
      message: {
        model: 'claude-opus-4-7',
        content: [{ type: 'text', text: 'response' }],
        usage: { input_tokens: tokens, output_tokens: tokens / 2, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      },
      timestamp: mtime.toISOString(),
    }),
  ].join('\n');
  fs.writeFileSync(filePath, content);
  fs.utimesSync(filePath, mtime, mtime);
}

test('getCommitTimestamp: returns null for non-existent commit', () => {
  const ts = getCommitTimestamp('zzzzzzznotacommit');
  assert.strictEqual(ts, null);
});

test('compareSinceCommit: throws on invalid commit', () => {
  const claudeDir = mkTmpClaude();
  assert.throws(() =>
    compareSinceCommit({ claudeDir, sinceCommit: 'zzzzzzznotacommit' }),
    /not found/
  );
});

test('compareSinceCommit: splits sessions by commit timestamp', () => {
  // Create a real git repo so we can reference a real commit
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-cost-repo-'));
  execSync('git init -q', { cwd: repoDir });
  execSync('git config user.email "t@t"', { cwd: repoDir });
  execSync('git config user.name "t"', { cwd: repoDir });
  fs.writeFileSync(path.join(repoDir, 'a.txt'), 'first');
  execSync('git add . && git commit -q -m first', { cwd: repoDir });
  // Sleep 1.5 seconds to make sure commits have different timestamps
  const startTime = Date.now();
  while (Date.now() - startTime < 1500) {
    /* busy wait */
  }
  fs.writeFileSync(path.join(repoDir, 'b.txt'), 'second');
  execSync('git add . && git commit -q -m second', { cwd: repoDir });
  const secondHash = execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf8' }).trim();
  const secondTs = new Date(execSync(`git show -s --format=%cI ${secondHash}`, { cwd: repoDir, encoding: 'utf8' }).trim());

  // Create sessions before and after the second commit
  const claudeDir = mkTmpClaude();
  const beforeTs = new Date(secondTs.getTime() - 10000);
  const afterTs = new Date(secondTs.getTime() + 10000);
  writeSession(claudeDir, 'proj', 'before-1', beforeTs, 100);
  writeSession(claudeDir, 'proj', 'after-1', afterTs, 200);

  // Need to invoke from the repo dir
  const origCwd = process.cwd();
  process.chdir(repoDir);
  try {
    const comparison = compareSinceCommit({ claudeDir, sinceCommit: secondHash });
    assert.strictEqual(comparison.before.sessions, 1, `expected 1 session before, got ${comparison.before.sessions}`);
    assert.strictEqual(comparison.after.sessions, 1, `expected 1 session after, got ${comparison.after.sessions}`);
    assert.strictEqual(comparison.before.outputTokens, 50);
    assert.strictEqual(comparison.after.outputTokens, 100);
  } finally {
    process.chdir(origCwd);
  }
});
