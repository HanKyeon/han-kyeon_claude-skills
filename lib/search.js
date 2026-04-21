'use strict';

const fs = require('fs');
const path = require('path');
const { loadFrontmatter } = require('./frontmatter');
const {
  getSkillsTargetDir,
  getCommandsTargetDir,
  getProjectClaudeDir,
} = require('./paths');

function collectSkillRecords(scopes) {
  const out = [];
  for (const { label, dir } of scopes) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(dir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      let fm, body;
      try {
        const text = fs.readFileSync(skillFile, 'utf8');
        const parsed = loadFrontmatter(skillFile);
        fm = parsed.frontmatter;
        body = parsed.body || text;
      } catch {
        continue;
      }
      out.push({
        kind: 'skill',
        scope: label,
        name: fm && fm.name ? fm.name : entry.name,
        path: skillFile,
        description: (fm && fm.description) || '',
        body: body || '',
      });
    }
  }
  return out;
}

function collectCommandRecords(scopes) {
  const out = [];
  for (const { label, dir } of scopes) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const filePath = path.join(dir, entry.name);
      let text = '';
      try {
        text = fs.readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }
      out.push({
        kind: 'command',
        scope: label,
        name: entry.name.replace(/\.md$/, ''),
        path: filePath,
        description: '',
        body: text,
      });
    }
  }
  return out;
}

function matchRecord(record, needleLower) {
  const hits = [];
  const nameLower = record.name.toLowerCase();
  if (nameLower.includes(needleLower)) hits.push(`name: ${record.name}`);
  if (record.description) {
    const descLower = record.description.toLowerCase();
    if (descLower.includes(needleLower)) {
      const idx = descLower.indexOf(needleLower);
      const start = Math.max(0, idx - 30);
      const end = Math.min(record.description.length, idx + needleLower.length + 30);
      hits.push(`desc: ...${record.description.slice(start, end).replace(/\s+/g, ' ')}...`);
    }
  }
  if (record.body) {
    const bodyLower = record.body.toLowerCase();
    let count = 0;
    let idx = 0;
    while ((idx = bodyLower.indexOf(needleLower, idx)) !== -1) {
      count++;
      idx += needleLower.length;
      if (count >= 5) break;
    }
    if (count > 0) hits.push(`body: ${count} hit${count > 1 ? 's' : ''}`);
  }
  return hits;
}

async function search({ query, target, kind, caseSensitive }) {
  if (!query || !String(query).trim()) {
    throw new Error('Usage: cfh search "<keyword>" [--kind skill|command] [--target <path>]');
  }
  const needle = caseSensitive ? String(query) : String(query).toLowerCase();

  const skillScopes = [];
  const commandScopes = [];
  if (target) {
    skillScopes.push({ label: 'target', dir: getSkillsTargetDir(path.join(target, 'skills')) });
    commandScopes.push({ label: 'target', dir: getCommandsTargetDir(path.join(target, 'commands')) });
  } else {
    skillScopes.push({ label: 'global', dir: getSkillsTargetDir() });
    commandScopes.push({ label: 'global', dir: getCommandsTargetDir() });
    const projRoot = getProjectClaudeDir();
    if (fs.existsSync(projRoot)) {
      skillScopes.push({ label: 'project', dir: path.join(projRoot, 'skills') });
      commandScopes.push({ label: 'project', dir: path.join(projRoot, 'commands') });
    }
  }

  const records = [];
  if (!kind || kind === 'skill') records.push(...collectSkillRecords(skillScopes));
  if (!kind || kind === 'command') records.push(...collectCommandRecords(commandScopes));

  const matches = [];
  for (const record of records) {
    const hits = matchRecord(
      caseSensitive
        ? record
        : { ...record, name: record.name.toLowerCase(), description: record.description.toLowerCase(), body: record.body.toLowerCase() },
      needle
    );
    // Use original record for output, hits computed above
    if (hits.length > 0) {
      matches.push({ record, hits });
    }
  }

  console.log('');
  console.log(`🔎 cfh search "${query}"  (${records.length} scanned${kind ? `, kind=${kind}` : ''}${caseSensitive ? ', case-sensitive' : ''})`);
  console.log('');

  if (matches.length === 0) {
    console.log('  (no matches)');
    return;
  }

  console.log(`  ${matches.length} match${matches.length > 1 ? 'es' : ''}:`);
  console.log('');
  for (const m of matches) {
    const { record, hits } = m;
    console.log(`  [${record.scope}/${record.kind}] ${record.name}`);
    console.log(`    ${record.path}`);
    for (const h of hits) console.log(`    - ${h}`);
    console.log('');
  }
}

module.exports = { search };
