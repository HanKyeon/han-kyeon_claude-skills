'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { validateSkillDir, SKILL_FRONTMATTER_SCHEMA } = require('../lib/validate');

function mkSkill(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-schema-test-'));
  // Create the actual skill name to match content
  const nameMatch = content.match(/^name:\s*(\S+)/m);
  const skillName = nameMatch ? nameMatch[1] : path.basename(dir);
  const skillDir = path.join(dir, skillName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);
  return skillDir;
}

test('schema: has expected required fields', () => {
  assert.deepStrictEqual(SKILL_FRONTMATTER_SCHEMA.required, ['name', 'description']);
});

test('validateSkillDir: passes well-formed skill', () => {
  const dir = mkSkill('---\nname: good-skill\ndescription: This is a description that is long enough to trigger.\n---\n\nBody.\n');
  const result = validateSkillDir(dir);
  assert.deepStrictEqual(result.errors, []);
});

test('validateSkillDir: reports kebab-case violation', () => {
  const dir = mkSkill('---\nname: BadSkill\ndescription: This is a description that is long enough to trigger.\n---\n\nBody.\n');
  // Note: dir name will match "BadSkill" so dir-match passes, but pattern check should fail
  const result = validateSkillDir(dir);
  assert.ok(result.errors.find((e) => /invalid format/.test(e)), `expected pattern error, got: ${result.errors.join(', ')}`);
});

test('validateSkillDir: reports description too short', () => {
  const dir = mkSkill('---\nname: short-desc\ndescription: too short\n---\n\nBody.\n');
  const result = validateSkillDir(dir);
  assert.ok(result.errors.find((e) => /too short/.test(e)));
});

test('validateSkillDir: reports name-vs-dir mismatch', () => {
  const dir = mkSkill('---\nname: mismatch-name\ndescription: A description that is sufficiently long for testing.\n---\n\nBody.\n');
  // Rename the skill dir to something different
  const parent = path.dirname(dir);
  const newDir = path.join(parent, 'different-name');
  fs.renameSync(dir, newDir);
  const result = validateSkillDir(newDir);
  assert.ok(result.errors.find((e) => /!= dir name/.test(e)));
});

test('validateSkillDir: strict mode warns on unknown fields', () => {
  const dir = mkSkill('---\nname: with-unknown\ndescription: A description that is sufficiently long for testing.\nrandom_field: hello\n---\n\nBody.\n');
  const lenient = validateSkillDir(dir);
  assert.deepStrictEqual(lenient.warnings, [], 'lenient mode should not warn on unknown');
  const strict = validateSkillDir(dir, { strict: true });
  assert.ok(strict.warnings.find((w) => /random_field/.test(w)));
});

test('validateSkillDir: missing SKILL.md returns error', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-schema-test-'));
  const skillDir = path.join(dir, 'empty-skill');
  fs.mkdirSync(skillDir);
  const result = validateSkillDir(skillDir);
  assert.ok(result.errors.find((e) => /missing SKILL\.md/.test(e)));
});
