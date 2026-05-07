#!/usr/bin/env node
'use strict';

const { install } = require('../lib/install');
const { list } = require('../lib/list');
const { remove } = require('../lib/remove');
const { update } = require('../lib/update');
const { validate } = require('../lib/validate');
const { newCmd } = require('../lib/new');
const { generate } = require('../lib/generate');
const { adopt } = require('../lib/adopt');
const { diff } = require('../lib/diff');
const { doctor } = require('../lib/doctor');
const { trace } = require('../lib/trace');
const { logEvent, evolve } = require('../lib/evolve');
const { search } = require('../lib/search');
const { open: openCmd } = require('../lib/open');
const { exportCmd, importCmd } = require('../lib/export-import');
const { cost } = require('../lib/cost');
const { name: PKG_NAME, version: PKG_VERSION } = require('../package.json');

const [, , command, ...args] = process.argv;

function getFlagValue(list, name) {
  const i = list.indexOf(name);
  return i >= 0 && list[i + 1] !== undefined ? list[i + 1] : null;
}

const FLAGS_WITH_VALUE = new Set(['--target', '--only', '--top', '--event', '--note', '--helpful', '--utterance', '--kind', '--editor', '--output', '--by', '--days', '--match', '--session']);

const flags = {
  link: args.includes('--link'),
  force: args.includes('--force') || args.includes('-f'),
  dryRun: args.includes('--dry-run'),
  target: getFlagValue(args, '--target'),
  only: getFlagValue(args, '--only'),
  project: args.includes('--project'),
  globalOnly: args.includes('--global'),
  yes: args.includes('--yes') || args.includes('-y'),
  full: args.includes('--full'),
  warnOnly: args.includes('--warn-only'),
  top: getFlagValue(args, '--top'),
  listFlag: args.includes('--list'),
  enable: args.includes('--enable'),
  disable: args.includes('--disable'),
  statusFlag: args.includes('--status'),
  event: getFlagValue(args, '--event'),
  note: getFlagValue(args, '--note'),
  helpful: getFlagValue(args, '--helpful'),
  utterance: getFlagValue(args, '--utterance'),
  deep: args.includes('--deep'),
  fast: args.includes('--fast'),
  usage: args.includes('--usage'),
  kind: getFlagValue(args, '--kind'),
  editor: getFlagValue(args, '--editor'),
  output: getFlagValue(args, '--output'),
  all: args.includes('--all'),
  caseSensitive: args.includes('--case-sensitive'),
  by: getFlagValue(args, '--by'),
  days: getFlagValue(args, '--days'),
  match: getFlagValue(args, '--match'),
  session: getFlagValue(args, '--session'),
  json: args.includes('--json'),
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
    `@han-kyeon/claude-skills v${PKG_VERSION} — Portable Claude Code skills, commands, and team-agent factory`,
    '',
    'Usage:',
    '  claude-skills <command> [options] [args...]',
    '  cfh <command> [options] [args...]',
    '  cfh --version              Print version and exit',
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
    'Maintenance commands (0.3.0):',
    '  adopt <name>                  Convert managed item to user-authored (drops manifest)',
    '  diff <name>                   Show what you changed since install (summary)',
    '  doctor                        Run health checks on installed items (--usage adds 30-day usage summary)',
    '  trace "<query>"               Simulate which skill would be triggered by an utterance',
    '',
    'Evolution commands (0.3.0, opt-in):',
    '  log <skill>                   Record a usage event to ~/.claude/.cfh-logs/<skill>.jsonl',
    '  log --enable | --disable      Turn telemetry on/off (opt-in, local only)',
    '  log --status                  Show telemetry state and log file summary',
    '  evolve [<skill>]              Analyze description + logs, print suggestions (no auto-apply)',
    '',
    'Utilities (0.7.0):',
    '  search "<keyword>"            Search installed skills/commands by keyword (name + description + body)',
    '  open <name>                   Open SKILL.md or command .md in $EDITOR',
    '  export [names...]             Export user-authored assets to a JSON bundle (pass --all for managed too)',
    '  import <bundle.json>          Import assets from a bundle (conflicts require --force or interactive confirm)',
    '',
    'Cost telemetry (0.10.0):',
    '  cost                          Aggregate token usage from Claude Code transcripts',
    '  cost --by command|day|model|session    Pick the breakdown view',
    '  cost --days N --match <substr>          Filter by recency / project name',
    '',
    'Options:',
    '  --link                        Use symbolic links instead of copying (install only)',
    '  --force, -f                   Overwrite existing / bypass safety refusals',
    '  --yes, -y                     Skip confirmation prompts (adopt)',
    '  --dry-run                     Show actions without writing',
    '  --full                        For "diff": show unified diff instead of summary',
    '  --warn-only                   For "doctor": exit 0 even on issues',
    '  --usage                       For "doctor": append 30-day usage summary from cfh log data',
    '  --deep / --fast               For "/cfh-team": bypass Deep-dive gate ((b) all yes / (c) skip)',
    '  --top <N>                     For "trace": number of top matches to show (default 5)',
    '  --target <path>               Override target root (default: ~/.claude for install,',
    '                                cwd for generate)',
    '  --only skills|commands        Install/update only one kind',
    '  --project                     For "new": scaffold into ./.claude/ instead of ~/.claude/',
    '                                For "list": show only project-local',
    '  --global                      For "list": show only ~/.claude',
    '',
    'Examples:',
    '  cfh install                   Install all packaged skills + commands',
    '  cfh install --link            Use symlinks (auto-update on npm update)',
    '  cfh install refactoring-strategy    Only a specific item',
    '  cfh update --only skills      Refresh only skills, never commands',
    '  cfh list                      Global + project (if ./.claude exists)',
    '  cfh list --project            Only project-local ./.claude',
    '  cfh new skill my-auth-flow    Create a blank skill at ~/.claude/skills/my-auth-flow/',
    '  cfh new skill my-flow --project   Create at ./.claude/skills/my-flow/ instead',
    '  cfh validate                  Check all skills + commands',
    '  cfh generate --list           See available team presets',
    '  cfh generate producer-reviewer    Write producer/reviewer agents + skill to ./.claude/',
    '  cfh adopt refactoring-strategy    Drop manifest so cfh update leaves it alone',
    '  cfh diff tdd-first            See what I changed after install',
    '  cfh doctor                    Check for broken manifests, trigger clashes, etc.',
    '  cfh trace "리뷰해줘"          See which skill would trigger',
    '  cfh log --enable              Opt-in to local usage logging',
    '  cfh log tdd-first --event trigger --utterance "TDD로 시작" --helpful y',
    '  cfh evolve                    Print suggestions for all installed skills',
    '  cfh evolve tdd-first          Focus on a specific skill',
    '  cfh remove tdd-first          Remove installed skill',
    '  cfh cost --days 7 --by command    Token usage by /cfh-* command, last 7 days',
    '  cfh cost --by session         Recent sessions with token cost',
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
        await list({
          target: flags.target,
          globalOnly: flags.globalOnly,
          projectOnly: flags.project,
        });
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
      case 'adopt':
        await adopt({
          name: positional[0],
          target: flags.target,
          dryRun: flags.dryRun,
          yes: flags.yes,
        });
        break;
      case 'diff':
        await diff({
          name: positional[0],
          target: flags.target,
          full: flags.full,
        });
        break;
      case 'doctor':
        await doctor({
          target: flags.target,
          warnOnly: flags.warnOnly,
          usage: flags.usage,
        });
        break;
      case 'trace':
        await trace({
          query: positional.join(' '),
          target: flags.target,
          top: flags.top ? Number(flags.top) : 5,
        });
        break;
      case 'log':
        await logEvent({
          skill: positional[0],
          event: flags.event,
          note: flags.note,
          helpful: flags.helpful,
          utterance: flags.utterance,
          enable: flags.enable,
          disable: flags.disable,
          status: flags.statusFlag,
        });
        break;
      case 'evolve':
        await evolve({
          name: positional[0],
        });
        break;
      case 'search':
        await search({
          query: positional.join(' '),
          target: flags.target,
          kind: flags.kind,
          caseSensitive: flags.caseSensitive,
        });
        break;
      case 'open':
        await openCmd({
          name: positional[0],
          target: flags.target,
          editor: flags.editor,
        });
        break;
      case 'export':
        await exportCmd({
          output: flags.output,
          target: flags.target,
          all: flags.all,
          names: positional,
        });
        break;
      case 'import':
        await importCmd({
          input: positional[0],
          target: flags.target,
          force: flags.force,
          yes: flags.yes,
          dryRun: flags.dryRun,
        });
        break;
      case 'cost':
        await cost({
          target: flags.target,
          project: flags.match,
          days: flags.days ? Number(flags.days) : null,
          by: flags.by,
          sessionId: flags.session,
          json: flags.json,
        });
        break;
      case 'version':
      case '--version':
      case '-v':
        console.log(`${PKG_NAME} ${PKG_VERSION}`);
        console.log(`node ${process.version}`);
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
