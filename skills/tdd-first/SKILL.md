---
name: tdd-first
description: |
  Use this skill when the user wants to follow TDD (test-driven development) for
  **React/Vue/frontend components** — asks to write tests first (테스트 먼저, 테스트부터),
  is starting a new feature, fixing a bug that lacks a regression test, or refactoring
  a tested area. Runs a 5-phase workflow with structural defenses against test-overfit
  and uses Testing Library (getByRole, userEvent, MSW) conventions. Do NOT trigger
  when the project is backend-only (Node/Python/Go/Rust/Java without React or Vue),
  CLI, library, or pure logic — `tdd-general` covers stack-neutral TDD with
  framework-agnostic idioms.
commands: [/cfh-tdd, /cfh-tc]
---

# TDD-First Workflow


## 트리거 조건 (1.0급 컨벤션 — 본문 참고용, frontmatter description이 권위)

```
TRIGGER:  React/Vue/FE 컴포넌트 + TDD intent (새로 만든다) — '테스트 먼저',
          '테스트부터', '컴포넌트 TDD', 'TDD로 .tsx 만들어줘', '새 컴포넌트'.
SKIP:     백엔드/CLI/라이브러리/순수 함수 → tdd-general.
          기존 FE 파일 *보강*만 (artifact mode) → /cfh-tc 명시 호출 권장.
INTENT vs ARTIFACT:
  intent (새 컴포넌트·훅) → tdd-first 자동 트리거
  artifact (기존 *.tsx 보강) → 자동 트리거 약함, /cfh-tc 명시 호출 권장
EXAMPLES:
  - 'TDD로 src/components/CouponInput.tsx 만들어줘' → Phase 1 Intent Interview
  - 'useAuth 훅 TDD로 시작' → Phase 0 Scope Narrowing 7 질문
  - '기존 UserList.tsx 테스트 보강' → /cfh-tc 라우팅 권장 (intent 아님)
```
새 기능·버그 수정·리팩터링을 **테스트 먼저 작성**하여 진행하는 5단계 워크플로입니다. AI와 사용자가 **테스트라는 공통 목표**를 공유하여 의도 정렬을 극대화합니다.

## 활성화 시 반드시

1. **(z) 모르겠음 fallback.** Phase 0 Scope Narrowing·Phase 1 Intent Interview의 모든 질문에 `(z) 모르겠음` 옵션 기본 탑재. 선택 시 `~/.claude/skills/asset-factory/references/unknown-answer-playbook.md`의 3단계 처리.

## 5 Phase (+ Phase 0)

```
Phase 0: Scope Narrowing    (7 질문으로 작업 범위 좁힘 → references/scope-narrowing.md)
   ↓
Phase 1: Intent Interview   (AI가 질문, 사용자가 답변)
   ↓
Phase 2: Test Outline        (describe/it 제목만 제안 → 사용자 승인)
   ↓
Phase 3: Failing Tests       (테스트 본문 작성, 구현 파일 X)
   ↓
Phase 4: Implementation      (최소 구현으로 GREEN)
   ↓
Phase 5: Refactor + Verify   (리팩터링 + Intent 재확인)
```

### 질문과 결과 포맷 구분
- **Phase 0·1의 질문**은 개발 판단에 **반드시 필요한 정보**를 얻기 위한 것. 포맷 규칙을 위해 질문 남발 금지.
- **결과 설명·Test Outline 해설·Intent Preservation 체크**는 Why/What/How/What if 4축으로 (`references/reasoning-format.md`). 출력에만 적용.

## Phase 복귀 규칙 (공통)

Phase 2 이후에 초반 답변이 틀렸다고 판단되면 아래 트리거로 이전 Phase 복귀:
- **"scope 재조정"** → Phase 0 Scope Narrowing으로 복귀
- **"intent 재인터뷰"** → Phase 1 Intent Interview로 복귀
- **"outline 수정"** → Phase 2 Test Outline으로 복귀
- **"실패 테스트 재작성"** → Phase 3 재작업

복귀 시 이전 답변은 참고용으로 남기고, 변경된 부분만 갱신합니다. git이 각 Phase의 커밋을 분리 기록하므로 필요 시 `git reset`·`git revert`로 코드 레벨 되돌리기도 병행 가능.

## Phase 1 — Intent Interview

AI가 코드 쓰기 전에 **반드시** 아래 질문을 던진다 (→ `references/intent-interview-template.md`):

1. **목표** — 한 문장으로 무엇을 하는가?
2. **Happy Path** — 대표 입력 → 기대 결과 1개
3. **Edge Cases** — null/undefined/빈 값/경계값/음수/매우 큰 값 중 처리 대상
4. **Error Cases** — 어떤 입력은 거부/실패하는가
5. **Out of Scope** — 이번에 **하지 않을** 것
6. **관찰 방법** — 반환값/DOM/state/side effect 중 무엇으로 검증?

답변이 모두 모이면 Phase 1.5로.

### Fast path — Draft-and-Confirm (신호 충분하면 이쪽이 default)

6개를 빈 질문으로 던지기 전에, 컨텍스트(`$ARGUMENTS`·대상 코드·CLAUDE.md·기존 테스트 컨벤션)에서 **답을 먼저 추론해 채워진 초안으로 제시**하고 사용자는 틀린 것만 고친다 (빈 폼 아님 — *채워진 초안의 교정*):

```
📝 Intent 초안 — 추론으로 채웠습니다. 틀린 항목만 정정해 주세요.

1. 목표:   <초안>  [inferred — $ARGUMENTS "<인용>"]
2. Happy:  <초안>  [inferred — 대상 코드 시그니처]
3. Edge:   <초안>  [guessed — 확인 권장]
4. Error:  <초안>  [guessed]
5. Out:    <초안>  [inferred]
6. 관찰:   <초안>  [verified — 기존 테스트 컨벤션]

(모호 발화·답변 간 충돌 검사 포함 — 이 카드가 Phase 1.5 합산 확인을 겸함)

답변: yes (Phase 2 진입) / 정정 <번호> <내용> / 전체 인터뷰 (순차 질문으로 전환)
```

- **발동 조건**: 6답 중 **과반이 `[verified]/[inferred]`**일 때만. 과반이 `[guessed]`면 fast path 금지 — 기존 순차 인터뷰로 (추측 초안 강요는 정렬이 아니라 오염).
- **이중 확인 방지**: 초안에 `yes`면 Phase 1.5를 *별도 출력하지 않음* (이 카드가 합산 확인 겸임). 정정이 2개 이상 나오면 정정 반영 후 Phase 1.5를 1회 수행.
- Phase 0 Scope 답도 신호가 있으면 같은 카드에 초안으로 포함 가능 (왕복 추가 절약).
- **escalation**: 사용자가 `전체 인터뷰` 선택 또는 초안이 연속 2회 크게 틀리면 순차 인터뷰로 전환.

## Phase 1.5 — Final Intent Confirm (Phase 2 진입 직전)

Phase 1 6 답변을 **합산 해석·모호 발화 검사·답변 충돌 자가검증** 후 명시 yes 받기 (→ `~/.claude/commands/references/final-confirm.md`).

**합산 대상**:
- 6 질문 답변 각각 *짧게 인용* + Claude 해석
- *모호 발화* — FE 도메인 동음이의어 (예: "form" → React Hook Form / native HTMLFormElement / form data validation 등 / "controller" → React form controller / RHF Controller / view controller)
- *답변 간 충돌·gap* — 예: Q3 Edge Case "null 거부" vs Q5 Out of scope "null 처리 안 함" 충돌

**검증 게이트**:
- Happy Path / Edge Case / Error Cases / Out of scope 4 카테고리 모두 답 존재
- 관찰 방법 명확 (반환값·DOM·callback·store·네트워크 중 *하나 이상* 명시)
- Phase 0 Scope Narrowing 답이 *현재 작업 단위*와 정합

답변: `yes` (Phase 2 진입) / `정정 <Q번호>` / `처음부터` (Phase 0 회귀) / `pass`. 짧은 동의는 ambiguous로 *대기*, 명시 `yes` 받기 전엔 Phase 2 진입 금지.

## Phase 2 — Test Outline (제목 먼저)

구현 전에 **describe/it 문자열만** 제안:

```ts
describe('<subject>', () => {
  it('does X for valid input');
  it('returns null for empty array');
  it('throws on negative numbers');
  // ...
});
```

사용자가 **추가/삭제/재명명**한 뒤 확정. 이 시점에 **같은 지도**를 공유.

## Phase 3 — Failing Tests

- 본문을 채우되 **구현 파일은 아직 읽거나 쓰지 않는다**.
- 테스트는 **함수 시그니처와 Phase 1~2 합의**만 참조.
- **의도 헤더 기본 포함**: 테스트 파일 상단에 Phase 1.5 확정 답을 JSDoc으로 — `@intent 목표 / @happy / @edge / @error / @outofscope / @observe`. 별도 질문 불필요 (작성 중인 파일의 일부).
- 모든 테스트가 **FAIL**인 상태로 커밋:
  ```
  test: add failing tests for <subject>
  ```

## Phase 4 — Implementation

- 테스트를 GREEN으로 만드는 **최소 구현**.
- 테스트 수정 금지. (→ `references/anti-overfit-rules.md`)
- 테스트가 틀렸다고 판단되면 **명시적으로 선언** 후 사용자 승인 받고 수정.

## Phase 5 — Refactor + Verify

- 테스트 GREEN 유지하며 구조 개선.
- **Intent Preservation 체크**: Phase 1 답변을 다시 읽고 구현이 의도를 충족하는지 **테스트와 별개로** 확인.

### 의도 헤더 동기화 (Phase 3에서 기본 작성된 것)

- Intent Preservation 체크 시 **의도 헤더도 현행과 일치하는지** 확인 — Phase 2~5 도중 의도가 정정됐으면 헤더 갱신 (테스트 파일과 같이 살므로 diff에 자연 노출).
- 이 헤더는 이후 `/cfh-review`(리뷰 기준 원래 의도)·`/cfh-refactor`(보존할 행동)·`/cfh-tc`(의도 충돌 방지)가 *있으면* 읽는다 — 없어도 각 자산은 정상 동작 (강제 아님).

## 오버핏 방지 — 반드시 지킬 5가지

1. **테스트 잠금**: 구현이 통과 못 하면 **구현을 고친다**. 테스트를 고치지 않는다.
2. **Writer/Implementer 분리 가능 시 분리**: 서브에이전트로 Test Writer와 Implementer를 분리 (→ `references/test-producer-reviewer-agents.md`)
3. **행동 기반 테스트**: class name, 내부 state 접근 금지. `getByRole`, 반환값, 최종 DOM만.
4. **Property-based 보강**: 핵심 로직에는 `fast-check` (→ `references/property-based-examples.md`)
5. **Intent Preservation**: 구현 완료 후 Phase 1 답변 재확인을 잊지 않기

## 테스트 품질 (오버핏 방지와 별개 — "좋은 테스트")

오버핏 방지가 "테스트에 맞춘 가짜 구현"을 막는다면, **테스트 품질**은 "좋은 테스트 자체"를 만든다 (→ `commands/references/test-quality.md`):
- **리트머스**: 구현 바꿔도 행동 같으면 green 유지 (공개 계약 결합, 내부 구조 결합 금지)
- **피라미드**: 순수 함수로 될 걸 컴포넌트 렌더로 테스트하지 않음 (싼 계층 우선)
- **부작용 테스트**: cleanup·blob revoke·async race·unmount 후 setState 미발생 — 가장 강력한 리팩터 안전망. 실제 버그는 회귀 테스트로 고정
- **의도 명시**: 이름=보장 행동 한 문장 / 회귀·table·비직관 setup만 한 줄 주석 / 미커버 영역 JSDoc
- **FE 구체**: 쿼리 우선순위(`getByRole`>label>testid>querySelector), `userEvent` 우선, 시간·랜덤·네트워크 고정

## 이 스킬이 활성화되면 반드시

1. **Phase 0 Scope Narrowing 7 질문 먼저** (→ `references/scope-narrowing.md`). 범위가 크면 분해 제안.
2. **코드 쓰기 전에 Phase 1 Intent Interview**. 건너뛰지 말 것.
3. **Phase 2 outline을 사용자가 승인하기 전에는 Phase 3 금지**.
4. **Phase 3에서는 구현 파일을 읽지 않음** — 순수 의도만 반영.
5. **Phase 4에서 테스트 수정이 필요하면 TEST CHANGE REQUEST(4축 포맷)로 승인 요청**.
6. **Phase 5에서 Intent Preservation 체크**를 4축 포맷으로 작성.
7. **결과 설명·시나리오 해설은 Why/What/How/What if** (→ `references/reasoning-format.md`) — 출력 전용.

## 프로젝트 조건별 조정

| 프로젝트 상태 | 조정 |
|---|---|
| 테스트 프레임워크 없음 | Phase 1에 "테스트 도구 결정" 질문 추가. Vitest/Jest 선정. |
| 테스트 극소수 | Characterization Test 병행 (→ refactoring-strategy 스킬) |
| E2E만 있고 unit 없음 | unit부터 시작. E2E는 Phase 5 이후 보강. |
| TDD 처음 도입 | 작은 유틸 함수 한두 개로 시범 적용 후 확대. |
