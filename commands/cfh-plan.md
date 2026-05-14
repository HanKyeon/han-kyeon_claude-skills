<s>
**🔀 잘못 진입하셨다면**:
- 새로운 **skill·command·team을 만들고** 싶으신가요? → `/cfh-make`로 가세요.
- 작업 종류가 **이미 확정**(TDD·리팩터·테스트·리뷰)이면 → `/cfh-tdd` / `/cfh-refactor` / `/cfh-tc` / `/cfh-review` 직접.
- **기존 plan·design을 깊이 파고 싶다** ("grill me", "stress-test", "진짜 이거 맞아?") → `/cfh-grill`로 가세요.
- 위 셋 다 아니고, **"이 작업을 어떻게 시작할지 정리하고 싶다"**면 — 이 커맨드(`/cfh-plan`)가 맞습니다.

이 커맨드는 복잡하거나 모호한 작업을 시작할 때 **목표 캡처 → 접근법 상의 → 작업 분류 → 실행·위임**의 3 Phase를 수행합니다.
`/cfh-make`가 "**재사용 자산 생성**"의 dispatcher라면, `/cfh-plan`은 "**실제 작업 실행**"의 dispatcher입니다.

**명시 호출 전용.** 자동 트리거 없음. 자연어로 대화하듯 진행해도 되는 가벼운 작업에는 사용하지 마세요.

**핵심 원칙**:
- **목표를 먼저, 스캔은 목표 기반으로.** 전체 프로젝트 broad scan은 금지. 목표가 정해진 뒤 **관련 영역만** 읽는다.
- 목표가 모이기 전에 파일 수정·코드 작성 금지.
- 접근법 초안을 제시하고 **사용자 승인 후** 실행.
- 해당 작업 유형의 전용 스킬·커맨드가 있으면 **위임** (직접 수행보다 우선).
- 추정·가정 금지. 모호하면 옵션으로 재질문.
</s>

<invocation>
작업 플래닝을 시작합니다.

**인자**: `$ARGUMENTS` — 작업 목표 한 문장 (선택). 예: "checkout 페이지에 쿠폰 검증 로직 추가", "legacy 결제 모듈 리팩터".

- 비어있으면 Phase 1 Q1부터 질문.
- 값이 있으면 Phase 1 Q1의 초안으로 사용 후 Q2~Q4만 질문.
</invocation>

<workflow>

## Phase 1 — Intent Capture (목표 먼저, 스캔은 그 뒤)

**목표를 먼저 받고, 그 목표를 기준으로 필요한 부분만 스캔**합니다. 전체 프로젝트를 무작정 훑지 않습니다.

### Step 1a — Q1. 목표 (한 문장)

> *"이 작업이 달성하려는 것을 한 문장으로 설명해 주세요."*

- `$ARGUMENTS`에 목표가 있으면 그대로 사용. "이대로 이해했는데 맞으십니까?"로 확인만.
- 비어있으면 이 질문부터 수행.

**좋은 답**: "체크아웃 페이지에서 입력된 쿠폰 코드의 유효성을 서버와 확인해 할인 적용 여부를 반환한다."
**약한 답**: "쿠폰 기능" → 재질문: "어떤 동작을 하면 이 작업이 끝난 건가요?"

### Step 1b — Scoped Pre-scan (목표 기반)

Q1 답변을 근거로 **관련 영역만** 읽습니다. 읽기 전용, 파일 생성·수정 금지.

**스캔 범위 결정 규칙**:
- Q1에 **경로·모듈명**이 있으면 (`src/features/checkout/**`, `결제 모듈`) → 그 디렉터리 범위로 제한
- Q1에 **작업 성격**이 있으면 (TDD·리팩터·리뷰) → 해당 축에 필요한 것만
  - TDD 성격 → 대상 파일 시그니처 + 기존 테스트 컨벤션 샘플
  - 리팩터 성격 → 대상 + import 참조 그래프 + 테스트 존재 여부
  - 리뷰 성격 → diff 범위 + `CLAUDE.md` 규약 섹션
- Q1이 **도메인 키워드**만 있으면 (예: "로그인 플로우") → 매칭되는 디렉터리 Glob 후 대표 3~5 파일

**항상 읽는 것** (경량, 모든 작업에 기본 필요):
- `CLAUDE.md` 전체 (프로젝트 규약 — 보통 수백 줄 이하)
- `package.json` — scripts·dependencies 키만 (test/lint/build/typecheck 명령 확인용)
- `git status --short` — 현재 작업 트리 상태

**건너뛰는 것** (목표 기반 판단):
- 목표가 단일 파일 수정이면 → git log·기타 모듈 읽지 않음
- 목표가 Scope 외 영역 수정 금지면 → 그 영역 아예 읽지 않음
- `gh` CLI 호출(열린 PR·Issue)은 **목표가 명확히 PR 연관**일 때만

**출력**:
```
🔎 Scoped Pre-scan (목표: "<Q1>")

- 프로젝트: <name> (<stack>)
- 규약 문서: <CLAUDE.md L1-N / 없음>
- 테스트 명령: <npm test / pnpm test / ...>
- 작업 트리: <clean / N files modified>
- 대상 범위: <읽은 디렉터리·파일 목록>
- 건너뛴 영역: <목표와 무관하여 읽지 않음>

위 정보 기반으로 Q2~Q4를 진행합니다.
```

스캔 결과는 Phase 2·3에서 재스캔하지 않도록 저장.

### Step 1c — Q2~Q4 (스캔 결과 참고하며)

#### Q2. 성공 기준

> *"이 작업이 '완료'됐다고 판단할 기준은 무엇입니까?"*

다음 중 하나 이상으로 유도:
- 기능 동작 (수동 시나리오)
- 테스트 통과 (어떤 테스트)
- 타입체크·린트 통과
- PR 승인·머지
- 배포 후 메트릭 확인

**답변 해석**:
- "기능 동작"만 → 검증 수단이 약함. 테스트 포함 권장.
- "테스트 통과"만 → 어떤 테스트인지 구체화 요청.

#### Q3. 제약·Out-of-scope

> *"이번 작업에서 **하지 않을 것 / 건드리지 말 것** 또는 이미 결정돼서 바꿀 수 없는 것이 있습니까?"*

예상 답변:
- "API 시그니처 바꾸지 말 것"
- "기존 UI 문자열 건드리지 말 것"
- "다른 팀 영역 파일은 수정 금지"
- "성능 최적화는 이번엔 제외, 정확성만"
- "없음" (그대로 진행)

**답변 해석**:
- 제약이 명확할수록 Phase 2 접근법 제안이 수렴. "없음"도 OK지만 Phase 2에서 "Scope 외 이슈 발견 시 어떻게 할까요"를 다시 물을 것.

#### Q4. 긴급도

> *"이 작업의 성격은 다음 중 어느 쪽에 가깝습니까?*
> *(a) 지금 당장 막혀 있어서 최소한만 빠르게*
> *(b) 제대로 가는 것이 우선, 시간은 여유 있음*
> *(c) 그 중간*"*

**답변 해석**:
- (a) → 접근법에서 Safety Net 축소, 직접 수정 경로 우선. 리팩터·테스트 보강은 후속 과제로 분리.
- (b) → 전용 스킬(`/cfh-tdd`·`/cfh-refactor`) 위임이 기본. 충분한 단계 밟음.
- (c) → 기본값. 중요 구간만 전용 스킬 위임.

## Phase 2 — Approach Proposal

Phase 1의 정보(목표 + scoped 스캔 결과 + Q2~Q4)를 근거로 Claude가 **접근법 카드**를 제시합니다. 사용자 승인 전 실행 금지.

### 태스크 분류

아래 카테고리 중 하나로 분류하고 근거를 공개:

| 분류 | 신호 | 권장 경로 (stack signal 포함, Track 9 0.18.0) |
|---|---|---|
| **신규 기능** | 대상 파일 없음 / 새 모듈 / 요구사항 중심 | FE → `/cfh-tdd` · non-FE → `/cfh-tdd-gen` (intent mode) |
| **버그 수정** | 재현 가능 / 특정 시나리오 실패 | 재현 테스트 작성 → 최소 수정 (stack에 따라 `/cfh-tc(-gen)`) |
| **리팩터** | 대상 파일 존재 / 행동 보존 / 구조 개선 | FE → `/cfh-refactor` · non-FE → `/cfh-refactor-gen` |
| **테스트 보강** | 구현 있음 / 커버리지 부족 | FE → `/cfh-tc` · non-FE → `/cfh-tc-gen` (artifact mode, Track 8) |
| **PR 리뷰** | diff 대상 / 머지 전 점검 | `/cfh-review` 위임 (stack-aware 7 서브에이전트) |
| **탐색·분석** | 코드 이해 / 의사결정 근거 수집 | 직접 조사 + 리포트 |
| **복합** | 위 중 2개+ 섞임 | 순서 제시 후 단계별 위임 |

**Stack signal 포함 추론** (Phase 2 approach card에 의무 출력, Track 9 0.18.0):

```
📦 Stack signal
  - [<confidence>] <신호 — 발화/인자에서 인용 (예: 'API handler' → BE, '.tsx' → FE)>
  - [<...>] <신호 2>
  - 결론: <FE | non-FE | mixed> 컨텍스트로 가정. <권장 sub-command 페어>.
  - 다른 stack이면 사용자가 명시 정정해 주세요.
```

상세 휴리스틱·키워드 매트릭스는 `commands/references/soft-routing.md`. 신호 약하면 (`[guessed]`만) "stack 미상 — 사용자 명시 필요" 표시.

### 접근법 카드 템플릿 (0.8.0 확장)

```
📋 접근법 제안

목표:       <Q1>
성공 기준:  <Q2>
제약:       <Q3>
긴급도:     <Q4>

태스크 분류: <카테고리>
근거:       <Q1~Q4 + scoped 스캔 결과 조합 한두 줄>

제안 흐름:
  1. <첫 단계 — 무엇을 어떻게, 예상 산출물>
  2. <두 번째>
  3. <마지막 — 검증 방법>

예상 위험 (코드):
  - <있다면 — 예: Blast Radius 큰 import 포함, 테스트 없는 영역 등>

📦 Project Alignment Check (0.8.0)
  - 기술 부채 영향: <증가/감소/중립 — 근거 1줄>
  - 모듈 경계: <강화/유지/침식 — 영향 받는 경계 명시>
  - 의존성 변화: <신규 라이브러리 X | 없음 | 기존 버전 업>
  - Migration 정렬: <진행 중 migration과 일치/역행/무관 — 근거>
  - ⚠️ 예상 Project 리스크: <있다면 — 없으면 생략>

🎯 Product Impact Check (0.8.0)
  - 사용자 체감 변화: <무엇을 보게 되나 | 내부 개선이라 체감 없음>
  - 실패 UX: <에러 메시지·fallback 계획 | 기존 에러 처리 의존>
  - 메트릭 후보: <수집할 지표 | 없음 — 내부 작업이라 불필요>
  - 80% 대안: <더 단순한 방법 검토 및 기각 이유 | 이미 최소 범위>
  - 롤백: <feature flag·canary | 단방향 — 리스크 명시>
  - ⚠️ 예상 Product 리스크: <있다면 — 없으면 생략>

위임할 스킬: </cfh-tdd | /cfh-refactor | /cfh-tc | /cfh-review | (직접)>
위임 시 전달할 컨텍스트:
  - 목표: <Q1 요약>
  - 제약: <Q3>
  - 긴급도: <Q4>
  - Project·Product 검증 결과 요약 (위 두 섹션)

🌳 결정 트리 sub-branch 힌트 (선택 사항)

이 접근법 안에 아직 안 정한 결정들 (사용자가 가지치기 가능):
  - <decision 1 — 예: state 위치 (zustand vs local)>
  - <decision 2 — 예: error UX (inline vs toast)>
  - <decision 3 — 예: cache TTL>

→ 깊이 파고 싶으면 (grill) 선택 / 충분하면 (yes) Phase 3

📌 추천: yes — Phase 3 실행
   이유:
     - [verified] Q1~Q4 답변이 일관됨 (모순·공백 없음)
     - [verified] Project Alignment·Product Impact 위험 신호 없음
     - [inferred] 위임 대상 명확 — Q1 키워드와 매칭

다른 옵션:
  - adjust <단계> — 빠진 단계가 있거나 Q2 성공 기준이 모호하게 느껴질 때
  - reclassify — task type 동의 안 할 때 (예: "리팩터가 아니라 신규 기능 같다")
  - revise-checks — Project Alignment 또는 Product Impact 추론이 너무 추측 같을 때
  - grill — 결정 트리 sub-branch가 너무 많이 미해결일 때 (위 힌트가 길면 신호)

선택: yes / adjust <단계> / reclassify / revise-checks / grill
```

### Project·Product 검증 추론 원칙

두 섹션은 **사용자에게 새 질문을 하지 않고** Claude가 Phase 1 답변 + Scoped Pre-scan 결과로 자동 추론합니다:

**추론 근거**:
- Q1 목표·Q2 성공 기준에서 "사용자 체감" 여부 판단
- Q3 제약에서 out-of-scope 힌트
- Pre-scan의 `CLAUDE.md`·`package.json`·대상 디렉터리 구조에서 모듈 경계·의존성·migration 정보 추출

**컨텍스트 부족 시 명시**:

```
📦 Project Alignment Check
  ℹ CLAUDE.md에 migration 계획·모듈 경계 정의가 없어 **추론 기반** 분석입니다.
  ...
```

```
🎯 Product Impact Check
  ℹ CLAUDE.md에 제품 컨텍스트(사용자 segment·핵심 메트릭)가 없어 **추론 기반** 분석입니다.
  ...
```

사용자가 `(revise-checks)` 선택 시 해당 섹션만 재논의 (다른 Phase 답변은 유지).

사용자가 `(grill)` 선택 시 → `/cfh-grill`로 **명시적 위임** (자동 흡수 X). 다음 형식으로 출력:

```
📋 Context handoff for /cfh-grill

Q1 목표:       <한 문장>
Q2 성공 기준:  <답변>
Q3 제약:       <답변, 특히 out-of-scope>
Q4 긴급도:     <답변>

태스크 분류:   <카테고리>
접근법 요약:   <Phase 2 카드 한 줄>
결정 트리 힌트: <미해결 sub-branch 목록>

다음 명령으로 진행하세요:
  /cfh-grill <Q1 목표 한 문장>

(위 handoff 블록을 /cfh-grill이 명시 컨텍스트로 참조합니다. 자동 흡수 아님 — 사용자가 명령을 그대로 실행해야 위임 완료.)
```

`/cfh-grill`은 인자 = Q1 목표 + 직전 turn의 handoff 블록 = 컨텍스트로 받음. Phase 1 결정 트리 enumerate부터 즉시 시작 (재질문 없음). grill 종료 후 사용자에게 Phase 3 복귀 또는 plan 재검토 권장.

### 추천 + 이유 패턴 (필수)

Phase 2 approach card 옵션 제시에 **빈 질문 금지**. 모든 옵션 블록은 다음 구조:

```
📌 추천: <기본 선택지>
   이유:
     - [verified] <사용자 답변·코드 인용>
     - [inferred] <합리적 추론>
     - [guessed] <약한 신호 — 사용자 확인 권장>

다른 옵션:
  - <X> — <조건>일 때 적합
```

상세 컨벤션: `commands/references/recommendation-pattern.md`.

### 복합 태스크 처리

한 작업이 여러 분류에 걸칠 때 (예: "리팩터 후 새 기능 추가") 순서를 명시:
```
1단계 /cfh-refactor — 기존 구조 정리 (별도 PR)
2단계 /cfh-tdd     — 새 기능을 테스트 먼저 (별도 PR)
```

각 단계 경계마다 Phase 2 승인을 한 번씩 받음.

## Phase 3 — Execution

### 위임 경로

전용 스킬·커맨드가 있으면 **해당 슬래시 커맨드를 사용자에게 안내**하고, 필요하면 Phase 1~2의 답변을 요약 컨텍스트로 전달:

```
다음 명령으로 이어가시면 됩니다:

  /cfh-tdd src/features/coupon/validateCoupon.ts

해당 스킬에는 아래 맥락을 전달해 두었습니다:
- 목표: <Q1>
- 성공 기준: <Q2>
- 제약: <Q3, 특히 out-of-scope>
- 긴급도: <Q4>
```

위임받은 스킬(`tdd-first`·`refactoring-strategy` 등)은 **자신의 Phase 0·1을 일부 skip** 가능 — `/cfh-plan`이 이미 확보한 답변은 재질문하지 않음.

### 직접 실행 경로

"탐색·분석" 또는 단순 수정이라 스킬 위임이 과한 경우, Claude가 Phase 1~2 답변을 기억한 채 바로 작업.

**직접 실행 시 자가 점검**:
- 모든 변경 전에 영향 범위 확인
- Q3 out-of-scope 준수 여부 매 수정 후 체크
- 단계 완료마다 사용자에게 경계 보고

### 완료 보고

실행 종료 시:

```
✅ 작업 완료 보고

목표 달성: <Q2 성공 기준 대비 체크리스트>
생성·수정 파일: <경로 목록>
미처리 (Q3 Scope 외에서 발견): <있다면 Issue 후보로 나열, TODO 주석 금지>
검증 수행: <타입체크·테스트·lint 결과>

🔄 Retro
  효과 있었음: <bullet 1~3>
  실패·삽질: <bullet 1~3 또는 "해당 없음">
  다음엔 바꿀 것: <bullet 1~3 또는 "해당 없음">
  저장: /cfh-retro로 영구 기록 가능

📝 제안 커밋  (코드 수정이 있었을 때만)
  메시지 초안: <subject + body>
  스테이지 범위: <파일 목록, .env 등 자동 제외>
  분할 추천: <단일 / 2개+ 분할 + 근거>
  진행: yes / edit-msg / split-differently / no-commit

다음 단계:
- 머지 전 자체 점검 → /cfh-review        (Phase 3에서 직접 실행했고 코드 수정이 있었던 경우)
- 이번 워크플로 피드백 → /cfh-feedback <기여 스킬> "<comment>"

남은 작업·별도 PR 후보:
- <목록>
```

**Retro·제안 커밋 블록 형식**: `commands/references/retro-and-commit.md`를 단일 출처로 따른다. 생략 금지 (코드 수정이 없는 탐색·분석 경로면 "📝 제안 커밋: 코드 수정 없음 — 생략" 한 줄로 대체).

**조건부 적용**: Phase 3가 위임 경로(`/cfh-tdd`·`/cfh-refactor` 등)였다면 위임받은 커맨드가 자체 완료 보고에서 Retro·Commit 블록을 출력하므로 `/cfh-plan`은 중복 출력하지 않음. 직접 실행 경로였을 때만 위 블록 출력.

</workflow>

<output_format>

각 Step·Phase 종료 시 사용자에게 짧게 보고:
- **Step 1a 완료**: Q1 목표 확인 (한 줄 반복 + 수정 기회)
- **Step 1b 완료**: Scoped Pre-scan 카드 (읽은 범위·건너뛴 영역 공개, 잘못된 부분 교정 기회)
- **Step 1c 완료**: Q2~Q4 답변 요약 + "Phase 2로 진행해도 될까요?"
- **Phase 2 완료**: 접근법 카드 (승인 대기)
- **Phase 3 완료**: 작업 완료 보고 (Q2 성공 기준 대비 체크)

긴 작업이면 Phase 3 도중에도 단계별 경계 보고.

</output_format>

<constraints>

- **명시 호출 전용**. 자동 트리거 키워드 없음. 자연어 대화로 진행해도 되는 가벼운 작업에는 부적합.
- **목표(Q1) 없이 스캔 금지.** Scoped Pre-scan은 Q1 답변 후에만 실행.
- Phase 1 답변(목표·스캔·Q2~Q4)이 모이기 전 코드 수정·파일 생성 금지.
- Phase 2 승인 전 Phase 3 실행 금지.
- 태스크 분류는 공개 후 사용자 재확인.
- 추정·가정 금지. 모호하면 (a)/(b)/(c) 옵션으로 재질문.
- 전용 스킬·커맨드 있으면 **위임 우선**. Phase 1~2 답변을 컨텍스트로 이관.
- 자산(skill/command/team) 생성 의도가 드러나면 `/cfh-make`로 전환 안내.
- Scope 외 이슈 발견 시 TODO 주석 금지 — Issue 후보로 별도 보고.
- 직접 실행 경로의 완료 보고는 **Retro·제안 커밋 블록 생략 금지**. 형식은 `commands/references/retro-and-commit.md`.
- 자동 commit 금지. 제안 커밋 블록은 사용자가 명시 yes 해야 진행.

</constraints>
