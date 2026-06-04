# PROGRESS.md Audit — 6축 검증 + Adversary side-effect (단일 출처)

> `/cfh-progress`가 작성·갱신한 PROGRESS.md를 **외부 독자 시점**에서 검증. *작성자 인격*과 *검토자 인격* 분리(Adversary 패턴)로 확증 편향 차단. 본 작업 영향 없음 — 검토 결과는 *갱신 권장*만 출력.

## 정신

- 작성자(`/cfh-progress`)와 검토자(`/cfh-progress-audit`)는 *책임 분리*
- LLM이 *방금 자기가 쓴 글*을 검증하면 확증 편향 — 별 인격으로 재평가
- 본 PROGRESS.md를 *수정하지 않음* — 갱신은 사용자 명시 yes 후
- 정책 § 0 명시 분기 + final-confirm 정신 일관

## 6축 검증

### 1. 자기 충족성 (Self-sufficiency)

PROGRESS.md *만* 보고 작업 재개 가능?

- 외부 컨텍스트 의존(슬랙·세션·머릿속) 없이 시작 가능?
- 새로운 사람이 *처음 본다*면?
- 미래의 자기 자신이 *3개월 후* 본다면?

### 2. 결정 근거 (Decision rationale)

결정마다 *왜* 명시?

- "X로 결정함" → *왜 X인지* 인용·증거?
- 대안 검토했는지 명시?
- 트레이드오프 명시?

### 3. 다음 단계 명확성 (Next-step clarity)

*무엇을* *어떻게* 할지 명시?

- ❌ 모호: "계속 진행", "마무리", "다음 단계 검토"
- ✅ 명확: "0.23.0 bump 후 npm publish", "contract test 6축 정의 검증"

### 4. 미해결 추적 (Unresolved tracking)

resolved/unresolved 명확 분리?

- 결정된 것과 미해결된 것 시각적 구분?
- 미해결 이유 명시? (skip / 정보 부족 / 다음 사이클로)
- 차단 요소(blocker)·의존성 명시?

### 5. 모호 발화 (Ambiguous wording)

동음이의어·도메인 가정 검사 (final-confirm.md § 모호 발화 정책 일관):

- "service" → Spring `@Service` / OS daemon / domain service / SaaS service?
- "controller" → MVC / domain / hardware?
- "API" → REST endpoint / library API / public method?
- 외부 독자가 *의미 확정* 가능?

### 6. Side-Effect (외부 영역 영향)

PROGRESS.md *외부* 영역에 미치는 영향 — **Adversary 인격이 가장 가치 큼**.

#### Side-Effect 영역 카탈로그 (7개)

| 영역 | 검사 |
|---|---|
| **다른 결정** | 이 결정이 *이전 결정*과 충돌? |
| **다른 자산** | 결정이 *다른 skill·command·reference*에 영향? |
| **인터페이스·계약** | API·SKILL.md description 변경 → *기존 사용자* 영향 명시? |
| **컨벤션·정책** | 새 정책이 *기존 코드·자산*에 backwards-compat? |
| **의존성** | 추가·제거된 dep이 *순환 의존*? |
| **migration·schema** | 변경이 *기존 데이터·환경* 영향? |
| **환경·설정** | settings·env 변경이 *다른 환경*(dev/prod·CI) 영향? |

#### `[guessed]` 마커 강제

side-effect 가설은 본질 *외부 영역 추측*이라 confidence 낮음:

- `[verified]` — PROGRESS.md 본문에 *명시*된 영향
- `[inferred]` — 코드·이전 PROGRESS.md·자산 보고 *합리적 추론*
- `[guessed]` — 근거 약함, *사용자 명시 확인 권장*

LLM이 "이거 깨질 수도" 남발 차단 — 마커로 신뢰도 분리.

## 2-Tier 검증

### Tier 1 — 체크리스트 (yes/no 빠른 검사)

```
🔍 PROGRESS.md Audit — Tier 1 (체크리스트)

6축 검증:
  ☐ [1] 자기 충족성 — PROGRESS.md만 보고 시작 가능?
       발견: <yes/no + 근거 한 줄>
  ☐ [2] 결정 근거 — 결정마다 인용·증거?
       발견: <yes/no + 근거>
  ☐ [3] 다음 단계 명확성 — 무엇을·어떻게 명시?
       발견: <yes/no + 인용>
  ☐ [4] 미해결 추적 — resolved/unresolved 분리?
       발견: <yes/no>
  ☐ [5] 모호 발화 — 외부 독자 가능?
       발견: <감지된 발화 1~3건 또는 "감지 없음">
  ☐ [6] Side-effect 명시 — 결정의 외부 영향 명시?
       발견: <yes/no + 명시된 영역 또는 누락 영역>

요약: <N>/6 통과

다음 단계: 더 깊이 Adversary 검토? (yes / no / skip 특정 축)
```

### Tier 2 — Adversary (사용자 명시 yes 후만)

#### Adversary 인격 — *반증 시도*

작성자가 *명시 안 한* 영역 적극 추적:

- "이 PROGRESS.md만으로 작업 재개 *불가능한 이유* 5가지 이상"
- "결정 #N → side-effect 영역 7개 체계적 확인 → 누락 발견"
- "다음 단계가 *명확해 보이지만* 사실 모호한 이유"

#### Defender 인격 — *반론 검토*

Adversary 반론마다 3 결정 중 1:

| 결정 | 의미 |
|---|---|
| (a) **유지** | "out of scope로 의도됨" — 갱신 불필요 |
| (b) **수정** | "내용 정정 필요" — 기존 단락 수정 |
| (c) **추가** | "side-effect 명시 추가 필요" — 새 단락 |

#### bounded 2 round (token 폭증 차단)

- Round 1: Adversary 반론 → Defender 1차 검토
- Round 2: Adversary 추가 반론(있으면) → Defender 최종 결정
- exceed 시 Defender 강제 결정 후 종료

#### Subagent mode default

- bounded 2 round 단순 — flag 불필요
- Adversary·Defender 각 1 subagent 호출 → orchestrator 통합
- 정말 *iterative*가 필요하면 teams mode (사용자 명시 선택)

## 안내 정책 — cfh-progress 작성 후 조건부 출력

team-suggestion.md § A 패턴 일관:

| 신호 강도 | 출력 |
|---|---|
| **weak** (단순 작은 갱신) | **출력 X** (자가검증) |
| **medium** (결정 3~5·미해결 ≥ 1) | **1줄 hint** — `🔍 (옵션) PROGRESS.md audit 가능 — /cfh-progress-audit` |
| **strong** (결정 ≥ 6·모호 발화 의심·side-effect 큰 변경 다수) | **2줄 hint** — `🔍 (옵션) PROGRESS.md audit 권장: <구체 신호> — /cfh-progress-audit` |

### 신호 트리거 (자산 자가 평가)

- **strong**:
  - 결정 ≥ 6
  - 또는 *모호 발화* 감지 ≥ 2건
  - 또는 *컨벤션·인터페이스 변경* 결정 포함 (side-effect 큰 영역)
- **medium**:
  - 결정 3~5
  - 또는 미해결 노드 ≥ 1
  - 또는 *다음 단계 단락이 짧음* (모호 의심)
- **weak**:
  - 결정 ≤ 2 + 미해결 0 + 단순 갱신

### 자가검증 (slot ≠ purpose)

매번 hint 출력 강제 X. *진짜 weak*면 침묵. "audit 가치 큼" 같은 templated 안내 금지 — 구체 신호 인용 필수.

## 갱신 권장 출력 (Tier 1·2 후)

Audit 종료 시 *PROGRESS.md 갱신 권장 단락* 출력 — **본 PROGRESS.md 수정 X**, 권장만:

```
📝 PROGRESS.md 갱신 권장

✅ 통과 축: <1·2·...>
⚠ 약점 축: <3·6 등>

권장 변경:
  - [수정] <축 N> "<발화 인용>" → "<제안 갱신>"
  - [추가] <축 N> <새 단락 — 예: "Side-Effect: 결정 #N이 X 영역에 영향">
  - [유지] <축 N> "out of scope로 의도됨" — Defender 결정

진행: yes (갱신 적용) / 부분 적용 <축> / no (현재 유지) / explain <항목>
```

명시 yes 받기 전 PROGRESS.md 수정 금지 (정책 § 0).

## 적용 자산

| 자산 | 역할 |
|---|---|
| `commands/cfh-progress.md` | 작성·갱신 후 *조건부 안내* hint |
| `commands/cfh-progress-audit.md` | 2-tier 검증 명령 (신설) |

후속 확장 후보 (외부 사용자 데이터 보고 결정):
- `commands/cfh-plan.md` 작성 후 plan audit
- `audit/*` 결과 audit

## 관련

- `commands/references/recommendation-pattern.md` — 매 결정 추천+이유 (체크리스트와 조합)
- `commands/references/confidence-tagging.md` — `[verified]/[inferred]/[guessed]` 마커
- `commands/references/final-confirm.md` — 갱신 권장 yes 받기 전 합산 confirm
- `commands/references/team-suggestion.md` — 조건부 안내 패턴 (안내 출력 정책 동일)
- `skills/cfh-harness/references/patterns/adversary.md` — 7번째 패턴 (Tier 2 적용)
