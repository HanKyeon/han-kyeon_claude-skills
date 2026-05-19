# Agent Communication Mode — subagent vs teams (단일 출처, 0.21.0+)

> 멀티 에이전트 자산이 *어떻게 통신*하는지 결정하는 단일 출처. `cfh-harness` 생성 팀·`cfh-review` 등 *멀티 agent 패턴 자산*에서 인용.

## 두 mode 차이

| 측면 | **Subagent** (default) | **Teams** (experimental flag) |
|---|---|---|
| 활성화 | Claude Code 기본 (Agent tool) | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |
| 통신 | orchestrator ↔ subagent (트리, 한 방향) | agent ↔ agent (그래프, 양방향) |
| 호출 패턴 | orchestrator가 task 한 번씩 위임 → 결과 모음 | agent 간 메시지 교환 (memo·broadcast·targeted) |
| 토큰 | 예측 가능 (N agents = N task call) | 폭증 위험 (메시지 round unbounded 가능) |
| 디버깅 | 결과 1회 모음에서 검증 | 메시지 timeline 추적 필요 |
| 무한 루프 위험 | 없음 | 있음 (bounded round로 통제 필요) |
| 안정성 | official API | experimental flag — 변경·폐지 위험 |

## 패턴별 mode 적합도 — 자동 추천 룰

| 패턴 | 추천 mode | 이유 |
|---|---|---|
| Pipeline | **subagent** | 한 방향 선형 흐름 — 메시지 교환 불필요 |
| Fan-out / Fan-in | **subagent** | 병렬 호출 후 통합 — 독립 작업 |
| Expert Pool | **subagent** | 독립 평가 후 orchestrator 통합 — *조건부* teams (cross-reference·conflict resolution 필요 시) |
| Producer-Reviewer (1회) | **subagent** | 생성 → 검토 1 cycle |
| Producer-Reviewer (iterative) | **teams** (bounded) | 검토 reject 시 N round 재생성 — bounded 3 round 권장 |
| **Supervisor** | **teams** | 런타임 동적 분기 — orchestrator가 미리 못 정함 |
| **Hierarchical Delegation** | **teams** | 하위 팀 간 통신 가치 큼 (5+ agents) |

자동 추천이 *암묵 매핑*이 되지 않게, **반드시 사용자 명시 선택 후 진행** (정책 § 0).

## 사용자 mode 선택 형식 (recommendation+reason)

```
📌 추천 mode: <subagent | teams>
   이유:
     - [verified] 패턴이 <X> → <적합 mode> 매칭
     - [inferred] 사용자 규모 답이 <N agents> → <조건>
     - [guessed] (있으면 표기)

다른 옵션:
   - subagent — 토큰 예측 가능·디버깅 쉬움·flag 불필요
   - teams — agent 간 메시지 교환·런타임 동적·단 experimental flag 의존

답변: 추천대로 / subagent / teams / explain
```

## Teams mode 통신 패턴

### bounded round 정책

token 폭증 차단 위해 *반드시 max-round budget*:

| 패턴 | max round | 통신 방식 |
|---|---|---|
| Supervisor | 5 (런타임 결정 횟수 cap) | orchestrator → worker, worker가 *분기 결과만* 답 (broadcast X) |
| Hierarchical | 3 per level, 2 level | 상위 → 하위 팀 (분배) → 하위 결과 → 상위 통합 |
| Producer-Reviewer iterative | 3 (생성→검토→재생성→재검토→재생성→fail) | 생성 ↔ 검토만 (다른 agent 메시지 X) |
| Expert Pool cross-reference | **1** (orchestrator 1차 통합 후 충돌 시 1 round 재논의) | 같은 코드 다른 reviewer 결과 *참조 후 자기 분석 refine* |

각 자산이 *자기 max-round* 명시 + *exceed 시 fail 또는 orchestrator 강제 통합* 정책 가짐.

### 통신 채널

| 채널 | 의미 | 예시 |
|---|---|---|
| `memo` | 모든 agent가 읽을 수 있는 공유 메모 | cohesion 신호 broadcast |
| `broadcast` | agent N → all (응답 기대 X) | 발견 사항 공유 |
| `targeted` | agent A → agent B (응답 기대) | "Performance 결과 봤는데 Test 추가 필요?" |
| `request-response` | A → B → A | bounded round 안에서만 |

## Fallback 정책 — flag 없는 환경

teams mode 자산을 *`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 없는 환경*에서 실행:

- **graceful degradation 권장**: subagent fallback 시도 (단 *bounded round·cross-reference 없는 단순 호출*)
- **명시 에러 권장**: "teams flag 미설정 — `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 후 재시도" 출력 + 종료
- 각 자산이 *어느 fallback 정책* 선택했는지 본문에 명시

## 디버깅 가이드 (teams mode)

teams 사용 시 발생할 수 있는 문제:

- **메시지 루프**: agent A·B 무한 ping — max-round budget으로 강제 차단
- **stale message**: 한 agent가 *이전 round 메시지*에 응답 — turn timestamp 명시
- **응답 빠짐**: targeted message에 응답 없음 — timeout 정책 (orchestrator가 default 답 채움)
- **결과 비결정성**: 메시지 순서가 결과 영향 — *결정적 순서* 강제 또는 *순서 무관 통합* 명시

## 토큰 budget 가이드

| Mode | budget 가이드 |
|---|---|
| subagent | N agents × 평균 task = N × ~5k token 예상 |
| teams (bounded 1 round) | N × ~5k + cross-reference round × ~3k |
| teams (Supervisor) | budget cap 명시 (`max_round_tokens`·`per_message_tokens`) |
| teams (Hierarchical) | level별 budget — 상위 팀 ~3k + 하위 팀 ~2k × M |

자산 본문에 *예상 token range* 명시 권장 — 사용자 결정 보조.

## 적용 자산

| 자산 | mode 선택 시점 | default | teams 사용 사례 |
|---|---|---|---|
| `cfh-harness` (= `/cfh-team` 생성) | Phase 2.5 (Pattern Selection 후) | 패턴별 자동 추천 | Supervisor·Hierarchical·iterative Producer-Reviewer |
| `cfh-review` | Step 1.5 (diff 규모 후) | **subagent** | cross-reference 필요 시 (1 bounded round) |

후속 확장 후보 (외부 사용자 데이터 보고 결정):
- `cross-domain-audit` — 8 agents Expert Pool. teams 가치 낮음 — 현재 default subagent 유지
- `framework-value-audit` — 8 personas. 동상

## 관련

- `commands/references/recommendation-pattern.md` — mode 선택 시 추천+이유 형식
- `commands/references/confidence-tagging.md` — mode 선택 신호 confidence marker
- `commands/references/final-confirm.md` — mode 선택 *후* 작업 실행 직전 합산 confirm 단계
- `skills/cfh-harness/references/patterns/*.md` — 6 패턴별 상세
