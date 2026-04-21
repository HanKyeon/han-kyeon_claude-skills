'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { search } = require('../lib/search');

function mktmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cfh-search-'));
}

// Capture console.log for assertions
function captureConsole(fn) {
  const out = [];
  const origLog = console.log;
  console.log = (...args) => out.push(args.join(' '));
  return Promise.resolve(fn()).finally(() => {
    console.log = origLog;
  }).then(() => out.join('\n'));
}

test('search: throws on empty query', async () => {
  await assert.rejects(
    () => search({ query: '', target: mktmp() }),
    /Usage: cfh search/
  );
});

test('search: finds keyword in skill SKILL.md', async () => {
  const tmp = mktmp();
  fs.mkdirSync(path.join(tmp, 'skills', 'my-test'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'commands'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'skills', 'my-test', 'SKILL.md'),
    '---\nname: my-test\ndescription: A skill about bluebird refactoring.\n---\n\n# My Test\n\nbluebird body content.',
    'utf8'
  );

  const output = await captureConsole(() =>
    search({ query: 'bluebird', target: tmp })
  );
  assert.ok(output.includes('my-test'));
  assert.ok(/desc:.*bluebird/.test(output));
});

test('search: case-insensitive by default', async () => {
  const tmp = mktmp();
  fs.mkdirSync(path.join(tmp, 'skills', 's1'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'commands'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'skills', 's1', 'SKILL.md'),
    '---\nname: s1\ndescription: UPPERCASE keyword.\n---\n\nBody.',
    'utf8'
  );

  const output = await captureConsole(() =>
    search({ query: 'uppercase', target: tmp })
  );
  assert.ok(output.includes('s1'));
});

test('search: no matches returns "(no matches)"', async () => {
  const tmp = mktmp();
  fs.mkdirSync(path.join(tmp, 'skills'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'commands'), { recursive: true });

  const output = await captureConsole(() =>
    search({ query: 'nothing-matches-this', target: tmp })
  );
  assert.ok(output.includes('(no matches)'));
});

test('search: --kind filter skips other types', async () => {
  const tmp = mktmp();
  fs.mkdirSync(path.join(tmp, 'skills', 's1'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'commands'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'skills', 's1', 'SKILL.md'),
    '---\nname: s1\ndescription: keyword bluebird.\n---\nBody.',
    'utf8'
  );
  fs.writeFileSync(
    path.join(tmp, 'commands', 'c1.md'),
    'command with bluebird inside.',
    'utf8'
  );

  const outputSkillOnly = await captureConsole(() =>
    search({ query: 'bluebird', target: tmp, kind: 'skill' })
  );
  assert.ok(outputSkillOnly.includes('s1'));
  assert.ok(!outputSkillOnly.includes('c1'));

  const outputCmdOnly = await captureConsole(() =>
    search({ query: 'bluebird', target: tmp, kind: 'command' })
  );
  assert.ok(!outputCmdOnly.includes('s1'));
  assert.ok(outputCmdOnly.includes('c1'));
});
