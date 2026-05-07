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

function diffSkillsVsEvals({ target } = {}) {
  const skillsDir = getSkillsTargetDir(target && path.join(target, 'skills'));
  if (!fs.existsSync(skillsDir)) {
    console.log('No skills directory found. Run cfh install first.');
    return;
  }

  const stale = [];
  const fresh = [];
  const noEvals = [];

  const entries = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory());

  for (const entry of entries) {
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    const evalsDir = path.join(skillsDir, entry.name, 'evals');
    if (!fs.existsSync(skillFile)) continue;

    const skillMtime = fs.statSync(skillFile).mtime;

    if (!fs.existsSync(evalsDir)) {
      noEvals.push({ name: entry.name, skillMtime });
      continue;
    }

    const evalFiles = fs.readdirSync(evalsDir).filter((f) => f.endsWith('.json'));
    if (evalFiles.length === 0) {
      noEvals.push({ name: entry.name, skillMtime });
      continue;
    }

    // Find youngest eval file
    let youngestEvalMtime = new Date(0);
    let youngestEvalFile = null;
    for (const f of evalFiles) {
      const fp = path.join(evalsDir, f);
      const m = fs.statSync(fp).mtime;
      if (m > youngestEvalMtime) {
        youngestEvalMtime = m;
        youngestEvalFile = f;
      }
    }

    const ageDiffMs = skillMtime.getTime() - youngestEvalMtime.getTime();
    const ageDiffDays = ageDiffMs / 86400000;

    if (ageDiffMs > 0) {
      stale.push({
        name: entry.name,
        skillMtime,
        evalMtime: youngestEvalMtime,
        evalFile: youngestEvalFile,
        ageDiffDays,
        evalCount: evalFiles.length,
      });
    } else {
      fresh.push({
        name: entry.name,
        skillMtime,
        evalMtime: youngestEvalMtime,
        evalCount: evalFiles.length,
      });
    }
  }

  console.log('');
  console.log('🕒 Skills vs evals staleness check');
  console.log(`  Source: ${skillsDir}`);
  console.log('');
  console.log(`  Fresh:    ${fresh.length} skills (evals updated after SKILL.md)`);
  console.log(`  Stale:    ${stale.length} skills (SKILL.md updated after evals — review evals)`);
  console.log(`  No evals: ${noEvals.length} skills`);
  console.log('');

  if (stale.length > 0) {
    console.log('  ⚠ Stale skills (consider re-running cfh eval after recent description changes):');
    console.log('');
    const sorted = [...stale].sort((a, b) => b.ageDiffDays - a.ageDiffDays);
    for (const s of sorted) {
      const days = s.ageDiffDays >= 1 ? `${s.ageDiffDays.toFixed(1)}d` : `${(s.ageDiffDays * 24).toFixed(1)}h`;
      console.log(`    • ${s.name.padEnd(24)} SKILL.md ${days} newer than ${s.evalFile} (${s.evalCount} cases)`);
    }
    console.log('');
  }

  if (noEvals.length > 0) {
    console.log('  ℹ No evals/ directory:');
    console.log('');
    for (const s of noEvals) {
      console.log(`    • ${s.name}`);
    }
    console.log('');
    console.log('    Suggested: add at least 1 happy-path + 1 anti-trigger case per skill.');
    console.log('');
  }

  if (stale.length === 0 && noEvals.length === 0) {
    console.log('  ✅ All skills with evals are fresh.');
  }
}

async function diff({ name, target, full, skillsVsEvals }) {
  if (skillsVsEvals) {
    diffSkillsVsEvals({ target });
    return;
  }

  if (!name) {
    throw new Error('Usage: cfh diff <name> [--full]  |  cfh diff --skills-vs-evals');
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

module.exports = { diff, diffSkillsVsEvals };
