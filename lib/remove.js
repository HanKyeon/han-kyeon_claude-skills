'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { getSkillsTargetDir, getCommandsTargetDir } = require('./paths');
const { readManifest, isModified } = require('./manifest');

async function remove({ target, dryRun, force, skills }) {
  const skillsTargetDir = getSkillsTargetDir(target && path.join(target, 'skills'));
  const commandsTargetDir = getCommandsTargetDir(target && path.join(target, 'commands'));

  let removed = 0;
  let notFound = 0;
  let refused = 0;

  for (const name of skills) {
    const skillPath = path.join(skillsTargetDir, name);
    const commandPath = path.join(commandsTargetDir, `${name}.md`);

    const candidates = [];
    if (fs.existsSync(skillPath)) candidates.push({ type: 'skill', path: skillPath });
    if (fs.existsSync(commandPath)) candidates.push({ type: 'command', path: commandPath });

    if (candidates.length === 0) {
      console.warn(`  !  Not installed: ${name}`);
      notFound++;
      continue;
    }

    for (const c of candidates) {
      const manifest = readManifest(c.path);
      const userAuthored = !manifest;
      const modified = manifest && isModified(c.path);

      if ((userAuthored || modified) && !force) {
        const reason = userAuthored ? 'user-authored (no manifest)' : 'modified since install';
        console.warn(`  !  Refusing to remove ${c.type}/${name}: ${reason}. Use --force.`);
        refused++;
        continue;
      }

      if (dryRun) {
        console.log(`  ~  [dry-run] remove ${c.type}: ${c.path}`);
        continue;
      }
      await fsp.rm(c.path, { recursive: true, force: true });
      console.log(`  -  Removed ${c.type}: ${name}`);
      removed++;
    }
  }

  console.log('');
  console.log(`Done. ${removed} removed, ${notFound} not found, ${refused} refused.`);
}

module.exports = { remove };
