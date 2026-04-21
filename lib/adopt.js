'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getSkillsTargetDir, getCommandsTargetDir } = require('./paths');
const { readManifest, removeManifest, manifestPath } = require('./manifest');

function promptYesNo(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

function resolveUnit({ name, target }) {
  const skillsDir = getSkillsTargetDir(target && path.join(target, 'skills'));
  const commandsDir = getCommandsTargetDir(target && path.join(target, 'commands'));

  const skillPath = path.join(skillsDir, name);
  if (fs.existsSync(skillPath) && fs.statSync(skillPath).isDirectory()) {
    return { kind: 'skill', path: skillPath };
  }

  const commandPath = path.join(commandsDir, `${name}.md`);
  if (fs.existsSync(commandPath) && fs.statSync(commandPath).isFile()) {
    return { kind: 'command', path: commandPath };
  }

  return null;
}

async function adopt({ name, target, dryRun, yes }) {
  if (!name) {
    throw new Error('Usage: cfh adopt <name> [--yes] [--dry-run]');
  }

  const unit = resolveUnit({ name, target });
  if (!unit) {
    throw new Error(
      `Not found: "${name}" in skills or commands under ${target || '~/.claude'}. Run "cfh list" to see installed items.`
    );
  }

  const manifest = readManifest(unit.path);
  if (!manifest) {
    console.log(`  =  "${name}" is already user-authored (no manifest). Nothing to do.`);
    return;
  }

  const mp = manifestPath(unit.path);
  console.log('');
  console.log(`  Adopting: ${unit.kind} "${name}"`);
  console.log(`  Manifest: ${mp}`);
  console.log(`  Status:   managed@${manifest.version} → user-authored`);
  console.log(`  Effect:   future "cfh update" will skip this item; "cfh remove" will ask for --force.`);
  console.log('');

  if (dryRun) {
    console.log(`  ~  [dry-run] would remove manifest at ${mp}`);
    return;
  }

  if (!yes) {
    const ok = await promptYesNo('  Continue? (y/N) ');
    if (!ok) {
      console.log('  Aborted.');
      return;
    }
  }

  await removeManifest(unit.path);
  console.log(`  +  Adopted "${name}" — now user-authored.`);
}

module.exports = { adopt };
