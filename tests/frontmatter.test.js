'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { parseFrontmatter, parseSimpleYaml } = require('../lib/frontmatter');

test('parseFrontmatter: returns null frontmatter when no --- block', () => {
  const { frontmatter, body } = parseFrontmatter('# Just a title\n\nNo frontmatter.');
  assert.strictEqual(frontmatter, null);
  assert.strictEqual(body, '# Just a title\n\nNo frontmatter.');
});

test('parseFrontmatter: returns null frontmatter when opening --- exists but no closing', () => {
  const { frontmatter } = parseFrontmatter('---\nname: x\n\nNo closing.');
  assert.strictEqual(frontmatter, null);
});

test('parseFrontmatter: parses simple key-value frontmatter', () => {
  const input = '---\nname: my-skill\ndescription: Short desc.\n---\n\n# Body';
  const { frontmatter, body } = parseFrontmatter(input);
  assert.deepStrictEqual(frontmatter, { name: 'my-skill', description: 'Short desc.' });
  assert.strictEqual(body.trim(), '# Body');
});

test('parseFrontmatter: parses block scalar with |', () => {
  const input = '---\nname: x\ndescription: |\n  Line 1\n  Line 2\n---\n\nBody';
  const { frontmatter } = parseFrontmatter(input);
  assert.strictEqual(frontmatter.name, 'x');
  assert.ok(frontmatter.description.includes('Line 1'));
  assert.ok(frontmatter.description.includes('Line 2'));
});

test('parseFrontmatter: handles CRLF line endings', () => {
  const input = '---\r\nname: cr-lf\r\n---\r\n\r\nBody';
  const { frontmatter, body } = parseFrontmatter(input);
  assert.strictEqual(frontmatter.name, 'cr-lf');
  assert.ok(body.includes('Body'));
});

test('parseSimpleYaml: ignores comment lines', () => {
  const yaml = '# this is a comment\nkey: value\n# another comment\nname: x';
  const parsed = parseSimpleYaml(yaml);
  assert.strictEqual(parsed.key, 'value');
  assert.strictEqual(parsed.name, 'x');
});

test('parseSimpleYaml: trims whitespace from values', () => {
  const parsed = parseSimpleYaml('key:    padded value   ');
  assert.strictEqual(parsed.key, 'padded value');
});

test('parseFrontmatter: handles frontmatter with Korean content', () => {
  const input = '---\nname: 한글-스킬\ndescription: 한글 설명입니다.\n---\n\n# 본문';
  const { frontmatter } = parseFrontmatter(input);
  assert.strictEqual(frontmatter.name, '한글-스킬');
  assert.strictEqual(frontmatter.description, '한글 설명입니다.');
});
