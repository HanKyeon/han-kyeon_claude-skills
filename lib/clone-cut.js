'use strict';

// clone-cut — CFH-aware 세션 절단점 탐지 (cfh-clone 개인 스킬이 소비).
//
// Cut rule (확정 설계):
//   꼬리 보존 시작점 = "최신 /cfh-* 명령 호출"(clean user 라인)과
//   "최신 Final Intent Confirm sentinel"(assistant 라인) 중 더 이른 쪽.
//   확정된 의도 카드는 어떤 경우에도 살아남는다:
//     - sentinel이 명령보다 이르면 → sentinel부터 보존 (카드 포함)
//     - 명령이 sentinel보다 이르면 → 명령부터 보존 (그 뒤의 카드도 자동 포함)
//   둘 다 없으면 reason='none' — 호출측(번들 스크립트)이 절반(halfway) 컷으로 폴백.
//
// 탐지 견고성:
//   - sentinel은 assistant 라인에서만 인정 — Read 도구로 final-confirm.md를 읽어
//     tool_result(user 라인)에 마커가 유입돼도 오탐하지 않는다.
//   - /cfh-clone 호출 자체는 앵커로 삼지 않는다
//     (클론 직전 명령을 앵커로 잡으면 보존량이 0에 수렴).

const fs = require('fs');

const SENTINEL = '<<cfh:final-confirm>>';
// 사용자가 직접 친 슬래시 명령: <command-name>/cfh-...</command-name> 또는 <command-message> 변형
const CFH_COMMAND_RE = /<command-(?:name|message)>\/?(?:dx:)?cfh-/;
const CLONE_CMD_RE = /<command-(?:name|message)>\/?(?:dx:)?cfh-clone</;

// Claude Code 세션 jsonl의 "clean user 메시지" 판정 — 번들 스크립트의 필터와 동일 의미
function isCleanUserLine(line) {
  const m = line.match(/"type":"([^"]*)"/);
  if (!m) return false;
  const t = m[1];
  return (
    (t === 'user' || t === 'queue-operation') &&
    !line.includes('"type":"tool_result"') &&
    !line.includes('"isMeta":true') &&
    !line.includes('Request interrupted by user')
  );
}

function isAssistantLine(line) {
  const m = line.match(/"type":"([^"]*)"/);
  return !!m && m[1] === 'assistant';
}

function computeCut(jsonlText) {
  const rawLines = jsonlText.split('\n');
  while (rawLines.length && rawLines[rawLines.length - 1].trim() === '') rawLines.pop();
  const totalLines = rawLines.length;

  let sentinelLine = 0;
  let commandLine = 0;
  const cleanUserLines = []; // 1-based

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const ln = i + 1;
    if (isCleanUserLine(line)) {
      cleanUserLines.push(ln);
      if (CFH_COMMAND_RE.test(line) && !CLONE_CMD_RE.test(line)) commandLine = ln;
    } else if (isAssistantLine(line)) {
      if (line.includes(SENTINEL)) sentinelLine = ln;
    }
  }

  let cutLine = 0;
  let reason = 'none';
  if (sentinelLine && commandLine) {
    cutLine = Math.min(sentinelLine, commandLine);
    reason = sentinelLine <= commandLine ? 'sentinel' : 'command';
  } else if (sentinelLine) {
    cutLine = sentinelLine;
    reason = 'sentinel';
  } else if (commandLine) {
    cutLine = commandLine;
    reason = 'command';
  }

  let skipCleanCount = null;
  let anchorUserLine = null;
  let keptLines = null;
  let trimPct = null;

  if (cutLine) {
    // 보존 경계 = cutLine 이전(포함)의 마지막 clean user 메시지 — 그 turn 전체를 보존
    let idx = -1;
    for (let k = 0; k < cleanUserLines.length; k++) {
      if (cleanUserLines[k] <= cutLine) idx = k;
      else break;
    }
    if (idx < 0) idx = 0; // 앵커가 첫 user 메시지보다 앞 — 전체 보존
    anchorUserLine = cleanUserLines.length ? cleanUserLines[idx] : 1;
    skipCleanCount = idx;
    keptLines = totalLines - (anchorUserLine - 1);
    trimPct = totalLines ? Math.round((1 - keptLines / totalLines) * 100) : 0;
  }

  return {
    reason, // 'sentinel' | 'command' | 'none'
    sentinelLine: sentinelLine || null,
    commandLine: commandLine || null,
    cutLine: cutLine || null,
    anchorUserLine,
    skipCleanCount,
    totalCleanUserMessages: cleanUserLines.length,
    totalLines,
    keptLines,
    trimPct,
  };
}

// CLI: cfh clone-cut <session.jsonl> [--sh]
async function cloneCut({ file, sh }) {
  if (!file) {
    console.error('Usage: cfh clone-cut <session.jsonl> [--sh]');
    process.exitCode = 1;
    return;
  }
  const text = fs.readFileSync(file, 'utf8');
  const r = computeCut(text);
  if (sh) {
    // 개인 스크립트(cfh-clone-conversation.sh)가 eval로 소비
    console.log(`CFH_CUT_REASON=${r.reason}`);
    console.log(`CFH_CUT_SKIP=${r.skipCleanCount === null ? '' : r.skipCleanCount}`);
    console.log(`CFH_CUT_TRIM_PCT=${r.trimPct === null ? '' : r.trimPct}`);
  } else {
    console.log(JSON.stringify(r, null, 2));
  }
}

module.exports = { computeCut, cloneCut, SENTINEL };
