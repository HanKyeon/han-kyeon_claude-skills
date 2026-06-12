# Confidence Tagging 컨벤션

스킬 출력에 **근거의 확실성**을 명시적으로 표기하는 권장 컨벤션입니다.
"AI가 알고 있는 것 / 추론한 것 / 추측한 것"을 구분하지 않는 게 LLM 에이전트의 가장 흔한 신뢰 누수 — 이 컨벤션은 그 갭을 가리는 약한 그물망입니다.

## 왜 필요한가

문제: 스킬·에이전트의 출력은 **세 가지 종류의 진술이 섞여** 있습니다.

1. **사용자가 명시한 사실** — "Q1에서 React 프로젝트라고 답함"
2. **읽은 파일·로그에서 직접 확인한 것** — "package.json에 react 18.3.1 명시"
3. **추론한 것** — "Vitest 사용 → MSW도 같이 쓸 가능성"
4. **추측한 것** — "팀이 strict mode를 선호할 것 같음"

모두 같은 톤으로 출력되면, 사용자는 어느 부분에 압박을 줘야 하는지 모릅니다. 추측이 사실처럼 보이면 잘못된 의사결정의 출발점이 됨.

## 권장 마커 — 3 단계 (신호등 emoji 병기)

| 마커 | 의미 | 사용 예 |
|---|---|---|
| `🟢 [verified]` | 코드·문서·사용자 답변에서 **직접 확인** | `🟢 [verified] package.json에 react 18.3.1 명시` |
| `🟡 [inferred]` | 직접 보지 않았지만 **합리적 추론** | `🟡 [inferred] Vitest 사용 → MSW 같이 쓸 가능성 높음` |
| `🔴 [guessed]` | 근거 약한 추측, **사용자 검증 필요** | `🔴 [guessed] strict mode 선호로 보임 — 확인 부탁` |

### Emoji 병기 규칙

출력 카드에서 마커는 신호등 emoji와 병기 — **emoji와 tag 사이 공백 하나** (`🟢 [verified]`).

- **이유**: 색 그라데이션은 글자보다 먼저 스캔됨 — 사용자가 읽기 전에 "🔴만 압박"이 가능
- 🔴은 경고를 겸함 — 추측은 검증 없이 믿지 말라는 `[guessed]`의 본뜻
- **기계 토큰은 bracket이 기준**: `cfh doctor --strict-confidence`·contract test는 `[verified]` 텍스트를 검사. emoji는 시각 접두라 검사와 무관 — 단 출력 표준은 병기
- **prose·백틱 인용에는 병기 안 함**: 마커를 *언급*할 때(예: "답이 모두 `[guessed]`면")는 글자만. emoji는 실제 출력 카드 전용
- **🟢🟡🔴은 confidence 전용 예약** — severity(high/medium/low) 등 다른 3단계 척도에 재사용 금지 (의미 충돌 방지)

## 적용 예시

### Before (마커 없음)

```
프로젝트 분석 결과:
- React 18.3.1 사용
- Vitest + MSW 테스트 환경
- 컴포넌트는 strict mode로 작성
```

→ 모든 항목이 같은 확신도로 보임. 사용자는 어느 게 진짜 사실인지 모름.

### After (마커 적용)

```
프로젝트 분석 결과:
- 🟢 [verified] React 18.3.1 사용 (package.json 확인)
- 🟢 [verified] Vitest 5.x — vite.config.ts에서 setup
- 🟡 [inferred] MSW 같이 쓸 가능성 — Vitest + 테스트에서 fetch mock 패턴 발견
- 🔴 [guessed] strict mode 선호 — tsconfig.json 미확인, 일반적 컨벤션 가정
```

→ 사용자가 "guessed 부분만 확인해 줘"라고 빠르게 좁힐 수 있음.

## 어디에 적용하나

### 권장 적용 위치

- **스캔·분석 결과 보고**: Pre-scan, Project Profile, Blast Radius 분석 등
- **추천·제안의 근거**: "X 라이브러리 추천 — 이유: …"
- **자동 추론 섹션**: `/cfh-plan`의 Project Alignment Check, Product Impact Check
- **리뷰 카드의 지적**: `/cfh-review`의 Critical/High 항목 근거

### 권장 안 함 위치

- **사용자 질문**: 질문은 답변을 받을 자리, 자기 추측이 끼어들 일 없음
- **작업 완료 보고**: 실제 변경 결과(파일·테스트 통과)는 fact, 마커 불필요
- **에러 메시지·tool 호출 결과**: 실제 출력 그대로, 가공 안 함

## 강제성 — 약하게

이 컨벤션은 **권장**이지 강제가 아닙니다. 이유:

1. **모든 출력에 마커를 붙이면 가독성 해침** — 명백히 verified한 사실에까지 마커 붙이는 건 노이즈.
2. **자동 lint으로 강제 어려움** — 어느 진술이 verified인지를 LLM 출력에서 자동 판정 못 함.
3. **사용자 톤 선호 차이** — 어떤 사용자는 마커 없는 깔끔한 출력 선호.

대신: **스킬 작성 시 가이드로 권장**, 사용자가 정직성 우선 프로젝트(의료·결제·법적)에서 명시 채택.

## 스킬 작성 시 적용 방법

`SKILL.md` 또는 `<output_format>` 섹션에 한 줄 추가:

```markdown
<output_format>

## 출력 컨벤션

분석·추론 결과는 confidence 마커를 붙여 표기 (신호등 emoji + 공백 병기):
- `🟢 [verified]` 직접 확인한 사실
- `🟡 [inferred]` 합리적 추론
- `🔴 [guessed]` 근거 약한 추측 — 사용자 검증 권장

상세는 `commands/references/confidence-tagging.md`.

</output_format>
```

## doctor 체크 (옵트인)

`cfh doctor --strict-confidence`로 실행 시 다음을 경고:

- 스킬 SKILL.md에 confidence tagging 가이드 부재 (info 수준)
- 스킬 출력 예시에서 `[verified]`/`[inferred]`/`[guessed]` 마커 0개 (info 수준)

기본 `cfh doctor`에는 이 체크가 활성화되지 않음 — opt-in. 정직성 우선 프로젝트에서만 활성화.

## /cfh-plan·/cfh-review와의 자연스러운 통합

이 두 커맨드는 이미 추론 기반 분석 섹션을 가짐 (Project Alignment Check, Product Impact Check). 그 섹션에 마커를 붙이면 즉시 효과:

```
📦 Project Alignment Check
  - 🟢 [verified] 신규 의존성 없음 — package.json 변경 없음
  - 🟡 [inferred] 모듈 경계 유지 — payments/·orders/ 구조 그대로
  - 🔴 [guessed] migration 일치 — CLAUDE.md 명시 없어 추정 기반
```

마지막 항목이 `[guessed]`로 표시되면 사용자는 "이건 내가 확인해봐야겠다"를 즉시 인지.

## 한계

- LLM이 마커를 일관되게 붙이리란 보장 없음 — 컨벤션일 뿐, 자동 강제 아님
- 마커 정확도는 LLM의 자기 인식에 의존 — `[verified]`라고 표시했지만 실제론 추론인 경우 있음
- 스킬마다 채택 정도가 달라 일관된 사용자 경험 어려움

이 컨벤션의 목적은 **완벽한 정확성이 아니라 사용자에게 압박 지점 신호 제공**. 100%는 아니어도 70%만 맞아도 가치 있음.
