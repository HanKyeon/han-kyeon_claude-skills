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

// Insert `commands: [/cfh-<name>]` into the YAML frontmatter of a SKILL.md.
// If the field already exists, append the new entry (deduped). If frontmatter is
// missing, do nothing (scaffold templates always include it, but we stay defensive).
async function insertCommandsFrontmatter(filePath, mirrorName) {
  if (!fs.existsSync(filePath)) return;
  const text = await fsp.readFile(filePath, 'utf8');
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return;
  const fm = fmMatch[1];
  const cmdEntry = `/${mirrorName}`;
  let newFm;
  const existing = fm.match(/^commands:\s*(.+)$/m);
  if (existing) {
    // Parse a tiny inline list like "[/cfh-x, /cfh-y]" or single string.
    const raw = existing[1].trim();
    const items = raw
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.includes(cmdEntry)) return; // already there
    items.push(cmdEntry);
    newFm = fm.replace(/^commands:\s*.+$/m, `commands: [${items.join(', ')}]`);
  } else {
    newFm = `${fm}\ncommands: [${cmdEntry}]`;
  }
  const newText = `---\n${newFm}\n---${text.slice(fmMatch[0].length)}`;
  await fsp.writeFile(filePath, newText, 'utf8');
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

async function newCmd({ kind, name, dryRun, force, target, project, fromExisting, noMirror }) {
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

  // Track 5.3 — auto-mirror command for new skills
  let mirrorCreated = false;
  if (kind === 'skill' && !noMirror && !fromExisting) {
    const mirrorName = `cfh-${name}`;
    let mirrorDest;
    if (project) {
      mirrorDest = path.join(getProjectClaudeDir(), 'commands', `${mirrorName}.md`);
    } else {
      const cmdRoot = getCommandsTargetDir(target && path.join(target, 'commands'));
      mirrorDest = path.join(cmdRoot, `${mirrorName}.md`);
    }
    if (fs.existsSync(mirrorDest) && !force) {
      console.log(`  -  Skip mirror command: ${mirrorDest} (exists, use --force to overwrite)`);
    } else {
      try {
        await scaffold({ kind: 'command', name: mirrorName, dest: mirrorDest, dryRun, force: true });
        mirrorCreated = true;
      } catch (err) {
        console.warn(`  !  mirror command creation failed: ${err.message}`);
      }
    }
    // Track 5.1 — also write `commands:` field into SKILL.md frontmatter so
    // cross-link is bidirectional from scaffold time. Skip in dry-run.
    if (mirrorCreated && !dryRun) {
      try {
        await insertCommandsFrontmatter(path.join(dest, 'SKILL.md'), mirrorName);
      } catch (err) {
        console.warn(`  !  could not write commands: frontmatter — ${err.message}`);
      }
    }
  }

  console.log('');
  console.log(`Next:`);
  console.log(`  1. Edit the TODO markers in the generated file(s).`);
  if (kind === 'skill' && mirrorCreated) {
    console.log(`  2. Edit the mirror command body in commands/cfh-${name}.md to delegate to the skill.`);
    console.log(`     (SKILL.md frontmatter "commands: [/cfh-${name}]" already wired by scaffold.)`);
  }
  console.log(`  ${kind === 'skill' && mirrorCreated ? '3' : '2'}. Run: cfh check schema${target ? ` --target ${target}` : ''}`);
  console.log(`  ${kind === 'skill' && mirrorCreated ? '4' : '3'}. Trigger in Claude Code by using keywords matching the frontmatter description.`);
}

module.exports = { newCmd };
