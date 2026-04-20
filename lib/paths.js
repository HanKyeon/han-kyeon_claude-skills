'use strict';

const path = require('path');
const os = require('os');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const SKILLS_SOURCE_DIR = path.join(PACKAGE_ROOT, 'skills');
const COMMANDS_SOURCE_DIR = path.join(PACKAGE_ROOT, 'commands');
const TEMPLATES_DIR = path.join(PACKAGE_ROOT, 'templates');
const PRESETS_DIR = path.join(TEMPLATES_DIR, 'presets');

function getClaudeDir(override) {
  if (override) return path.resolve(override);
  return path.join(os.homedir(), '.claude');
}

function getSkillsTargetDir(override) {
  if (override) return path.resolve(override);
  return path.join(os.homedir(), '.claude', 'skills');
}

function getCommandsTargetDir(override) {
  if (override) return path.resolve(override);
  return path.join(os.homedir(), '.claude', 'commands');
}

function getProjectClaudeDir(cwd = process.cwd()) {
  return path.join(cwd, '.claude');
}

module.exports = {
  PACKAGE_ROOT,
  SKILLS_SOURCE_DIR,
  COMMANDS_SOURCE_DIR,
  TEMPLATES_DIR,
  PRESETS_DIR,
  getClaudeDir,
  getSkillsTargetDir,
  getCommandsTargetDir,
  getProjectClaudeDir,
};
