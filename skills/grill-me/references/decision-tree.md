# 결정 트리 walk 알고리즘

grill-me Phase 1·2의 핵심 — 어떤 순서로 결정을 파야 하는가.

## 기본 원칙

1. **의존성 순서**: 부모 결정 → 자식 결정. 부모가 안 풀리면 자식은 추측에 불과.
2. **가지치기 우선**: 결정 트리를 먼저 보여주고 사용자가 잘라낼 기회 제공. 모든 가지를 다 파지 않음.
3. **사용자 의도 우선**: 결정은 항상 사용자에게 묻기. 코드는 *현재 상태*이지 *미래 의도*가 아님 — 사용자 답이 코드와 다를 수 있음. 코드는 추천 이유의 컨텍스트로만 (선택적) 인용.
4. **시간 박스**: 한 grill 세션이 30분 넘어가면 종료 신호 — 너무 추측 영역이거나 plan 자체를 다시 짜야 함.

## 결정 트리 추출 패턴

새 기능 plan을 grill할 때 일반적으로 등장하는 결정 카테고리:

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

## walk 순서 — 의존성 그래프

각 결정에는 **의존성**이 있다. 의존성 없는 결정부터 풀어야 함.

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
1. state-location (no deps)
2. validation (no deps) — 병렬 가능하지만 한 번에 하나만
3. data-flow (state-location 결정 후)
4. schema-lib (validation 결정 후)
5. error-UX·loading-UX·caching (data-flow 후)
6. accessibility (schema 후 — form ARIA 등)
7. testing (모든 결정 후 — 무엇을 테스트할지)

## 가지치기 기준

사용자가 명시 "skip"하지 않아도 자동 가지치기:

| 신호 | 가지치기 |
|---|---|
| Q3 out-of-scope에 "성능 최적화 제외" 명시 | caching·prefetch 가지 자동 제외 |
| Q4 긴급도 (a) "지금 당장 막혔어" | 의존성 그래프의 leaf만, root만 grill — 깊이 줄임 |
| 코드에서 이미 정해진 결정 (예: 기존 zustand 사용) | state-location 가지 자동 [verified] resolve |
| `--no-deep` 같은 flag (향후) | 명시적 얕은 grill |

## 종료 조건

다음 중 하나면 grill 종료:

1. **트리 소진** — 모든 가지가 resolved 또는 [verified] 또는 skipped
2. **사용자 "enough"** — 명시 종료 신호
3. **추측 영역 진입** — 남은 가지가 모두 [guessed]만 가능 → 더 가도 의미 없음
4. **시간 박스** — 30분+ 한 세션 (대화량 측정)
5. **새 plan 필요** — grill 중 plan 자체가 잘못됐다는 신호 발견 → "/cfh-plan으로 돌아가야 합니다" 권장

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

→ 이건 *사실*. Grep으로 즉시 확인 후 [verified]로 인용. 의도 결정만 사용자에게 묻고, 단순 사실은 코드로 확인 OK.

### ❌ 트리 안 보여주고 바로 질문

→ 사용자는 grill의 끝이 어디인지 모름. **Phase 1 트리 enumeration이 먼저**.

## eval 가능성

이 패턴은 `cfh eval --executor claude --enable-judge`로 측정 가능:

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
