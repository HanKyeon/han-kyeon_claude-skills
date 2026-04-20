'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { TEMPLATES_DIR, PRESETS_DIR, getProjectClaudeDir } = require('./paths');

async function listPresets() {
  if (!fs.existsSync(PRESETS_DIR)) return [];
  const entries = await fsp.readdir(PRESETS_DIR);
  return entries.filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
}

async function loadPreset(name) {
  const p = path.join(PRESETS_DIR, `${name}.json`);
  if (!fs.existsSync(p)) {
    const available = await listPresets();
    throw new Error(`Preset not found: "${name}". Available: ${available.join(', ') || '(none)'}`);
  }
  return JSON.parse(await fsp.readFile(p, 'utf8'));
}

async function applyFileSpec({ spec, destRoot, dryRun, force }) {
  const destPath = path.join(destRoot, spec.path);
  const templatePath = path.join(TEMPLATES_DIR, spec.template);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template missing: ${templatePath}`);
  }
  if (fs.existsSync(destPath) && !force) {
    console.log(`  -  Skip (exists): ${spec.path}  [use --force to overwrite]`);
    return 'skip';
  }
  if (dryRun) {
    console.log(`  ~  [dry-run] write ${spec.path}`);
    return 'dry';
  }

  await fsp.mkdir(path.dirname(destPath), { recursive: true });

  const isDir = fs.statSync(templatePath).isDirectory();
  if (isDir) {
    if (fs.existsSync(destPath)) await fsp.rm(destPath, { recursive: true, force: true });
    await fsp.cp(templatePath, destPath, { recursive: true });
    const primary = path.join(destPath, 'SKILL.md');
    if (fs.existsSync(primary) && spec.replace) {
      let text = await fsp.readFile(primary, 'utf8');
      for (const [from, to] of Object.entries(spec.replace)) {
        text = text.split(from).join(to);
      }
      await fsp.writeFile(primary, text, 'utf8');
    }
  } else {
    let text = await fsp.readFile(templatePath, 'utf8');
    if (spec.replace) {
      for (const [from, to] of Object.entries(spec.replace)) {
        text = text.split(from).join(to);
      }
    }
    await fsp.writeFile(destPath, text, 'utf8');
  }
  console.log(`  +  Created: ${spec.path}`);
  return 'done';
}

async function generate({ presetName, dryRun, force, target, list }) {
  if (list) {
    const presets = await listPresets();
    console.log('');
    console.log('Available presets:');
    for (const name of presets) {
      const p = await loadPreset(name);
      console.log(`  ${name.padEnd(22)}  ${p.description || ''}`);
    }
    console.log('');
    return;
  }

  if (!presetName) {
    throw new Error(`Usage: cfh generate <preset> [--target <dir>]. Run "cfh generate --list" to see presets.`);
  }

  const preset = await loadPreset(presetName);
  const destRoot = target ? path.resolve(target) : getProjectClaudeDir();

  console.log(`Preset: ${preset.name} (${preset.pattern})`);
  console.log(`Target: ${destRoot}${dryRun ? ' (dry-run)' : ''}`);
  console.log(`Description: ${preset.description}`);
  console.log('');

  let created = 0;
  let skipped = 0;

  for (const fileSpec of preset.files) {
    const res = await applyFileSpec({ spec: fileSpec, destRoot, dryRun, force });
    if (res === 'done' || res === 'dry') created++;
    else skipped++;
  }

  console.log('');
  console.log(`Done. ${created} created, ${skipped} skipped.`);
  if (!dryRun && created > 0) {
    console.log('');
    console.log(`Next: edit TODO markers in the generated files, then restart Claude Code`);
    console.log(`to pick up new .claude/agents/ and .claude/skills/.`);
  }
}

module.exports = { generate, listPresets };
