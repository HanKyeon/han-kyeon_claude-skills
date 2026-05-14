'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadFrontmatter } = require('./frontmatter');
const { manifestPath, readManifest } = require('./manifest');
const {
  getSkillsTargetDir,
  getCommandsTargetDir,
  getProjectClaudeDir,
} = require('./paths');

const LOGS_DIR = path.join(os.homedir(), '.claude', '.cfh-logs');

function collectSkills(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, path: path.join(dir, e.name) }));
}

function collectCommands(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => ({ name: e.name.replace(/\.md$/, ''), path: path.join(dir, e.name) }));
}

function tokenize(text) {
  if (!text) return [];
  return (text.match(/[A-Za-z가-힣_]{3,}/g) || []).map((w) => w.toLowerCase());
}

function extractTriggerWords(description) {
  if (!description) return new Set();
  // Remove "Do NOT trigger for ..." section to avoid counting anti-triggers as trigger keywords.
  const triggerPart = description.split(/Do NOT trigger|반-트리거|do not trigger/i)[0] || '';
  return new Set(tokenize(triggerPart));
}

function checkFrontmatter(skill) {
  const issues = [];
  const skillFile = path.join(skill.path, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    issues.push({ severity: 'error', message: `missing SKILL.md` });
    return issues;
  }
  let fm;
  try {
    ({ frontmatter: fm } = loadFrontmatter(skillFile));
  } catch (err) {
    issues.push({ severity: 'error', message: `frontmatter parse error: ${err.message}` });
    return issues;
  }
  if (!fm) {
    issues.push({ severity: 'error', message: `no YAML frontmatter` });
    return issues;
  }
  if (!fm.name) issues.push({ severity: 'error', message: `frontmatter missing "name"` });
  else if (fm.name !== skill.name) {
    issues.push({
      severity: 'error',
      message: `frontmatter name "${fm.name}" != dir "${skill.name}"`,
    });
  }
  if (!fm.description) {
    issues.push({ severity: 'error', message: `frontmatter missing "description"` });
  } else if (fm.description.length < 20) {
    issues.push({
      severity: 'warn',
      message: `description too short (<20 chars) — weak trigger`,
    });
  }
  return issues;
}

function checkCommandInvocation(command) {
  const issues = [];
  if (!fs.existsSync(command.path)) {
    issues.push({ severity: 'error', message: `missing file` });
    return issues;
  }
  const text = fs.readFileSync(command.path, 'utf8');
  if (!text.trim()) {
    issues.push({ severity: 'error', message: `empty file` });
    return issues;
  }
  const hasArgs = /\$ARGUMENTS|\$\{ARGUMENTS\}/.test(text);
  const hasTag = /<(invocation|target|review_scope|s)\b/i.test(text);
  if (!hasArgs && !hasTag) {
    issues.push({
      severity: 'warn',
      message: `no $ARGUMENTS and no structured tag — command may be context-free`,
    });
  }
  return issues;
}

function hasAntiTrigger(description) {
  if (!description) return false;
  return /Do NOT trigger|반-트리거|do not trigger/i.test(description);
}

function checkTriggerOverlap(skills) {
  const issues = new Map();
  const wordOwners = new Map();
  const antiTriggerByName = new Map();

  for (const skill of skills) {
    const skillFile = path.join(skill.path, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    let fm;
    try {
      ({ frontmatter: fm } = loadFrontmatter(skillFile));
    } catch {
      continue;
    }
    if (!fm || !fm.description) continue;
    antiTriggerByName.set(skill.name, hasAntiTrigger(fm.description));
    const words = extractTriggerWords(fm.description);
    for (const word of words) {
      if (word.length < 4) continue;
      if (!wordOwners.has(word)) wordOwners.set(word, []);
      wordOwners.get(word).push(skill.name);
    }
  }

  const stopwords = new Set([
    'use', 'this', 'skill', 'when', 'user', 'the', 'and', 'for', 'with',
    'code', 'file', 'task', 'work', 'claude', 'should', 'wants', 'trigger',
    'from', 'that', 'about', 'through', 'workflow',
    '사용', '스킬', '해야', '하는', '것을', '경우', '때에', '있는', '이다', '합니다',
  ]);

  // Rule 1 — general overlap (existing behavior)
  const flagged = new Map();
  for (const [word, owners] of wordOwners) {
    if (owners.length < 2) continue;
    if (stopwords.has(word)) continue;
    for (const owner of owners) {
      if (!flagged.has(owner)) flagged.set(owner, []);
      flagged.get(owner).push({ word, peers: owners.filter((o) => o !== owner) });
    }
  }

  for (const [skill, hits] of flagged) {
    if (hits.length === 0) continue;
    const topHits = hits.slice(0, 3);
    const msg = topHits
      .map((h) => `"${h.word}" also in [${h.peers.join(', ')}]`)
      .join('; ');
    issues.set(skill, [{ severity: 'warn', message: `trigger overlap: ${msg}` }]);
  }

  // Rule 2 — serious collision: pair shares 3+ keywords AND neither has anti-trigger
  // E2: "tdd-first ↔ tdd-general share 4 trigger keywords without mutual anti-trigger"
  const pairSharedKeywords = new Map(); // "a|b" → [words]
  for (const [word, owners] of wordOwners) {
    if (owners.length < 2 || stopwords.has(word)) continue;
    for (let i = 0; i < owners.length; i++) {
      for (let j = i + 1; j < owners.length; j++) {
        const key = [owners[i], owners[j]].sort().join('|');
        if (!pairSharedKeywords.has(key)) pairSharedKeywords.set(key, []);
        pairSharedKeywords.get(key).push(word);
      }
    }
  }

  for (const [pair, words] of pairSharedKeywords) {
    if (words.length < 3) continue;
    const [a, b] = pair.split('|');
    const aHasAnti = antiTriggerByName.get(a);
    const bHasAnti = antiTriggerByName.get(b);
    if (aHasAnti && bHasAnti) continue; // both handled
    const missingAnti = [];
    if (!aHasAnti) missingAnti.push(a);
    if (!bHasAnti) missingAnti.push(b);
    const wordsPreview = words.slice(0, 4).join(', ');
    const collisionMsg =
      `${pair.replace('|', ' ↔ ')} share ${words.length} trigger keywords without mutual anti-trigger ` +
      `(${wordsPreview}${words.length > 4 ? ', …' : ''}). ` +
      `Missing anti-trigger: ${missingAnti.join(', ')}. ` +
      `Disambiguation suggested in description.`;
    // Report on skills missing anti-trigger
    for (const skill of missingAnti) {
      if (!issues.has(skill)) issues.set(skill, []);
      issues.get(skill).push({ severity: 'warn', message: `trigger-collision: ${collisionMsg}` });
    }
  }

  return issues;
}

function checkOrphanManifests(dir, kind) {
  const issues = [];
  if (!fs.existsSync(dir)) return issues;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  if (kind === 'skill') {
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      // Skills: manifest lives inside dir; orphan would be if dir missing SKILL.md but manifest exists
      const mp = manifestPath(path.join(dir, e.name));
      if (mp && fs.existsSync(mp)) {
        const skillFile = path.join(dir, e.name, 'SKILL.md');
        if (!fs.existsSync(skillFile)) {
          issues.push({
            scope: `skills/${e.name}`,
            severity: 'warn',
            message: `orphan manifest: ${mp} exists but SKILL.md is missing`,
          });
        }
      }
    }
  } else {
    // Commands: hidden manifest alongside .md. If .<name>.md.cfh.json exists without .md → orphan.
    for (const e of entries) {
      if (!e.isFile() || !e.name.startsWith('.') || !e.name.endsWith('.cfh.json')) continue;
      const baseName = e.name.replace(/^\./, '').replace(/\.cfh\.json$/, '');
      const mdPath = path.join(dir, baseName);
      if (!fs.existsSync(mdPath)) {
        issues.push({
          scope: `commands/${baseName}`,
          severity: 'warn',
          message: `orphan manifest: ${e.name} exists but ${baseName} is missing`,
        });
      }
    }
  }
  return issues;
}

function collectAgents(claudeDir) {
  const agentsDir = path.join(claudeDir, 'agents');
  if (!fs.existsSync(agentsDir)) return [];
  return fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => ({ name: e.name.replace(/\.md$/, ''), path: path.join(agentsDir, e.name) }));
}

function checkAgentTeamStructure(claudeDir, scopeLabel) {
  const issues = [];
  const agents = collectAgents(claudeDir);
  if (agents.length === 0) return issues;

  // Rule 1: 5+ agents in single level → suggest hierarchical
  if (agents.length >= 5) {
    issues.push({
      scope: `${scopeLabel}/agents (count=${agents.length})`,
      severity: 'warn',
      message: `5+ agents in single level. Consider Hierarchical Delegation (sub-teams) — see harness-factory patterns.`,
    });
  }

  // Rule 2: tools: "*" usage in any agent
  for (const agent of agents) {
    let fm;
    try {
      ({ frontmatter: fm } = loadFrontmatter(agent.path));
    } catch {
      continue;
    }
    if (!fm) continue;
    const toolsValue = fm.tools || '';
    if (/\*/.test(toolsValue) || /^\s*all\s*$/i.test(toolsValue)) {
      issues.push({
        scope: `${scopeLabel}/agents/${agent.name}`,
        severity: 'warn',
        message: `tools: "${toolsValue}" — least-privilege violation. Specify exact tools (Read, Grep, Edit, etc.).`,
      });
    }
    if (!fm.description) {
      issues.push({
        scope: `${scopeLabel}/agents/${agent.name}`,
        severity: 'warn',
        message: `agent missing "description" — orchestrator cannot route to this agent.`,
      });
    }
  }
  return issues;
}

function checkSkillKeywordCount(skill) {
  const issues = [];
  const skillFile = path.join(skill.path, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return issues;
  let fm;
  try {
    ({ frontmatter: fm } = loadFrontmatter(skillFile));
  } catch {
    return issues;
  }
  if (!fm || !fm.description) return issues;
  const triggerWords = extractTriggerWords(fm.description);
  if (triggerWords.size === 0) {
    issues.push({
      severity: 'warn',
      message: `description has 0 trigger keywords (after removing anti-trigger section). Skill may never auto-trigger.`,
    });
  }
  return issues;
}

function checkShadowing(globalSkills, projectSkills, globalCommands, projectCommands) {
  const issues = [];
  if (!fs.existsSync(projectSkills) && !fs.existsSync(projectCommands)) return issues;

  const globalSkillNames = new Set(collectSkills(globalSkills).map((s) => s.name));
  const projectSkillNames = new Set(collectSkills(projectSkills).map((s) => s.name));
  for (const name of projectSkillNames) {
    if (globalSkillNames.has(name)) {
      issues.push({
        scope: `skills/${name}`,
        severity: 'warn',
        message: `project ./.claude/skills/${name} shadows ~/.claude/skills/${name}`,
      });
    }
  }
  const globalCmdNames = new Set(collectCommands(globalCommands).map((c) => c.name));
  const projectCmdNames = new Set(collectCommands(projectCommands).map((c) => c.name));
  for (const name of projectCmdNames) {
    if (globalCmdNames.has(name)) {
      issues.push({
        scope: `commands/${name}`,
        severity: 'warn',
        message: `project ./.claude/commands/${name}.md shadows global version`,
      });
    }
  }
  return issues;
}

function readUsageLogs(skillName) {
  const file = path.join(LOGS_DIR, `${skillName}.jsonl`);
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line));
    } catch {
      // skip malformed
    }
  }
  return out;
}

function summarizeUsage(skillName, lookbackDays = 30) {
  const entries = readUsageLogs(skillName);
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const recent = entries.filter((e) => {
    const t = Date.parse(e.ts || '');
    return !Number.isNaN(t) && t >= cutoff;
  });
  const total = recent.length;
  const helpful = recent.filter((e) => e.helpful === true).length;
  const notHelpful = recent.filter((e) => e.helpful === false).length;
  const miss = recent.filter((e) => e.event === 'miss').length;
  const success = recent.filter((e) => e.event === 'success').length;
  return { total, helpful, notHelpful, miss, success };
}

function printUsageSummary(skillsDirs) {
  console.log('');
  console.log(`📊 최근 30일 스킬 사용 현황 (~/.claude/.cfh-logs/ 기반)`);

  // Collect all installed skill names (across all scopes)
  const installedSkills = new Set();
  for (const { path: dir } of skillsDirs) {
    for (const skill of collectSkills(dir)) {
      installedSkills.add(skill.name);
    }
  }

  // Also include any skill that has logs but isn't installed (orphan log)
  if (fs.existsSync(LOGS_DIR)) {
    for (const file of fs.readdirSync(LOGS_DIR)) {
      if (!file.endsWith('.jsonl')) continue;
      installedSkills.add(file.replace(/\.jsonl$/, ''));
    }
  }

  if (installedSkills.size === 0) {
    console.log(`  (no skills found)`);
    return;
  }

  const sortedNames = [...installedSkills].sort();
  const rows = sortedNames.map((name) => ({ name, ...summarizeUsage(name) }));

  // Find max name length for alignment
  const maxName = Math.max(...sortedNames.map((n) => n.length), 20);

  for (const r of rows) {
    const namePad = r.name.padEnd(maxName + 2);
    let line;
    if (r.total === 0) {
      line = `  ${namePad}${'0회'.padStart(6)} ← 쓴 적 없음. 제거 또는 트리거 개선 검토?`;
    } else {
      const helpfulRatio = r.helpful + r.notHelpful > 0
        ? Math.round((r.helpful / (r.helpful + r.notHelpful)) * 100)
        : null;
      let detail = `(success ${r.success}, helpful ${r.helpful}, not-helpful ${r.notHelpful}`;
      if (r.miss > 0) detail += `, miss ${r.miss}`;
      detail += ')';
      let suffix = '';
      if (r.notHelpful > r.helpful && r.total >= 5) {
        suffix = ` ← not-helpful 비율 높음. cfh evolve 권장`;
      } else if (r.miss >= 3) {
        suffix = ` ← miss 반복. description 키워드 보강 권장`;
      }
      line = `  ${namePad}${(r.total + '회').padStart(6)} ${detail}${suffix}`;
    }
    console.log(line);
  }

  console.log('');
  console.log(`  자세한 분석: cfh evolve [<skill>]`);
}

function checkSkillCommandMapping(skillsDir, commandsDir) {
  const issues = [];
  if (!fs.existsSync(skillsDir) || !fs.existsSync(commandsDir)) return issues;
  // Collect installed command names (cfh-tdd.md → /cfh-tdd)
  const installedCommands = new Set(
    fs
      .readdirSync(commandsDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => `/${f.replace(/\.md$/, '')}`)
  );
  // For each skill, check its commands: field
  const skillEntries = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory());
  for (const entry of skillEntries) {
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    let fm;
    try {
      ({ frontmatter: fm } = loadFrontmatter(skillFile));
    } catch {
      continue;
    }
    if (!fm || !fm.commands) {
      issues.push({
        scope: `skill/${entry.name}`,
        severity: 'info',
        message: 'no `commands` field in frontmatter — consider listing mirror slash commands (Track 5.1)',
      });
      continue;
    }
    const cmdList = Array.isArray(fm.commands) ? fm.commands : [fm.commands];
    for (const cmd of cmdList) {
      // Frontmatter parser may emit "[/cfh-tdd, /cfh-tc]" as a single string — split if needed.
      const items = String(cmd).replace(/[[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
      for (const item of items) {
        if (!item.startsWith('/cfh-')) {
          issues.push({
            scope: `skill/${entry.name}`,
            severity: 'warn',
            message: `commands entry "${item}" must start with /cfh-`,
          });
          continue;
        }
        if (!installedCommands.has(item)) {
          issues.push({
            scope: `skill/${entry.name}`,
            severity: 'warn',
            message: `commands entry "${item}" not found in commands dir (expected ${item.slice(1)}.md)`,
          });
        }
      }
    }
  }
  return issues;
}

function checkConfidenceTagging(skill) {
  const issues = [];
  const skillFile = path.join(skill.path, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return issues;
  const body = fs.readFileSync(skillFile, 'utf8');
  // Look for at least one confidence marker reference or active use
  const hasGuide = /confidence-tagging|\[verified\]|\[inferred\]|\[guessed\]/i.test(body);
  if (!hasGuide) {
    issues.push({
      severity: 'info',
      message: 'no confidence tagging guide ([verified]/[inferred]/[guessed]) — see commands/references/confidence-tagging.md',
    });
  }
  return issues;
}

async function doctor({ target, warnOnly, usage, strictConfidence, mapping }) {
  const allIssues = [];

  const skillsDirs = [];
  const commandsDirs = [];
  if (target) {
    skillsDirs.push({ label: 'target/skills', path: getSkillsTargetDir(path.join(target, 'skills')) });
    commandsDirs.push({ label: 'target/commands', path: getCommandsTargetDir(path.join(target, 'commands')) });
  } else {
    skillsDirs.push({ label: 'global skills', path: getSkillsTargetDir() });
    commandsDirs.push({ label: 'global commands', path: getCommandsTargetDir() });
    const projRoot = getProjectClaudeDir();
    if (fs.existsSync(projRoot)) {
      skillsDirs.push({ label: 'project skills', path: path.join(projRoot, 'skills') });
      commandsDirs.push({ label: 'project commands', path: path.join(projRoot, 'commands') });
    }
  }

  console.log('');
  console.log(`=== cfh doctor ===`);

  let checkedSkills = 0;
  let checkedCommands = 0;

  // 1. Frontmatter checks for all skills
  for (const { label, path: dir } of skillsDirs) {
    const skills = collectSkills(dir);
    for (const skill of skills) {
      checkedSkills++;
      const issues = checkFrontmatter(skill);
      for (const issue of issues) {
        allIssues.push({ scope: `${label}/${skill.name}`, ...issue, check: 'frontmatter' });
      }
      // 1b. Skill keyword count
      const kwIssues = checkSkillKeywordCount(skill);
      for (const issue of kwIssues) {
        allIssues.push({ scope: `${label}/${skill.name}`, ...issue, check: 'trigger-keywords' });
      }
    }
    const overlap = checkTriggerOverlap(skills);
    for (const [skillName, issues] of overlap) {
      for (const issue of issues) {
        allIssues.push({ scope: `${label}/${skillName}`, ...issue, check: 'trigger-overlap' });
      }
    }
  }

  // 2. Command invocation checks
  for (const { label, path: dir } of commandsDirs) {
    const commands = collectCommands(dir);
    for (const cmd of commands) {
      checkedCommands++;
      const issues = checkCommandInvocation(cmd);
      for (const issue of issues) {
        allIssues.push({ scope: `${label}/${cmd.name}`, ...issue, check: 'invocation' });
      }
    }
  }

  // 3. Orphan manifests
  for (const { path: dir } of skillsDirs) {
    for (const issue of checkOrphanManifests(dir, 'skill')) {
      allIssues.push({ ...issue, check: 'orphan-manifest' });
    }
  }
  for (const { path: dir } of commandsDirs) {
    for (const issue of checkOrphanManifests(dir, 'command')) {
      allIssues.push({ ...issue, check: 'orphan-manifest' });
    }
  }

  // 5. Global/project shadowing (only if no --target)
  if (!target) {
    const shadowIssues = checkShadowing(
      getSkillsTargetDir(),
      path.join(getProjectClaudeDir(), 'skills'),
      getCommandsTargetDir(),
      path.join(getProjectClaudeDir(), 'commands')
    );
    for (const issue of shadowIssues) {
      allIssues.push({ ...issue, check: 'shadowing' });
    }
  }

  // 6. Agent team structure (project ./.claude/agents only — global rarely has agents)
  if (!target) {
    const projRoot = getProjectClaudeDir();
    if (fs.existsSync(projRoot)) {
      for (const issue of checkAgentTeamStructure(projRoot, 'project')) {
        allIssues.push({ ...issue, check: 'agent-team' });
      }
    }
  } else {
    for (const issue of checkAgentTeamStructure(path.resolve(target), 'target')) {
      allIssues.push({ ...issue, check: 'agent-team' });
    }
  }

  // Report
  const errors = allIssues.filter((i) => i.severity === 'error');
  const warns = allIssues.filter((i) => i.severity === 'warn');

  console.log('');
  console.log(`Scanned: ${checkedSkills} skills, ${checkedCommands} commands`);
  console.log(`Issues:  ${errors.length} errors, ${warns.length} warnings`);

  if (allIssues.length === 0) {
    console.log('');
    console.log(`  All checks passed.`);
    return;
  }

  const byCheck = new Map();
  for (const issue of allIssues) {
    if (!byCheck.has(issue.check)) byCheck.set(issue.check, []);
    byCheck.get(issue.check).push(issue);
  }

  for (const [check, issues] of byCheck) {
    console.log('');
    console.log(`  [${check}]`);
    for (const issue of issues) {
      const marker = issue.severity === 'error' ? '✖' : '⚠';
      console.log(`    ${marker} ${issue.scope}: ${issue.message}`);
    }
  }

  if (!warnOnly && errors.length + warns.length > 0) {
    process.exitCode = 1;
  }

  // 7. Optional: usage summary (--usage flag)
  if (usage) {
    printUsageSummary(skillsDirs);
  }

  // 8. Optional: skill ↔ command mapping consistency (--mapping flag, Track 5.2)
  if (mapping) {
    console.log('');
    console.log('  [skill-command-mapping] (--mapping)');
    let mappingIssues = 0;
    for (let i = 0; i < skillsDirs.length; i++) {
      const { label, path: sDir } = skillsDirs[i];
      const cDir = commandsDirs[i].path;
      const issues = checkSkillCommandMapping(sDir, cDir);
      for (const issue of issues) {
        const marker = issue.severity === 'warn' ? '⚠' : 'ℹ';
        console.log(`    ${marker} ${label}/${issue.scope.split('/').pop()}: ${issue.message}`);
        if (issue.severity === 'warn') mappingIssues++;
      }
    }
    if (mappingIssues === 0) {
      console.log('    Skill ↔ command mappings are consistent.');
    }
  }

  // 9. Optional: confidence tagging coverage (--strict-confidence flag)
  if (strictConfidence) {
    console.log('');
    console.log('  [confidence-tagging] (--strict-confidence)');
    let totalInfo = 0;
    for (const { label, path: dir } of skillsDirs) {
      const skills = collectSkills(dir);
      for (const skill of skills) {
        const issues = checkConfidenceTagging(skill);
        for (const issue of issues) {
          console.log(`    ℹ ${label}/${skill.name}: ${issue.message}`);
          totalInfo++;
        }
      }
    }
    if (totalInfo === 0) {
      console.log('    All scanned skills include confidence tagging guidance.');
    }
  }
}

module.exports = { doctor };
