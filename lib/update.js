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
const { writeManifest, readManifest, isModified } = require('./manifest');

async function updateOne({ src, dest, kind, name, label, dryRun, force }) {
  if (!fs.existsSync(dest)) {
    return { action: 'skip', reason: 'not installed' };
  }
  const manifest = readManifest(dest);
  if (!manifest) {
    if (!force) return { action: 'skip', reason: 'user-authored (no manifest)' };
  } else if (isModified(dest) && !force) {
    return { action: 'skip', reason: 'user-modified since install' };
  }

  if (dryRun) {
    console.log(`  ~  [dry-run] update ${label}`);
    return { action: 'update' };
  }

  await fsp.rm(dest, { recursive: true, force: true });
  await fsp.cp(src, dest, { recursive: true });
  await writeManifest(dest, { kind, name });
  console.log(`  ^  Updated: ${label}`);
  return { action: 'update' };
}

async function update({ target, dryRun, force, skills, only }) {
  const skillsTargetDir = getSkillsTargetDir(target && path.join(target, 'skills'));
  const commandsTargetDir = getCommandsTargetDir(target && path.join(target, 'commands'));
  const updateSkills = !only || only === 'skills';
  const updateCommands = !only || only === 'commands';
  const filter = skills && skills.length > 0 ? new Set(skills) : null;

  let updated = 0;
  let skipped = 0;

  if (updateSkills && fs.existsSync(SKILLS_SOURCE_DIR)) {
    console.log('');
    console.log(`Skills target: ${skillsTargetDir}`);
    const available = (await fsp.readdir(SKILLS_SOURCE_DIR, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    const toUpdate = filter ? available.filter((n) => filter.has(n)) : available;
    for (const name of toUpdate) {
      const res = await updateOne({
        src: path.join(SKILLS_SOURCE_DIR, name),
        dest: path.join(skillsTargetDir, name),
        kind: 'skill',
        name,
        label: `skill/${name}`,
        dryRun,
        force,
      });
      if (res.action === 'update') updated++;
      else {
        console.log(`  -  Skip: skill/${name} [${res.reason}]`);
        skipped++;
      }
    }
  }

  if (updateCommands && fs.existsSync(COMMANDS_SOURCE_DIR)) {
    console.log('');
    console.log(`Commands target: ${commandsTargetDir}`);
    const available = (await fsp.readdir(COMMANDS_SOURCE_DIR, { withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name);
    const toUpdate = filter
      ? available.filter((f) => filter.has(f.replace(/\.md$/, '')))
      : available;
    for (const filename of toUpdate) {
      const name = filename.replace(/\.md$/, '');
      const res = await updateOne({
        src: path.join(COMMANDS_SOURCE_DIR, filename),
        dest: path.join(commandsTargetDir, filename),
        kind: 'command',
        name,
        label: `command/${name}`,
        dryRun,
        force,
      });
      if (res.action === 'update') updated++;
      else {
        console.log(`  -  Skip: command/${name} [${res.reason}]`);
        skipped++;
      }
    }
  }

  console.log('');
  console.log(`Done. ${updated} updated, ${skipped} skipped.`);
}

module.exports = { update };
