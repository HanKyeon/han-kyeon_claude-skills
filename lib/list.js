'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const {
  SKILLS_SOURCE_DIR,
  COMMANDS_SOURCE_DIR,
  getSkillsTargetDir,
  getCommandsTargetDir,
} = require('./paths');
const { readManifest, isModified } = require('./manifest');

async function loadPackaged(dir, kind) {
  if (!fs.existsSync(dir)) return new Set();
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  if (kind === 'skill') {
    return new Set(entries.filter((e) => e.isDirectory()).map((e) => e.name));
  }
  return new Set(
    entries
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name.replace(/\.md$/, ''))
  );
}

async function listSection({ label, targetDir, kind, packagedNames }) {
  if (!fs.existsSync(targetDir)) {
    console.log('');
    console.log(`${label}: (directory not found at ${targetDir})`);
    return;
  }

  const entries = await fsp.readdir(targetDir, { withFileTypes: true });
  const items =
    kind === 'skill'
      ? entries.filter((e) => e.isDirectory())
      : entries.filter((e) => e.isFile() && e.name.endsWith('.md'));

  console.log('');
  console.log(`${label} (${targetDir}):`);
  if (items.length === 0) {
    console.log(`  (none)`);
    return;
  }

  for (const e of items) {
    const full = path.join(targetDir, e.name);
    const name = kind === 'skill' ? e.name : e.name.replace(/\.md$/, '');
    let stat;
    try {
      stat = await fsp.lstat(full);
    } catch {
      continue;
    }
    const linkType = stat.isSymbolicLink() ? 'symlink' : kind === 'skill' ? 'dir' : 'file';
    const manifest = readManifest(full);

    let status;
    if (manifest) {
      if (linkType === 'symlink') status = `managed@${manifest.version} (symlink)`;
      else if (isModified(full)) status = `managed@${manifest.version} (user-modified)`;
      else status = `managed@${manifest.version}`;
    } else if (packagedNames.has(name)) {
      status = `unmanaged (name matches package, pre-0.2 install?)`;
    } else {
      status = `user-authored`;
    }

    console.log(`  ${name.padEnd(28)}  ${status}`);
  }
}

async function list({ target }) {
  const skillsTargetDir = getSkillsTargetDir(target && path.join(target, 'skills'));
  const commandsTargetDir = getCommandsTargetDir(target && path.join(target, 'commands'));

  const packagedSkills = await loadPackaged(SKILLS_SOURCE_DIR, 'skill');
  const packagedCommands = await loadPackaged(COMMANDS_SOURCE_DIR, 'command');

  await listSection({
    label: 'Skills',
    targetDir: skillsTargetDir,
    kind: 'skill',
    packagedNames: packagedSkills,
  });

  await listSection({
    label: 'Commands',
    targetDir: commandsTargetDir,
    kind: 'command',
    packagedNames: packagedCommands,
  });

  console.log('');
  console.log('  Legend: managed@<ver> = installed by cfh; user-authored = kept safe from cfh update');
  console.log('');
}

module.exports = { list };
