'use strict';

const fs = require('fs');
const path = require('path');
const { loadFrontmatter } = require('./frontmatter');
const {
  SKILLS_SOURCE_DIR,
  COMMANDS_SOURCE_DIR,
  getSkillsTargetDir,
  getCommandsTargetDir,
} = require('./paths');

// SKILL.md frontmatter schema (0.12.0)
// Used by validateSkillDir to enforce consistent structure across skills.
const SKILL_FRONTMATTER_SCHEMA = {
  required: ['name', 'description'],
  fields: {
    name: {
      type: 'string',
      pattern: /^[a-z][a-z0-9-]{0,62}$/,
      patternHint: 'kebab-case, 1-63 chars, must start with letter',
      mustMatchDir: true,
    },
    description: {
      type: 'string',
      minLength: 20,
      maxLength: 1024,
    },
    allowed_tools: { type: 'string-or-array' },
    license: { type: 'string' },
    version: { type: 'string' },
    deps: { type: 'string-or-array' },
    origin: { type: 'string' },
    // Track 5.1 frontmatter (cross-link to commands) — optional, will be enforced more strictly in 1.x
    commands: { type: 'string-or-array' },
  },
  // Unknown fields are forbidden in 1.0 (strict default). Pass --legacy to downgrade to warnings.
};

function validateField(name, value, spec) {
  const errors = [];
  if (spec.type === 'string' && typeof value !== 'string') {
    errors.push(`"${name}" must be string, got ${typeof value}`);
    return errors;
  }
  if (spec.type === 'string-or-array' && typeof value !== 'string' && !Array.isArray(value)) {
    errors.push(`"${name}" must be string or array, got ${typeof value}`);
    return errors;
  }
  if (typeof value === 'string') {
    if (spec.minLength && value.length < spec.minLength) {
      errors.push(`"${name}" too short (${value.length} < ${spec.minLength} chars)`);
    }
    if (spec.maxLength && value.length > spec.maxLength) {
      errors.push(`"${name}" too long (${value.length} > ${spec.maxLength} chars)`);
    }
    if (spec.pattern && !spec.pattern.test(value)) {
      errors.push(`"${name}" invalid format (${spec.patternHint})`);
    }
  }
  return errors;
}

function validateSkillDir(dir, { strict = false } = {}) {
  const errors = [];
  const warnings = [];
  const name = path.basename(dir);
  const skillFile = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    errors.push(`missing SKILL.md`);
    return { errors, warnings };
  }
  let fm;
  try {
    ({ frontmatter: fm } = loadFrontmatter(skillFile));
  } catch (err) {
    errors.push(`frontmatter parse error: ${err.message}`);
    return { errors, warnings };
  }
  if (!fm) {
    errors.push(`SKILL.md has no YAML frontmatter (--- block)`);
    return { errors, warnings };
  }

  // Required fields
  for (const required of SKILL_FRONTMATTER_SCHEMA.required) {
    if (!fm[required]) errors.push(`frontmatter missing required field "${required}"`);
  }

  // Per-field validation
  for (const [fieldName, spec] of Object.entries(SKILL_FRONTMATTER_SCHEMA.fields)) {
    if (fm[fieldName] === undefined) continue;
    const fieldErrors = validateField(fieldName, fm[fieldName], spec);
    errors.push(...fieldErrors);
    if (spec.mustMatchDir && fm[fieldName] !== name) {
      errors.push(`frontmatter "${fieldName}" "${fm[fieldName]}" != dir name "${name}"`);
    }
  }

  // Strict-only: warn on unknown fields (forward-compat, may be intentional)
  if (strict) {
    const knownFields = new Set(Object.keys(SKILL_FRONTMATTER_SCHEMA.fields));
    for (const k of Object.keys(fm)) {
      if (!knownFields.has(k)) {
        warnings.push(`unknown frontmatter field "${k}" (not in schema; consider documenting or remove)`);
      }
    }
  }

  // Backward-compat: callers may expect a flat array
  // We still return the new structure but legacy callers will see errors only via getSkillErrors helper.
  return { errors, warnings };
}

// Legacy helper for callers that want a flat array (backward-compat)
function getSkillErrors(dir) {
  return validateSkillDir(dir).errors;
}

function validateCommandFile(filePath) {
  const errors = [];
  const name = path.basename(filePath, '.md');
  if (!fs.existsSync(filePath)) {
    errors.push(`missing file`);
    return errors;
  }
  const text = fs.readFileSync(filePath, 'utf8');
  if (!text.trim()) errors.push(`empty command body`);
  if (!/\$ARGUMENTS|\$\{ARGUMENTS\}/.test(text) && !/<(invocation|target|review_scope)/i.test(text)) {
    errors.push(`no $ARGUMENTS reference and no structured invocation tag — command may be context-free`);
  }
  return errors;
}

async function validate({ target, strict, legacy }) {
  // 1.0 default: strict is on. `--legacy` flag downgrades to 0.x behavior (warn-only on unknown fields).
  if (legacy) {
    strict = false;
  } else if (strict === undefined) {
    strict = true;
  }
  const skillsDir = getSkillsTargetDir(target && path.join(target, 'skills'));
  const commandsDir = getCommandsTargetDir(target && path.join(target, 'commands'));

  const sources = [
    { label: 'package skills', dir: SKILLS_SOURCE_DIR, kind: 'skill' },
    { label: 'installed skills', dir: skillsDir, kind: 'skill' },
    { label: 'package commands', dir: COMMANDS_SOURCE_DIR, kind: 'command' },
    { label: 'installed commands', dir: commandsDir, kind: 'command' },
  ];

  let totalErrors = 0;
  let totalWarnings = 0;
  let checked = 0;

  for (const src of sources) {
    if (!fs.existsSync(src.dir)) continue;
    console.log('');
    console.log(`${src.label} (${src.dir}):`);
    const entries = fs.readdirSync(src.dir, { withFileTypes: true });
    const items =
      src.kind === 'skill'
        ? entries.filter((e) => e.isDirectory())
        : entries.filter((e) => e.isFile() && e.name.endsWith('.md'));
    if (items.length === 0) {
      console.log(`  (none)`);
      continue;
    }
    for (const e of items) {
      const full = path.join(src.dir, e.name);
      let errs = [];
      let warns = [];
      if (src.kind === 'skill') {
        const result = validateSkillDir(full, { strict });
        errs = result.errors;
        warns = result.warnings;
      } else {
        errs = validateCommandFile(full);
      }
      checked++;
      const hasIssues = errs.length > 0 || warns.length > 0;
      if (!hasIssues) {
        console.log(`  ok  ${e.name}`);
      } else {
        if (errs.length) {
          totalErrors += errs.length;
          console.log(`  FAIL  ${e.name}`);
          for (const err of errs) console.log(`        ✖ ${err}`);
        } else {
          console.log(`  warn  ${e.name}`);
        }
        if (warns.length) {
          totalWarnings += warns.length;
          for (const w of warns) console.log(`        ⚠ ${w}`);
        }
      }
    }
  }

  console.log('');
  console.log(`Checked ${checked} items, ${totalErrors} errors, ${totalWarnings} warnings${strict ? ' (strict)' : ''}.`);
  if (totalErrors > 0) process.exitCode = 1;
}

module.exports = { validate, validateSkillDir, validateCommandFile, getSkillErrors, SKILL_FRONTMATTER_SCHEMA };
