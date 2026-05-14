---
name: harness-factory
description: |
  Use this skill when the user wants to design a multi-agent team or scaffold a
  coordinated set of agents+skills for a domain (keywords: "팀 에이전트", "team agents",
  "build a harness", "agent team", "multi-agent", "orchestrate agents", "서브에이전트
  구성"). Interviews the user, picks one of six architecture patterns, and generates
  .claude/agents/*.md + .claude/skills/*/SKILL.md project-locally. Do NOT trigger for
  single-skill authoring (use skill-author) or for using existing agents.
commands: [/cfh-team]
---

# Harness Factory


## 트리거 조건 (1.0 컨벤션 — 본문 참고용, frontmatter description이 권위)

```
TRIGGER:  '팀 에이전트', 'team agents', 'multi-agent', 'orchestrate agents',
          '서브에이전트 구성' 같이 *여러 에이전트를 묶는* 의도.
SKIP:     단일 skill 작성은 skill-author. 기존 에이전트 사용은 트리거 안 됨.
EXAMPLES:
  - 'PR 응답 검증 팀 만들어줘' → Phase 1 인터뷰 + 6 패턴 중 1 선택
  - 'producer-reviewer 패턴으로' → 인터뷰 단축, 즉시 Phase 2
```
도메인 설명을 받아 **에이전트 팀 + 전용 스킬**을 프로젝트 로컬(`.claude/`)에 생성하는 메타-스킬입니다. revfactory/harness와 같은 L3 meta-factory 역할.

## 활성화 시 반드시

1. **Pre-scan 먼저.** Phase 0에서 프로젝트 구조·기존 에이전트·CLAUDE.md를 훑어 Phase 1 답변 초안을 만든 뒤 진입.
2. **도메인 인터뷰 다음, 패턴은 그 후에.** Q1~Q5 + 옵션 Deep-dive + Sanity check 순. 작업 특성 답변 전 패턴 확정 금지.
3. **6 패턴 중 1개만 선택.** 혼합은 실패 원인. 필요하면 2개 팀으로 분리.
4. **프로젝트 로컬에 작성.** 출력은 `.claude/agents/`, `.claude/skills/` (사용자 전역 `~/.claude`가 아님).
5. **CLI가 있으면 CLI 우선.** `cfh generate <preset>`으로 해결 가능한 경우는 그것을 제안. 커스텀이 필요할 때만 직접 파일 작성.
6. **생성 후 실험 플래그 안내.** 에이전트 간 메시지 교환이 필요하면 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 필요함을 알림. Deep-dive D1에서 이미 확인된 경우 중복 안내 생략.
7. **(z) 모르겠음 fallback.** 모든 Q1~Q6·Deep-dive D1~D7에 `(z) 모르겠음` 옵션 기본 탑재. 선택 시 `~/.claude/skills/asset-factory/references/unknown-answer-playbook.md`의 3단계 처리 — 예시 2~3개 → 안전한 기본값 제안 → y/n.

## 7 Phase 워크플로

```
Phase 0: Pre-scan                (프로젝트 스캔 → Phase 1 답변 초안)
   ↓
Phase 1: Domain Interview        (기본 5 질문 + 옵션 Deep-dive 7 축 + Sanity check)
   ↓
Phase 2: Pattern Selection       (6 패턴 중 1개 추천 + 사용자 확인)
   ↓
Phase 3: Agent Roster            (각 에이전트 책임·도구·입출력 확정)
   ↓
Phase 4: Skill Design            (팀을 트리거할 스킬 + 오케스트레이션 스킬)
   ↓
Phase 5: Scaffold                (cfh generate 또는 직접 Write)
   ↓
Phase 6: Validate + Dry Run      (cfh validate + 샘플 태스크로 시운전)
```

## Phase 복귀 규칙 (공통)

Phase 2 이후에 초반 답변이 틀렸다고 판단되면 아래 트리거로 이전 Phase 복귀:
- **"intent 재인터뷰"** → Phase 1 Domain Interview로 복귀
- **"패턴 재선택"** → Phase 2 Pattern Selection으로 복귀
- **"roster 수정"** → Phase 3 Agent Roster로 복귀
- **"skill 재설계"** → Phase 4 Skill Design으로 복귀

복귀 시 이전 답변은 참고용으로 남기고 변경 부분만 갱신. 생성된 `.claude/agents/*`나 `.claude/skills/*`는 git으로 추적·되돌리기 가능.

## Phase 0 — Pre-scan

`CLAUDE.md`, `package.json`, `./.claude/agents/`, `./.claude/skills/`를 훑어 Phase 1 질문의 답변 초안을 만듭니다 (→ `references/pre-scan.md`). 도메인 경계를 추출해 Q3(전문성 축) 후보를 자동 생성하고, `CLAUDE.md`에 "프로덕션"·"결제" 등이 보이면 Q4(실패 비용)를 (c) 기본값으로 제시합니다.

빈 프로젝트 또는 스캔할 것이 없으면 "Phase 1 정상 진행"으로 종료.

## Phase 1 — Domain Interview

기본 6 질문 → (옵션) Deep-dive 7 축 → Sanity check 순 (→ `references/interview-flow.md`).

### 기본 6 질문

1. **태스크 성격** — 반복적/선형적 / 병렬 가능 / 검토·비판이 중요 / 계층적 분해 필요 / 탐색적
2. **입력·출력** — 한 번에 들어오는 입력 단위(파일/PR/요구사항) + 최종 산출물 형태
3. **전문성 축** — 보안·성능·접근성(a11y) / 일관성(consistency) / 멱등성(idempotency) / 지연(latency) / 공정성(fairness) / 타입 / 도메인 — 프로젝트 도메인에 맞게 3~5개 선택. (축은 도메인별로 다르다 — FE: a11y·타입·UX / BE: consistency·idempotency·latency / ML: fairness·robustness / embedded: real-time deadline·footprint.)
4. **실패 비용** — 틀리면 롤백 쉬운가, 아니면 수정 비용이 큰가 (큰 경우 producer-reviewer 강제)
5. **규모** — 에이전트 2~3개로 충분한가, 5개 이상이 필요한가 (5개 넘으면 계층 분해 검토)
6. **관측성** — 실패 시 어떻게 알게 되나 (리턴값 / 로그 / CI / 모니터링 / 없음). Q4=(b)/(c) 와 Q6=(e) 조합은 R8 Sanity check 트리거.

### Deep-dive 옵트인 (3지 선택 + CLI bypass)

기본 6 질문 완료 후 사용자에게 **(a)/(b)/(c) 3지 선택** 제시. CLI `--deep`/`--fast` 플래그로 bypass 가능.

자동 추천 규칙:
- Q4=(c) OR Q5=6+ OR Q6=(e) → **(b) 모두 yes 권장**
- Q1=(e)/(f) → **(a) 조건부 권장**
- Q5=2~3 AND Q4=(a) AND Q6=(a)/(b)/(c) → **(c) skip 권장**

(b) 선택 시 아래 **7 축 전부** 질문. (a) 선택 시 **관련된 것만** 조건부:

| 축 | 활성 조건 |
|---|---|
| D1 통신 대역폭 | Q1=(a)/(b)/(f) OR Q5=4+ |
| D2 상태성 | Q1=(e) OR (f) |
| D3 인간 개입 지점 | Q4=(b) OR (c) |
| D4 반복 한계 | Q1=(e) OR 피드백 루프 |
| D5 권한·도구 | 항상 |
| D6 실패 처리 | Q4=(b) OR (c) |
| D7 관측성 | Q4=(c) OR Pre-scan에 CI 발견 |

일반적으로 2~4개 축이 활성화됩니다. 7개 전부 묻는 일은 드묾.

### Sanity check (요약 카드 직전)

기본 + Deep-dive 답변을 `references/sanity-check.md`의 R1~R8 룰로 검사:
- R1 규모 vs 축 수
- R2 실패 비용 vs 패턴 후보
- R3 태스크 성격 vs 입출력
- R4 축 겹침
- R5 기존 에이전트 충돌
- R6 Deep-dive 답변 모순 (옵션 수행 시)
- R7 통신 vs 실험 플래그 인식 (옵션 수행 시)
- R8 관측성 공백 vs 실패 비용 (Q6=(e) + Q4=(b)/(c) 시 경고)

모순 발견 시 재확인 → 통과하면 **요약 카드** + 패턴 추천 제시하고 사용자 승인.

## Phase 2 — Pattern Selection

6 패턴 카탈로그 (→ `references/patterns/`):

| 패턴 | 언제 | 에이전트 수 | 통신 |
|---|---|---|---|
| **Pipeline** | 선형 단계 변환 (Analyst → Builder → QA) | 2~4 | 순차 |
| **Fan-out/Fan-in** | 독립 부분 문제를 병렬 + 결과 병합 | 2~N | 병렬 + 집계 |
| **Expert Pool** | 여러 전문가가 같은 입력을 각자 평가 | 2~6 | 병렬 |
| **Producer-Reviewer** | 생성과 검증을 **인격 분리** — 오버핏 방지 | 2 | 2-step |
| **Supervisor** | 1 supervisor가 worker를 동적 배정 | 1 + N | 중앙집중 |
| **Hierarchical Delegation** | 큰 문제를 재귀 분해, 깊이 2+ | 3~N | 트리 |

각 패턴 상세는 `references/patterns/<pattern>.md`. 사용자에게 추천 1개 + 이유 + 대안 1개 제시.

## Phase 3 — Agent Roster

각 에이전트별로 결정 (→ `references/agent-contract.md`):

- `name` — kebab-case (예: `security-reviewer`)
- `description` — 오케스트레이터가 언제 이 에이전트를 부르는가
- `tools` — `Read, Grep, Glob` 등 최소 권한 원칙
- `input` — 이 에이전트가 받을 것 (경로, 스펙, 이전 단계 출력)
- `output` — 반환 형식 (단일 메시지 구조: 발견·권고·신뢰도)
- `refusal` — 거부 조건 (범위 초과, 도구 부족)

## Phase 4 — Skill Design

팀을 **하나의 스킬**로 묶어 트리거 가능하게:

- **트리거 스킬** (필수): 사용자의 의도와 팀의 연결. 예: `expert-review-pool` SKILL이 사용자 "리뷰해줘"에서 발동.
- **오케스트레이션 스킬** (선택): 패턴이 복잡하면 워크플로를 별도 스킬로. 예: `pipeline-flow` SKILL.

skill-author의 Phase 2~3 규약을 그대로 적용.

## Phase 5 — Scaffold

### 5a. 이름 충돌 체크 (Scaffold 전 필수)

생성할 각 파일의 경로를 **먼저 확인**:
- `./.claude/agents/<agent-name>.md` × N개 (에이전트마다)
- `./.claude/skills/<team-skill>/SKILL.md`

하나라도 이미 존재하면:

```
⚠️ 이름 충돌 감지
   다음 파일이 이미 존재합니다:
   - ./.claude/agents/<name-1>.md (상태: <managed | user-authored | ...>)
   - ./.claude/skills/<team>/SKILL.md (상태: ...)

어떻게 진행할까요?
  (a) 모든 충돌 이름 변경 — 팀 이름·에이전트 이름 재제안 인터뷰
  (b) 일부만 재사용 — 충돌 파일 개별로 (편집 / 다른 이름 / 덮어쓰기) 결정
  (c) 전부 덮어쓰기 — ⚠️ user-authored 대상은 아래 경고
  (d) 취소
```

**(b) 또는 (c) 덮어쓰기 포함 시 user-authored 파일은 명시적 y/N 확인**:
```
🚨 ./.claude/agents/<name>.md는 사용자 작성물입니다 (삭제 시 복구 불가).
정말 덮어쓰시겠습니까? [y/N]
```
`y`만 통과. 그 외 전부 해당 파일 취소.

### 5b. 실제 생성

충돌 체크 통과 후:

**옵션 A — CLI (권장, 프리셋에 맞으면)**:
```bash
cfh generate producer-reviewer
cfh generate pipeline-3stage
cfh generate reviewer-team
cfh generate reviewer-team-backend
```

덮어쓰기 승인이 있었다면 `cfh generate <preset> --force` 사용.

**옵션 B — Claude가 직접 Write**: 프리셋에 없는 커스텀 조합. 파일 구조:
```
.claude/
├── agents/
│   ├── <agent-1>.md
│   └── <agent-2>.md
└── skills/
    └── <team-skill>/
        └── SKILL.md
```

각 에이전트 md는 frontmatter `name`, `description`, `tools`를 포함해야 Claude Code가 등록. (→ `references/output-contract.md`)

## Phase 6 — Validate + Dry Run

1. `cfh validate` 실행.
2. **샘플 태스크 시운전**: 사용자에게 "이 팀이 처음으로 풀 작은 태스크 1개"를 요청. 오케스트레이터가 에이전트들을 호출하는 흐름을 실제로 보고 문제점 파악.
3. 실패 시 Phase 3~4로 돌아가 에이전트 책임 분할 조정.

## 자주 하는 실수

| 실수 | 대응 |
|---|---|
| 에이전트 역할 중복 | "2명이 같은 걸 본다" = 1명으로 병합하거나 축을 분명히 분리 |
| Producer가 자기 검토 | Producer-Reviewer 패턴 핵심은 **인격 분리** — 같은 agent가 2번 돌지 않음 |
| 5+ 에이전트 1 레벨 | Hierarchical로 재편 권장 (depth 2) |
| 모든 에이전트에 `tools: *` | 최소 권한 — 각 역할에 필요한 도구만 |
| 오케스트레이션을 SKILL.md에만 기술 | 실제 실행은 슬래시 커맨드에도 복제 (`/harness-run` 식) |

## references/

- `pre-scan.md` — Phase 0 스캔 프로토콜 + Phase 1 초안 매핑
- `interview-flow.md` — Phase 1 기본 5 질문 + Deep-dive 7 축 + 옵트인 게이트
- `sanity-check.md` — Phase 1 요약 직전 모순 감지 룰 (R1~R7)
- `patterns/pipeline.md` — 선형 파이프라인
- `patterns/fan-out-fan-in.md` — 병렬 분해 + 병합
- `patterns/expert-pool.md` — 병렬 전문가 풀
- `patterns/producer-reviewer.md` — 생성-검증 분리
- `patterns/supervisor.md` — 중앙 배정자
- `patterns/hierarchical-delegation.md` — 트리 분해
- `agent-contract.md` — 에이전트 정의 프런트매터·입출력 계약
- `output-contract.md` — `.claude/` 파일 구조와 Claude Code 등록 규칙
