'use strict';

// Contract test — clone-cut 절단 룰 (행동 검증).
// 핵심 불변식: "확정된 의도 카드(sentinel)는 어떤 경우에도 보존된다."
// fixture는 **실물 jsonl 형태** — message 객체("type":"message" 포함)가 top-level type보다
// 앞에 온다 (raw-regex 첫-매치 판별을 실제로 깨뜨렸던 직렬화 순서 — 회귀 방지).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { computeCut, resolveSessionFile, SENTINEL } = require(path.join(REPO_ROOT, 'lib', 'clone-cut.js'));

// ── 실물 형태 fixture (message가 type보다 앞) ──
const a = (blocks) =>
  JSON.stringify({ parentUuid: null, message: { id: 'm', type: 'message', role: 'assistant', content: blocks }, type: 'assistant' });
const aText = (t) => a([{ type: 'text', text: t }]);
const aToolEdit = (textBefore, inputStr) =>
  a([{ type: 'text', text: textBefore }, { type: 'tool_use', id: 't1', name: 'Edit', input: { new_string: inputStr } }]);
const u = (t) => JSON.stringify({ parentUuid: null, message: { role: 'user', content: t }, type: 'user' });
const toolResult = () =>
  JSON.stringify({ message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'ok' }] }, type: 'user' });
const cfhCmd = (name) => u(`<command-name>/${name}</command-name> <command-message>${name}</command-message>`);
const jsonl = (...lines) => lines.join('\n') + '\n';

test('케이스1 — sentinel·command 공존: 더 이른 쪽이 cut, reason 정확', () => {
  const text = jsonl(
    u('old'), aText('reply'),            // 1-2
    cfhCmd('cfh-tdd'),                   // 3  command
    aText('interview'), u('answers'),    // 4-5
    aText(`confirm ${SENTINEL}`),        // 6  sentinel (진짜 — text 블록)
    u('yes'), aText('phase2')            // 7-8
  );
  const r = computeCut(text);
  assert.equal(r.reason, 'command');
  assert.equal(r.cutLine, 3);
  assert.ok(r.anchorUserLine <= r.sentinelLine, '확정 카드가 보존 범위 안');
});

test('케이스2 — 회귀: tool_use input의 마커는 sentinel을 갱신하지 않는다', () => {
  const text = jsonl(
    u('q'),
    aText(`real card ${SENTINEL}`),                       // 2  진짜 카드 (text 블록)
    u('continue'),
    aToolEdit('편집할게요', `SENTINEL doc line ${SENTINEL}`), // 4  마커가 tool_use input에만
    u('more'), aText('done')
  );
  const r = computeCut(text);
  assert.equal(r.sentinelLine, 2, 'spurious tool_use 마커가 절단점을 뒤로 밀면 안 됨 (불변식)');
});

test('케이스3 — 인터럽트 문구 *인용*은 clean user로 카운트, stub은 제외', () => {
  const text = jsonl(
    u('그때 Request interrupted by user 가 떴었어'), // 인용 — clean ✓
    aText('r'),
    u('[Request interrupted by user]'),              // stub — 제외
    aText('r2')
  );
  const r = computeCut(text);
  assert.equal(r.totalCleanUserMessages, 1, 'quote counts, stub excluded');
});

test('케이스4 — 클론 명령 변형(뒤따르는 텍스트)도 앵커 제외 (\\b 경계)', () => {
  const text = jsonl(
    u('a'), aText('b'),
    u('<command-message>cfh-clone is running…</command-message>'), // 클론 변형
    aText('cloning')
  );
  const r = computeCut(text);
  assert.equal(r.reason, 'none', 'clone-command variants must not become command anchors');
});

test('케이스5 — 앵커 없음: reason none, halfway만 유효', () => {
  const r = computeCut(jsonl(u('a'), aText('b'), u('c'), aText('d')));
  assert.equal(r.reason, 'none');
  assert.equal(r.skipCleanCount, null);
  assert.ok(r.candidates.halfway, 'halfway candidate available');
  assert.equal(r.candidates.sentinel, null);
  assert.equal(r.candidates.command, null);
});

test('케이스6 — clean user 1개 이하: halfway=null', () => {
  const r = computeCut(jsonl(u('only'), aText('r')));
  assert.equal(r.candidates.halfway, null);
});

test('오탐 가드: tool_result·user 텍스트의 마커는 sentinel이 아니다', () => {
  const text = jsonl(
    u('hi'),
    toolResult(),                          // tool_result에 마커가 있어도 (Read 유입) — type상 제외
    u(`docs mention ${SENTINEL}`),         // user 텍스트의 마커 — assistant 아님
    aText('ok'),
    cfhCmd('cfh-clone')                    // 클론 명령 자체 — 앵커 제외
  );
  const r = computeCut(text);
  assert.equal(r.reason, 'none');
});

test('후보 3종 + 추천 미러링 (--anchor 선택지 데이터)', () => {
  const text = jsonl(
    u('o1'), aText('r1'), u('o2'), aText('r2'),
    cfhCmd('cfh-tdd'),                        // 5
    aText('iv'), u('ans'),
    aText(`card ${SENTINEL}`),                // 8
    u('yes'), aText('p2')
  );
  const r = computeCut(text);
  assert.ok(r.candidates.sentinel && r.candidates.command && r.candidates.halfway);
  assert.ok(r.candidates.command.trimPct <= r.candidates.sentinel.trimPct, 'earlier trims less');
  assert.equal(r.skipCleanCount, r.candidates.command.skipCleanCount, 'top-level mirrors recommended');
  assert.equal(r.candidates.halfway.skipCleanCount, Math.floor(r.totalCleanUserMessages / 2));
  // 라인 직접 사용 키의 원천 데이터
  assert.ok(Number.isInteger(r.candidates.command.anchorUserLine));
});

test('resolveSessionFile: 경로는 그대로, UUID는 projects 스캔', () => {
  assert.equal(typeof resolveSessionFile, 'function');
  assert.equal(resolveSessionFile(__filename), __filename, 'existing path passes through');
});

// ── 패키지 자산: /cfh-clone 명령 + 번들 스크립트 ──
test('cfh-clone 명령 — AskUQ에 인계 카드 통합(preview) + 타이핑 실행 트리거', () => {
  const cmd = fs.readFileSync(path.join(REPO_ROOT, 'commands/cfh-clone.md'), 'utf8');
  assert.match(cmd, /명시 호출 전용/);
  // 선택 + 인계 카드를 AskUQ 하나로 — 카드는 question 텍스트에 한 번 (누락 구조적 불가, e2e 2호 카드 누락 실측 후 도입)
  assert.match(cmd, /AskUserQuestion/, 'AskUQ for selection');
  assert.match(cmd, /question 텍스트에 한 번/, 'handover card embedded ONCE in the question text');
  assert.match(cmd, /preview에 중복 탑재 금지/, 'no per-option duplication (context waste + schema-portability)');
  assert.match(cmd, /누락이 구조적으로 불가능|누락 불가/, 'card cannot be skipped (part of the call)');
  assert.match(cmd, /tool_use input/, 'card survival path documented (assistant line in jsonl)');
  assert.match(cmd, /폴백.*일반 텍스트|일반 텍스트로 출력/, 'text fallback when AskUQ unavailable');
  assert.match(cmd, /포인터/, 'memo guidance points at the embedded card (visibility offset)');
  // 낡은 카드 오인 방지 — 취소 무효 표식 + 마지막 카드 우선 규칙
  assert.match(cmd, /클론 취소.*무효|인계 카드는 무효/, 'cancel leaves an explicit invalidation marker');
  assert.match(cmd, /마지막.*카드만 신뢰/, 'latest-card-wins rule for the next session agent');
  // 부모 의도 유실 방지 — plan→grill처럼 최신 confirm보다 앞의 상위 의도가 잘릴 때 카드에 요약
  assert.match(cmd, /부모 의도|상위 워크플로의 확정 의도/, 'parent intent summarized into the card when it falls outside the cut');
  // 실행: 타이핑 필수
  assert.match(cmd, /마지막 인계 메모/, 'typed trigger doubles as final handover note');
  assert.match(cmd, /타이핑된 사용자 메시지를 받은 다음 turn|타이핑을 받은 다음 turn/, 'execution only after typed message');
  assert.match(cmd, /바로 실행하지 말|같은 turn 실행 절대 금지|같은 turn에서 실행하면/, 'no same-turn execution');
  assert.match(cmd, /응답 종료/, 'selection turn ends the response');
  assert.match(cmd, /tool_result/, 'rationale documented');
  // 절단 후보 데이터
  assert.match(cmd, /cfh clone-cut \$\{CLAUDE_SESSION_ID\}/, 'session-id only (no path guessing)');
  assert.match(cmd, /\(추천\)은 추천 룰|추천 룰\(`reason` 값/, 'recommendation follows the rule, not a fixed option');
  assert.match(cmd, /--anchor sentinel/);
  assert.match(cmd, /--anchor half/);
  assert.match(cmd, /trim ≥ 90%|보존 극소/);
  assert.match(cmd, /추정·예시값 금지|추정·예시값 출력 금지/, 'no fabricated numbers');
  // 인계 카드 내용
  assert.match(cmd, /인계 카드/);
  assert.match(cmd, /작업 중 파일/);
  assert.match(cmd, /halfway\) 컷으로 폴백|절반\(halfway\)/, 'halfway fallback documented');
  assert.ok(!cmd.includes(SENTINEL), 'command body must not contain the raw sentinel');

  const sh = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'cfh-clone-conversation.sh'), 'utf8');
  assert.match(sh, /cfh clone-cut/, 'script consumes clone-cut');
  assert.match(sh, /cut_anchor_line/, 'script uses line numbers directly (lib·awk 분류 불일치 방지)');
  assert.match(sh, /falling back to halfway/, 'halfway fallback with warning');
  assert.match(sh, /\$\{HOME\}|\$HOME/, '$HOME-based');
  assert.ok(!sh.includes('/c/user_en'), 'no hardcoded user path');
});

test('final-confirm.md 템플릿·tdd-first 카드가 sentinel을 싣는다 (문서 계약)', () => {
  const fc = fs.readFileSync(path.join(REPO_ROOT, 'commands/references/final-confirm.md'), 'utf8');
  assert.ok(fc.includes(SENTINEL), 'final-confirm template carries the sentinel');
  assert.match(fc, /변형 금지/);
  const tddFirst = fs.readFileSync(path.join(REPO_ROOT, 'skills/tdd-first/SKILL.md'), 'utf8');
  assert.ok(tddFirst.includes(SENTINEL), 'fast-path draft card carries the sentinel');
});
