<s>
이 커맨드는 **현재 세션의 꼬리를 CFH-aware 절단점부터 새 세션으로 복제**합니다. 절단점은 "최신 `/cfh-*` 명령 호출"과 "최신 Final Intent Confirm 카드(sentinel)" 중 **더 이른 쪽** — 확정된 의도는 어떤 경우에도 살아남습니다 (→ `commands/references/final-confirm.md` § 절단점 sentinel).

**명시 호출 전용.** 자동 트리거 없음. 컨텍스트가 가득 찼을 때 사용자가 직접 부릅니다.

**내장 compaction과의 차이**: Claude Code의 자동 요약(compaction)은 *무엇이 손실되는지 통제할 수 없는* 요약 압축. cfh-clone은 반대 트레이드오프 — **최근 대화를 verbatim 보존**하고 오래된 쪽을 통째로 드랍. 진행 중 워크플로의 정확한 맥락(확정 의도·Phase 상태)을 요약 손실 없이 이어가고 싶을 때 이쪽.

**핵심 원칙**:
- **2-turn 흐름 필수**: 선택 turn과 실행 turn을 분리한다. 클론 명령과 같은 turn에서 실행하면 *마지막 clean user 메시지 = 클론 명령*이 되어 trailing exclusion이 인계 내용까지 잘라낸다 — 사용자의 *타이핑* 메시지(다음 turn)가 있어야 그 앞 전부가 클론에 포함된다. jsonl에 엔트리를 합성 삽입하지 않는다.
- **절단 지점은 사용자가 고른다**: 후보(확정 의도/워크플로 시작/절반)를 trim%와 함께 **AskUserQuestion 하나**로 제시 — "어떤 정보를 들고 다음 세션으로 갈지"의 결정. **인계 카드는 question 텍스트에 한 번 싣는다** (별도 출력 단계 없음 — 누락 불가, 카드는 tool_use input으로 클론에 생존, Other로 추가 의견 수용). 단 **실행 트리거는 반드시 타이핑된 사용자 메시지** — AskUserQuestion 답은 tool_result라 clean user 메시지가 아니다. 선택 확정 후 "아무 메시지나 입력해 주세요 — 이 입력은 새 세션에 *마지막 인계 메모*로 기록됩니다"로 turn을 끝내고, 타이핑을 받은 다음 turn에 실행한다 (그 메시지가 절단 보호 + self-documenting 기록을 겸함).
- 파일 상태 머신 없음 — 상태는 대화(인계 카드)에만 있다.
- 앵커가 없으면 절반(halfway) 컷으로 폴백하고 그 사실을 사용자에게 알린다.
</s>

<invocation>
CFH-aware 세션 클론을 시작합니다. 인자 없음 — 현재 세션이 대상.

요구 사항: `cfh` CLI 설치(이 패키지) + `bash` (Windows는 Git Bash).
</invocation>

<workflow>

## Step 1 — 절단 지점 선택지 + 인계 카드 (이 turn에서 실행 금지)

먼저 후보별 절단 정보를 read-only로 확인 (세션 ID만으로 동작 — 경로 추측 불필요):

```bash
cfh clone-cut ${CLAUDE_SESSION_ID}
```

먼저 **인계 카드**를 작성한다 (새 세션의 agent가 이어받을 내용):

```
📦 인계 카드 (cfh-clone)

워크플로 위치:  <진행 중인 cfh 명령·Phase — 예: /cfh-tdd Phase 3 (실패 테스트 작성 중) / 없으면 "idle">
작업 중 파일:   <직전에 편집·참조하던 파일 경로 — 새 세션이 선제 Read할 목록>
영속화된 의도:  <의도 헤더가 있는 테스트 파일 경로 목록 — 없으면 "없음">
미기록 결정:    <이 대화에서 합의됐지만 아직 파일에 안 적힌 결정 — 없으면 "없음">
미해결 항목:    <대기 중인 질문·블로커 — 없으면 "없음">
```

> "작업 중 파일"은 클론 후 file-state 추적이 리셋되어 Edit 전 Read가 재요구되는 마찰(half-clone 실측에서 반복 기록)을 줄이기 위한 것 — 새 세션 agent가 이 목록을 먼저 Read하면 곧바로 Edit 가능. 각 항목은 *짧게* — 파일에서 확인 가능한 것은 경로만, 대화에만 있는 것은 내용을.

> **잘리는 부모 의도 구조 요약**: 절단 후보가 가리키는 지점 *이전*에 상위 워크플로의 확정 의도가 있으면(예: plan → grill 위임에서 절단점이 grill의 confirm 카드 — plan의 카드는 절단선 밖), 그 핵심(목표·out-of-scope·핵심 제약)을 **"미기록 결정" 항목에 1~2줄 요약**해 싣는다. 파일(의도 헤더·PROGRESS.md)에 이미 영속화된 내용이면 경로만.

이어서 **AskUserQuestion 한 번으로 선택 + 인계 카드를 함께** 싣는다:

- question: `"어떤 컨텍스트를 들고 다음 세션으로 갈까요?"` + 줄바꿈 후 **위 인계 카드 전문을 question 텍스트에 한 번 포함** — 카드는 tool_use input(assistant 라인)으로 jsonl에 실려 클론에 생존. *별도 단계가 아니라 호출의 일부이므로 누락이 구조적으로 불가능.* (옵션별 preview에 중복 탑재 금지 — 생존엔 한 부면 충분하고, 새 세션 컨텍스트에 카드×옵션수 낭비. question은 preview와 달리 모든 버전 스키마에 확실.)
- header: `"절단 지점"`
- options: 존재하는 후보만 (`candidates`에서 null 아닌 것) + `취소`
  - label: `"확정 의도부터 (추천)"` · `"워크플로 시작부터"` · `"절반"` — **(추천)은 추천 룰(`reason` 값 — sentinel·command 중 더 이른 쪽)을 따라 붙인다, 고정 아님**. 추천 옵션을 첫 번째로.
  - description: `trim <N>% · 보존 <keptLines>줄 · <무엇이 보존되는지 한 줄>` — trim ≥ 90%면 `⚠ 보존 극소` 표기 (경고용 경험적 경계 — 차단 아님)
- **모든 수치는 방금 실행한 `cfh clone-cut`의 `candidates` 값** — 추정·예시값 금지. 도구를 안 돌렸으면 AskUserQuestion을 호출하지 말 것.

AskUserQuestion이 없는 환경이면 폴백: 인계 카드 + 선택지(`1 / 2 / 3 / 취소`)를 일반 텍스트로 출력.

선택을 받았으면 **바로 실행하지 말고** 안내 후 응답 종료:
> "실행하려면 아무 메시지나 입력해 주세요 — 그 입력은 새 세션에 *마지막 인계 메모*로 기록됩니다. (예: '인계 카드 확인, X부터 이어서' 처럼 적으면 새 세션이 카드를 바로 찾습니다)"

— 메모가 tool_use 속 카드를 가리키는 *포인터* 역할을 겸하게 유도 (카드가 일반 텍스트가 아니라 주목도가 낮은 것을 상쇄).

(같은 turn 실행 절대 금지 — 마지막 clean user 메시지가 여전히 클론 명령이라 trailing exclusion이 카드를 포함한 turn 전체를 잘라냄.)

## Step 2 — 클론 실행 (사용자가 선택을 *타이핑한 다음 turn*)

선택에 따라 `--anchor`를 지정해 실행:

```bash
cfh clone ${CLAUDE_SESSION_ID} --anchor sentinel   # 1: 확정 의도부터
cfh clone ${CLAUDE_SESSION_ID} --anchor command    # 2: 워크플로 시작부터
cfh clone ${CLAUDE_SESSION_ID} --anchor half       # 3: 절반
```

(추천 그대로면 `--anchor` 생략 가능 — 추천 룰로 동작.)

**`취소`면**: 실행 없이 종료하되 **1줄 명시 출력** — `🚫 클론 취소 — 위 인계 카드는 무효 (이 시점 상태 아님)`. 취소된 카드도 jsonl에 남으므로, 이후 클론에 실렸을 때 새 세션 agent가 낡은 상태로 오인하지 않게 무효 표식을 같은 자리에 남긴다.

스크립트가 절단점 탐지(`cfh clone-cut`) → 꼬리 복제 → `[CFH-CLONE <timestamp>]` 태그 세션 생성까지 수행.

## Step 3 — 완료 보고

- 성공 + **절단 기준**(sentinel / command / halfway 폴백)과 trim% 보고
- 절단점이 너무 최근이라 trim%가 낮으면 그 수치를 그대로 보고 (차단하지 않음 — 판단은 사용자)
- 앵커가 없어 절반(halfway) 컷으로 폴백했다면 1줄로 알림
- `/resume`에서 `[CFH-CLONE ...]` 태그가 붙은 세션을 선택해 이어서 작업하라고 안내

> **새 세션 agent를 위한 규칙: 인계 카드가 여러 장이면 *마지막* 카드만 신뢰** — 이전 카드는 취소됐거나(🚫 표식) 과거 시점의 상태. 클론을 거듭한 세션에는 낡은 카드가 누적될 수 있다.

</workflow>

<constraints>
- **명시 호출 전용** — 자동 트리거·model invocation 금지.
- **실행은 *타이핑된* 사용자 메시지를 받은 다음 turn에만** — AskUserQuestion 답변(tool_result)은 실행 트리거가 될 수 없다. 클론 명령·AskUQ 선택과 같은 turn에서 실행하면 trailing exclusion이 카드까지 제외해 새 세션이 빈 껍데기가 됨.
- 인계 카드에 sentinel 마커 문자열을 쓰지 말 것 (Final Intent Confirm 카드 전용 — prose 유입 시 오탐).
- jsonl을 직접 수정·합성하지 말 것 — 복제는 전적으로 `cfh clone` 스크립트가 수행.
</constraints>
