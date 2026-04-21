'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  getSkillsTargetDir,
  getCommandsTargetDir,
  getProjectClaudeDir,
} = require('./paths');

function resolveTargetPath({ name, target }) {
  // Build candidate paths in priority order (project > global > target override)
  const candidates = [];
  if (target) {
    candidates.push(path.join(getSkillsTargetDir(path.join(target, 'skills')), name, 'SKILL.md'));
    candidates.push(path.join(getCommandsTargetDir(path.join(target, 'commands')), `${name}.md`));
  } else {
    const projRoot = getProjectClaudeDir();
    candidates.push(path.join(projRoot, 'skills', name, 'SKILL.md'));
    candidates.push(path.join(projRoot, 'commands', `${name}.md`));
    candidates.push(path.join(projRoot, 'agents', `${name}.md`));
    candidates.push(path.join(getSkillsTargetDir(), name, 'SKILL.md'));
    candidates.push(path.join(getCommandsTargetDir(), `${name}.md`));
  }

  const hits = candidates.filter((p) => fs.existsSync(p));
  return hits;
}

async function openCmd({ name, target, editor }) {
  if (!name) {
    throw new Error('Usage: cfh open <name> [--target <path>] [--editor <cmd>]');
  }

  const hits = resolveTargetPath({ name, target });
  if (hits.length === 0) {
    throw new Error(
      `Not found: "${name}" (searched project + global, skill/command/agent).\n` +
        `  Run "cfh list" to see installed items.`
    );
  }

  // If multiple hits (project + global), project wins silently and note others
  const chosen = hits[0];
  if (hits.length > 1) {
    console.log('');
    console.log(`  Multiple matches for "${name}":`);
    for (const h of hits) console.log(`    - ${h}${h === chosen ? '  ← opening (project > global)' : ''}`);
    console.log('');
  }

  const editorCmd = editor || process.env.EDITOR || process.env.VISUAL;
  if (!editorCmd) {
    console.log('');
    console.log(`  File: ${chosen}`);
    console.log(`  EDITOR·VISUAL 환경변수가 설정되지 않아 자동으로 열 수 없습니다.`);
    console.log(`  다음 중 하나로 직접 여세요:`);
    console.log(`    - export EDITOR=code   (VSCode)`);
    console.log(`    - export EDITOR=vim`);
    console.log(`    - cfh open <name> --editor code`);
    return;
  }

  console.log(`  Opening ${chosen} with "${editorCmd}"...`);
  // Parse editor command (may contain args like "code -w")
  const parts = editorCmd.split(/\s+/).filter(Boolean);
  const cmd = parts[0];
  const args = [...parts.slice(1), chosen];

  try {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    await new Promise((resolve, reject) => {
      child.on('close', (code) => (code === 0 ? resolve() : resolve()));
      child.on('error', reject);
    });
  } catch (err) {
    throw new Error(`Failed to launch editor "${editorCmd}": ${err.message}`);
  }
}

module.exports = { open: openCmd };
