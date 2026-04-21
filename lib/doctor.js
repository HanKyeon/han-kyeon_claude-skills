'use strict';

const fs = require('fs');
const path = require('path');
const { loadFrontmatter } = require('./frontmatter');
const { manifestPath, readManifest } = require('./manifest');
const {
  getSkillsTargetDir,
  getCommandsTargetDir,
  getProjectClaudeDir,
} = require('./paths');

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

function checkTriggerOverlap(skills) {
  const issues = new Map();
  const wordOwners = new Map();

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
    const words = extractTriggerWords(fm.description);
    for (const word of words) {
      if (word.length < 4) continue;
      if (!wordOwners.has(word)) wordOwners.set(word, []);
      wordOwners.get(word).push(skill.name);
    }
  }

  const flagged = new Map();
  for (const [word, owners] of wordOwners) {
    if (owners.length < 2) continue;
    const stopwords = new Set([
      'use', 'this', 'skill', 'when', 'user', 'the', 'and', 'for', 'with',
      'code', 'file', 'task', 'work', 'claude', 'should', '사용', '스킬',
      '해야', '하는', '것을', '경우', '때에', '있는', '이다', '합니다',
    ]);
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

function checkBrokenSymlinks(dir) {
  const issues = [];
  if (!fs.existsSync(dir)) return issues;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    try {
      fs.statSync(full);
    } catch {
      issues.push({
        scope: path.relative(process.cwd(), full).split(path.sep).join('/'),
        severity: 'error',
        message: `broken symlink`,
      });
    }
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

async function doctor({ target, warnOnly }) {
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

  // 4. Broken symlinks
  for (const { path: dir } of skillsDirs) {
    for (const issue of checkBrokenSymlinks(dir)) {
      allIssues.push({ ...issue, check: 'symlink' });
    }
  }
  for (const { path: dir } of commandsDirs) {
    for (const issue of checkBrokenSymlinks(dir)) {
      allIssues.push({ ...issue, check: 'symlink' });
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
}

module.exports = { doctor };
