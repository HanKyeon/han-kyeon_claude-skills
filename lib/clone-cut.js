'use strict';

// clone-cut — CFH-aware 세션 절단점 탐지 (번들 스크립트 cfh-clone-conversation.sh가 소비).
//
// Cut rule:
//   꼬리 보존 시작점 = "최신 /cfh-* 명령 호출"(clean user)과
//   "최신 Final Intent Confirm sentinel"(assistant text 블록) 중 더 이른 쪽.
//   확정된 의도 카드는 어떤 경우에도 살아남는다. 둘 다 없으면 reason='none' → 호출측 halfway 폴백.
//
// 파싱: 라인별 JSON.parse 구조 판정.
//   raw regex의 "첫 type 필드 = 최상위" 가정은 실제 jsonl(메시지 객체 내부의 "type":"message")에서
//   깨지고, includes 매칭은 tool_use input·인용에 오폭한다 — e2e 실측 + 코드 리뷰로 확인된 버그.
//
// 탐지 견고성:
//   - sentinel은 assistant 메시지의 **text 블록 안**에서만 인정 — Write/Edit tool_use input에
//     마커가 verbatim 노출돼도 오탐하지 않는다 (절단점이 뒤로 밀려 진짜 카드가 잘리는 불변식 위반 방지).
//   - /cfh-clone 호출 자체는 앵커 제외 (\b 경계 — 뒤따르는 텍스트가 있어도 매치).

const fs = require('fs');
const path = require('path');
const os = require('os');

// 자기참조 오탐 방지를 위해 분리 저장 — 이 파일을 편집하는 tool_use에도 마커 원형이 없음
const SENTINEL = '<<cfh:' + 'final-confirm>>';
const CFH_COMMAND_RE = /<command-(?:name|message)>\/?(?:dx:)?cfh-/;
const CLONE_CMD_RE = /<command-(?:name|message)>\/?(?:dx:)?cfh-clone\b/;

function parseLine(line) {
  if (!line || line[0] !== '{') return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function contentBlocks(obj) {
  const c = obj && obj.message && obj.message.content;
  if (Array.isArray(c)) return c;
  if (typeof c === 'string') return [{ type: 'text', text: c }];
  return [];
}

// assistant/user 메시지의 text 블록만 이어붙임 — tool_use input·tool_result는 제외
function contentText(obj) {
  return contentBlocks(obj)
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n');
}

// 번들 스크립트 filter_clean_user_msgs와 동일 의미 (구조 기반)
function isCleanUser(obj) {
  if (!obj) return false;
  if (obj.type !== 'user' && obj.type !== 'queue-operation') return false;
  if (obj.isMeta === true) return false;
  if (contentBlocks(obj).some((b) => b && b.type === 'tool_result')) return false;
  // 인터럽트 stub만 제외 — 본문에 문구를 *인용*한 정상 메시지는 clean으로 유지
  if (contentText(obj).trim().startsWith('[Request interrupted by user')) return false;
  return true;
}

function computeCut(jsonlText) {
  const rawLines = jsonlText.split('\n');
  while (rawLines.length && rawLines[rawLines.length - 1].trim() === '') rawLines.pop();
  const totalLines = rawLines.length;

  let sentinelLine = 0;
  let commandLine = 0;
  const cleanUserLines = []; // 1-based

  for (let i = 0; i < rawLines.length; i++) {
    const obj = parseLine(rawLines[i]);
    if (!obj) continue;
    const ln = i + 1;
    if (isCleanUser(obj)) {
      cleanUserLines.push(ln);
      const text = contentText(obj);
      if (CFH_COMMAND_RE.test(text) && !CLONE_CMD_RE.test(text)) commandLine = ln;
    } else if (obj.type === 'assistant') {
      if (contentText(obj).includes(SENTINEL)) sentinelLine = ln;
    }
  }

  // 보존 경계 = 해당 라인 이전(포함)의 마지막 clean user 메시지 — 그 turn 전체를 보존
  const anchorInfoFor = (line) => {
    if (!line || !cleanUserLines.length) return null;
    let idx = -1;
    for (let k = 0; k < cleanUserLines.length; k++) {
      if (cleanUserLines[k] <= line) idx = k;
      else break;
    }
    if (idx < 0) idx = 0;
    const anchorUserLine = cleanUserLines[idx];
    const keptLines = totalLines - (anchorUserLine - 1);
    return {
      line,
      anchorUserLine,
      skipCleanCount: idx,
      keptLines,
      trimPct: totalLines ? Math.round((1 - keptLines / totalLines) * 100) : 0,
    };
  };

  const halfSkip = Math.floor(cleanUserLines.length / 2);
  const halfway =
    cleanUserLines.length >= 2
      ? (() => {
          const anchorUserLine = cleanUserLines[halfSkip];
          const keptLines = totalLines - (anchorUserLine - 1);
          return {
            line: anchorUserLine,
            anchorUserLine,
            skipCleanCount: halfSkip,
            keptLines,
            trimPct: totalLines ? Math.round((1 - keptLines / totalLines) * 100) : 0,
          };
        })()
      : null;
  const candidates = {
    sentinel: anchorInfoFor(sentinelLine),
    command: anchorInfoFor(commandLine),
    halfway,
  };

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
  const rec = cutLine ? anchorInfoFor(cutLine) : null;

  return {
    reason,
    sentinelLine: sentinelLine || null,
    commandLine: commandLine || null,
    cutLine: cutLine || null,
    anchorUserLine: rec ? rec.anchorUserLine : null,
    skipCleanCount: rec ? rec.skipCleanCount : null,
    totalCleanUserMessages: cleanUserLines.length,
    totalLines,
    keptLines: rec ? rec.keptLines : null,
    trimPct: rec ? rec.trimPct : null,
    candidates,
  };
}

// 세션 ID(UUID)만 받아도 jsonl을 찾도록 — 모델의 <project-dir> 경로 추측 오류 제거
function resolveSessionFile(arg) {
  if (!arg) return arg;
  if (fs.existsSync(arg)) return arg;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(arg)) return arg;
  const projectsDir = path.join(os.homedir(), '.claude', 'projects');
  try {
    for (const dir of fs.readdirSync(projectsDir)) {
      const candidate = path.join(projectsDir, dir, `${arg}.jsonl`);
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch {
    /* projectsDir 없음 — 원본 인자 그대로 */
  }
  return arg;
}

// CLI: cfh clone-cut <session.jsonl | session-id> [--sh]
async function cloneCut({ file, sh }) {
  if (!file) {
    console.error('Usage: cfh clone-cut <session.jsonl | session-id> [--sh]');
    process.exitCode = 1;
    return;
  }
  const resolved = resolveSessionFile(file);
  if (!fs.existsSync(resolved)) {
    console.error(
      /^[0-9a-f-]{36}$/i.test(file)
        ? `Session ${file} not found under ~/.claude/projects/*/ — check the session ID or pass the full .jsonl path.`
        : `File not found: ${file}`
    );
    process.exitCode = 1;
    return;
  }
  const text = fs.readFileSync(resolved, 'utf8');
  const r = computeCut(text);
  if (sh) {
    // 번들 스크립트가 eval로 소비 — 기존 키는 불변, 라인 키는 additive
    const c = (cand, key) => (cand ? cand[key] : '');
    console.log(`CFH_CUT_REASON=${r.reason}`);
    console.log(`CFH_CUT_SKIP=${r.skipCleanCount === null ? '' : r.skipCleanCount}`);
    console.log(`CFH_CUT_TRIM_PCT=${r.trimPct === null ? '' : r.trimPct}`);
    console.log(`CFH_CUT_SKIP_SENTINEL=${c(r.candidates.sentinel, 'skipCleanCount')}`);
    console.log(`CFH_CUT_TRIM_SENTINEL=${c(r.candidates.sentinel, 'trimPct')}`);
    console.log(`CFH_CUT_SKIP_COMMAND=${c(r.candidates.command, 'skipCleanCount')}`);
    console.log(`CFH_CUT_TRIM_COMMAND=${c(r.candidates.command, 'trimPct')}`);
    console.log(`CFH_CUT_SKIP_HALF=${c(r.candidates.halfway, 'skipCleanCount')}`);
    console.log(`CFH_CUT_TRIM_HALF=${c(r.candidates.halfway, 'trimPct')}`);
    // 라인 직접 사용용 (lib·awk 분류 불일치로 skip 인덱스가 어긋나는 것 방지)
    console.log(`CFH_CUT_ANCHOR_LINE=${r.anchorUserLine === null ? '' : r.anchorUserLine}`);
    console.log(`CFH_CUT_LINE_SENTINEL=${c(r.candidates.sentinel, 'anchorUserLine')}`);
    console.log(`CFH_CUT_LINE_COMMAND=${c(r.candidates.command, 'anchorUserLine')}`);
    console.log(`CFH_CUT_LINE_HALF=${c(r.candidates.halfway, 'anchorUserLine')}`);
  } else {
    console.log(JSON.stringify(r, null, 2));
  }
}

module.exports = { computeCut, cloneCut, resolveSessionFile, SENTINEL };
