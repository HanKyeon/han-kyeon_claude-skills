---
name: refactoring-strategy
description: |
  Use this skill when the user mentions refactoring (리팩터링, refactor,
  restructure, cleanup, migration), proposes structural changes to existing
  code without changing behavior, or is cleaning up legacy code written by
  multiple authors. Provides strategy, safety guardrails, and references to
  library-official anti-patterns.
---

# Refactoring Strategy

기존 동작을 보존하면서 구조만 개선하는 작업을 안전하게 수행하기 위한 전략과 체크리스트입니다.

## 5대 원칙 (Always Apply)

1. **작은 단위 PR** — 한 PR은 하나의 리팩터링 주제만. 동작 변경과 구조 변경을 같은 커밋에 섞지 않는다.
2. **행동 보존** — "같은 입력 → 같은 출력"을 보장하는 안전망(테스트, 타입, smoke test) 없이 리팩터링하지 않는다.
3. **Blast Radius 먼저 파악** — 수정 대상이 어느 화면/기능/API에 영향을 주는지 **코드를 바꾸기 전에** 트레이싱한다.
4. **Legacy 허용** — 이번 PR 범위 밖의 문제는 고치지 않는다. 발견만 하고 Issue/TODO로 분리.
5. **라이브러리 공식 기준** — 취향이 아니라 **해당 라이브러리가 공식 문서로 지정한 규칙/안티패턴**을 기준으로 판단.

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
