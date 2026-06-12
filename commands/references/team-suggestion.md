# Team Suggestion — 안내 패턴 (단일 출처)

> 자산이 *team 가치 신호*를 감지하면 사용자에게 명시 안내. **강제 X — 거부해도 default 워크플로 그대로 진행**. multi-agent team은 *별 흐름*이라는 정신 강조.

## 정신

- 현재 자산은 *단일 orchestrator* — 그대로 작업 끝까지 진행
- *team 가치 신호*가 강하면 안내만 출력. *현재 작업 결과에 영향 0*
- 사용자가 *명시 선택*하면 `cfh-team`·`cfh-make`로 별 흐름 시작
- 정책 § 0 *명시성 + 분리*

## 두 출력 정책

자산 성격에 따라 분기:

### A. 빠른 자산 — 3단계 + lazy load (default)

| 신호 강도 | 출력 |
|---|---|
| **weak** (감지 X 또는 약함, `[guessed]`만) | **출력 X** (자가검증 — slot ≠ purpose) |
| **medium** (가능성 있음, `[inferred]` 1~2) | **1줄 hint** |
| **strong** (명확 가치, `[verified]` 또는 `[inferred]` 강함) | **2줄 hint** |

사용자가 명시 `why teams` 입력 시 → full 분석 (~20줄)

**적용 자산**: `/cfh-debug`, `/cfh-tdd`, `/cfh-tdd-gen`, `/cfh-refactor`, `/cfh-refactor-gen`

### B. 깊이 자산 — full 제안 default (예외)

깊이 인터뷰가 본질인 자산은 *full 제안*이 분량 잡음 아님 — grill 답변이 원래 풍부.

| 신호 강도 | 출력 |
|---|---|
| weak | 출력 X (자가검증) |
| medium+ | **full 단락 default** (~20줄) |

**적용 자산**: `/cfh-grill`

## 신호 강도 정의

각 자산이 *3단계 신호*를 정확히 분류해야 함. 임의 medium 부여 금지.

### 자산별 신호 트리거

#### `/cfh-debug` (Adversary 패턴 추천)
- **strong**: 채택 가설 ≥ 3 + 동일 시스템 다축 (예: race + locking + GC 동시 의심)
- **medium**: 가설 1~2이지만 *확증 편향 위험* (Q3 답에서 사용자가 한 가설 강하게 밀고 있을 때)
- **weak**: 가설 1개 명확 + 증거 강함

#### `/cfh-tdd`·`/cfh-tdd-gen` (Producer-Reviewer 패턴 추천)
- **strong**: Edge Case ≥ 5 + Intent Preservation 위험 신호 (구현 복잡·overfit 패턴 의심)
- **medium**: 컴포넌트·모듈 규모 큼 (10+ states / 7+ branches)
- **weak**: 단순 컴포넌트·단순 함수

#### `/cfh-refactor`·`/cfh-refactor-gen` (Expert Pool 패턴 추천)
- **strong**: Blast Radius ≥ 5축 + 영향 파일 ≥ 10 + 대규모 legacy (저자 N+, 컨벤션 혼재)
- **medium**: Blast Radius 3~4축, 영향 5~10 파일
- **weak**: 단일 파일·소규모 작업

#### `/cfh-grill` (full default — 패턴은 결정 트리에 따름)
- **medium+**: 결정 노드 ≥ 5, 미해결 ≥ 1, 또는 결정 다축 (FE·BE·observability 등 여러 축 동시 grill)
- **weak**: 결정 노드 ≤ 3, 모두 resolved, 단일 축

## 출력 템플릿

### A. medium hint (1줄)

```
💡 (옵션) team 활용 가능 — `why teams`로 자세히
```

### A. strong hint (2줄)

```
💡 (옵션) <패턴> 가치 큼: <한 단어 신호>
    자세히: `why teams`
```

예:
```
💡 (옵션) Expert Pool 가치 큼: Blast Radius 5축
    자세히: `why teams`
```

### `why teams` 응답 (lazy load full 분석)

사용자가 `why teams` 입력 시 다음 단락 출력:

```
📊 신호 분석:
  - 🟢 [verified] <감지 신호 1 — 인용·정량 포함>
  - 🟢 [verified] <감지 신호 2>
  - 🟡 [inferred] <보조 신호>

💡 추천 패턴: <Adversary | Producer-Reviewer | Expert Pool | ...>
   가치: <어떤 영역>에 <어떻게> 유리
         - <구체 효과 1>
         - <구체 효과 2>

📌 만들기:
   /cfh-team <도메인>       # 6 패턴 중 1 선택
   /cfh-make                 # 자산 종류 분류부터

⚠ 본 워크플로 영향 없음. team 사용은 *별도* 흐름.
   원래 작업 그대로 진행하려면 추가 답변 없이 다음 단계 진행.
```

### B. cfh-grill full default

Phase 3 종료 보고 안에 *Retro 옆*에 inline:

```
💡 Team 활용 가치 (grill 결과 기반)
   📊 신호 분석:
     - 🟢 [verified] 결정 #<N>이 <축 1>·<축 2>·<축 3> 다축 관련
     - 🟢 [verified] 미해결 노드 <M>개 — 추가 시각 필요
     - 🟡 [inferred] <도메인>에 <패턴> 가치

   💡 추천 패턴: <Expert Pool | Adversary | Producer-Reviewer | ...>
      가치: <2~3 문장>

   📌 만들기:
      /cfh-team <도메인>     # 6 패턴 중 1 선택
      /cfh-make               # 자산 종류 분류

   ⚠ 본 grill 결과는 그대로. team 사용은 *별도* 흐름.
```

## 위치 — 워크플로 종료 시 권장 단락 안

각 자산의 *기존 "다음 단계 권장"* 단락에 **새 한 줄**(또는 cfh-grill은 *단락*) 추가. 별 카드 신설 X — 일관 흐름.

기존 cfh 컨벤션:
```
다음 단계:
- 머지 전 → /cfh-review
- 이번 워크플로 피드백 → /cfh-feedback <skill> "<comment>"
- 회고 영구 기록 → /cfh-retro
- 💡 (옵션) Expert Pool 가치 큼: Blast Radius 5축 — `why teams`    ← 신규 row (조건부)
```

## 거부·복귀 정책

- `why teams` 답 받은 후 *사용자가 추가 답변 안 함* → default 워크플로 그대로 진행 (영향 0)
- 사용자가 *명시 `/cfh-team`·`/cfh-make` 실행*해야만 team 흐름 시작
- 원래 작업의 결과·산출물에 영향 0 — *명시 분리*

## 자가검증 (slot ≠ purpose)

이 안내가 *형식 채우기*가 되면 가치 0:

- **weak 신호인데 medium 부여 금지** — 트리거 정의(위)에 정확히 매칭되는 경우만
- **"가치 큼" 같은 templated 안내 금지** — 구체 신호·축 인용 필수
- 매번 출력 강제 X — weak면 *침묵*
- "Expert Pool 가치 큼" + 신호 없음 → *자가 비판*: 신호 못 찾으면 출력 안 함

## 토큰·UX 영향 추정

| 케이스 | 추가 토큰 |
|---|---|
| 빠른 자산, weak | **0** |
| 빠른 자산, medium | +1줄 (~20 토큰) |
| 빠른 자산, strong | +2줄 (~40 토큰) |
| 빠른 자산, `why teams` 요청 | +20줄 (~400 토큰, 한 turn만) |
| cfh-grill, medium+ | +20줄 default (~400 토큰) |

→ default UX 거의 영향 없음. *명시 요청* 시만 풍부한 정보.

## 적용 자산

| 자산 | 정책 | 트리거 위치 |
|---|---|---|
| `/cfh-debug` | A (3단계) | Phase 4 Fix Plan 직전 |
| `/cfh-tdd` | A (3단계) | Phase 1.5 Final Intent Confirm 후 또는 워크플로 종료 |
| `/cfh-tdd-gen` | A (3단계) | 동상 |
| `/cfh-refactor` | A (3단계) | Step 8 최종 보고 안 |
| `/cfh-refactor-gen` | A (3단계) | 동상 |
| **`/cfh-grill`** | **B (full default)** | Phase 3 종료 보고 안 — Retro 옆 |

후속 확장 후보 (외부 사용자 데이터 보고 결정):
- `/cfh-plan` (낮은 가치 — 사용자 대화 본질)
- `/cfh-tc`·`/cfh-tc-gen` (낮은 가치 — 작은 작업)
- `/cfh-make`·`/cfh-new` (없음 — dispatcher)

## 관련

- `commands/references/recommendation-pattern.md` — 매 turn 추천+이유 (이 안내의 형식 기반)
- `commands/references/confidence-tagging.md` — 신호 `[verified]/[inferred]/[guessed]` 마커
- `commands/references/agent-team-modes.md` — subagent vs teams mode 선택 (cfh-team에서 진행)
- `commands/references/final-confirm.md` — 작업 실행 직전 합산 confirm (이 안내와 별 단계)
- `skills/cfh-harness/references/patterns/adversary.md` — 7번째 패턴
