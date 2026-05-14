'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const {
  SKILLS_SOURCE_DIR,
  COMMANDS_SOURCE_DIR,
  getSkillsTargetDir,
  getCommandsTargetDir,
  getProjectClaudeDir,
} = require('./paths');
const { readManifest, isModified } = require('./manifest');
const { loadFrontmatter } = require('./frontmatter');

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
    if (!fs.existsSync(full)) continue;
    const manifest = readManifest(full);

    let status;
    if (manifest) {
      if (isModified(full)) status = `managed@${manifest.version} (modified locally)`;
      else status = `managed@${manifest.version}`;
    } else {
      status = packagedNames.has(name) ? `user-authored (adopted)` : `user-authored`;
    }

    // 1.0 mapping column (Track 5.5) — skills show their mirror commands.
    let mapping = '';
    if (kind === 'skill') {
      const skillFile = path.join(full, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        try {
          const { frontmatter: fm } = loadFrontmatter(skillFile);
          if (fm && fm.commands) {
            const cmds = Array.isArray(fm.commands) ? fm.commands : [fm.commands];
            if (cmds.length) mapping = `  →  ${cmds.join(', ')}`;
          }
        } catch {
          /* swallow — schema check is a separate command */
        }
      }
    }

    console.log(`  ${name.padEnd(28)}  ${status}${mapping}`);
  }
}

async function listScope({ scopeLabel, skillsDir, commandsDir, packagedSkills, packagedCommands }) {
  console.log('');
  console.log(`=== ${scopeLabel} ===`);
  await listSection({
    label: 'Skills',
    targetDir: skillsDir,
    kind: 'skill',
    packagedNames: packagedSkills,
  });
  await listSection({
    label: 'Commands',
    targetDir: commandsDir,
    kind: 'command',
    packagedNames: packagedCommands,
  });
}

async function list({ target, globalOnly, projectOnly }) {
  const packagedSkills = await loadPackaged(SKILLS_SOURCE_DIR, 'skill');
  const packagedCommands = await loadPackaged(COMMANDS_SOURCE_DIR, 'command');

  // --target overrides everything and shows a single scope
  if (target) {
    const skillsDir = getSkillsTargetDir(path.join(target, 'skills'));
    const commandsDir = getCommandsTargetDir(path.join(target, 'commands'));
    await listScope({
      scopeLabel: `custom target (${path.resolve(target)})`,
      skillsDir,
      commandsDir,
      packagedSkills,
      packagedCommands,
    });
    printLegend();
    return;
  }

  const globalSkills = getSkillsTargetDir();
  const globalCommands = getCommandsTargetDir();
  const projectRoot = getProjectClaudeDir();
  const projectSkills = path.join(projectRoot, 'skills');
  const projectCommands = path.join(projectRoot, 'commands');
  const projectExists = fs.existsSync(projectRoot);

  const showGlobal = !projectOnly;
  const showProject = !globalOnly && (projectOnly || projectExists);

  if (showGlobal) {
    await listScope({
      scopeLabel: `Global (~/.claude)`,
      skillsDir: globalSkills,
      commandsDir: globalCommands,
      packagedSkills,
      packagedCommands,
    });
  }

  if (showProject) {
    await listScope({
      scopeLabel: `Project (${projectRoot})`,
      skillsDir: projectSkills,
      commandsDir: projectCommands,
      packagedSkills,
      packagedCommands,
    });
  } else if (!globalOnly && !projectExists) {
    console.log('');
    console.log(`  (no ./.claude in current directory — use --target <path> or cd into a project)`);
  }

  printLegend();
}

function printLegend() {
  console.log('');
  console.log('  Legend: managed@<ver> = installed by cfh; user-authored = kept safe from cfh update');
  console.log('  Scope:  --global (only ~/.claude)  --project (only ./.claude)  --target <path> (custom)');
  console.log('');
}

module.exports = { list };
