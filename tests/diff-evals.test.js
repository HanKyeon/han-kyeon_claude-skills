'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { diffSkillsVsEvals } = require('../lib/diff');

function mkTmpClaude() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-diff-evals-test-'));
  fs.mkdirSync(path.join(dir, 'skills'), { recursive: true });
  return dir;
}

function makeSkill(claudeDir, name, { withEvals = false, evalMtime = null, skillMtime = null } = {}) {
  const skillDir = path.join(claudeDir, 'skills', name);
  fs.mkdirSync(skillDir, { recursive: true });
  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.writeFileSync(skillFile, `---\nname: ${name}\ndescription: Test skill for ${name} that triggers on relevant keywords.\n---\n\nBody.\n`);
  if (skillMtime) fs.utimesSync(skillFile, skillMtime, skillMtime);
  if (withEvals) {
    const evalsDir = path.join(skillDir, 'evals');
    fs.mkdirSync(evalsDir, { recursive: true });
    const evalFile = path.join(evalsDir, 'case.json');
    fs.writeFileSync(evalFile, JSON.stringify({
      name: 'c1', prompt: 'p',
      assertions: [{ type: 'contains', value: 'x' }],
    }));
    if (evalMtime) fs.utimesSync(evalFile, evalMtime, evalMtime);
  }
}

function captureOutput(fn) {
  const original = console.log;
  const lines = [];
  console.log = (...args) => lines.push(args.join(' '));
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines.join('\n');
}

test('diffSkillsVsEvals: detects fresh skill (evals newer than SKILL.md)', () => {
  const dir = mkTmpClaude();
  const old = new Date(Date.now() - 7 * 86400000);
  const recent = new Date();
  makeSkill(dir, 'fresh-one', { withEvals: true, skillMtime: old, evalMtime: recent });

  const out = captureOutput(() => diffSkillsVsEvals({ target: dir }));
  assert.match(out, /Fresh:\s+1/);
  assert.match(out, /Stale:\s+0/);
});

test('diffSkillsVsEvals: detects stale skill (SKILL.md newer than evals)', () => {
  const dir = mkTmpClaude();
  const old = new Date(Date.now() - 7 * 86400000);
  const recent = new Date();
  makeSkill(dir, 'stale-one', { withEvals: true, skillMtime: recent, evalMtime: old });

  const out = captureOutput(() => diffSkillsVsEvals({ target: dir }));
  assert.match(out, /Stale:\s+1/);
  assert.match(out, /stale-one/);
  assert.match(out, /SKILL\.md.*newer/);
});

test('diffSkillsVsEvals: counts skills with no evals separately', () => {
  const dir = mkTmpClaude();
  makeSkill(dir, 'no-evals', { withEvals: false });

  const out = captureOutput(() => diffSkillsVsEvals({ target: dir }));
  assert.match(out, /No evals:\s+1/);
  assert.match(out, /no-evals/);
});

test('diffSkillsVsEvals: mixed scenario', () => {
  const dir = mkTmpClaude();
  const old = new Date(Date.now() - 7 * 86400000);
  const recent = new Date();
  makeSkill(dir, 'fresh', { withEvals: true, skillMtime: old, evalMtime: recent });
  makeSkill(dir, 'stale', { withEvals: true, skillMtime: recent, evalMtime: old });
  makeSkill(dir, 'noevals', { withEvals: false });

  const out = captureOutput(() => diffSkillsVsEvals({ target: dir }));
  assert.match(out, /Fresh:\s+1/);
  assert.match(out, /Stale:\s+1/);
  assert.match(out, /No evals:\s+1/);
});
