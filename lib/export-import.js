'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const readline = require('readline');
const { readManifest } = require('./manifest');
const {
  getSkillsTargetDir,
  getCommandsTargetDir,
  getProjectClaudeDir,
} = require('./paths');
const { version: PKG_VERSION } = require('../package.json');

const BUNDLE_FORMAT = 'cfh-bundle-v1';

function promptYesNo(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

function walkFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
    } else if (entry.isFile()) {
      // Skip manifest files (they'll be regenerated on install)
      if (entry.name.endsWith('.cfh.json') || entry.name === '.cfh-manifest.json') continue;
      out.push(full);
    }
  }
  return out;
}

function collectSkillsForExport(scopes, { userAuthoredOnly }) {
  const out = [];
  for (const { label, dir } of scopes) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillPath = path.join(dir, entry.name);
      const manifest = readManifest(skillPath);
      const status = manifest ? 'managed' : 'user-authored';
      if (userAuthoredOnly && status === 'managed') continue;

      const files = walkFiles(skillPath);
      const items = files.map((f) => ({
        relpath: path.relative(skillPath, f).split(path.sep).join('/'),
        content: fs.readFileSync(f, 'utf8'),
      }));
      out.push({ kind: 'skill', scope: label, name: entry.name, status, files: items });
    }
  }
  return out;
}

function collectCommandsForExport(scopes, { userAuthoredOnly }) {
  const out = [];
  for (const { label, dir } of scopes) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const filePath = path.join(dir, entry.name);
      const manifest = readManifest(filePath);
      const status = manifest ? 'managed' : 'user-authored';
      if (userAuthoredOnly && status === 'managed') continue;

      out.push({
        kind: 'command',
        scope: label,
        name: entry.name.replace(/\.md$/, ''),
        status,
        files: [{ relpath: '.', content: fs.readFileSync(filePath, 'utf8') }],
      });
    }
  }
  return out;
}

async function exportCmd({ output, target, all, names }) {
  const outputPath = output || `cfh-export-${new Date().toISOString().slice(0, 10)}.json`;
  const userAuthoredOnly = !all;

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

  let items = [
    ...collectSkillsForExport(skillScopes, { userAuthoredOnly }),
    ...collectCommandsForExport(commandScopes, { userAuthoredOnly }),
  ];

  if (names && names.length > 0) {
    const filter = new Set(names);
    items = items.filter((i) => filter.has(i.name));
  }

  if (items.length === 0) {
    throw new Error(
      `Nothing to export${userAuthoredOnly ? ' (user-authored only — pass --all for managed too)' : ''}.`
    );
  }

  const bundle = {
    format: BUNDLE_FORMAT,
    exportedAt: new Date().toISOString(),
    exportedBy: `@han-kyeon/claude-skills@${PKG_VERSION}`,
    scope: target || 'global+project',
    filter: userAuthoredOnly ? 'user-authored' : 'all',
    items,
  };

  await fsp.writeFile(outputPath, JSON.stringify(bundle, null, 2) + '\n', 'utf8');

  console.log('');
  console.log(`✅ Exported ${items.length} item(s) to ${outputPath}`);
  console.log('');
  const skills = items.filter((i) => i.kind === 'skill').length;
  const commands = items.filter((i) => i.kind === 'command').length;
  console.log(`  skills:   ${skills}`);
  console.log(`  commands: ${commands}`);
  console.log('');
  console.log(`불러오기: cfh import ${outputPath}`);
}

async function importCmd({ input, target, force, yes, dryRun }) {
  if (!input) {
    throw new Error('Usage: cfh import <bundle.json> [--target <path>] [--force] [--yes] [--dry-run]');
  }
  if (!fs.existsSync(input)) {
    throw new Error(`Bundle file not found: ${input}`);
  }

  let bundle;
  try {
    bundle = JSON.parse(fs.readFileSync(input, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse bundle: ${err.message}`);
  }

  if (bundle.format !== BUNDLE_FORMAT) {
    throw new Error(`Unsupported bundle format: ${bundle.format} (expected ${BUNDLE_FORMAT})`);
  }
  if (!Array.isArray(bundle.items) || bundle.items.length === 0) {
    throw new Error('Bundle is empty.');
  }

  const skillsTarget = target
    ? getSkillsTargetDir(path.join(target, 'skills'))
    : getSkillsTargetDir();
  const commandsTarget = target
    ? getCommandsTargetDir(path.join(target, 'commands'))
    : getCommandsTargetDir();

  console.log('');
  console.log(`📦 Import from ${input}`);
  console.log(`  exported: ${bundle.exportedAt}`);
  console.log(`  by:       ${bundle.exportedBy}`);
  console.log(`  filter:   ${bundle.filter}`);
  console.log(`  items:    ${bundle.items.length}`);
  console.log('');
  console.log(`  target skills:   ${skillsTarget}`);
  console.log(`  target commands: ${commandsTarget}`);
  console.log('');

  // Detect conflicts
  const plan = [];
  for (const item of bundle.items) {
    if (item.kind === 'skill') {
      const dest = path.join(skillsTarget, item.name);
      plan.push({ item, dest, exists: fs.existsSync(dest) });
    } else if (item.kind === 'command') {
      const dest = path.join(commandsTarget, `${item.name}.md`);
      plan.push({ item, dest, exists: fs.existsSync(dest) });
    }
  }

  const conflicts = plan.filter((p) => p.exists);
  if (conflicts.length > 0) {
    console.log(`  ⚠️  ${conflicts.length} conflict(s):`);
    for (const c of conflicts) {
      const existingManifest = c.item.kind === 'skill' ? readManifest(c.dest) : readManifest(c.dest);
      const existingStatus = existingManifest ? 'managed' : 'user-authored';
      console.log(`    - ${c.item.kind}/${c.item.name}  (existing: ${existingStatus})`);
    }
    console.log('');
    if (!force) {
      throw new Error(`Conflicts exist. Use --force to overwrite (user-authored items still require individual confirmation).`);
    }
  }

  if (dryRun) {
    console.log('  ~ [dry-run] no files written');
    return;
  }

  if (conflicts.length > 0 && !yes) {
    const ok = await promptYesNo(`  Overwrite ${conflicts.length} existing item(s)? (y/N) `);
    if (!ok) {
      console.log('  Aborted.');
      return;
    }
  }

  let written = 0;
  let skipped = 0;
  for (const p of plan) {
    if (p.exists && !force) {
      skipped++;
      continue;
    }
    if (p.item.kind === 'skill') {
      await fsp.mkdir(p.dest, { recursive: true });
      for (const f of p.item.files) {
        const filePath = path.join(p.dest, f.relpath);
        await fsp.mkdir(path.dirname(filePath), { recursive: true });
        await fsp.writeFile(filePath, f.content, 'utf8');
      }
    } else if (p.item.kind === 'command') {
      await fsp.mkdir(path.dirname(p.dest), { recursive: true });
      await fsp.writeFile(p.dest, p.item.files[0].content, 'utf8');
    }
    written++;
    console.log(`  + ${p.item.kind}/${p.item.name}`);
  }

  console.log('');
  console.log(`✅ Imported ${written} item(s), ${skipped} skipped.`);
  if (skipped > 0) {
    console.log(`   (skipped due to existing files — use --force to overwrite)`);
  }
  console.log('');
  console.log(`  Note: imported items are treated as user-authored (no manifest).`);
  console.log(`  Run "cfh list${target ? ` --target ${target}` : ''}" to verify.`);
}

module.exports = { exportCmd, importCmd };
