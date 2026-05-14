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
const { writeManifest, isManaged, isModified } = require('./manifest');

const VALID_ONLY = new Set(['skills', 'commands']);

async function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name);
}

async function installOne({ src, dest, kind, name, force, dryRun, label }) {
  const exists = fs.existsSync(dest);
  if (exists) {
    const managed = isManaged(dest);
    const modified = managed && isModified(dest);

    if (!force) {
      const suffix = modified ? ' [modified by user]' : managed ? ' [managed]' : ' [not managed]';
      console.log(`  -  Skip (exists): ${label}${suffix}  [use --force to overwrite]`);
      return 'skip';
    }

    if (!managed) {
      console.warn(`  !  Overwriting unmanaged ${label} (no manifest, assumed user-authored)`);
    } else if (modified) {
      console.warn(`  !  Overwriting user-modified ${label} (manifest hash mismatch)`);
    }

    if (!dryRun) {
      await fsp.rm(dest, { recursive: true, force: true });
    }
  }

  if (dryRun) {
    console.log(`  ~  [dry-run] copy -> ${label}`);
    return 'install';
  }

  await fsp.cp(src, dest, { recursive: true });
  await writeManifest(dest, { kind, name });
  console.log(`  +  Copied: ${label}`);
  return 'install';
}

async function install({ force, dryRun, target, skills, only }) {
  if (only && !VALID_ONLY.has(only)) {
    throw new Error(`Invalid --only value: "${only}". Expected "skills" or "commands".`);
  }

  const skillsTargetDir = getSkillsTargetDir(target && path.join(target, 'skills'));
  const commandsTargetDir = getCommandsTargetDir(target && path.join(target, 'commands'));

  const installSkills = !only || only === 'skills';
  const installCommands = !only || only === 'commands';

  if (installSkills && !fs.existsSync(SKILLS_SOURCE_DIR)) {
    console.warn(`Source skills directory not found: ${SKILLS_SOURCE_DIR}`);
  }
  if (installCommands && !fs.existsSync(COMMANDS_SOURCE_DIR)) {
    console.warn(`Source commands directory not found: ${COMMANDS_SOURCE_DIR}`);
  }

  if (!dryRun) {
    if (installSkills) await fsp.mkdir(skillsTargetDir, { recursive: true });
    if (installCommands) await fsp.mkdir(commandsTargetDir, { recursive: true });
  }

  console.log(`Mode: copy${dryRun ? ' (dry-run)' : ''}`);

  let installed = 0;
  let skipped = 0;
  const filter = skills && skills.length > 0 ? new Set(skills) : null;
  const unmatched = new Set(filter ? [...filter] : []);

  if (installSkills) {
    console.log('');
    console.log(`Skills target: ${skillsTargetDir}`);
    const available = await listDirs(SKILLS_SOURCE_DIR);
    const toInstall = filter ? available.filter((n) => filter.has(n)) : available;
    for (const name of toInstall) {
      unmatched.delete(name);
      const result = await installOne({
        src: path.join(SKILLS_SOURCE_DIR, name),
        dest: path.join(skillsTargetDir, name),
        kind: 'skill',
        name,
        force,
        dryRun,
        label: `skill/${name}`,
      });
      if (result === 'install') installed++;
      else skipped++;
    }
  }

  if (installCommands) {
    console.log('');
    console.log(`Commands target: ${commandsTargetDir}`);
    const available = await listMarkdownFiles(COMMANDS_SOURCE_DIR);
    const toInstall = filter
      ? available.filter((f) => filter.has(f.replace(/\.md$/, '')))
      : available;
    for (const filename of toInstall) {
      const name = filename.replace(/\.md$/, '');
      unmatched.delete(name);
      const result = await installOne({
        src: path.join(COMMANDS_SOURCE_DIR, filename),
        dest: path.join(commandsTargetDir, filename),
        kind: 'command',
        name,
        force,
        dryRun,
        label: `command/${name}`,
      });
      if (result === 'install') installed++;
      else skipped++;
    }

    // Copy commands/references/ subdirectory (shared reference docs for slash commands).
    // No manifest needed — these are read-only reference material, not commands themselves.
    const referencesSrc = path.join(COMMANDS_SOURCE_DIR, 'references');
    const referencesDest = path.join(commandsTargetDir, 'references');
    if (fs.existsSync(referencesSrc) && !filter) {
      if (dryRun) {
        console.log(`  ~  [dry-run] copy -> commands/references/`);
      } else {
        if (fs.existsSync(referencesDest)) {
          await fsp.rm(referencesDest, { recursive: true, force: true });
        }
        await fsp.cp(referencesSrc, referencesDest, { recursive: true });
        console.log(`  +  Copied: commands/references/`);
      }
    }
  }

  for (const name of unmatched) {
    console.warn(`  !  Not found in package: ${name}`);
    skipped++;
  }

  console.log('');
  console.log(`Done. ${installed} installed, ${skipped} skipped.`);
}

module.exports = { install };
