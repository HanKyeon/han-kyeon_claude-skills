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

## 오버핏 방지 — 반드시 지킬 5가지

1. **테스트 잠금**: 구현이 통과 못 하면 **구현을 고친다**. 테스트를 고치지 않는다.
2. **Writer/Implementer 분리 가능 시 분리**: 서브에이전트로 Test Writer와 Implementer를 분리 (→ `references/test-producer-reviewer-agents.md`)
3. **행동 기반 테스트**: class name, 내부 state 접근 금지. `getByRole`, 반환값, 최종 DOM만.
4. **Property-based 보강**: 핵심 로직에는 `fast-check` (→ `references/property-based-examples.md`)
5. **Intent Preservation**: 구현 완료 후 Phase 1 답변 재확인을 잊지 않기

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
