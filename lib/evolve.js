'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { loadFrontmatter } = require('./frontmatter');
const {
  getSkillsTargetDir,
  getProjectClaudeDir,
} = require('./paths');

const CONFIG_PATH = path.join(os.homedir(), '.claude', '.cfh-config.json');
const LOGS_DIR = path.join(os.homedir(), '.claude', '.cfh-logs');

// ---------- Config (opt-in) ----------

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

async function writeConfig(cfg) {
  await fsp.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fsp.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
}

function promptYesNo(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

async function ensureOptIn() {
  const cfg = readConfig();
  if (cfg && cfg.telemetry && typeof cfg.telemetry.enabled === 'boolean') {
    return cfg.telemetry.enabled;
  }

  console.log('');
  console.log(`  cfh log은 기본적으로 비활성화되어 있습니다.`);
  console.log(`  로그는 로컬 파일(~/.claude/.cfh-logs/)에만 기록되며 외부 전송은 없습니다.`);
  console.log(`  기록 내용: 스킬 이름 / 타임스탬프 / 트리거 발화 토큰 / 결과(helpful?).`);
  console.log('');
  const ok = await promptYesNo('  로깅을 활성화하시겠습니까? (y/N) ');

  const next = { telemetry: { enabled: ok, optedInAt: new Date().toISOString() } };
  await writeConfig(next);

  if (!ok) console.log('  로깅 비활성화됨. 나중에 활성화하려면 `cfh log --enable` 실행.');
  return ok;
}

// ---------- Logger ----------

async function logEvent({ skill, event, note, helpful, utterance, enable, disable, status }) {
  if (enable) {
    await writeConfig({ telemetry: { enabled: true, optedInAt: new Date().toISOString() } });
    console.log('  +  Telemetry enabled.');
    return;
  }
  if (disable) {
    await writeConfig({ telemetry: { enabled: false, optedOutAt: new Date().toISOString() } });
    console.log('  -  Telemetry disabled.');
    return;
  }
  if (status) {
    const cfg = readConfig();
    const enabled = cfg && cfg.telemetry && cfg.telemetry.enabled;
    console.log('');
    console.log(`  Telemetry: ${enabled ? 'enabled' : 'disabled'}`);
    console.log(`  Config:    ${CONFIG_PATH}`);
    console.log(`  Logs dir:  ${LOGS_DIR}`);
    if (fs.existsSync(LOGS_DIR)) {
      const files = fs.readdirSync(LOGS_DIR).filter((f) => f.endsWith('.jsonl'));
      console.log(`  Log files: ${files.length} (${files.join(', ') || 'none'})`);
    }
    return;
  }

  if (!skill) {
    throw new Error(
      'Usage: cfh log <skill> [--event trigger|success|miss] [--note "..."] [--helpful y|n] [--utterance "..."]\n' +
        '       cfh log --enable | --disable | --status'
    );
  }

  const enabled = await ensureOptIn();
  if (!enabled) {
    console.log('  Telemetry is disabled. Event discarded.');
    return;
  }

  await fsp.mkdir(LOGS_DIR, { recursive: true });
  const logFile = path.join(LOGS_DIR, `${skill}.jsonl`);
  const entry = {
    ts: new Date().toISOString(),
    skill,
    event: event || 'trigger',
    utterance: utterance || null,
    helpful: helpful === undefined ? null : /^y(es)?$/i.test(String(helpful)),
    note: note || null,
  };
  await fsp.appendFile(logFile, JSON.stringify(entry) + '\n', 'utf8');
  console.log(`  +  Logged ${entry.event} for "${skill}" at ${entry.ts}`);
}

// ---------- Log reader ----------

function readLogs(skill) {
  const file = path.join(LOGS_DIR, `${skill}.jsonl`);
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }
  return entries;
}

// ---------- Skill discovery ----------

function collectSkills() {
  const out = [];
  const globalDir = getSkillsTargetDir();
  const projectDir = path.join(getProjectClaudeDir(), 'skills');
  for (const [scope, dir] of [['global', globalDir], ['project', projectDir]]) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(dir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      let fm;
      try {
        ({ frontmatter: fm } = loadFrontmatter(skillFile));
      } catch {
        continue;
      }
      if (!fm || !fm.description) continue;
      out.push({ scope, name: fm.name || entry.name, description: fm.description, path: skillFile });
    }
  }
  return out;
}

// ---------- Static analysis ----------

function tokenize(text) {
  if (!text) return [];
  return (text.match(/[A-Za-z가-힣0-9]{3,}/g) || []).map((t) => t.toLowerCase());
}

function analyzeStatic(target, allSkills) {
  const suggestions = [];
  const desc = target.description || '';
  const descLen = desc.length;

  if (descLen < 40) {
    suggestions.push({
      severity: 'warn',
      type: 'description-short',
      message: `description이 ${descLen}자로 짧습니다 (권장 80자+). 트리거 키워드를 더 추가하세요.`,
    });
  }

  const positivePart = desc.split(/Do NOT trigger|반-트리거|do not trigger/i)[0] || '';
  const hasAntiTrigger = desc.length > positivePart.length;
  if (!hasAntiTrigger) {
    suggestions.push({
      severity: 'info',
      type: 'anti-trigger-missing',
      message: `반-트리거("Do NOT trigger for …") 절이 없습니다. 오발동 가능성 검토 필요.`,
    });
  }

  const myTokens = new Set(tokenize(positivePart));
  const overlaps = [];
  for (const other of allSkills) {
    if (other.name === target.name) continue;
    const otherPart = (other.description || '').split(/Do NOT trigger|반-트리거|do not trigger/i)[0] || '';
    const otherTokens = new Set(tokenize(otherPart));
    const commonTokens = [...myTokens].filter((t) => otherTokens.has(t) && t.length >= 4);
    const stopwords = new Set(['skill', 'when', 'user', 'wants', 'this', 'uses', 'should', 'code', 'work']);
    const meaningful = commonTokens.filter((t) => !stopwords.has(t));
    if (meaningful.length >= 3) {
      overlaps.push({ peer: other.name, tokens: meaningful });
    }
  }
  if (overlaps.length > 0) {
    for (const o of overlaps.slice(0, 3)) {
      suggestions.push({
        severity: 'warn',
        type: 'trigger-overlap',
        message: `"${o.peer}"와 트리거 토큰 ${o.tokens.length}개 공유 (${o.tokens.slice(0, 3).join(', ')}). 반-트리거 명시 권장.`,
      });
    }
  }

  const keywordCount = myTokens.size;
  if (keywordCount < 5) {
    suggestions.push({
      severity: 'warn',
      type: 'keywords-few',
      message: `고유 트리거 토큰이 ${keywordCount}개뿐입니다. 동의어·영문 키워드 추가 고려.`,
    });
  }

  return suggestions;
}

// ---------- Usage analysis ----------

function analyzeUsage(entries) {
  const suggestions = [];
  if (entries.length === 0) {
    suggestions.push({
      severity: 'info',
      type: 'no-logs',
      message: `로그 항목이 없습니다. "cfh log <skill> --utterance ..." 또는 settings.json 훅으로 기록하세요.`,
    });
    return suggestions;
  }

  const total = entries.length;
  const helpful = entries.filter((e) => e.helpful === true).length;
  const unhelpful = entries.filter((e) => e.helpful === false).length;
  const misses = entries.filter((e) => e.event === 'miss').length;

  suggestions.push({
    severity: 'info',
    type: 'usage-summary',
    message: `총 ${total}회 기록 (helpful ${helpful}, not-helpful ${unhelpful}, miss ${misses}).`,
  });

  if (total >= 5 && unhelpful > helpful) {
    suggestions.push({
      severity: 'warn',
      type: 'low-satisfaction',
      message: `not-helpful(${unhelpful}) > helpful(${helpful}). description 또는 원칙 재검토 권장.`,
    });
  }

  const utteranceTokenCounts = new Map();
  for (const e of entries) {
    if (!e.utterance) continue;
    for (const t of tokenize(e.utterance)) {
      utteranceTokenCounts.set(t, (utteranceTokenCounts.get(t) || 0) + 1);
    }
  }
  const topTokens = [...utteranceTokenCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (topTokens.length > 0) {
    const preview = topTokens.map(([t, c]) => `${t}(${c})`).join(', ');
    suggestions.push({
      severity: 'info',
      type: 'top-tokens',
      message: `자주 등장한 발화 토큰: ${preview}`,
    });
  }

  if (misses >= 3) {
    const missUtterances = entries
      .filter((e) => e.event === 'miss' && e.utterance)
      .slice(0, 3)
      .map((e) => `"${e.utterance}"`)
      .join(' / ');
    suggestions.push({
      severity: 'warn',
      type: 'recurring-miss',
      message: `miss 이벤트 ${misses}회 기록됨. 최근 예: ${missUtterances}. 놓친 키워드를 description에 추가 검토.`,
    });
  }

  return suggestions;
}

// ---------- Evolve main ----------

function analyzeEvals(skill) {
  const suggestions = [];
  const evalsDir = path.join(skill.path, 'evals');
  if (!fs.existsSync(evalsDir)) {
    suggestions.push({
      severity: 'info',
      type: 'eval-coverage',
      message: 'no evals/ directory — consider adding case files to enable cfh eval. See commands/references/confidence-tagging.md neighbour: each skill benefits from at least 1 happy-path + 1 anti-trigger case.',
    });
    return suggestions;
  }

  const files = fs.readdirSync(evalsDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    suggestions.push({
      severity: 'info',
      type: 'eval-coverage',
      message: 'evals/ exists but no .json case files',
    });
    return suggestions;
  }

  let totalCases = 0;
  let happyPathCount = 0;
  let antiTriggerCount = 0;
  let assertionCount = 0;
  const assertionTypeUse = { contains: 0, not_contains: 0, regex: 0 };
  const skillTriggerSet = new Set();
  const parseFailures = [];

  for (const f of files) {
    const fp = path.join(evalsDir, f);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (err) {
      parseFailures.push(f);
      continue;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const c of items) {
      if (!c || typeof c !== 'object') continue;
      totalCases++;
      const tags = Array.isArray(c.tags) ? c.tags : [];
      if (tags.includes('happy-path')) happyPathCount++;
      if (tags.includes('anti-trigger')) antiTriggerCount++;
      if (Array.isArray(c.assertions)) {
        assertionCount += c.assertions.length;
        for (const a of c.assertions) {
          if (a && a.type && assertionTypeUse[a.type] !== undefined) {
            assertionTypeUse[a.type]++;
          }
        }
      }
      if (typeof c.skill_should_trigger === 'string' && c.skill_should_trigger) {
        skillTriggerSet.add(c.skill_should_trigger);
      }
    }
  }

  // Report basics as info
  suggestions.push({
    severity: 'info',
    type: 'eval-coverage',
    message: `${totalCases} case(s) defined (${happyPathCount} #happy-path, ${antiTriggerCount} #anti-trigger), ${assertionCount} assertions`,
  });

  if (parseFailures.length) {
    suggestions.push({
      severity: 'warn',
      type: 'eval-parse',
      message: `${parseFailures.length} eval file(s) failed to parse: ${parseFailures.join(', ')}`,
    });
  }

  // Suggestion: anti-trigger missing
  if (antiTriggerCount === 0 && totalCases > 0) {
    suggestions.push({
      severity: 'warn',
      type: 'eval-coverage',
      message: 'no #anti-trigger case — consider adding one to catch description drift into adjacent skills',
    });
  }

  // Suggestion: only one assertion type used (less robust)
  const typesUsed = Object.values(assertionTypeUse).filter((n) => n > 0).length;
  if (typesUsed === 1 && totalCases >= 2) {
    suggestions.push({
      severity: 'info',
      type: 'eval-diversity',
      message: 'all cases use a single assertion type — adding "not_contains" or "regex" can catch different failure modes',
    });
  }

  // Suggestion: should_trigger pointing to non-self
  if (skillTriggerSet.size > 0 && !skillTriggerSet.has(skill.name)) {
    const otherSkills = [...skillTriggerSet].join(', ');
    suggestions.push({
      severity: 'info',
      type: 'eval-self-trigger',
      message: `no case asserts ${skill.name} should trigger (cases reference: ${otherSkills}). consider adding a happy-path with skill_should_trigger:"${skill.name}".`,
    });
  }

  // Suggestion: very small set
  if (totalCases < 2) {
    suggestions.push({
      severity: 'info',
      type: 'eval-coverage',
      message: 'only 1 case — consider adding more to cover happy-path + anti-trigger + edge case',
    });
  }

  return suggestions;
}

async function evolve({ name, top }) {
  const allSkills = collectSkills();
  if (allSkills.length === 0) {
    console.log('');
    console.log('  (no skills found. Run "cfh install" or ensure ~/.claude/skills has content.)');
    return;
  }

  let targets = name ? allSkills.filter((s) => s.name === name) : allSkills;
  if (targets.length === 0) {
    throw new Error(`Skill "${name}" not found. Run "cfh list" to see available skills.`);
  }

  // `top` (positive int) limits output to top-N skills by suggestion count.
  // Useful for triage: `cfh feedback top 3` shows the 3 noisiest skills.
  const topN = Number.isInteger(top) && top > 0 ? top : null;

  console.log('');
  console.log(`=== cfh feedback ===`);
  console.log(`Analyzing ${targets.length} skill(s). Suggestions are advisory only — no files are modified.`);

  // Pre-compute suggestions per skill so `top` can sort by count.
  const perSkill = targets.map((skill) => {
    const staticSugs = analyzeStatic(skill, allSkills);
    const entries = readLogs(skill.name);
    const usageSugs = analyzeUsage(entries);
    const evalSugs = analyzeEvals(skill);
    const all = [...staticSugs, ...usageSugs, ...evalSugs];
    const actionable = all.filter((s) => s.severity !== 'info').length;
    return { skill, all, actionable };
  });

  if (topN !== null) {
    perSkill.sort((a, b) => b.actionable - a.actionable);
    perSkill.splice(topN);
    console.log(`(showing top ${perSkill.length} by actionable suggestion count)`);
  }

  let totalSuggestions = 0;
  for (const { skill, all, actionable } of perSkill) {
    console.log('');
    console.log(`── ${skill.name} [${skill.scope}] ──`);
    if (all.length === 0) {
      console.log('  (no suggestions — looks healthy)');
      continue;
    }
    for (const s of all) {
      const marker = s.severity === 'warn' ? '⚠' : s.severity === 'error' ? '✖' : 'ℹ';
      console.log(`  ${marker} [${s.type}] ${s.message}`);
    }
    totalSuggestions += actionable;
  }

  console.log('');
  console.log(`Summary: ${totalSuggestions} actionable suggestion(s) across ${perSkill.length} skill(s).`);
  console.log(`Review suggestions and edit SKILL.md manually. Auto-apply is not available.`);
}

module.exports = { logEvent, evolve };
