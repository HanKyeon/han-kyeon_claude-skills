'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getSkillsTargetDir, getCommandsTargetDir, getProjectClaudeDir } = require('./paths');

const DEBOUNCE_MS = 500;

function fmtTime() {
  const d = new Date();
  return d.toISOString().slice(11, 19);
}

function findCfhBin() {
  // Used to spawn validate / doctor as child processes
  return path.join(__dirname, '..', 'bin', 'cli.js');
}

function runCommand(args, label, cwd) {
  return new Promise((resolve) => {
    const cliPath = findCfhBin();
    const child = spawn(process.execPath, [cliPath, ...args], { cwd, stdio: 'inherit' });
    child.on('exit', (code) => {
      const status = code === 0 ? 'ok' : `exit ${code}`;
      console.log(`[${fmtTime()}] ${label}: ${status}`);
      resolve(code);
    });
  });
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function gatherWatchPaths({ target } = {}) {
  const paths = [];
  if (target) {
    paths.push(path.join(target, 'skills'));
    paths.push(path.join(target, 'commands'));
  } else {
    paths.push(getSkillsTargetDir());
    paths.push(getCommandsTargetDir());
    const proj = getProjectClaudeDir();
    if (fs.existsSync(proj)) {
      paths.push(path.join(proj, 'skills'));
      paths.push(path.join(proj, 'commands'));
    }
  }
  return paths.filter((p) => fs.existsSync(p));
}

async function watchCmd({ target, doctor: alsoDoctor } = {}) {
  const paths = gatherWatchPaths({ target });
  if (paths.length === 0) {
    console.error('No skills/commands directories to watch. Run cfh install first or pass --target.');
    process.exitCode = 1;
    return;
  }

  console.log('🔭 cfh watch');
  console.log('Watching:');
  for (const p of paths) console.log(`  ${p}`);
  console.log('');
  console.log('On change: validate' + (alsoDoctor ? ' + doctor' : '') + '. Press Ctrl+C to stop.');
  console.log('');

  let running = false;
  const args = ['validate'];
  if (target) args.push('--target', target);
  const doctorArgs = ['doctor'];
  if (target) doctorArgs.push('--target', target);

  const runChecks = async () => {
    if (running) return;
    running = true;
    console.log(`[${fmtTime()}] change detected — running checks…`);
    await runCommand(args, 'validate');
    if (alsoDoctor) {
      await runCommand(doctorArgs, 'doctor');
    }
    console.log('');
    running = false;
  };

  const debounced = debounce(runChecks, DEBOUNCE_MS);

  // Initial run
  await runChecks();

  for (const watchPath of paths) {
    try {
      fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        // Ignore manifest/internal files to avoid feedback loops
        if (filename.endsWith('.cfh-manifest.json')) return;
        if (filename.startsWith('.cfh-logs')) return;
        debounced();
      });
    } catch (err) {
      console.error(`Could not watch ${watchPath}: ${err.message}`);
    }
  }

  // Keep process alive
  return new Promise(() => {});
}

module.exports = { watchCmd };
