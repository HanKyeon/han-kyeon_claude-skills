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
const { cloneCut } = require('../lib/clone-cut');
const { logEvent, evolve } = require('../lib/evolve');
const { search } = require('../lib/search');
const { open: openCmd } = require('../lib/open');
const { exportCmd, importCmd } = require('../lib/export-import');
const { cost } = require('../lib/cost');
const { evalCmd } = require('../lib/eval');
const { sentry } = require('../lib/sentry');
const { dashboardCmd } = require('../lib/dashboard');
const { watchCmd } = require('../lib/watch');
const { name: PKG_NAME, version: PKG_VERSION } = require('../package.json');

const [, , command, ...args] = process.argv;

function getFlagValue(list, name) {
  const i = list.indexOf(name);
  return i >= 0 && list[i + 1] !== undefined ? list[i + 1] : null;
}

const FLAGS_WITH_VALUE = new Set(['--target', '--only', '--top', '--event', '--note', '--helpful', '--utterance', '--kind', '--editor', '--output', '--by', '--days', '--match', '--session', '--executor', '--tool', '--report', '--variants', '--since-commit', '--from-existing', '--judge-model']);

// --link flag was removed in 1.0 (see PLAN.md Track 1.3). Detect + warn for graceful UX.
const _deprecatedLinkFlag = args.includes('--link');

const flags = {
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
  sh: args.includes('--sh'),
  anchor: getFlagValue(args, '--anchor'),
  manual: args.includes('--manual'),
  executor: getFlagValue(args, '--executor'),
  baseline: args.includes('--baseline'),
  strictConfidence: args.includes('--strict-confidence'),
  mapping: args.includes('--mapping'),
  tool: getFlagValue(args, '--tool'),
  report: getFlagValue(args, '--report'),
  variants: getFlagValue(args, '--variants'),
  strict: args.includes('--strict') ? true : undefined,
  legacy: args.includes('--legacy'),
  sinceCommit: getFlagValue(args, '--since-commit'),
  fromExisting: getFlagValue(args, '--from-existing'),
  skillsVsEvals: args.includes('--skills-vs-evals'),
  enableJudge: args.includes('--enable-judge'),
  judgeModel: getFlagValue(args, '--judge-model'),
  live: args.includes('--live'),
  installHook: args.includes('--install-hook'),
  noMirror: args.includes('--no-mirror'),
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
    '  generate <preset>             Generate a team (agents + skills) in .claude/ from a preset',
    '  generate --list               List available presets',
    '',
    'Maintenance / health (1.0):',
    '  check                         Run all health checks (schema lint + skill diagnostics)',
    '  check schema                  Frontmatter lint only (alias: `cfh validate`)',
    '  check skills                  Trigger overlap / orphan manifest / agent team checks (alias: `cfh doctor`)',
    '  check --strict                Stricter frontmatter rules + confidence-tagging coverage',
    '  adopt <name>                  Convert managed item to user-authored (drops manifest)',
    '  diff <name>                   Show what you changed since install (summary)',
    '  diff --skills-vs-evals        Detect skills whose SKILL.md is newer than evals',
    '  trace "<query>"               Simulate which skill would be triggered by an utterance',
    '  clone <session-id> [project]  CFH-aware tail clone of a session (preserves latest confirmed intent)',
    '  clone-cut <session.jsonl>     CFH-aware session cut point (confirm sentinel·cfh command anchors; --sh for eval)',
    '  (legacy: `cfh validate` / `cfh doctor` still work with a deprecation warning until 2.0.)',
    '',
    'Feedback / evolution (opt-in, local only):',
    '  feedback [<skill>]            Analyze description + logs, print suggestions (no auto-apply)',
    '  feedback enable | disable     Turn telemetry on/off',
    '  feedback status               Show telemetry state and log file summary',
    '  feedback log <skill>          Record a usage event to ~/.claude/.cfh-logs/<skill>.jsonl',
    '                                  Flags: --event trigger|success|miss --note "..." --helpful y|n --utterance "..."',
    '  (legacy: `cfh evolve` and `cfh log` still work with a deprecation warning until 2.0.)',
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
    'Maintainer-facing (skill authors):',
    '  dev eval [skill]              Run skill eval cases (default: dry-run, no LLM call)',
    '  dev eval --list [skill]       List available eval cases',
    '  dev eval --dry-run            Print prompts + assertions, do not run',
    '  dev eval --manual             Paste claude output manually for each case',
    '  dev eval --executor claude    Run via claude CLI subprocess (consumes tokens)',
    '  dev eval --baseline           A/B compare: skill enabled vs soft anti-trigger',
    '  dev eval --variants <file>    Compare description variants by trace score',
    '  dev eval --report junit       Output JUnit XML for CI integration',
    '  dev eval --enable-judge       Run judge assertions (semantic, LLM call per assertion)',
    '  dev eval --judge-model <name> Override judge model (default: claude-haiku-4-5)',
    '  (legacy: top-level `cfh eval` still works with a deprecation warning until 2.0.)',
    '',
    'Tool failure sensor:',
    '  sentry                        Detect tool errors / loops / empty reads in transcripts',
    '  sentry --days N --tool Read   Filter by recency / specific tool',
    '  sentry live                   Show current PostToolUse hook state',
    '  sentry hook install           Copy hook script + print settings.json snippet',
    '  (legacy: `--live` and `--install-hook` flags still work with a deprecation warning until 2.0.)',
    '',
    'Observability (1.0):',
    '  stats                         Combined cost + sentry + eval coverage report (markdown)',
    '  stats cost                    Token usage breakdown (alias: `cfh cost`)',
    '  stats errors                  Tool failure summary (alias: `cfh sentry`)',
    '  stats --output FILE           Write to file instead of stdout',
    '  (legacy: `cfh dashboard` still works with a deprecation warning until 2.0.)',
    '',
    'Cost regression / DX (0.12.0):',
    '  cost --since-commit <hash>    Compare token usage before/after a git commit',
    '  diff --skills-vs-evals        Detect skills whose SKILL.md is newer than evals',
    '  new skill <name> --from-existing <other>    Fork an existing skill',
    '  watch [--doctor]              Re-run validate (and doctor) on file changes',
    '  validate --strict             Schema lint with stricter frontmatter rules',
    '',
    'Options:',
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
    '  cfh feedback enable           Opt-in to local usage logging',
    '  cfh feedback log tdd-first --event trigger --utterance "TDD로 시작" --helpful y',
    '  cfh feedback                  Print suggestions for all installed skills',
    '  cfh feedback tdd-first        Focus on a specific skill',
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
        if (_deprecatedLinkFlag) {
          console.warn('  !  --link is no longer supported (removed in 1.0). For local dev iteration, use `npm link` from the package source. Continuing with copy install.');
        }
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
        console.warn('  !  `cfh validate` is deprecated (removed in 2.0). Use `cfh check schema` (or `cfh check` for everything).');
        await validate(flags);
        break;
      case 'check': {
        // 1.0 health-check umbrella (Track 1.4): combines validate + doctor.
        // Subcommands: (none) = all, schema = validate, skills = doctor
        // --strict propagates to BOTH (umbrella expectation): schema=strict frontmatter,
        // skills=strict-confidence coverage. --strict-confidence remains a direct opt-in.
        const sub = positional[0];
        const strictAll = flags.strict === true;
        const doctorArgs = {
          target: flags.target,
          warnOnly: flags.warnOnly,
          usage: flags.usage,
          strictConfidence: flags.strictConfidence || strictAll,
          mapping: flags.mapping,
        };
        switch (sub) {
          case undefined:
            await validate(flags);
            console.log('');
            await doctor(doctorArgs);
            break;
          case 'schema':
            await validate(flags);
            break;
          case 'skills':
            await doctor(doctorArgs);
            break;
          default:
            console.error(`  ✖ Unknown check subcommand: "${sub}". Available: (none) | schema | skills`);
            process.exitCode = 1;
            break;
        }
        break;
      }
      case 'new':
        await newCmd({
          kind: positional[0],
          name: positional[1],
          dryRun: flags.dryRun,
          force: flags.force,
          target: flags.target,
          project: flags.project,
          fromExisting: flags.fromExisting,
          noMirror: flags.noMirror,
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
          skillsVsEvals: flags.skillsVsEvals,
        });
        break;
      case 'doctor':
        console.warn('  !  `cfh doctor` is deprecated (removed in 2.0). Use `cfh check skills` (or `cfh check` for everything).');
        await doctor({
          target: flags.target,
          warnOnly: flags.warnOnly,
          usage: flags.usage,
          strictConfidence: flags.strictConfidence,
          mapping: flags.mapping,
        });
        break;
      case 'trace':
        await trace({
          query: positional.join(' '),
          target: flags.target,
          top: flags.top ? Number(flags.top) : 5,
        });
        break;
      case 'clone-cut':
        await cloneCut({ file: positional[0], sh: flags.sh });
        break;
      case 'clone': {
        // CFH-aware tail clone — runs the bundled bash script (requires bash, e.g. Git Bash on Windows)
        const path = require('path');
        const { spawnSync } = require('child_process');
        const scriptPath = path.join(__dirname, '..', 'scripts', 'cfh-clone-conversation.sh');
        if (!positional[0]) {
          console.error('Usage: cfh clone <session-id> [project-path]');
          process.exitCode = 1;
          break;
        }
        // positional은 flag '값'을 제거하지 않음 — --anchor half의 'half'가
        // 스크립트의 [project-path] 인자로 새는 것을 차단 (e2e 실측에서 발견)
        const clonePositional = positional.filter((p) => p !== flags.anchor);
        const anchorArgs = flags.anchor ? ['--anchor', flags.anchor] : [];
        const res = spawnSync('bash', [scriptPath, ...clonePositional, ...anchorArgs], { stdio: 'inherit' });
        process.exitCode = res.status == null ? 1 : res.status;
        break;
      }
      case 'log': {
        console.warn('  !  `cfh log` is deprecated (removed in 2.0). Use `cfh feedback` subcommands instead.');
        // Legacy flag-style routing — same args as 0.x
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
      }
      case 'evolve': {
        console.warn('  !  `cfh evolve` is deprecated (removed in 2.0). Use `cfh feedback [skill]` instead.');
        // Legacy passthrough: --top N → cfh feedback top N behavior.
        const topN = flags.top ? parseInt(flags.top, 10) : null;
        await evolve({ name: positional[0], top: Number.isFinite(topN) ? topN : null });
        break;
      }
      case 'feedback': {
        // Unified feedback command (1.0 — Track 1.1 + Track 2 in PLAN.md).
        // Subcommands: enable | disable | status | log | top | <skill> | (none = analyze all)
        const sub = positional[0];
        switch (sub) {
          case 'enable':
            await logEvent({ enable: true });
            break;
          case 'disable':
            await logEvent({ disable: true });
            break;
          case 'status':
            await logEvent({ status: true });
            break;
          case 'log':
            // cfh feedback log <skill> --event ... --note ... --helpful ... --utterance ...
            await logEvent({
              skill: positional[1],
              event: flags.event,
              note: flags.note,
              helpful: flags.helpful,
              utterance: flags.utterance,
            });
            break;
          case 'top': {
            // `cfh feedback top [N]` — top-N skills by actionable suggestion count.
            // N defaults to 5; --top flag also honored for backward-compat.
            let topN = positional[1] ? parseInt(positional[1], 10) : null;
            if ((topN === null || !Number.isFinite(topN)) && flags.top) {
              topN = parseInt(flags.top, 10);
            }
            await evolve({ name: undefined, top: Number.isFinite(topN) && topN > 0 ? topN : 5 });
            break;
          }
          case undefined:
            // `cfh feedback` (no args) = analyze all skills.
            // Honor --top as a positional-less shortcut so legacy scripts keep working.
            {
              const topN = flags.top ? parseInt(flags.top, 10) : null;
              await evolve({ name: undefined, top: Number.isFinite(topN) && topN > 0 ? topN : null });
            }
            break;
          default:
            // `cfh feedback <skill>` — analyze specific skill
            await evolve({ name: sub });
            break;
        }
        break;
      }
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
          sinceCommit: flags.sinceCommit,
        });
        break;
      case 'eval': {
        console.warn('  !  `cfh eval` is deprecated as a top-level command (removed in 2.0). Use `cfh dev eval` instead — eval is a maintainer tool, not part of the end-user surface.');
        await evalCmd({
          skill: positional[0],
          target: flags.target,
          project: flags.project,
          list: flags.listFlag,
          dryRun: flags.dryRun,
          manual: flags.manual,
          executor: flags.executor,
          json: flags.json,
          baseline: flags.baseline,
          report: flags.report,
          output: flags.output,
          variants: flags.variants,
          enableJudge: flags.enableJudge,
          judgeModel: flags.judgeModel,
        });
        break;
      }
      case 'dev': {
        // 1.0 maintainer namespace (Track 2): currently hosts `dev eval`.
        const sub = positional[0];
        switch (sub) {
          case 'eval':
            await evalCmd({
              skill: positional[1],
              target: flags.target,
              project: flags.project,
              list: flags.listFlag,
              dryRun: flags.dryRun,
              manual: flags.manual,
              executor: flags.executor,
              json: flags.json,
              baseline: flags.baseline,
              report: flags.report,
              output: flags.output,
              variants: flags.variants,
              enableJudge: flags.enableJudge,
              judgeModel: flags.judgeModel,
            });
            break;
          case undefined:
            console.log('Usage: cfh dev <subcommand>');
            console.log('  dev eval [skill]    Run skill eval cases (maintainer-facing)');
            break;
          default:
            console.error(`  ✖ Unknown dev subcommand: "${sub}". Available: eval`);
            process.exitCode = 1;
            break;
        }
        break;
      }
      case 'sentry': {
        // 1.0 subcommands (Track 1.1): `sentry live`, `sentry hook install`.
        // Legacy flags (--live, --install-hook) still work with deprecation warning.
        let live = flags.live;
        let installHook = flags.installHook;
        const sub = positional[0];
        if (sub === 'live') {
          live = true;
        } else if (sub === 'hook' && positional[1] === 'install') {
          installHook = true;
        } else if (sub === 'hook') {
          console.error('  ✖ Usage: cfh sentry hook install');
          process.exitCode = 1;
          break;
        }
        if (flags.live) {
          console.warn('  !  `--live` flag is deprecated (removed in 2.0). Use `cfh sentry live` instead.');
        }
        if (flags.installHook) {
          console.warn('  !  `--install-hook` flag is deprecated (removed in 2.0). Use `cfh sentry hook install` instead.');
        }
        await sentry({
          target: flags.target,
          project: flags.match,
          days: flags.days ? Number(flags.days) : null,
          tool: flags.tool,
          sessionId: flags.session,
          json: flags.json,
          live,
          installHook,
        });
        break;
      }
      case 'dashboard':
        console.warn('  !  `cfh dashboard` is deprecated (removed in 2.0). Use `cfh stats` (default = dashboard view).');
        await dashboardCmd({
          days: flags.days,
          match: flags.match,
          target: flags.target,
          output: flags.output,
        });
        break;
      case 'stats': {
        // Observability umbrella (1.0 — Track 2): default = dashboard, `stats cost` = cost, `stats errors` = sentry summary.
        const sub = positional[0];
        switch (sub) {
          case undefined:
            await dashboardCmd({
              days: flags.days,
              match: flags.match,
              target: flags.target,
              output: flags.output,
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
              sinceCommit: flags.sinceCommit,
            });
            break;
          case 'errors':
            // sentry summary mode only — live / hook install stay on `cfh sentry`.
            await sentry({
              target: flags.target,
              project: flags.match,
              days: flags.days ? Number(flags.days) : null,
              tool: flags.tool,
              sessionId: flags.session,
              json: flags.json,
            });
            break;
          default:
            console.error(`  ✖ Unknown stats subcommand: "${sub}". Available: (none) | cost | errors`);
            process.exitCode = 1;
            break;
        }
        break;
      }
      case 'watch':
        await watchCmd({
          target: flags.target,
          doctor: args.includes('--doctor'),
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
