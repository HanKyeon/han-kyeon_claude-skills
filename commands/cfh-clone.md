<s>
이 커맨드는 **현재 세션의 꼬리를 CFH-aware 절단점부터 새 세션으로 복제**합니다. 절단점은 "최신 `/cfh-*` 명령 호출"과 "최신 Final Intent Confirm 카드(sentinel)" 중 **더 이른 쪽** — 확정된 의도는 어떤 경우에도 살아남습니다 (→ `commands/references/final-confirm.md` § 절단점 sentinel).

**명시 호출 전용.** 자동 트리거 없음. 컨텍스트가 가득 찼을 때 사용자가 직접 부릅니다.

**내장 compaction과의 차이**: Claude Code의 자동 요약(compaction)은 *무엇이 손실되는지 통제할 수 없는* 요약 압축. cfh-clone은 반대 트레이드오프 — **최근 대화를 verbatim 보존**하고 오래된 쪽을 통째로 드랍. 진행 중 워크플로의 정확한 맥락(확정 의도·Phase 상태)을 요약 손실 없이 이어가고 싶을 때 이쪽.

**핵심 원칙**:
- **2-turn 흐름 필수**: 카드 출력 turn과 실행 turn을 분리한다. 클론 명령과 같은 turn에서 실행하면 *마지막 clean user 메시지 = 클론 명령*이 되어 trailing exclusion이 카드까지 잘라낸다 — 카드는 사용자의 *타이핑된 선택*(다음 turn) 뒤에서만 클론에 포함된다. jsonl에 엔트리를 합성 삽입하지 않는다.
- **절단 지점은 사용자가 고른다**: 후보(확정 의도/워크플로 시작/절반)를 trim%와 함께 제시 — "어떤 정보를 들고 다음 세션으로 갈지"의 결정. 선택은 **타이핑**으로 받는다 (AskUserQuestion 금지 — 그 답은 tool_result라 ⓐ clean user 메시지가 아니어서 카드 절단 보호가 안 걸리고 ⓑ 선택 기록이 새 세션에 안 남는다. 타이핑된 선택은 둘 다 해결 + 새 세션에 self-documenting).
- 파일 상태 머신 없음 — 상태는 대화(인계 카드)에만 있다.
- 앵커가 없으면 절반(halfway) 컷으로 폴백하고 그 사실을 사용자에게 알린다.
</s>

<invocation>
CFH-aware 세션 클론을 시작합니다. 인자 없음 — 현재 세션이 대상.

요구 사항: `cfh` CLI 설치(이 패키지) + `bash` (Windows는 Git Bash).
</invocation>

<workflow>

## Step 1 — 절단 지점 선택지 + 인계 카드 (이 turn에서 실행 금지)

먼저 후보별 절단 정보를 read-only로 확인:

```bash
cfh clone-cut "$HOME/.claude/projects/<project-dir>/${CLAUDE_SESSION_ID}.jsonl"
```

`candidates`(sentinel·command·halfway 각각의 trimPct·keptLines)로 **선택 카드**를 출력 — 존재하는 후보만:

```
✂️ 절단 지점 선택 — 어떤 컨텍스트를 들고 다음 세션으로 갈까요?

1. 확정 의도부터      — trim <N>% · 최신 Final Intent Confirm 카드부터 보존  📌 추천
2. 워크플로 시작부터   — trim <M>% · 최신 /cfh-* 명령부터
3. 절반              — trim <H>% · 후반부 전체

선택: 1 / 2 / 3 / 취소
```

- **모든 수치는 방금 실행한 `cfh clone-cut`의 `candidates` 값으로 채운다** — 추정·예시값 출력 금지. 도구를 안 돌렸으면 카드를 만들지 말 것.
- trim ≥ 90%인 후보에는 `⚠ 보존 극소 (<keptLines>줄)` 표기 (90%는 경고용 경험적 경계 — 차단 아님).
- 📌 추천 = 추천 룰(sentinel·command 중 더 이른 쪽)의 결과. 각 옵션엔 *무엇이 보존되는지* 한 줄.

이어서 새 세션의 agent가 이어받을 수 있게 인계 카드를 **일반 메시지로** 출력:

```
📦 인계 카드 (cfh-clone)

워크플로 위치:  <진행 중인 cfh 명령·Phase — 예: /cfh-tdd Phase 3 (실패 테스트 작성 중) / 없으면 "idle">
작업 중 파일:   <직전에 편집·참조하던 파일 경로 — 새 세션이 선제 Read할 목록>
영속화된 의도:  <의도 헤더가 있는 테스트 파일 경로 목록 — 없으면 "없음">
미기록 결정:    <이 대화에서 합의됐지만 아직 파일에 안 적힌 결정 — 없으면 "없음">
미해결 항목:    <대기 중인 질문·블로커 — 없으면 "없음">
```

> "작업 중 파일"은 클론 후 file-state 추적이 리셋되어 Edit 전 Read가 재요구되는 마찰(half-clone 실측에서 반복 기록)을 줄이기 위한 것 — 새 세션 agent가 이 목록을 먼저 Read하면 곧바로 Edit 가능.

각 항목은 *짧게* — 새 agent가 파일에서 확인 가능한 것은 경로만, 대화에만 있는 것은 내용을 적는다.

카드까지 출력했으면 **반드시 응답 종료** (같은 turn에서 `cfh clone` 실행 절대 금지 — 카드가 클론에서 잘림).

## Step 2 — 클론 실행 (사용자가 선택을 *타이핑한 다음 turn*)

선택에 따라 `--anchor`를 지정해 실행:

```bash
cfh clone ${CLAUDE_SESSION_ID} --anchor sentinel   # 1: 확정 의도부터
cfh clone ${CLAUDE_SESSION_ID} --anchor command    # 2: 워크플로 시작부터
cfh clone ${CLAUDE_SESSION_ID} --anchor half       # 3: 절반
```

(추천 그대로면 `--anchor` 생략 가능 — 추천 룰로 동작. `취소`면 아무것도 실행하지 않고 종료.)

스크립트가 절단점 탐지(`cfh clone-cut`) → 꼬리 복제 → `[CFH-CLONE <timestamp>]` 태그 세션 생성까지 수행.

## Step 3 — 완료 보고

- 성공 + **절단 기준**(sentinel / command / halfway 폴백)과 trim% 보고
- 절단점이 너무 최근이라 trim%가 낮으면 그 수치를 그대로 보고 (차단하지 않음 — 판단은 사용자)
- 앵커가 없어 절반(halfway) 컷으로 폴백했다면 1줄로 알림
- `/resume`에서 `[CFH-CLONE ...]` 태그가 붙은 세션을 선택해 이어서 작업하라고 안내

</workflow>

<constraints>
- **명시 호출 전용** — 자동 트리거·model invocation 금지.
- **클론 명령과 같은 turn에서 `cfh clone` 실행 금지** — trailing exclusion이 카드까지 제외해 새 세션이 빈 껍데기가 됨. 카드+`진행: yes` 출력 후 응답 종료, 실행은 yes 받은 다음 turn에만.
- 인계 카드에 sentinel 마커 문자열을 쓰지 말 것 (Final Intent Confirm 카드 전용 — prose 유입 시 오탐).
- jsonl을 직접 수정·합성하지 말 것 — 복제는 전적으로 `cfh clone` 스크립트가 수행.
</constraints>
