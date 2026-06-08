---
name: refactoring-strategy
description: |
  Use this skill when the user mentions refactoring (리팩터링, refactor,
  restructure, cleanup, migration), proposes structural changes to existing
  code without changing behavior, or is cleaning up legacy code written by
  multiple authors. Provides strategy, safety guardrails, and references to
  library-official anti-patterns.
commands: [/cfh-refactor, /cfh-refactor-gen]
---

# Refactoring Strategy


## 트리거 조건 (1.0 컨벤션 — 본문 참고용, frontmatter description이 권위)

```
TRIGGER:  '리팩터링', 'refactor', 'restructure', 'cleanup', 'migration' — 행동 보존
          하면서 구조 변경 의도.
SKIP:     디버그(원인 조사) → debug-investigator. 새 기능 추가 → tdd-*.
EXAMPLES:
  - '레거시 모듈 정리해줘' → Step 1 Scope Narrowing 8 질문
  - 'zustand → jotai 마이그레이션' → Step 4 Safety Net + Step 5 Small PR 분할
```

### FE / BE 컨텍스트 분기 (`-gen` suffix 컨벤션)

같은 5 Step 메타 워크플로(Scope · Profile · Blast Radius · Safety Net · Small PR)를 적용하되, **컨텍스트별 가이드가 다름**:

| 신호 | 가이드 |
|---|---|
| FE 컴포넌트·React/Vue·queryKey·i18n·Suspense 등장 | `/cfh-refactor` (FE 가이드 — RTL·MSW·React 라이브러리 안티패턴) |
| BE handler·repository·migration·OpenTelemetry·ORM 등장 | `/cfh-refactor-gen` (BE 가이드 — DB schema·API contract·observability·Strangler Fig 분할) |
| 둘 다 또는 모호 | 발화에서 명시 신호 우선. 없으면 `/cfh-refactor` (default) 또는 사용자에게 확인 |

분기는 Blast Radius·Library 안티패턴·Safety Net 단계에서 가장 두드러짐. Scope Narrowing 8 질문 자체는 stack-agnostic.
기존 동작을 보존하면서 구조만 개선하는 작업을 안전하게 수행하기 위한 전략과 체크리스트입니다.

## 5대 원칙 (Always Apply)

1. **작은 단위 PR** — 한 PR은 하나의 리팩터링 주제만. 동작 변경과 구조 변경을 같은 커밋에 섞지 않는다.
2. **행동 보존** — "같은 입력 → 같은 출력"을 보장하는 안전망(테스트, 타입, smoke test) 없이 리팩터링하지 않는다.
3. **Blast Radius 먼저 파악** — 수정 대상이 어느 화면/기능/API에 영향을 주는지 **코드를 바꾸기 전에** 트레이싱한다.
4. **Legacy 허용** — 이번 PR 범위 밖의 문제는 고치지 않는다. 발견만 하고 Issue/TODO로 분리.
5. **라이브러리 공식 기준** — 취향이 아니라 **해당 라이브러리가 공식 문서로 지정한 규칙/안티패턴**을 기준으로 판단.

## 방향 제안 — 대안 탐색 + 정량 비교

리팩터 *접근*을 정할 때, 현행 답습 전 더 나은 대안을 검토하고 정량 비교로 사용자에게 제시한다.

### 대안 탐색
- 현행 구조를 그대로 답습하기 전 **"더 단순·안전한 리팩터 접근이 있나"** 먼저 검토.
- **작업 범위 내로 한정** (5대 원칙 4 Legacy 허용과 정합 — scope 밖까지 넓히지 않음).
- **측정 가능·명확한 이점일 때만** 제안 (5대 원칙 5와 정합 — "취향 차이" 변경 금지).
- 기존 방식이 **의도적 선택**(주석·테스트·문서로 드러난)인지 먼저 고려 — 맥락 모르고 "개선"하지 않음.
- **행동 보존 유지** (5대 원칙 2 — 기능 변경이 아니라 *접근* 대안).

### 정량 비교 (조건부 카탈로그)
방향 비교 시 **해당하는 지표만** 골라 제시. 측정 가능하면 `[verified]`, 아니면 `[guessed] 추정` + 측정 방법 명시 (→ `confidence-tagging.md`). 무관한 지표는 **생략** (slot ≠ purpose — 매번 다 채우지 말 것).

**공통 지표 (스택 무관)**:

| 지표 | 무엇 | 언제 |
|---|---|---|
| 영향 범위 | 변경 파일·함수 수 | 항상 (Blast Radius 결과 재사용) |
| 복잡도 | 순환 복잡도·중첩 깊이·의존성 수 | 구조 개선 시 |
| **중복 제거** | 중복 N곳 → M곳 | DRY 목표 시 (리팩터 핵심 동기) |
| **결합도·의존 방향** | 순환 의존 → 단방향, 모듈 경계 | 의존 구조 개선 시 (측정 어려우면 추정) |
| **타입 안전성** | 타입 escape hatch 개수(`any`/`Any`/`interface{}`/`unsafe` 등 언어별)·타입 커버리지 | 정적 타입 언어에서 타입 강화 시 |
| 테스트 | 추가·수정·삭제 수 | 항상 |

**스택별 지표** (번들·성능 등 — 표현이 스택마다 다름): `/cfh-refactor`(FE 축) · `/cfh-refactor-gen`(BE 축) 본문 참고. 타입 안전성의 구체 측정 도구(`tsc`·`mypy --strict`·`go vet`·`clippy`)도 각 커맨드에서.

### 트레이드오프 + 현행 유지
- 추천안 + 이유 한 문장 (→ `recommendation-pattern.md`). **최종 선택은 사용자.**
- **트레이드오프 명시**: 무엇을 얻고 무엇을 포기하는가 + 위험도(회귀 가능성·되돌리기 쉬움).
- **정량 이점이 미미하거나 추정 불확실성이 크면 "현행 유지"도 동등한 선택지로 제시.**
- 예외: 명백한 버그·보안 결함·CLAUDE.md 명시 룰 위반은 비교 없이 바로 수정하되, *무엇을 왜 고쳤는지* 기록.

## 활성화 시 반드시

- **(z) 모르겠음 fallback.** Scope Narrowing의 모든 질문에 `(z) 모르겠음` 옵션 기본 탑재. 선택 시 `~/.claude/skills/asset-factory/references/unknown-answer-playbook.md`의 3단계 처리.

## Step 복귀 규칙 (공통)

Step 3 이후에 초반 판단이 틀렸다고 판단되면 아래 트리거로 이전 Step 복귀:
- **"scope 재조정"** → Step 1 Scope Narrowing 재수행
- **"blast radius 재산정"** → Step 3 Blast Radius 분석 재실행
- **"safety net 재검토"** → Step 4 Safety Net (테스트 보강 계획 수정)
- **"PR 분해 재설계"** → Step 5 Small PR 계획 재작성
- **"legacy 재분류"** → Step 7 Legacy 기록 범위 조정

복귀 시 이전 답변·스캔 결과는 참고용으로 유지하고 변경된 부분만 갱신. 각 PR 단위로 이미 커밋돼 있으면 `git revert` 또는 `git reset`으로 코드 레벨 되돌리기도 병행 가능.

## 워크플로 (시작 전 순서)

```
Step 0: Scope Narrowing — 사용자에게 범위 질문 (→ references/scope-narrowing.md)
  ↓
Step 1: Scope 확정 + Project Profile 수집
  ↓
Step 2: Blast Radius  — 영향 범위 스캔 (→ references/blast-radius-analysis.md)
  ↓
Step 3: Safety Net    — 테스트 있음? 없음? (→ references/characterization-test.md)
  ↓
Step 4: Small PR 계획 — 5~10 파일 단위로 쪼개기 (→ references/small-pr-guide.md)
  ↓
Step 5: 실행 + 검증   — 각 PR마다 행동 보존 확인
  ↓
Step 6: 발견 사항 분리 — Legacy 문제는 별도 Issue (→ references/legacy-tolerance.md)
```

### 질문은 "개발에 필요한 때"만
- Step 0의 Scope Narrowing 질문은 **필수**. 추측 금지.
- Step 2~5 중에도 개발 판단에 **정보가 부족하면** 사용자에게 질문. 단, 결과 포맷팅만을 위해 질문하지는 말 것.
- 질문 없이 진행 가능하면 그대로 진행.

### 결과 설명은 Why/What/How/What if 4축
- **결과 설명·제안·리뷰 출력**은 `references/reasoning-format.md`의 4축 포맷으로 작성.
- 단순 사실 보고(파일 목록, 실행 결과 등)에는 불필요.
- 단순 결정에는 축약 버전(한 줄)도 가능.

## 자주 하는 실수와 대응

| 실수 | 대응 |
|---|---|
| "이왕 보는 김에" 여러 개선 묶기 | ❌ **중단**. 별도 PR로 쪼갤 것. |
| 테스트 없이 대규모 변환 | ❌ Characterization Test 먼저. 불가능하면 Playwright smoke test. |
| 외부 "베스트 프랙티스" 강요 | ❌ 라이브러리 공식 문서 링크 없으면 제안하지 말 것. |
| Legacy 코드 전면 재작성 충동 | ❌ Scope 내로만. 나머지는 TODO. |
| AI가 임의로 API 시그니처 변경 | ❌ 공개 API 변경은 항상 사용자 승인. |

## 라이브러리별 공식 안티패턴 체크

리팩터링 중 아래 라이브러리가 사용된다면 공식 안티패턴을 **먼저 참조**:

→ `references/library-anti-patterns.md` (React, React Query, React Hook Form, Tailwind, Zustand 등)

## 중요 규칙 — 이 스킬이 활성화되면 반드시

1. **Scope Narrowing 프로토콜**(`references/scope-narrowing.md`)의 8 질문을 먼저 수행. 답변 받기 전에 코드 수정 금지.
2. **수정 전 영향 범위 브리핑**. "이 변경이 X, Y, Z 파일/화면에 영향 갑니다"를 먼저 알림.
3. **각 PR 단위로 커밋 메시지에 `refactor:` prefix**. 동작 변경이 없음을 명시.
4. **테스트가 없는 영역은 리팩터링 전에 '테스트부터 쓸까요?'를 질문**.
5. **라이브러리 공식 문서 링크로 안티패턴을 근거 제시**. "내 취향"으로 제안 금지.
6. **모든 제안·리뷰 결과 설명은 Why/What/How/What if 4축**(`references/reasoning-format.md`) — 출력에만 적용, 질문 남발 용도 아님.
