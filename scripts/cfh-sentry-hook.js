#!/usr/bin/env node
'use strict';

/*
 * cfh sentry — PostToolUse hook
 *
 * Reads the hook event JSON from stdin, updates ~/.claude/.cfh-logs/sentry-state.json,
 * and emits a warning to stderr when threshold patterns are detected:
 *   - 3+ consecutive tool errors
 *   - 3+ identical (tool + input) calls in a row (potential loop)
 *   - 2+ empty Read results in a row
 *
 * Never throws — always exits 0 to avoid blocking Claude Code on hook errors.
 *
 * Install: copy this file to ~/.claude/scripts/cfh-sentry-hook.js and add to settings.json:
 *   {
 *     "hooks": {
 *       "PostToolUse": [
 *         {
 *           "hooks": [
 *             { "type": "command", "command": "node ~/.claude/scripts/cfh-sentry-hook.js" }
 *           ]
 *         }
 *       ]
 *     }
 *   }
 *
 * Or run: cfh sentry --install-hook
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Respect HOME/USERPROFILE env first (so tests can override). Fallback to os.homedir().
function homeDir() {
  return process.env.HOME || process.env.USERPROFILE || os.homedir();
}

const STATE_FILE = process.env.CFH_SENTRY_STATE_FILE
  || path.join(homeDir(), '.claude', '.cfh-logs', 'sentry-state.json');
const RECENT_LIMIT = 100;

const THRESHOLDS = {
  consecutiveErrors: 3,
  sameSigCount: 3,
  emptyReadCount: 2,
  inputSigBytes: 200,
};

function inputSignature(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== 'object') {
    return `${toolName}::${String(toolInput).slice(0, THRESHOLDS.inputSigBytes)}`;
  }
  const keys = Object.keys(toolInput).sort();
  const repr = keys.map((k) => {
    const v = toolInput[k];
    return [k, typeof v === 'string' ? v.slice(0, THRESHOLDS.inputSigBytes) : v];
  });
  return `${toolName}::${JSON.stringify(repr).slice(0, THRESHOLDS.inputSigBytes)}`;
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {
      recent: [],
      consecutiveErrors: 0,
      lastSig: '',
      sameSigCount: 0,
      consecutiveEmptyReads: 0,
      lastBreaches: [],
    };
  }
}

function saveState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {
    /* silent */
  }
}

function detectEmptyRead(toolName, toolResponse) {
  if (toolName !== 'Read') return false;
  // Result content can be string or array of {type:text,text} — be defensive
  const content = toolResponse?.content ?? toolResponse?.output ?? toolResponse;
  let text = '';
  if (typeof content === 'string') text = content;
  else if (Array.isArray(content)) {
    text = content.map((c) => c?.text ?? '').join('');
  } else if (content && typeof content === 'object' && content.text) {
    text = content.text;
  }
  // Strict: only literally empty content qualifies (avoid false positives on short ok responses)
  return typeof text === 'string' && text.trim().length === 0;
}

function detectError(event) {
  const r = event.tool_response || event.tool_result || {};
  return r.is_error === true || r.error === true || event.is_error === true;
}

function processEvent(event) {
  const state = loadState();
  const tool = event.tool_name || 'unknown';
  const toolInput = event.tool_input || {};
  const toolResponse = event.tool_response || event.tool_result || {};
  const isError = detectError(event);
  const isEmptyRead = detectEmptyRead(tool, toolResponse);

  // Update signatures + counters
  const sig = inputSignature(tool, toolInput);
  if (sig === state.lastSig) state.sameSigCount++;
  else {
    state.lastSig = sig;
    state.sameSigCount = 1;
  }

  if (isError) state.consecutiveErrors = (state.consecutiveErrors || 0) + 1;
  else state.consecutiveErrors = 0;

  if (isEmptyRead) state.consecutiveEmptyReads = (state.consecutiveEmptyReads || 0) + 1;
  else state.consecutiveEmptyReads = 0;

  state.recent = state.recent || [];
  state.recent.push({ tool, isError, isEmptyRead, ts: Date.now() });
  if (state.recent.length > RECENT_LIMIT) state.recent.shift();

  // Check thresholds
  const warnings = [];
  if (state.consecutiveErrors >= THRESHOLDS.consecutiveErrors) {
    warnings.push(`${state.consecutiveErrors}회 연속 tool 에러 — 다음 호출 전에 점검 필요`);
  }
  if (state.sameSigCount >= THRESHOLDS.sameSigCount) {
    warnings.push(`${tool} 동일 input ${state.sameSigCount}회 반복 — loop 가능성`);
  }
  if (state.consecutiveEmptyReads >= THRESHOLDS.emptyReadCount) {
    warnings.push(`${state.consecutiveEmptyReads}회 연속 빈 Read — 잘못된 경로 가능성`);
  }

  if (warnings.length) {
    state.lastBreaches = state.lastBreaches || [];
    state.lastBreaches.push({
      ts: Date.now(),
      tool,
      warnings,
    });
    if (state.lastBreaches.length > 20) state.lastBreaches.shift();
  }

  saveState(state);
  return warnings;
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
});
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(buf);
    const warnings = processEvent(event);
    if (warnings.length) {
      process.stderr.write(`🚨 cfh sentry: ${warnings.join(' | ')}\n`);
    }
  } catch {
    /* silent */
  }
  process.exit(0);
});
