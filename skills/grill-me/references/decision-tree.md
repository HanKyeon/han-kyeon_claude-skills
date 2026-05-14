# 결정 트리 walk 알고리즘

grill-me Phase 1·2의 핵심 — 어떤 결정을 어떤 순서로 파는가.

이 문서는 `commands/cfh-grill.md` v4 결정과 일관됩니다. 충돌 시 cfh-grill.md가 권위.

---

## 기본 원칙 (5개)

### 1. 의존성 순서

부모 결정 → 자식 결정. 부모가 안 풀리면 자식은 추측에 불과.

### 2. 결정 트리 enumerate 먼저

전체 트리를 enumerate해서 사용자에게 보여준 다음 Phase 2 진입. 사용자가 보지 못한 채 grill 시작 금지.

### 3. 사용자 의도 우선 + 사실은 코드로 (구분 중요)

두 종류 질문을 구분:

- **의도 결정** (state 위치·에러 UX·마이그레이션 전략 등): **항상 사용자에게** 묻기. 코드 현황은 추천 *이유*로만 인용(`[verified]`), 결정은 사용자.
- **사실 확인** (import 경로·함수 시그니처·의존 그래프): **코드로 확인**. 사용자에게 묻지 말 것 — 답을 못 함.

구분 기준 — *"이 결정에 영향받는 사람의 **미래 행동**을 묻는가?"*
- YES → 의도, 사용자에게
- NO → 사실, 코드에서

### 4. 자가검증 (slot ≠ purpose)

아래 카테고리별 템플릿의 노드는 *후보*일 뿐. 각 plan에 실제 영향 주는지 자가검증 후만 트리에 포함. "템플릿에 있어서 enumerate"는 금지.

- 각 노드 옆에 "이 plan에서 왜 필요한가" 한 줄 사유 표기.
- 사유가 "카테고리 표준이라서"·"템플릿에 있어서"밖에 안 나오면 **제외**.
- 의심스러우면 default 제외. 사용자가 "그것도 봐야 해" 요청하면 그때 추가.

### 5. 라운드 인지 (자동 cap 없음)

세션이 길어지면 사용자가 "여기서 끊자" 판단할 수 있도록 라운드 카운터 정보 노출. **자동 종료 cap 없음** — mattpocock 원본의 "relentlessly" 정신 유지. 사용자가 명시 종료 신호("그만"·"enough"·"시간 없어")를 줄 때까지 진행.

---

## Plan 종류별 가이드

### Greenfield (신규 기능·추상 목표)

대상: `/cfh-grill 쿠폰 검증 추가`, `/cfh-grill auth flow 재설계` 같은 추상 목표.

- **코드 `[verified]` 없음** — 추천 이유는 `[inferred]`·`[guessed]` 위주
- 사용자 답이 거의 모든 결정의 신호 → grill이 더 강하게 작동
- Pre-scan **skip**, 카테고리 템플릿에서 키워드 매칭으로 후보 enumerate

### Brownfield (기존 코드 대상)

대상: `/cfh-grill src/legacy/payment 리팩터` 같은 기존 코드 변형.

- mini Pre-scan으로 도메인 파악 (CLAUDE.md 관련 섹션 + deps + 관련 파일 최대 3개, 각 100줄)
- 추천 이유에 `[verified]` 가능 — 단, **결정은 여전히 사용자**
- 코드 발견은 *가지치기 추천*의 근거 (아래 "가지치기 추천 신호" 표). **자동 resolve 아님**

### 광범위 topic (재진입 처리)

대상: `/cfh-grill 결제 쪽`·`auth 관련`·`프론트 좀` 같은 광범위 답.

- **카테고리 트리 enumerate 금지.** 즉시 8개 결정 펼치면 사용자가 원하던 한 가지를 묻기 전에 트리 폭격.
- 한 번 더 좁히는 질문: *"구체적으로 어떤 결정·plan을 grill할까요? (예: 결제 실패 시 retry 정책 / 카드 토큰 저장 전략 / 멱등성)"*
- 사용자가 좁힌 후에만 Phase 1 진입.

---

## 결정 트리 추출 패턴

새 기능 plan을 grill할 때 일반적으로 등장하는 결정 카테고리. **이 목록은 후보 풀일 뿐 — 자가검증 후 적용**.

### Frontend 기능 plan의 전형 결정 트리

```
1. State 위치
   ├── local component state
   ├── shared store (zustand·redux·jotai)
   ├── server state (react-query·swr)
   └── URL state (search params·router)

2. Data flow
   ├── lift state up
   ├── context provider
   └── prop drilling

3. Error UX
   ├── inline error message
   ├── toast notification
   ├── error boundary
   └── retry mechanism

4. Loading UX
   ├── spinner
   ├── skeleton
   ├── optimistic update
   └── progressive disclosure

5. Caching
   ├── cache TTL
   ├── stale-while-revalidate
   ├── invalidation triggers
   └── prefetch strategy

6. Validation
   ├── client-only
   ├── server-side
   ├── both (debounced)
   └── schema definition (zod·yup·valibot)

7. Accessibility
   ├── ARIA labels
   ├── keyboard navigation
   ├── screen reader announcements
   └── focus management

8. Testing
   ├── unit
   ├── integration
   ├── e2e
   └── visual regression
```

### Backend 기능 plan의 전형 트리

```
1. API contract
   ├── REST / GraphQL / RPC
   ├── request/response schema
   └── error format

2. Auth
   ├── who can call
   ├── permission granularity
   └── token validation

3. Data layer
   ├── DB schema migration
   ├── transaction boundary
   └── index strategy

4. Caching
   ├── layer (in-memory / Redis / CDN)
   ├── invalidation
   └── TTL

5. Idempotency
   ├── idempotency key
   ├── retry semantics
   └── side effects

6. Observability
   ├── log fields
   ├── metrics (counter / gauge / histogram)
   └── trace span

7. Rate limiting
   ├── per-user / per-IP / per-token
   └── backoff strategy

8. Failure handling
   ├── timeout
   ├── circuit breaker
   └── fallback
```

### Refactor plan의 전형 트리

```
1. Scope (breadth × depth)
   ├── single file
   ├── module
   ├── cross-module
   └── architectural

2. Behavior preservation
   ├── pure refactor (no behavior change)
   ├── refactor + minor fix
   └── refactor + new feature (split into 2 PRs)

3. Safety net
   ├── existing test coverage
   ├── characterization tests needed
   └── smoke test only

4. Migration strategy
   ├── big bang
   ├── strangler fig (gradual)
   ├── adapter pattern
   └── feature flag

5. Blast radius
   ├── direct imports
   ├── type dependencies
   ├── runtime/string references (queryKey·i18n·path)
   └── test files

6. Library migration (if any)
   ├── version compat
   ├── breaking changes
   └── codemod / manual
```

---

## walk 순서 — 의존성 그래프

각 결정에는 **의존성**이 있음. 의존성 없는 결정부터 풀어야 함.

```
의존성 그래프 예 (FE 기능):

state-location → data-flow → error-UX
                          ↘
                            loading-UX
                          ↘
                            caching
                          ↗
validation → schema-lib → accessibility
                       ↘
                         testing
```

순서:
1. state-location (의존성 없음 — 독립 root)
2. validation (의존성 없음 — 독립 root)
3. data-flow (state-location 결정 후)
4. schema-lib (validation 결정 후)
5. error-UX·loading-UX·caching (data-flow 후)
6. accessibility (schema 후 — form ARIA 등)
7. testing (모든 결정 후 — 무엇을 테스트할지)

**한 번에 하나만 출력**: 의존성상 독립이라도 *질문 출력은 한 번에 하나*. "병렬 가능"이라는 표현이 동시 출력 유혹을 줄 수 있어 명시 — 의존성 측면의 독립 ≠ 출력 측면의 동시.

---

## 가지치기 추천 신호 (자동 아님 — 추천만)

사용자에게 *"이렇게 가지치기 추천"*을 제시. 자동 적용 금지 — 사용자 명시 확정만이 진행 신호.

| 신호 | 가지치기 추천 |
|---|---|
| Q3 out-of-scope에 "성능 최적화 제외" 명시 | caching·prefetch 가지 → "**제외 추천.** 이유: Q3 명시 [verified]" |
| Q4 긴급도 (a) "지금 당장 막혔어" | "**얕은 grill 추천** — root만, depth 1. 이유: 시간 제약" |
| 코드에서 결정이 이미 보임 (예: 기존 zustand 사용) | "**zustand 유지 추천**. 이유: 기존 사용 [verified] 일관성. **단, 새 plan에선 다른 선택 가능 — 사용자 답이 결정**" |
| `--no-deep` flag (향후) | 명시적 얕은 grill 모드 |

모든 경우 Phase 1 트리 카드에 **추천 + 이유** 형태로 표시, **사용자 답변으로 확정**. *행동*은 같지만 (가지가 잘려나감) *권한*은 사용자에게 남음.

---

## 종료 조건

(시간 박스는 제거됨 — `cfh-grill.md` v4와 일관)

1. **트리 소진** — 모든 가지가 resolved 또는 [verified] 또는 user-excluded
2. **사용자 명시 종료** — "그만"·"enough"·"충분"·"시간 없어"·"여기서 끊자"
3. **추측 영역 진입** — 남은 가지가 모두 `[guessed]`만 가능 → 더 가도 의미 없음
4. **새 plan 필요** — grill 중 plan 자체가 잘못됐다는 신호 발견 → "/cfh-plan으로 돌아가야 합니다" 권장

---

## 안티 패턴

### ❌ 한 turn에 여러 질문

```
state는 어디 둘까요? cache TTL은? error UX는?
```

→ 사용자 압박, 답변 품질 저하. **한 번에 하나만**.

### ❌ 추천 없는 질문

```
state를 zustand·local·server 중 어디 둘까요?
```

→ 사용자가 trade-off 모르면 답 못 함. **추천 + 이유 필수**.

### ❌ 코드에 답이 있다고 결정 자동 처리

```
"코드에 zustand 있음 → state 위치 결정 #3: zustand로 자동 resolve"
```

→ 코드는 *현재 상태*, 사용자는 *미래 의도*. 새 plan에선 다른 선택지 가능 — **반드시 사용자에게 묻기**. 코드 현황은 추천 이유로 인용하되, 답은 사용자.

### ❌ 단순 사실 확인까지 사용자에게 묻기

```
"이 컴포넌트가 어디서 import되나요?"
```

→ 이건 *사실*. Grep으로 즉시 확인 후 `[verified]`로 인용. 의도 결정만 사용자에게 묻고, 단순 사실은 코드로 확인 OK. (원칙 3 참조)

### ❌ 트리 안 보여주고 바로 질문

→ 사용자는 grill의 끝이 어디인지 모름. **Phase 1 트리 enumeration이 먼저**.

### ❌ Template 슬롯이 있다는 이유로 노드 추가

```
"FE 카테고리에 a11y가 있으니까 enumerate"
(plan은 정적 위치 변경, 인터랙션 없음)
```

→ 자가검증 위반. 슬롯 채우기 = 빈 질문 = 금지. (원칙 4 참조)

### ❌ 광범위 topic에 즉시 카테고리 폭격

```
사용자: "결제 쪽 봐줘"
→ FE/BE 표준 트리 8 노드 즉시 enumerate
```

→ 사용자가 원하던 한 가지를 묻기 전에 트리 폭격. 좁히는 질문 먼저.

### ❌ "다른 옵션 B/C" 가짜 채우기

```
📌 추천: A
다른 옵션:
  - B: A의 정반대 — 거의 모든 경우 비추
  - C: 일반적 대안 — 특별한 trade-off 없음
```

→ 형식 슬롯 강제 채우기. 추천이 압도적이면 "**다른 옵션: 없음 — 단일 선택지 명확**" 명시.

### ❌ 답에서 sub-decision 자동 파생

```
사용자: "zustand로 갈게"
LLM: "그럼 zustand 안에서 도메인 분할은? slice 패턴은? middleware는?"
```

→ 사용자가 명시한 분기 또는 blocking 결정일 때만 추가. 자동 파생 금지.

---

## eval 가능성

이 패턴은 `cfh eval --executor claude --enable-judge`로 측정 가능. 우리가 합의한 핵심 원칙들을 cover하는 judge criteria:

```json
{
  "type": "judge",
  "criterion": "응답이 결정 트리를 먼저 보여주고 사용자에게 가지치기 기회를 제공하는가"
}
```

```json
{
  "type": "judge",
  "criterion": "각 질문이 추천 답 + 이유 + 다른 옵션 트리거 조건을 포함하는가"
}
```

```json
{
  "type": "judge",
  "criterion": "[verified]/[inferred]/[guessed] confidence marker가 추천 이유에 부착되어 있는가"
}
```

```json
{
  "type": "judge",
  "criterion": "사용자의 'OK'/짧은 응답/Enter/침묵을 default 동의로 해석하지 않고 명시 답변을 기다리는가"
}
```

```json
{
  "type": "judge",
  "criterion": "코드 발견을 결정 자동 resolve로 사용하지 않고 추천 이유로만 인용하는가"
}
```

```json
{
  "type": "judge",
  "criterion": "광범위 topic 입력에 카테고리 트리를 즉시 enumerate하지 않고 좁히는 질문을 하는가"
}
```

```json
{
  "type": "judge",
  "criterion": "결정 노드가 plan에 실제 영향을 주는 경우에만 트리에 포함되는가 (slot ≠ purpose)"
}
```

```json
{
  "type": "judge",
  "criterion": "Phase 1 트리 카드에 제외된 후보와 그 사유가 가시화되는가"
}
```

```json
{
  "type": "judge",
  "criterion": "한 응답이 결정 노드 하나에 대한 질문만 포함하고, 동시에 다음 노드 질문이나 추가 질문을 묶지 않는가"
}
```

```json
{
  "type": "judge",
  "criterion": "import 경로·함수 시그니처 같은 단순 사실을 사용자에게 묻지 않고 코드에서 직접 확인하는가"
}
```
