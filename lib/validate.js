'use strict';

const fs = require('fs');
const path = require('path');
const { loadFrontmatter } = require('./frontmatter');
const {
  SKILLS_SOURCE_DIR,
  COMMANDS_SOURCE_DIR,
  getSkillsTargetDir,
  getCommandsTargetDir,
} = require('./paths');

function validateSkillDir(dir) {
  const errors = [];
  const name = path.basename(dir);
  const skillFile = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    errors.push(`missing SKILL.md`);
    return errors;
  }
  let fm;
  try {
    ({ frontmatter: fm } = loadFrontmatter(skillFile));
  } catch (err) {
    errors.push(`frontmatter parse error: ${err.message}`);
    return errors;
  }
  if (!fm) {
    errors.push(`SKILL.md has no YAML frontmatter (--- block)`);
    return errors;
  }
  if (!fm.name) errors.push(`frontmatter missing "name"`);
  else if (fm.name !== name) errors.push(`frontmatter name "${fm.name}" != dir "${name}"`);
  if (!fm.description) errors.push(`frontmatter missing "description"`);
  else if (fm.description.length < 20) errors.push(`description too short (<20 chars) — triggering may be weak`);
  return errors;
}

function validateCommandFile(filePath) {
  const errors = [];
  const name = path.basename(filePath, '.md');
  if (!fs.existsSync(filePath)) {
    errors.push(`missing file`);
    return errors;
  }
  const text = fs.readFileSync(filePath, 'utf8');
  if (!text.trim()) errors.push(`empty command body`);
  if (!/\$ARGUMENTS|\$\{ARGUMENTS\}/.test(text) && !/<(invocation|target|review_scope)/i.test(text)) {
    errors.push(`no $ARGUMENTS reference and no structured invocation tag — command may be context-free`);
  }
  return errors;
}

async function validate({ target }) {
  const skillsDir = getSkillsTargetDir(target && path.join(target, 'skills'));
  const commandsDir = getCommandsTargetDir(target && path.join(target, 'commands'));

  const sources = [
    { label: 'package skills', dir: SKILLS_SOURCE_DIR, kind: 'skill' },
    { label: 'installed skills', dir: skillsDir, kind: 'skill' },
    { label: 'package commands', dir: COMMANDS_SOURCE_DIR, kind: 'command' },
    { label: 'installed commands', dir: commandsDir, kind: 'command' },
  ];

  let totalErrors = 0;
  let checked = 0;

  for (const src of sources) {
    if (!fs.existsSync(src.dir)) continue;
    console.log('');
    console.log(`${src.label} (${src.dir}):`);
    const entries = fs.readdirSync(src.dir, { withFileTypes: true });
    const items =
      src.kind === 'skill'
        ? entries.filter((e) => e.isDirectory())
        : entries.filter((e) => e.isFile() && e.name.endsWith('.md'));
    if (items.length === 0) {
      console.log(`  (none)`);
      continue;
    }
    for (const e of items) {
      const full = path.join(src.dir, e.name);
      const errs = src.kind === 'skill' ? validateSkillDir(full) : validateCommandFile(full);
      checked++;
      if (errs.length === 0) {
        console.log(`  ok  ${e.name}`);
      } else {
        totalErrors += errs.length;
        console.log(`  FAIL  ${e.name}`);
        for (const err of errs) console.log(`        - ${err}`);
      }
    }
  }

  console.log('');
  console.log(`Checked ${checked} items, ${totalErrors} errors.`);
  if (totalErrors > 0) process.exitCode = 1;
}

module.exports = { validate, validateSkillDir, validateCommandFile };
