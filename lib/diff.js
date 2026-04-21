'use strict';

const fs = require('fs');
const path = require('path');
const {
  SKILLS_SOURCE_DIR,
  COMMANDS_SOURCE_DIR,
  getSkillsTargetDir,
  getCommandsTargetDir,
} = require('./paths');
const { readManifest, hashUnit } = require('./manifest');

function resolveUnit({ name, target }) {
  const skillsDir = getSkillsTargetDir(target && path.join(target, 'skills'));
  const commandsDir = getCommandsTargetDir(target && path.join(target, 'commands'));

  const skillPath = path.join(skillsDir, name);
  if (fs.existsSync(skillPath) && fs.statSync(skillPath).isDirectory()) {
    return { kind: 'skill', path: skillPath, sourcePath: path.join(SKILLS_SOURCE_DIR, name) };
  }

  const commandPath = path.join(commandsDir, `${name}.md`);
  if (fs.existsSync(commandPath) && fs.statSync(commandPath).isFile()) {
    return {
      kind: 'command',
      path: commandPath,
      sourcePath: path.join(COMMANDS_SOURCE_DIR, `${name}.md`),
    };
  }

  return null;
}

function splitLines(text) {
  return text.split(/\r?\n/);
}

function unifiedDiff(oldText, newText, filePath, oldLabel, newLabel) {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);

  const m = oldLines.length;
  const n = newLines.length;
  const lcs = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = oldLines[i] === newLines[j]
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const out = [`--- ${filePath} (${oldLabel})`, `+++ ${filePath} (${newLabel})`];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      out.push(`  ${oldLines[i]}`);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push(`- ${oldLines[i]}`);
      i++;
    } else {
      out.push(`+ ${newLines[j]}`);
      j++;
    }
  }
  while (i < m) out.push(`- ${oldLines[i++]}`);
  while (j < n) out.push(`+ ${newLines[j++]}`);
  return out.join('\n');
}

function resolveFilePair(unit, relPath) {
  if (unit.kind === 'command') {
    return { current: unit.path, source: unit.sourcePath };
  }
  return {
    current: path.join(unit.path, relPath),
    source: path.join(unit.sourcePath, relPath),
  };
}

async function diff({ name, target, full }) {
  if (!name) {
    throw new Error('Usage: cfh diff <name> [--full]');
  }

  const unit = resolveUnit({ name, target });
  if (!unit) {
    throw new Error(`Not found: "${name}". Run "cfh list" to see installed items.`);
  }

  const manifest = readManifest(unit.path);
  if (!manifest) {
    console.log(`  =  "${name}" is user-authored (no manifest to diff against).`);
    return;
  }

  const { files: currentFiles } = hashUnit(unit.path);
  const baselineFiles = manifest.files || {};

  const allKeys = new Set([...Object.keys(baselineFiles), ...Object.keys(currentFiles)]);
  const added = [];
  const removed = [];
  const modified = [];
  for (const key of allKeys) {
    const base = baselineFiles[key];
    const cur = currentFiles[key];
    if (base && !cur) removed.push(key);
    else if (!base && cur) added.push(key);
    else if (base !== cur) modified.push(key);
  }

  console.log('');
  console.log(`  Diff: ${unit.kind} "${name}"`);
  console.log(`  Baseline: installed manifest @ ${manifest.version} (hash snapshot)`);
  console.log(`  Current:  ${unit.path}`);
  console.log('');

  if (added.length === 0 && removed.length === 0 && modified.length === 0) {
    console.log(`  =  No changes since install.`);
    return;
  }

  console.log(`  Summary (what you changed since install):`);
  console.log(`    + ${added.length} added    - ${removed.length} removed    ~ ${modified.length} modified`);
  console.log('');
  for (const f of added.sort()) console.log(`    +  ${f}`);
  for (const f of removed.sort()) console.log(`    -  ${f}`);
  for (const f of modified.sort()) console.log(`    ~  ${f}`);

  if (!full) {
    console.log('');
    console.log(`  Run with --full to see unified diff against the current package source.`);
    console.log(`  (Manifest stores hashes only, so full content diff is vs package source, not install-time snapshot.)`);
    return;
  }

  console.log('');
  console.log(`  === Unified diff (current vs package source) ===`);
  console.log(`  Note: comparing to package source at v${require('../package.json').version}.`);
  console.log(`  If that differs from your install manifest (${manifest.version}), diff mixes upstream + local changes.`);
  console.log('');

  const modifiedOrAdded = [...modified, ...added].sort();
  for (const relPath of modifiedOrAdded) {
    const { current, source } = resolveFilePair(unit, relPath);
    let curText = '';
    let srcText = '';
    try {
      curText = fs.readFileSync(current, 'utf8');
    } catch {
      curText = '';
    }
    try {
      srcText = fs.readFileSync(source, 'utf8');
    } catch {
      srcText = '(not in package source)';
    }
    console.log(unifiedDiff(srcText, curText, relPath, 'package source', 'current'));
    console.log('');
  }
}

module.exports = { diff };
