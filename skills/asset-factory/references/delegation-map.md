# Delegation Map — Phase 2 위임 프로토콜

분류 결과에 따라 어느 메타-스킬·인라인 절차로 위임할지, 그리고 **어떤 컨텍스트를 전달해야 위임받는 쪽이 재질문하지 않는지**를 정의합니다.

## 원칙

1. **컨텍스트 이관 최대화.** asset-factory의 Q1~Q3 답변과 Pre-scan 결과를 위임받는 쪽이 활용할 수 있도록 전달.
2. **중복 질문 금지.** skill-author나 cfh-harness의 Phase 0·1 중 asset-factory가 이미 확인한 내용은 skip하도록 알림.
3. **위임 공개.** 사용자에게 "이제 `<대상 스킬>`로 넘어갑니다. 거기서 <남은 질문 수>개를 더 묻습니다"라고 사전 안내.
4. **되돌림 경로 유지.** 위임 대상에서 사용자가 "잘못 분류된 것 같다"고 판단하면 asset-factory로 복귀할 수 있음을 명시.

---

## 위임 1 — skill-author

### 언제
Q1=(a) + Q2=(b) + Q3=(a) 또는 (c)

### 사용자에게 하는 안내

```
이제 `skill-author` 메타-스킬로 넘어갑니다.
지금까지의 분류 결과를 거기에 전달하므로, Phase 0(Pre-scan)과 Q1(목적)은 초안으로 채워진 채로 시작합니다.
남은 작업: Phase 1 Q2~Q6 확인 → Phase 2~5 진행.
```

### 전달 컨텍스트

skill-author 활성화 시 다음 정보를 **초기 메시지 또는 전달 블록**으로 제공:

```yaml
from: asset-factory
user_request: <한 문장 요구사항>
pre_scan_done: true           # asset-factory에서 이미 스캔함
classification:
  kind: skill
  reason: <분류 근거 1줄>
draft_answers:
  Q1_purpose: <사용자의 한 문장 요구사항을 스킬 목적으로 변환한 초안>
  Q2_triggers: (모름 — skill-author가 질문)
  Q3_anti_triggers:
    - 유사 기존 스킬: <Pre-scan에서 겹쳤던 스킬 이름, 있다면>
  Q4_principles: (모름 — skill-author가 질문)
  Q5_output: (모름 — skill-author가 질문)
  Q6_references: (모름 — skill-author가 질문)
paired_command:
  requested: <true/false>     # Q3=(c) 답변이었는지
  name_hint: /cfh-<name>
```

### skill-author가 해야 할 것

1. Phase 0 Pre-scan을 **이미 완료된 것으로 간주** — 중복 스캔 금지.
2. Q1 목적 초안을 사용자에게 제시, 수정만 받기.
3. Q2~Q6는 정상 수행.
4. `paired_command.requested = true`이면 Phase 4(Write Files)에서 `cfh new command <name>` + 짝 커맨드 `.md`도 함께 작성.

---

## 위임 2 — cfh-harness

### 언제
Q2=(a) — 팀 확정

### 사용자에게 하는 안내

```
이제 `cfh-harness` 메타-스킬로 넘어갑니다.
분류 과정에서 얻은 "협업 필요" 판단을 전달하므로, Phase 1 Q1(태스크 성격)은 "(a)~(f) 중 하나로 좁혀진 상태"로 시작합니다.
남은 작업: Phase 1 나머지 질문 → Phase 2~6 진행.
```

### 전달 컨텍스트

```yaml
from: asset-factory
user_request: <한 문장 요구사항>
pre_scan_done: true
classification:
  kind: team
  reason: <분류 근거>
phase1_hints:
  Q1_task_type_candidates: <자동 추려진 후보 1~2개>
    # 예: 사용자가 "여러 축에서 리뷰" 말하면 (c) Expert Pool이 유력 (도메인별 축: FE a11y·타입 / BE consistency·idempotency·latency 등)
    # 사용자가 "생성 → 검증" 말하면 (d) Producer-Reviewer가 유력
  Q2_io: (모름 — cfh-harness가 질문)
  Q3_axes: <asset-factory에서 식별한 축 후보 — 있다면>
  Q4_failure_cost: (모름)
  Q5_scale: (모름)
existing_agents: <Pre-scan에서 발견한 ./.claude/agents/ 목록, 있다면>
```

### cfh-harness가 해야 할 것

1. Phase 0 Pre-scan 스캔 완료로 간주. 도메인 경계·기존 에이전트 목록을 그대로 활용.
2. Q1 태스크 성격은 힌트 1~2개와 함께 제시하여 빠른 확인.
3. Q2~Q5 정상 수행.
4. Deep-dive 옵트인 게이트는 정상 적용 (asset-factory가 자동 추천값에 개입하지 않음).

---

## 위임 3 — Inline Command Interview

### 언제
Q1=(a) + Q2=(b) + Q3=(b)

별도 메타-스킬이 없으므로 **asset-factory 안에서 직접** 3 질문으로 처리.

### 인라인 질문 (3개)

#### C1. 목적·입력

> *"이 커맨드는 `$ARGUMENTS`로 무엇을 받고, 무엇을 해야 하나요?"*

예상 답변 형태:
- "파일 경로를 받아 테스트 작성"
- "PR 번호를 받아 리뷰 작성"
- "인자 없음, 현재 브랜치 자동 처리"

#### C2. 출력 형태

> *"결과로 사용자가 받을 것은?"*

- (a) 파일 생성·수정 (예: `REVIEW.md`)
- (b) 대화 내 리포트·요약
- (c) 추가 질문 (사용자 입력을 받는 인터랙티브)
- (d) 코드 수정 제안 (diff 형식)

#### C3. 워크플로 단계

> *"3~5개 단계로 나누면 어떻게 되나요?"*

예상 답변:
- "Step 1 Scope 확인 → Step 2 분석 → Step 3 리포트 생성"
- "Step 1 인자 검증 → Step 2 Glob으로 파일 수집 → Step 3 각 파일 테스트 작성"

### 인라인 처리 후

답변 모이면:

1. 사용자에게 이름 제안: `/cfh-` 접두는 **붙이지 않음** (user-authored 네임스페이스). 예: `/our-audit`, `/review-api`
2. `cfh new command <name>` 실행 안내 (또는 Claude가 Write로 직접 생성 가능)
3. `templates/command.md`의 `<s>`/`<invocation>`/`<workflow>`/`<output_format>` 태그를 유지하면서 C1~C3 답변으로 TODO 대체
4. `cfh validate` 실행 안내
5. `cfh trace "<예상 사용자 발화>"` 실행 안내 — 커맨드 자체는 슬래시 호출 전용이지만, 만약 자동 트리거도 원하면 skill로 승격 권장

### 인라인 처리 템플릿

```
=== 커맨드 생성 요약 ===

이름: /<name>
목적·입력: <C1>
출력: <C2>
워크플로:
  1. <C3 step 1>
  2. <C3 step 2>
  3. <C3 step 3>

다음 명령 실행을 안내드립니다:
  cfh new command <name> [--project]

생성 후 TODO 마커를 위 내용으로 Claude가 채워드립니다. 계속할까요?
```

---

## 위임 4 — Standalone Agent Scaffold

### 언제
드문 케이스. 사용자가 명시적으로 "agent"를 원하거나, 분류 과정에서 **기존 skill의 내부 위임용 서브에이전트**로 판단됨.

### 처리

```
단독 agent는 보통 아래 두 경우에만 가치가 있습니다:
(a) 기존 skill 내부에서 위임받을 전문 역할 → `cfh new agent <name> --project` + 부모 skill에 위임 지침 추가
(b) 새 팀의 시작점 → 차라리 cfh-harness로 팀 전체를 설계

어느 쪽인가요?
```

- (a) → 간단 인터뷰 3 질문 후 `cfh new agent <name> --project`:
  1. Input contract: 오케스트레이터로부터 무엇을 받는가?
  2. Process: 내부 단계는?
  3. Output contract: 어떤 구조로 반환?
- (b) → cfh-harness로 위임 (위의 위임 2와 동일)

---

## 종료 보고 (모든 위임 완료 후)

asset-factory에서 위임한 작업이 끝나면 사용자에게 종합 보고:

```
✅ asset-factory 위임 완료

분류 결과: <skill | command | team | agent>
생성된 자산:
  - <path 1>
  - <path 2>

확인 명령:
  cfh list          # 설치 확인
  cfh validate      # 유효성 검증
  cfh trace "..."   # (skill인 경우) 트리거 시뮬레이션

다음 제안: <해당 자산의 다음 단계 — 예: reference 채우기, 팀 중 한 에이전트부터 시운전>
```
