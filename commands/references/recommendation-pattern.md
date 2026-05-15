# 추천 + 이유 패턴 (Recommendation with Rationale)

CFH의 인터뷰·옵션 제시·dispatch 결정에서 **빈 질문 금지, 추천 우선** 컨벤션. mattpocock의 grilling 핵심 원칙을 프로젝트 가치에 맞게 어댑테이션한 것.

## 핵심 원칙

> **"어떻게 생각하세요?"는 빈 질문이다.**
> 항상 추천 1개 + 그 추천의 이유 + 다른 옵션이 맞을 신호 조건을 함께 제시한다.

사용자가 "yes / no / 다른 옵션"으로 답할 수 있게 만든다 — 의사결정 공을 사용자에게 넘기지 않는다.

## 안티 패턴 (피해야 할 형식)

```
어떻게 하시겠습니까?
- (a) X
- (b) Y
- (c) Z
```

이 형식의 문제:
- 사용자가 X·Y·Z의 차이를 안다고 가정 (자주 안 그럼)
- 무엇을 골라야 할지 단서 0개
- 결정 비용을 사용자에게 모두 떠넘김

## 권장 형식

### 단일 추천 + 이유 + 대안 트리거

```
📌 추천: X
   이유: <2~3 문장. 현재 컨텍스트에서 X가 best인 구체적 근거.>

다른 옵션:
   - Y — 사용자가 <조건>일 때 적합
   - Z — 사용자가 <조건>일 때 적합

선택: yes / Y / Z / 다른 의견
```

### 적용 예 (`/cfh-plan` Phase 2 approach card)

**Before** (개선 전):
```
이대로 진행하시겠습니까?
- (yes) Phase 3 실행
- (adjust) 특정 단계만 수정
- (reclassify) 태스크 분류 재논의
```

**After** (추천+이유):
```
📌 추천: yes — Phase 3 실행
   이유: Q1~Q4 답이 일관됨. Project·Product 위험 신호 없음.
         위임 대상(/cfh-tdd)도 명확.

다른 옵션:
   - adjust — Q2 성공 기준이 모호하게 느껴지거나 빠진 단계가 있을 때
   - reclassify — "이 작업은 리팩터가 아니라 신규 기능 같다" 같은 task type 이견
   - revise-checks — Project Alignment 또는 Product Impact 추론이 너무 추측 같을 때
   - grill — 결정 트리 sub-branch를 더 깊이 파야 할 때 (/cfh-grill로)

선택: yes / adjust <단계> / reclassify / revise-checks / grill
```

## 이유 작성 가이드

| 좋은 이유 | 약한 이유 |
|---|---|
| "Q3에서 'API 시그니처 변경 금지'를 명시했고, 신규 기능 추가는 시그니처를 안 건드리니까 TDD 위임이 적합" | "TDD가 좋습니다" |
| "직전 turn에서 사용자가 '캐시 TTL'을 모름 — 결정 트리에 미해결 branch 존재, grill이 도움 됨" | "더 깊이 봐도 좋을 것 같음" |
| "diff 4파일, all FE — Convention·Logic·Test 3 에이전트면 충분, Project/Product Health 제외 권장" | "다 켜도 되지만 많을 수도" |

**원칙**: 이유에 **구체 신호** 1~2개 인용 (사용자 답변·코드·정량 측정 결과). 일반론은 피함.

## 추천이 어려운 경우

### Case 1 — 추천이 정말 5:5

```
📌 추천: (강한 추천 없음 — 둘 다 합리적)
   이유: A는 즉시 효과, B는 장기 유지보수에 유리. 사용자 선호에 따라 갈림.

선택: A — <조건> / B — <조건>
```

이 경우에도 **무엇이 갈림길의 핵심 변수인지** 명시. "사용자에게 달림"으로 끝내지 말 것.

### Case 2 — 정보 부족

```
📌 추천: (정보 부족 — 한 가지 추가 정보 필요)
   필요: <구체적 발화 또는 코드 확인>
   이유: 이 정보 없이는 X와 Y 중 어느 게 맞는지 판단 불가능 (둘이 가정하는 환경이 다름).

진행: 위 정보를 알려주시거나, "(skip) 둘 다 고려한 plan B"를 받으세요.
```

## 코드는 추천 이유의 컨텍스트로만

추천을 제시하려면 근거가 필요. 코드는 **이유 근거**로 인용하되, **결정은 사용자가** 합니다.

| 질문 유형 | 처리 |
|---|---|
| 사실 확인 ("이 import 어디?") | Grep으로 즉시 확인 + 추천 이유에 [verified]로 인용 |
| 의도 결정 ("어디 둬야 하나?") | **반드시 사용자에게 묻기.** 코드 현황은 이유로만, 결정 아님 |

예시:
- "이 컴포넌트가 어디서 import되나?" → **사실** → Grep으로 확인 → "[verified] X에서 import 중"
- "이 컴포넌트의 state는 어디 둬야 하나?" → **의도 결정** → 사용자에게 묻기 (코드 현황은 이유로만 인용)
- "팀이 strict mode를 선호하나?" → **사실** → CLAUDE.md 검색 → [verified] 또는 [inferred] 추정 + 사용자 확인

**핵심**: 코드는 *현재 상태*, 사용자는 *미래 의도*. 결정 권한은 사용자에게.

## confidence tagging과의 결합

추천 이유에 `[verified]` / `[inferred]` / `[guessed]` 마커를 붙이면 더 정직:

```
📌 추천: yes — Phase 3 실행
   이유:
     - [verified] Q3 out-of-scope 명시 (사용자 답변)
     - [verified] 신규 의존성 없음 (package.json 확인)
     - [inferred] tdd-first가 적합 — Q1이 "react 컴포넌트" 명시
     - [guessed] 위임 후 추가 질문 거의 없을 것 — 인터뷰 답이 풍부
```

사용자는 `[guessed]` 부분만 압박해서 확인 가능.

## 어디에 적용하나 (cfh-* 가이드)

| 커맨드 | 적용 지점 | 효과 | 도입 |
|---|---|---|---|
| `/cfh-plan` | Phase 2 approach card 옵션 | 사용자 결정 비용 감소 + (grill) 옵션 | 0.14.1 |
| `/cfh-make` | dispatch 결정 (skill/command/team/agent) | "왜 skill로 분류했는지" 명시 | 0.14.1 |
| `/cfh-debug` | Phase 2 가설 prioritization | "가설 N부터 검증 추천 — 이유: ..." | 0.14.1 |
| `/cfh-review` | Step 2.5 exclusion 인터뷰 | "UI-only면 E 제외 추천" | 0.14.1 |
| `/cfh-refactor` | Step 1 Scope (8질문 각각) + Step 5 분할 전략 | 8개 결정 모두 추천 동반 + (grill) 옵션 | 0.14.2 |
| `/cfh-team` | Phase 2 패턴 선택 (6 중 1) | "Producer-Reviewer 추천 — 이유: ..." | 0.14.2 |
| `/cfh-grill` | 매 질문 | **본질** — grilling의 핵심 | 0.14.1 |

## 적용 예제 — cfh-refactor의 분할 전략 선택

```
📌 추천 분할 전략: Scaffolding
   이유:
     - [verified] Blast Radius 영향 23 파일 — 한 PR로 묶기 위험
     - [verified] Q3에서 "행동 보존만"이라 신·구 병존 가능
     - [inferred] 의존 그래프상 새 구조 → 기존 마이그레이션 → 기존 제거 3단 분할이 안전
     - [guessed] Q4 시간 박스 "여유 있음"이라 3 PR 분리 가능

다른 옵션:
   - Vertical Slice — 영향 파일 < 5개일 때 적합
   - Horizontal Slice — 같은 layer를 가로지르는 codemod류일 때
   - Adapter — breaking API change 회피 우선일 때

답변: 추천대로 / 다른 전략 / grill
```

## 적용 예제 — cfh-team의 패턴 선택

```
📌 추천 패턴: Producer-Reviewer
   이유:
     - [verified] Q4 실패 비용이 "결제 모듈 — 매우 큼"
     - [verified] Q1 답이 "TDD 오버핏 방지" — 검증-중심 신호
     - [inferred] 생성·검증 인격 분리가 테스트 통과만 하는 가짜 구현 위험을 줄임
     - [guessed] Q3 전문성 축 1개로 단순 — Expert Pool은 과한 듯

다른 옵션:
   - Expert Pool — 여러 축 동시 평가 필요할 때 (도메인별: FE a11y·타입 / BE consistency·idempotency·latency / ML fairness 등)
   - Pipeline — 단계가 선형으로 명확할 때

답변: 추천대로 / 다른 패턴 / grill (패턴 선택을 깊이 파기)
```

## 어디엔 적용 안 하나

- **정보 수집 질문** ("프로젝트 이름이 뭔가요?") — 추천할 게 없음, 질문은 그대로
- **사용자가 명시 답변한 직후 확인** ("react 18.3.1 맞으세요?") — 추천 불필요
- **fact 보고** — 추천은 의사결정 지점에서만

## 한계

- **추천이 항상 정확하리란 보장 없음** — 컨텍스트 일부만 보고 만든 신호
- **사용자가 추천을 무비판 수용할 위험** — `[guessed]` 마커로 완화
- **추천 작성 비용** — 매 옵션마다 이유 작성은 추가 토큰 → 핵심 결정 지점에만 적용 (정보 수집 질문 제외)

## 관련

- `commands/references/confidence-tagging.md` — `[verified]`·`[inferred]`·`[guessed]` 마커
- `skills/grilling/SKILL.md` — 결정 트리 깊이 파는 전용 스킬
- `commands/cfh-grill.md` — grilling 명시 호출
