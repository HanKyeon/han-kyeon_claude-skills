'use strict';

// Contract test — clone-cut 절단 룰 (행동 검증).
// 핵심 보장: "확정된 의도 카드(Final Intent Confirm sentinel)는 어떤 경우에도 보존된다."
// + sentinel 문서 계약 (final-confirm.md 템플릿·tdd-first fast-path 카드).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { computeCut, SENTINEL } = require(path.join(REPO_ROOT, 'lib', 'clone-cut.js'));

// ── fixture helpers (jsonl 한 줄 = 한 메시지) ──
const u = (text) => JSON.stringify({ type: 'user', message: { role: 'user', content: text } });
const a = (text) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
const toolResult = (text) =>
  `{"type":"user","message":{"content":[{"type":"tool_result","content":"${text}"}]}}`;
const cfhCmd = (name) => u(`<command-name>/${name}</command-name> <command-message>${name}</command-message>`);
const jsonl = (...lines) => lines.join('\n') + '\n';

test('절단 룰: 명령이 sentinel보다 이르면 명령부터 보존 → 카드도 자동 포함', () => {
  const text = jsonl(
    u('old talk'),            // 1
    a('old reply'),           // 2
    cfhCmd('cfh-tdd'),        // 3  ← latest cfh command
    a('interview'),           // 4
    u('answers'),             // 5
    a(`confirm card ${SENTINEL}`), // 6  ← latest sentinel
    u('yes'),                 // 7
    a('phase 2')              // 8
  );
  const r = computeCut(text);
  assert.equal(r.reason, 'command', 'earlier anchor = command');
  assert.equal(r.cutLine, 3);
  assert.equal(r.anchorUserLine, 3, 'preserve from the command line itself (clean user msg)');
  assert.equal(r.skipCleanCount, 1, 'skip only the messages before the workflow');
  assert.ok(r.anchorUserLine <= r.sentinelLine, '확정 의도 카드가 보존 범위 안에 있다');
});

test('절단 룰: sentinel이 명령보다 이르면 sentinel부터 보존 (카드는 항상 생존)', () => {
  const text = jsonl(
    u('q'),                   // 1
    a(`card ${SENTINEL}`),    // 2  ← sentinel (이른 쪽)
    u('yes'),                 // 3
    cfhCmd('cfh-review'),     // 4  ← command (늦은 쪽)
    a('reviewing')            // 5
  );
  const r = computeCut(text);
  assert.equal(r.reason, 'sentinel');
  assert.equal(r.cutLine, 2);
  assert.equal(r.anchorUserLine, 1, '카드를 만든 turn의 user 메시지부터 보존');
  assert.equal(r.skipCleanCount, 0);
});

test('sentinel만 있을 때: 카드 직전 user 메시지부터 보존', () => {
  const text = jsonl(u('a'), a('b'), u('c'), a(`card ${SENTINEL}`), u('yes'));
  const r = computeCut(text);
  assert.equal(r.reason, 'sentinel');
  assert.equal(r.anchorUserLine, 3);
  assert.equal(r.skipCleanCount, 1);
});

test('앵커 없음 → reason none (호출측이 half 폴백)', () => {
  const r = computeCut(jsonl(u('hi'), a('hello'), u('bye'), a('ok')));
  assert.equal(r.reason, 'none');
  assert.equal(r.skipCleanCount, null);
});

test('오탐 가드: tool_result/user 라인의 sentinel·클론 명령 자체는 앵커가 아니다', () => {
  // final-confirm.md를 Read한 tool_result에 마커가 유입된 상황 + /cfh-clone 호출
  const text = jsonl(
    u('hi'),                              // 1
    toolResult(`doc says ${SENTINEL}`),   // 2 — user(tool_result) 라인: 무시돼야 함
    u(`reading docs about ${SENTINEL}`),  // 3 — clean user 라인의 마커도 무시 (assistant만 인정)
    a('ok'),                              // 4
    cfhCmd('cfh-clone')                   // 5 — 클론 명령 자체: 앵커 제외
  );
  const r = computeCut(text);
  assert.equal(r.reason, 'none', 'no false anchors from tool_result/user/clone-cmd');
});

test('후보 3종 노출 — 사용자가 절단 지점을 고를 데이터 (--anchor 선택지)', () => {
  const text = jsonl(
    u('old1'), a('r1'), u('old2'), a('r2'),   // 1~4
    cfhCmd('cfh-tdd'),                        // 5  command 앵커
    a('interview'), u('answers'),             // 6~7
    a(`card ${SENTINEL}`),                    // 8  sentinel 앵커
    u('yes'), a('phase2')                     // 9~10
  );
  const r = computeCut(text);
  assert.ok(r.candidates.sentinel && r.candidates.command && r.candidates.halfway, 'three candidates exposed');
  // command(5행)가 sentinel(8행)보다 이르므로 보존이 많음 = trim이 작거나 같음
  assert.ok(r.candidates.command.trimPct <= r.candidates.sentinel.trimPct, 'earlier anchor trims less');
  assert.equal(r.reason, 'command', 'recommended = earlier of the two');
  assert.equal(r.skipCleanCount, r.candidates.command.skipCleanCount, 'top-level mirrors recommended candidate');
  assert.equal(r.candidates.halfway.skipCleanCount, Math.floor(r.totalCleanUserMessages / 2), 'halfway = clean user 절반');
});

test('trim 보고: 절단점이 최근이어도 차단하지 않고 수치만 제공', () => {
  const lines = [];
  for (let i = 0; i < 20; i++) lines.push(u(`talk ${i}`), a(`re ${i}`));
  lines.push(cfhCmd('cfh-grill'), a('grilling'));
  const r = computeCut(jsonl(...lines));
  assert.equal(r.reason, 'command');
  assert.ok(r.trimPct >= 90, `trims most of the old context (got ${r.trimPct}%)`);
  assert.ok(typeof r.keptLines === 'number' && r.keptLines >= 2);
});

// ── 문서 계약: sentinel이 카드 템플릿에 실재 ──
test('final-confirm.md 템플릿과 tdd-first fast-path 카드가 sentinel을 싣는다', () => {
  const fc = fs.readFileSync(path.join(REPO_ROOT, 'commands/references/final-confirm.md'), 'utf8');
  assert.ok(fc.includes(SENTINEL), 'final-confirm template carries the sentinel');
  assert.match(fc, /변형 금지/, 'sentinel stability rule documented');
  assert.match(fc, /prose에.*출력하지 말|카드 외/, 'no-prose rule documented');

  const tddFirst = fs.readFileSync(path.join(REPO_ROOT, 'skills/tdd-first/SKILL.md'), 'utf8');
  assert.ok(tddFirst.includes(SENTINEL), 'fast-path draft card (1.5 겸임) carries the sentinel');
});

// ── 패키지 자산: /cfh-clone 명령 + 번들 스크립트 ──
test('cfh-clone은 패키지 자산 — 카드 선출력·명시 호출·폴백 안내·스크립트 번들', () => {
  const cmd = fs.readFileSync(path.join(REPO_ROOT, 'commands/cfh-clone.md'), 'utf8');
  assert.match(cmd, /명시 호출 전용/, 'explicit invocation only');
  // 2-turn 흐름 — 같은 turn 실행 시 trailing exclusion이 카드까지 잘라냄 (재현된 버그)
  assert.match(cmd, /같은 turn에서.*실행.*금지|같은 turn에서 `cfh clone` 실행 절대 금지/, 'NO same-turn execution');
  assert.match(cmd, /다음 turn/, 'execution happens on the NEXT turn after explicit yes');
  assert.match(cmd, /응답 종료/, 'card turn must end the response');
  assert.match(cmd, /카드가 클론에서 잘림|카드까지/, 'rationale documented (card would be cut)');
  // 절단 지점 선택 — "어떤 정보를 들고 갈지"를 사용자가 고름
  assert.match(cmd, /clone-cut/, 'pre-run candidates via cfh clone-cut');
  assert.match(cmd, /절단 지점 선택/, 'choice card for cut point');
  assert.match(cmd, /--anchor sentinel/, 'anchor option: sentinel');
  assert.match(cmd, /--anchor half/, 'anchor option: half');
  assert.match(cmd, /trim ≥ 90%|보존 극소/, 'warns when almost everything would be trimmed');
  // 타이핑 수집 근거 — AskUserQuestion 답은 tool_result라 절단 보호·기록이 안 됨
  assert.match(cmd, /tool_result/, 'documents why typed selection (not AskUserQuestion)');
  assert.match(cmd, /인계 카드/, 'handover card contents defined');
  assert.match(cmd, /작업 중 파일/, 'card lists in-progress files (file-state reset friction)');
  assert.match(cmd, /half.*폴백|폴백.*half/i, 'half fallback is reported to the user');
  assert.match(cmd, /cfh clone \$\{CLAUDE_SESSION_ID\}/, 'runs the bundled clone via cfh CLI');
  assert.match(cmd, /sentinel.*쓰지 말|마커.*쓰지 말/, 'handover card must not contain the sentinel (오탐 방지)');
  assert.ok(!cmd.includes(SENTINEL), 'command body itself must not contain the raw sentinel');

  const script = path.join(REPO_ROOT, 'scripts', 'cfh-clone-conversation.sh');
  assert.ok(fs.existsSync(script), 'bundled clone script exists');
  const sh = fs.readFileSync(script, 'utf8');
  assert.match(sh, /cfh clone-cut/, 'script consumes cfh clone-cut for the cut point');
  assert.match(sh, /falling back to halfway/, 'script falls back to halfway with a warning');
  assert.match(sh, /\$\{HOME\}|\$HOME/, 'script is $HOME-based (no hardcoded user paths)');
  assert.ok(!sh.includes('/c/user_en'), 'no hardcoded /c/user_en path');
});
