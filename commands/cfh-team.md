<s>
이 커맨드는 `cfh-harness` 메타-스킬을 활성화하여 **에이전트 팀 + 전용 스킬을 프로젝트 로컬에 생성**하는 워크플로를 시작합니다.
스킬이 자동 트리거되지 않았다면 지금 `~/.claude/skills/cfh-harness/SKILL.md`를 읽고 그 6 Phase에 따라 진행하세요.
</s>

<invocation>
에이전트 팀(하네스)을 설계·생성합니다.

**인자**: `$ARGUMENTS` — 도메인 설명(선택) + 플래그(선택).

**도메인 설명 예시**: "프론트엔드 PR 다축 리뷰", "결제 모듈 TDD 오버핏 방지".

**플래그 (Deep-dive bypass)**:
- `--deep` — Deep-dive 게이트 건너뛰고 **(b) 모두 yes**로 자동 응답. 시니어가 매번 (b) 입력하지 않도록.
- `--fast` — Deep-dive 게이트 건너뛰고 **(c) skip**으로 자동 응답. 단순 팀 빠른 경로.
- 플래그 없으면 Phase 1 Deep-dive 게이트에서 (a)/(b)/(c) 3지선 질문.

파싱 규칙:
1. `$ARGUMENTS`에서 `--deep`·`--fast` 토큰을 추출·제거
2. 나머지 텍스트를 도메인 설명으로 사용
3. 남은 텍스트가 비어있으면 "이 팀이 다룰 전형적 태스크를 1~2 문장으로 설명해주세요"로 질문

</invocation>

<workflow>

## Phase 1 — Domain Interview

`cfh-harness/references/interview-flow.md`의 5 질문:

1. 태스크 성격 (선형 / 병렬 / 다축 평가 / 검증 / 동적 분기 / 계층)
2. 입력 → 출력
3. 전문성 축
4. 실패 비용
5. 규모

## Phase 2 — Pattern Selection (추천+이유 패턴)

`cfh-harness/references/patterns/`의 7 패턴 중 1개 자동 추천:

| 패턴 | 적합 신호 |
|---|---|
| **Pipeline** | Q1 "단계가 명확한 선형 변환" + Q2 "한 방향 흐름" |
| **Fan-out / Fan-in** | Q1 "큰 입력을 독립 부분으로 분할" + Q5 "병렬 가능" |
| **Expert Pool** | Q1 "같은 입력을 여러 축에서 평가" + Q3 "축이 명확" (FE: a11y·타입·UX / BE: consistency·idempotency·latency / ML: fairness·robustness — 도메인별 3~5개) |
| **Producer-Reviewer** | Q4 "실패 비용 큼" + Q1 "검증 중심" (테스트 통과만 하는 가짜 구현 위험) |
| **Supervisor** | Q1 "런타임에 경로가 결정" + Q5 "다이내믹 분기" |
| **Hierarchical Delegation** | Q5 "10+ 에이전트" + Q3 "여러 도메인 분할" |
| **Adversary** | Q1 "반증·취약점 탐색·확증 편향 차단" + Q4 "실패 비용 큼" (debug·security audit·legal review) |

**추천 형식**:
```
📌 추천 패턴: <Pattern>
   이유:
     - [verified] Q1 답이 "<인용>" — <적합 신호> 매칭
     - [verified] Q4 실패 비용이 "<인용>"
     - [inferred] Q3 전문성 축이 N개 — 패턴의 sweet spot
     - [guessed] (있다면) 사용자 답에서 추정한 부분

다른 옵션:
   - <대안 패턴> — 사용자가 <조건>이면 적합 (예: "런타임 분기가 더 명확하면 Supervisor")
   - <대안 2> — <조건>

답변: 추천대로 / <대안> / 다시 인터뷰 / grill (패턴 선택을 깊이 파기)
```

상세 추천 패턴: `commands/references/recommendation-pattern.md`.

(grill) 선택 시 `/cfh-grill`로 위임. 자주 깊이 파는 sub-branches:
- 에이전트 수 (3 vs 5 vs 7+)
- 도구 권한 분할 (각 에이전트가 어떤 tool만 쓰나)
- 통신 패턴 (broadcast vs targeted)
- 실패 처리 (early-exit vs continue)

사용자 승인 후 Phase 2.5.

## Phase 2.5 — Communication Mode Selection

패턴 결정 *후* agent 간 통신 mode 명시 선택 (→ `commands/references/agent-team-modes.md`).

### 패턴별 자동 추천

| 선택 패턴 | 추천 mode | 사용 시 |
|---|---|---|
| Pipeline · Fan-out · Expert Pool · Producer-Reviewer (1회) | **subagent** | orchestrator 1차 모음 — 토큰 예측 가능 |
| **Supervisor · Hierarchical Delegation** | **teams** | 런타임 동적 분기 / 하위 팀 통신 |
| Producer-Reviewer (iterative loop) | **teams** (bounded 3 round) | reject 시 재생성 |

### 출력 (recommendation+reason)

```
📌 추천 mode: <subagent | teams>
   이유:
     - [verified] 패턴이 <X> → <적합 mode>
     - [inferred] Q5 규모 <N> → <조건>

다른 옵션:
   - subagent — flag 불필요·디버깅 쉬움·token 예측 가능
   - teams — agent 간 메시지 교환·런타임 동적·단 experimental flag 의존

답변: 추천대로 / subagent / teams / explain
```

**명시 선택 후만 Phase 3 진입** (정책 § 0). teams 선택 시 생성 자산 본문에 *flag 활성화 두 갈래 모두 inline* 포함:
- 세션: `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
- 영구: `~/.claude/settings.json` 또는 `./.claude/settings.json`의 `"env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }`

추가로 fallback 정책·max-round budget 명시.

상세 mode별 통신 패턴·token budget·디버깅 가이드는 `commands/references/agent-team-modes.md`.

## Phase 3 — Agent Roster

각 에이전트별로 결정 (`agent-contract.md`):
- name / description / tools / input / output / refusal

## Phase 4 — Skill Design

팀을 트리거할 SKILL.md 설계. skill-author 규약 준수.

## Phase 5 — Scaffold

### 프리셋 매칭 시 (빠른 경로)

```bash
cfh generate --list                  # 목록 확인
cfh generate producer-reviewer       # 생성과 검증 분리
cfh generate pipeline-3stage         # 3단 파이프라인
cfh generate reviewer-team           # 4-expert 풀
```

### 커스텀 (프리셋 불일치)

Claude가 Write tool로 직접 생성:
- `.claude/agents/<name>.md` — 각 에이전트
- `.claude/skills/<team-skill>/SKILL.md` — 팀 트리거 스킬
- `.claude/skills/<team-skill>/references/` — 아키텍처 다이어그램, 워크플로

`output-contract.md`의 체크리스트 준수.

## Phase 6 — Validate + Dry Run

```bash
cfh validate
```

이후 **샘플 태스크 1개로 시운전**. 오케스트레이터가 에이전트를 호출하는 흐름 관찰. 문제 시 Phase 3~4 재방문.

### Agent Teams 실험 플래그

에이전트 간 메시지 교환이 필요하면:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

</workflow>

<output_format>

생성 완료 시 사용자에게 보고:

- 선택된 패턴 + 이유
- 생성된 파일 트리 (`.claude/agents/...`, `.claude/skills/...`)
- 각 에이전트의 책임 요약 (1줄씩)
- 시운전 샘플 태스크 제안 1개
- Agent Teams 플래그 필요 여부

## 종료 시 다음 단계 권장 (필수 출력)

```
✅ 팀 생성 완료

다음 단계:
- 검증 → cfh validate
- 트리거 스킬 발화 시뮬레이션 → cfh trace "<예상 팀 호출 발화>"
- 설치 확인 → cfh list --project
- 시운전 샘플 태스크 1개 즉시 실행 (Phase 6에서 제안된 것)
- 이번 팀 설계 흐름 피드백 → /cfh-feedback cfh-harness "<comment>"
```

</output_format>
