'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const {
  TEMPLATES_DIR,
  getSkillsTargetDir,
  getCommandsTargetDir,
  getProjectClaudeDir,
} = require('./paths');

const VALID_KINDS = new Set(['skill', 'command', 'agent']);
const NAME_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

function titleCase(name) {
  return name
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

async function replaceInPlace(filePath, map) {
  let text = await fsp.readFile(filePath, 'utf8');
  for (const [from, to] of Object.entries(map)) {
    text = text.split(from).join(to);
  }
  await fsp.writeFile(filePath, text, 'utf8');
}

async function scaffoldFromExisting({ kind, name, dest, sourceName, target, dryRun, force }) {
  if (kind !== 'skill') {
    throw new Error('--from-existing currently supports only kind=skill');
  }

  // Resolve source skill path (search both global skills and target if given)
  const candidates = [];
  if (target) {
    candidates.push(path.join(target, 'skills', sourceName));
  } else {
    candidates.push(path.join(getSkillsTargetDir(), sourceName));
    candidates.push(path.join(getProjectClaudeDir(), 'skills', sourceName));
  }
  const src = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isDirectory());
  if (!src) {
    throw new Error(`Source skill "${sourceName}" not found. Searched: ${candidates.join(', ')}`);
  }

  if (fs.existsSync(dest) && !force) {
    throw new Error(`Already exists: ${dest} (use --force to overwrite)`);
  }
  if (dryRun) {
    console.log(`  ~  [dry-run] fork skill ${sourceName} → ${name} at ${dest}`);
    return;
  }

  if (fs.existsSync(dest)) await fsp.rm(dest, { recursive: true, force: true });
  await fsp.cp(src, dest, { recursive: true });

  // Update frontmatter: replace name and add TODO marker to description
  const skillFile = path.join(dest, 'SKILL.md');
  let body = await fsp.readFile(skillFile, 'utf8');

  // Replace name in frontmatter
  body = body.replace(/^name:\s*\S+/m, `name: ${name}`);

  // Add TODO prefix to description so it's clear what to update
  body = body.replace(/^description:\s*(.+)$/m, (match, original) => {
    if (original.startsWith('TODO ')) return match;
    return `description: TODO update for ${name} — was: ${original}`;
  });

  await fsp.writeFile(skillFile, body, 'utf8');

  // Drop manifest if any (forked skill is user-authored, not managed)
  const manifestFile = path.join(dest, '.cfh-manifest.json');
  if (fs.existsSync(manifestFile)) {
    await fsp.rm(manifestFile, { force: true });
  }

  console.log(`  +  Forked skill: ${dest}  (from "${sourceName}")`);
  console.log(`  ⚠ Update description and review SKILL.md body — TODO marker added.`);
}

async function scaffold({ kind, name, dest, dryRun, force }) {
  const title = titleCase(name);
  const replaceMap = {
    __SKILL_NAME__: name,
    __SKILL_TITLE__: title,
    __COMMAND_TITLE__: `${title} Command`,
    __AGENT_NAME__: name,
    __AGENT_TITLE__: `${title} Agent`,
  };

  if (kind === 'skill') {
    const src = path.join(TEMPLATES_DIR, 'skill');
    if (fs.existsSync(dest) && !force) {
      throw new Error(`Already exists: ${dest} (use --force to overwrite)`);
    }
    if (dryRun) {
      console.log(`  ~  [dry-run] create skill ${name} at ${dest}`);
      return;
    }
    if (fs.existsSync(dest)) await fsp.rm(dest, { recursive: true, force: true });
    await fsp.cp(src, dest, { recursive: true });
    await replaceInPlace(path.join(dest, 'SKILL.md'), replaceMap);
    console.log(`  +  Created skill: ${dest}`);
    return;
  }

  if (kind === 'command') {
    const src = path.join(TEMPLATES_DIR, 'command.md');
    if (fs.existsSync(dest) && !force) {
      throw new Error(`Already exists: ${dest} (use --force to overwrite)`);
    }
    if (dryRun) {
      console.log(`  ~  [dry-run] create command ${name}.md at ${dest}`);
      return;
    }
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(src, dest);
    await replaceInPlace(dest, replaceMap);
    console.log(`  +  Created command: ${dest}`);
    return;
  }

  if (kind === 'agent') {
    const src = path.join(TEMPLATES_DIR, 'agent.md');
    if (fs.existsSync(dest) && !force) {
      throw new Error(`Already exists: ${dest} (use --force to overwrite)`);
    }
    if (dryRun) {
      console.log(`  ~  [dry-run] create agent ${name}.md at ${dest}`);
      return;
    }
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(src, dest);
    await replaceInPlace(dest, replaceMap);
    console.log(`  +  Created agent: ${dest}`);
    return;
  }
}

async function newCmd({ kind, name, dryRun, force, target, project, fromExisting }) {
  if (!kind || !VALID_KINDS.has(kind)) {
    throw new Error(`Usage: cfh new <skill|command|agent> <name> [--project]`);
  }
  if (!name || !NAME_RE.test(name)) {
    throw new Error(
      `Invalid name: "${name}". Must be lowercase, alphanumeric + dashes, 1-63 chars.`
    );
  }

  let dest;
  if (project) {
    const claudeDir = getProjectClaudeDir();
    if (kind === 'skill') dest = path.join(claudeDir, 'skills', name);
    else if (kind === 'command') dest = path.join(claudeDir, 'commands', `${name}.md`);
    else dest = path.join(claudeDir, 'agents', `${name}.md`);
  } else {
    if (kind === 'skill') {
      const root = getSkillsTargetDir(target && path.join(target, 'skills'));
      dest = path.join(root, name);
    } else if (kind === 'command') {
      const root = getCommandsTargetDir(target && path.join(target, 'commands'));
      dest = path.join(root, `${name}.md`);
    } else {
      const claudeDir = target ? path.resolve(target) : path.join(require('os').homedir(), '.claude');
      dest = path.join(claudeDir, 'agents', `${name}.md`);
    }
  }

  if (fromExisting) {
    console.log(`Forking from existing skill "${fromExisting}" → ${name} at ${dest}${dryRun ? ' (dry-run)' : ''}`);
    await scaffoldFromExisting({ kind, name, dest, sourceName: fromExisting, target, dryRun, force });
  } else {
    console.log(`Scaffolding ${kind}/${name} at ${dest}${dryRun ? ' (dry-run)' : ''}`);
    await scaffold({ kind, name, dest, dryRun, force });
  }
  console.log('');
  console.log(`Next:`);
  console.log(`  1. Edit the TODO markers in the generated file(s).`);
  console.log(`  2. Run: cfh validate${target ? ` --target ${target}` : ''}`);
  console.log(`  3. Trigger in Claude Code by using keywords matching the frontmatter description.`);
}

module.exports = { newCmd };
