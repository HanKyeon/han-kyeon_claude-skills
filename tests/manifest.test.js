'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const {
  writeManifest,
  readManifest,
  isManaged,
  isModified,
  removeManifest,
  hashUnit,
  merkle,
} = require('../lib/manifest');

function mktmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-test-'));
}

test('hashUnit: single-file produces files map with one entry', () => {
  const tmp = mktmp();
  const file = path.join(tmp, 'cmd.md');
  fs.writeFileSync(file, 'hello', 'utf8');
  const { files } = hashUnit(file);
  assert.strictEqual(Object.keys(files).length, 1);
  assert.strictEqual(Object.keys(files)[0], 'cmd.md');
  assert.ok(/^[a-f0-9]{64}$/.test(Object.values(files)[0]));
});

test('hashUnit: directory walks recursively + skips manifest', () => {
  const tmp = mktmp();
  fs.mkdirSync(path.join(tmp, 'nested'));
  fs.writeFileSync(path.join(tmp, 'SKILL.md'), 'top', 'utf8');
  fs.writeFileSync(path.join(tmp, 'nested', 'ref.md'), 'nested', 'utf8');
  fs.writeFileSync(path.join(tmp, '.cfh-manifest.json'), '{}', 'utf8');

  const { files } = hashUnit(tmp);
  assert.ok('SKILL.md' in files);
  assert.ok('nested/ref.md' in files);
  assert.ok(!('.cfh-manifest.json' in files));
});

test('merkle: deterministic for same files map', () => {
  const files = { a: 'hash1', b: 'hash2', c: 'hash3' };
  const m1 = merkle(files);
  const m2 = merkle({ c: 'hash3', a: 'hash1', b: 'hash2' });
  assert.strictEqual(m1, m2, 'merkle should not depend on key order');
});

test('merkle: changes when any file hash changes', () => {
  const files1 = { a: 'hash1', b: 'hash2' };
  const files2 = { a: 'hash1', b: 'hash2-modified' };
  assert.notStrictEqual(merkle(files1), merkle(files2));
});

test('writeManifest + readManifest: round-trip for directory unit', async () => {
  const tmp = mktmp();
  fs.writeFileSync(path.join(tmp, 'SKILL.md'), 'content', 'utf8');
  await writeManifest(tmp, { kind: 'skill', name: 'test-skill' });

  const m = readManifest(tmp);
  assert.ok(m);
  assert.strictEqual(m.name, 'test-skill');
  assert.strictEqual(m.kind, 'skill');
  assert.ok(m.merkle);
  assert.ok(m.files['SKILL.md']);
});

test('writeManifest + readManifest: round-trip for single-file unit', async () => {
  const tmp = mktmp();
  const file = path.join(tmp, 'cmd.md');
  fs.writeFileSync(file, 'content', 'utf8');
  await writeManifest(file, { kind: 'command', name: 'cmd' });

  const m = readManifest(file);
  assert.ok(m);
  assert.strictEqual(m.kind, 'command');
  assert.ok(m.files['cmd.md']);
  // Hidden manifest sibling file
  assert.ok(fs.existsSync(path.join(tmp, '.cmd.md.cfh.json')));
});

test('isManaged: true after writeManifest, false for bare dir', async () => {
  const tmp = mktmp();
  fs.writeFileSync(path.join(tmp, 'SKILL.md'), 'c', 'utf8');
  assert.strictEqual(isManaged(tmp), false);
  await writeManifest(tmp, { kind: 'skill', name: 'n' });
  assert.strictEqual(isManaged(tmp), true);
});

test('isModified: false when unchanged, true after edit', async () => {
  const tmp = mktmp();
  fs.writeFileSync(path.join(tmp, 'SKILL.md'), 'original', 'utf8');
  await writeManifest(tmp, { kind: 'skill', name: 'n' });
  assert.strictEqual(isModified(tmp), false);

  fs.writeFileSync(path.join(tmp, 'SKILL.md'), 'modified', 'utf8');
  assert.strictEqual(isModified(tmp), true);
});

test('removeManifest: removes manifest file', async () => {
  const tmp = mktmp();
  fs.writeFileSync(path.join(tmp, 'SKILL.md'), 'c', 'utf8');
  await writeManifest(tmp, { kind: 'skill', name: 'n' });
  assert.strictEqual(isManaged(tmp), true);
  await removeManifest(tmp);
  assert.strictEqual(isManaged(tmp), false);
});

test('readManifest: returns null for nonexistent path', () => {
  assert.strictEqual(readManifest('/nonexistent/path/xyz'), null);
});
