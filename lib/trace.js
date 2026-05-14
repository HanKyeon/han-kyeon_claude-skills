'use strict';

const fs = require('fs');
const path = require('path');
const { loadFrontmatter } = require('./frontmatter');
const {
  getSkillsTargetDir,
  getProjectClaudeDir,
} = require('./paths');

function tokenizeQuery(query) {
  if (!query) return [];
  // Unicode letters (incl. Korean) + digits, min length 2
  return (query.match(/[A-Za-z가-힣0-9]{2,}/g) || []).map((w) => w.toLowerCase());
}

function splitDescription(description) {
  if (!description) return { positive: '', negative: '' };
  const parts = description.split(/Do NOT trigger|반-트리거|do not trigger/i);
  return {
    positive: parts[0] || '',
    negative: parts.slice(1).join(' ') || '',
  };
}

function keywordBagFrom(text) {
  if (!text) return new Map();
  const bag = new Map();
  for (const word of tokenizeQuery(text)) {
    bag.set(word, (bag.get(word) || 0) + 1);
  }
  return bag;
}

function scoreSkill(queryTokens, description) {
  const { positive, negative } = splitDescription(description);
  const posBag = keywordBagFrom(positive);
  const negBag = keywordBagFrom(negative);

  let score = 0;
  const hits = [];
  const penalties = [];
  for (const token of queryTokens) {
    if (posBag.has(token)) {
      score += 2;
      hits.push(token);
    }
    if (negBag.has(token)) {
      score -= 3;
      penalties.push(token);
    }
    // Partial match: query token appears as substring of a keyword
    for (const posKey of posBag.keys()) {
      if (posKey === token) continue;
      if (posKey.includes(token) || token.includes(posKey)) {
        score += 0.5;
      }
    }
  }
  return { score, hits: [...new Set(hits)], penalties: [...new Set(penalties)] };
}

function collectSkillsFromDir(dir, scopeLabel) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const skills = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const skillFile = path.join(dir, e.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    let fm;
    try {
      ({ frontmatter: fm } = loadFrontmatter(skillFile));
    } catch {
      continue;
    }
    if (!fm || !fm.description) continue;
    skills.push({
      name: fm.name || e.name,
      scope: scopeLabel,
      description: fm.description,
      path: skillFile,
    });
  }
  return skills;
}

async function trace({ query, target, top }) {
  if (!query || !query.trim()) {
    throw new Error('Usage: cfh trace "<utterance>"   e.g. cfh trace "리뷰 좀 해줘"');
  }

  const limit = top || 5;
  const skills = [];

  if (target) {
    skills.push(
      ...collectSkillsFromDir(
        getSkillsTargetDir(path.join(target, 'skills')),
        `target (${target})`
      )
    );
  } else {
    skills.push(...collectSkillsFromDir(getSkillsTargetDir(), 'global'));
    const projectSkills = path.join(getProjectClaudeDir(), 'skills');
    if (fs.existsSync(projectSkills)) {
      skills.push(...collectSkillsFromDir(projectSkills, 'project'));
    }
  }

  if (skills.length === 0) {
    console.log('');
    console.log(`  (no skills found. Run "cfh install" or "cfh list" first.)`);
    return;
  }

  const queryTokens = tokenizeQuery(query);
  const scored = skills
    .map((s) => ({ ...s, ...scoreSkill(queryTokens, s.description) }))
    .sort((a, b) => b.score - a.score);

  console.log('');
  console.log(`  Query: "${query}"`);
  console.log(`  Tokens: [${queryTokens.join(', ')}]`);
  console.log(`  Scanned ${skills.length} skill(s). Top ${Math.min(limit, scored.length)}:`);
  console.log('');

  const top5 = scored.slice(0, limit);
  for (const s of top5) {
    const trigger = s.score > 0 ? '✓' : s.score < 0 ? '✗' : '·';
    console.log(`  ${trigger} [${s.scope}] ${s.name.padEnd(28)} score=${s.score.toFixed(1)}`);
    if (s.hits.length > 0) console.log(`      hits:      ${s.hits.join(', ')}`);
    if (s.penalties.length > 0) console.log(`      penalties: ${s.penalties.join(', ')}`);
  }

  const likely = scored.filter((s) => s.score > 0);
  console.log('');
  if (likely.length === 0) {
    console.log(`  =  No skill likely to trigger for this utterance.`);
    console.log(`     Consider adding keywords to the intended skill's description.`);
  } else if (likely.length === 1) {
    console.log(`  →  Likely trigger: ${likely[0].name}`);
  } else {
    const competing = likely.slice(0, 3).map((s) => s.name).join(', ');
    console.log(`  →  Multiple candidates compete: ${competing}`);
    console.log(`     Claude will pick one based on overall context — review anti-trigger clauses.`);
  }
}

/**
 * Library-friendly trace API (Track 9 — Soft routing suggestion, 0.18.0).
 * Returns sorted skill scores for a given utterance, without printing.
 *
 * @param {Object} opts
 * @param {string} opts.utterance — user input to score against skills
 * @param {string} [opts.target] — optional target dir override
 * @returns {Array<{name, scope, score, hits, penalties}>} sorted desc by score
 */
function traceScores({ utterance, target }) {
  if (!utterance || typeof utterance !== 'string' || !utterance.trim()) {
    return [];
  }
  const skills = [];
  if (target) {
    skills.push(...collectSkillsFromDir(getSkillsTargetDir(path.join(target, 'skills')), 'target'));
  } else {
    skills.push(...collectSkillsFromDir(getSkillsTargetDir(), 'global'));
    const projectSkills = path.join(getProjectClaudeDir(), 'skills');
    if (fs.existsSync(projectSkills)) {
      skills.push(...collectSkillsFromDir(projectSkills, 'project'));
    }
  }
  if (skills.length === 0) return [];
  const queryTokens = tokenizeQuery(utterance);
  return skills
    .map((s) => ({
      name: s.name,
      scope: s.scope,
      ...scoreSkill(queryTokens, s.description),
    }))
    .sort((a, b) => b.score - a.score);
}

module.exports = { trace, scoreSkill, tokenizeQuery, traceScores };
