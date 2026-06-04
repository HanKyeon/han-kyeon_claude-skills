# Final Intent Confirm — 최종 종합 확인 (단일 출처)

> *결론 → 작업 실행 직전*에 사용자 답변을 *합산 해석*하고 *모호 발화*를 명시한 뒤 최종 yes를 받는 단계. 각 turn 단위 확인(국소)과 다른 *전체 흐름*(합산) 검증. mattpocock grilling의 *"멈추고 묻기"* 정신 + cfh의 *명시성* 정책 확장.

이 패턴을 적용하는 자산은 본 reference를 인용하고, *합산 대상*만 자기 자산에 맞게 채웁니다.

## 언제 사용

| 흐름 | 적용 시점 |
|---|---|
| **Intent → Action** (사용자 답변 → 코드 작성/수정) | 인터뷰 마지막 → 실행 직전 |
| **Specification → Files** (인터뷰 → 파일 생성) | 인터뷰 마지막 → Write 직전 |
| **Investigation → Fix** (증거·가설 → 수정 계획) | Verification 마지막 → Fix Plan 출력 직전 |

각 자산이 위 분류 중 *어디인지* 본문에 명시.

## 출력 템플릿

```
📋 최종 의도 해석 (Final Intent Confirm)

답변 종합:
  - <Q1 항목>: "<사용자 답변 인용>" → <Claude 해석 — 한 줄>
  - <Q2 항목>: "<인용>" → <해석>
  - <...>

모호 발화 해석:
  - "<원 발화>" → <Claude가 채택한 의미>. <다른 가능 의미>면 정정 권장.
  - <감지된 동음이의어·약어·도메인 가정 — 있으면 명시, 없으면 "감지된 모호 발화 없음">

답변 간 충돌·gap:
  - <발견 시 표기 — 예: "Q3 'API 변경 금지' vs Q5 '새 endpoint 추가' 충돌">
  - <또는 "충돌 없음">

✅ 검증 게이트:
  - <자산별 핵심 게이트 — 예: scope 명확 / 의존 chain 정합 / out-of-scope 명시>

진행: yes / 정정 <항목> / 처음부터 / pass (보류 — 추가 정보 모이면 재개)
```

## 합산 룰

### 1. 답변 인용 — verbatim 우선

- 사용자 답변에서 *원 발화*를 *짧게 인용*. 요약 금지.
- 인용은 따옴표(`"..."`)로 표시. 해석은 인용 뒤 화살표(`→`)로 분리.
- 인용이 길면 *앞 30자 + "…"* 형식. 절대 *Claude 요약*으로 대체 금지.

### 2. 모호 발화 해석 — 명시 표기

자산이 동음이의어·약어·도메인 가정 감지하면 명시:

| 카테고리 | 예시 |
|---|---|
| 동음이의어 | "service" → Spring `@Service` bean / OS daemon / domain service / SaaS service |
| 약어 | "API" → REST endpoint / library API surface / public method |
| 도메인 가정 | "user" → application user / DB row / OAuth subject / tenant member |
| 동작 단어 | "fix" → bug fix / refactor / improve perf / type tighten |
| 범위 단어 | "전체" → 한 파일 / 한 모듈 / 한 도메인 / 전 코드베이스 |

해석 형식:
```
"<원 발화>" → <채택 의미>. <다른 가능 의미>면 정정 권장.
```

감지 *없으면* 명시:
```
모호 발화 해석:
  - 감지된 모호 발화 없음
```

→ 매번 비어 있어도 *명시 단락* 유지. 사용자가 *Claude가 모호 검사를 했음*을 신뢰할 수 있게.

### 3. 답변 간 충돌·gap — 자가 검증

LLM이 *답변 모음 안에서* 모순 또는 누락 감지:

- **충돌**: 두 답이 서로 어긋남 — 예: Q3 "API 변경 금지" + Q5 "새 endpoint 추가" → 둘 다 진행 불가
- **gap**: 결정에 필요한 답이 빠짐 — 예: scope 답에 *out-of-scope* 정의 없음
- **약한 신호**: 답이 *모두 `[guessed]`* 마커만 → 사용자 명시 정정 권장

발견 시 단락에 *명시*. 없으면 "충돌 없음".

### 4. 검증 게이트 — 자산별 핵심

각 자산이 *진행 직전 반드시 확보해야 할 것*을 게이트로 명시. 예:
- `/cfh-plan`: 위임 sub-command 1개 명확 / Q3 out-of-scope 답 존재
- `tdd-first`: Happy Path / Edge Case / Out of scope 3 카테고리 모두 답
- `/cfh-tc`: 보강 시나리오 범위 명확 / 기존 테스트 컨벤션 파악

자산이 *최소 1~3 게이트*만 명시 (10+는 ceremony).

## 답변 옵션

| 입력 | 동작 |
|---|---|
| `yes` / `진행` / `OK` | 다음 Phase 실행 |
| `정정 <항목>` (예: `정정 Q3`·`정정 모호`) | 해당 항목 재질문 → 답 받고 종합 재출력 |
| `처음부터` / `restart` | Phase 1로 회귀 (전체 답변 폐기) |
| `pass` / `보류` | 노드 unresolved 유지, 추가 정보 모이면 재개 (작업 실행 안 함) |
| `explain <항목>` | 해당 답변/해석의 신호·근거 자세히 출력 (lazy load) |
| 그 외 / 침묵 / 짧은 동의 (`응`·`OK` 단독) | **대기**. ambiguous response — 명확한 의사 표현이 들어와야 진행. 자동 진행 금지. |

## 자가검증 (slot ≠ purpose)

이 단계가 *형식 채우기*가 되면 가치 0:
- 답변이 *전부 한 줄*인데 모호 해석 채우지 말 것 (gap이 진짜 없으면 "없음" 명시)
- 답변이 *모두 `[guessed]`* 라도 자동 진행 금지 → "추가 정보 필요" 표기
- 충돌·gap 단락이 *항상 "없음"*만 출력되면 LLM이 검사 안 한 신호 → 자가 비판: 검사 안 했으면 명시 "검사 skip"

## 토큰·turn 정책

- **한 turn 출력 + 응답 종료** — confirm 단락 뒤 *즉시 stop*. 자동 진행 금지.
- 사용자 답이 *모호*(`pass`·`잠깐`·짧은 동의) → 대기.
- 답변 인용은 *짧게* — 30자 + ellipsis. 토큰 절약 + 가독성.
- 모호 발화 1~3건만 명시 (5+ 카테고리 한꺼번에 채우면 *카탈로그 함정*).

## 적용 자산

| 자산 | 시점 | 합산 대상 |
|---|---|---|
| `/cfh-plan` | Phase 2 Approach Card → Phase 3 Execution 직전 | Q1~Q4 + 위임 sub-command + 접근법 카드 |
| `/cfh-grill` (`grilling`) | Phase 2 Sequential Interrogation → Phase 3 Convergence 직전 | 트리 결정 모음 + 미해결 노드 + 모호 발화 |
| `tdd-first` | Phase 1 Intent Interview → Phase 2 Outline 직전 | 6 질문 답변 + Happy/Edge/Error scope |
| `tdd-general` | 동상 | 동상 |
| `/cfh-tc` | Phase 1 Intent → Phase 2 작성 직전 | 의도 + 보강 시나리오 범위 + 기존 테스트 컨벤션 |
| `/cfh-tc-gen` | 동상 | 동상 |

후속 확장 후보 (사용자 반응 보고 결정):
- `refactoring-strategy` Step 5→6
- `skill-author` Phase 4 Write Files 직전
- `cfh-harness` Phase 5 Scaffold 직전
- `asset-factory` Phase 2 Delegation 직전
- `debug-investigator` Phase 4 Fix Plan 직전

## 관련

- `commands/references/recommendation-pattern.md` — 매 turn 추천+이유 (국소). 본 reference는 *합산* 차원.
- `commands/references/confidence-tagging.md` — `[verified]/[inferred]/[guessed]` 마커
- `commands/references/soft-routing.md` — Phase 0a stack misroute suggestion (입구 단계)
