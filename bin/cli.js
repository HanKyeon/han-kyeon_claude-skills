#!/usr/bin/env node
'use strict';

const { install } = require('../lib/install');
const { list } = require('../lib/list');
const { remove } = require('../lib/remove');
const { update } = require('../lib/update');
const { validate } = require('../lib/validate');
const { newCmd } = require('../lib/new');
const { generate } = require('../lib/generate');

const [, , command, ...args] = process.argv;

function getFlagValue(list, name) {
  const i = list.indexOf(name);
  return i >= 0 && list[i + 1] !== undefined ? list[i + 1] : null;
}

const FLAGS_WITH_VALUE = new Set(['--target', '--only']);

const flags = {
  link: args.includes('--link'),
  force: args.includes('--force') || args.includes('-f'),
  dryRun: args.includes('--dry-run'),
  target: getFlagValue(args, '--target'),
  only: getFlagValue(args, '--only'),
  project: args.includes('--project'),
  listFlag: args.includes('--list'),
};

const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('-')) {
    if (FLAGS_WITH_VALUE.has(a)) i++;
    continue;
  }
  positional.push(a);
}

function printHelp() {
  const help = [
    '',
    '@hankyeon/claude-skills — Portable Claude Code skills, commands, and team-agent factory',
    '',
    'Usage:',
    '  claude-skills <command> [options] [args...]',
    '  cfh <command> [options] [args...]',
    '',
    'Install commands:',
    '  install [name...]             Install packaged skills + commands (copy by default)',
    '  update [name...]              Update managed items to latest packaged version',
    '  list, ls                      List installed items with manifest status',
    '  remove, rm <name>             Remove installed item (refuses user-authored unless --force)',
    '',
    'Authoring commands (framework mode):',
    '  new <kind> <name>             Scaffold a new skill/command/agent from templates',
    '                                kind: skill | command | agent',
    '  validate                      Lint all skills/commands (frontmatter + invocation checks)',
    '  generate <preset>             Generate a team (agents + skills) in .claude/ from a preset',
    '  generate --list               List available presets',
    '',
    'Options:',
    '  --link                        Use symbolic links instead of copying (install only)',
    '  --force, -f                   Overwrite existing / bypass safety refusals',
    '  --dry-run                     Show actions without writing',
    '  --target <path>               Override target root (default: ~/.claude for install,',
    '                                cwd for generate)',
    '  --only skills|commands        Install/update only one kind',
    '  --project                     For "new": scaffold into ./.claude/ instead of ~/.claude/',
    '',
    'Examples:',
    '  cfh install                   Install all packaged skills + commands',
    '  cfh install --link            Use symlinks (auto-update on npm update)',
    '  cfh install refactoring-strategy    Only a specific item',
    '  cfh update --only skills      Refresh only skills, never commands',
    '  cfh list                      Show installed with managed/user-authored status',
    '  cfh new skill my-auth-flow    Create a blank skill at ~/.claude/skills/my-auth-flow/',
    '  cfh new skill my-flow --project   Create at ./.claude/skills/my-flow/ instead',
    '  cfh new agent code-reviewer --project',
    '  cfh validate                  Check all skills + commands',
    '  cfh generate --list           See available team presets',
    '  cfh generate producer-reviewer    Write producer/reviewer agents + skill to ./.claude/',
    '  cfh remove tdd-first          Remove installed skill',
    '',
    'Default paths:',
    '  Install target:  ~/.claude/{skills,commands}/',
    '  Generate target: ./.claude/{agents,skills}/  (project-local)',
    '',
  ];
  console.log(help.join('\n'));
}

async function main() {
  try {
    switch (command) {
      case 'install':
        await install({ ...flags, skills: positional });
        break;
      case 'update':
        await update({ ...flags, skills: positional });
        break;
      case 'list':
      case 'ls':
        await list(flags);
        break;
      case 'remove':
      case 'rm':
        if (positional.length === 0) {
          console.error('Usage: cfh remove <name> [...]');
          process.exit(1);
        }
        await remove({ ...flags, skills: positional });
        break;
      case 'validate':
        await validate(flags);
        break;
      case 'new':
        await newCmd({
          kind: positional[0],
          name: positional[1],
          dryRun: flags.dryRun,
          force: flags.force,
          target: flags.target,
          project: flags.project,
        });
        break;
      case 'generate':
        await generate({
          presetName: positional[0],
          dryRun: flags.dryRun,
          force: flags.force,
          target: flags.target,
          list: flags.listFlag,
        });
        break;
      case undefined:
      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
