# 사용 가이드 — @han-kyeon/claude-skills

이 문서는 **패키지를 실제로 어떻게 쓰는지**를 순서대로 설명합니다. 설치부터 자기만의 스킬·팀 에이전트를 만드는 것까지.

> 레퍼런스(명령어 전체 목록, 플래그, 내부 구조)는 [README.md](./README.md)를 참조하세요. 이 문서는 "내가 오늘 당장 뭘 치면 되는가"에 집중합니다.

---

## 0. 누구를 위한 패키지인가

Claude Code를 쓰는데 아래 중 하나라도 해당된다면 이 패키지가 유용합니다:

- 리팩터링·TDD·PR 리뷰를 Claude가 **일관된 방식**으로 돕기를 원한다
- 프로젝트마다 같은 지시를 반복해서 주기 싫다
- 자기만의 스킬을 작성하고 싶은데 frontmatter/references 구조를 매번 고민하기 싫다
- revfactory/harness 스타일로 **여러 에이전트가 협력하는 팀**을 프로젝트에 구성하고 싶다

---

## 1. 설치 (1회)

```bash
npm install -g @han-kyeon/claude-skills
cfh install
```

끝. 두 번째 줄이 `~/.claude/skills/`와 `~/.claude/commands/`에 번들된 6개 스킬 + 13개 슬래시 커맨드를 복사합니다 (0.6.0 기준).

### 확인

```bash
cfh list
```

아래와 같이 나오면 성공:

```
=== Global (~/.claude) ===

Skills (C:\Users\<you>\.claude\skills):
  asset-factory            managed@0.6.0
  harness-factory          managed@0.6.0
  refactoring-strategy     managed@0.6.0
  skill-author             managed@0.6.0
  tdd-first                managed@0.6.0
  tdd-general              managed@0.6.0

Commands (C:\Users\<you>\.claude\commands):
  cfh-feedback, cfh-guide, cfh-make, cfh-new, cfh-plan,
  cfh-refactor, cfh-review, cfh-tc, cfh-tc-gen, cfh-tdd,
  cfh-tdd-gen, cfh-team, cfh-trace               (모두 managed@0.6.0)
```

Claude Code를 새 세션으로 시작하거나 `/agents`·`/`로 확인하면 커맨드가 떠야 합니다.

---

## 2. Day 1 — 번들 자산 그대로 쓰기

패키지가 바로 쓸 수 있는 4가지 워크플로를 제공합니다.

### 2.1 리팩터링 (`refactoring-strategy` 스킬)

**자동 트리거**: 대화에 "리팩터링" / "refactor" / "cleanup" 같은 단어가 나오면 발동.

```
사용자: src/components/patient-table 이거 리팩터링 해야 할 것 같은데
Claude: (refactoring-strategy 스킬 자동 로드)
        먼저 Scope를 확인하겠습니다.
        Q1 범위 축: 단일 파일인가요, 디렉터리 전체인가요?
        Q2 깊이 축: 내부 구현만? public API까지?
        ...
```

**명시 호출**:

```
사용자: /cfh-refactor src/components/patient-table
```

5대 원칙(Small PR · 행동 보존 · Blast Radius · Legacy 허용 · 공식 안티패턴)에 따라 단계별 진행.

### 2.2 TDD (`tdd-first` 스킬)

**자동 트리거**: "TDD" / "테스트 먼저" / "test-driven".

**명시 호출**:

```
사용자: /cfh-tdd src/utils/formatBloodPressure.ts
```

5 Phase 순차 수행: Intent Interview → Test Outline → Failing Test → Implement → Refactor + Intent Preservation.

### 2.3 PR 리뷰 (`/cfh-review` 커맨드)

```
사용자: /cfh-review develop
```

현재 브랜치를 `develop` 기준으로 diff 추출 → 규모에 따라 1~5개 서브에이전트 병렬 실행 → `REVIEW.md` 생성.

파라미터 생략하면 브랜치명으로 부모 추정 (`hotfix/*` → `release`, `release/*` → `main`, 나머지 → `develop`).

### 2.4 기존 코드 테스트 보강 (`/cfh-tc` 커맨드)

```
사용자: /cfh-tc src/components/Button.tsx
```

파일이 이미 있으면 Test-Fill Mode (Characterization 접근). 없으면 TDD Mode (새 설계).

---

## 3. Week 1 — 자기만의 스킬 쓰기

"우리 팀은 이런 규칙이 있어" 같은 **프로젝트·팀 고유 지식**을 스킬로 내리세요. Claude가 매 세션 읽을 수 있습니다.

### 3.1 대화로 만들기 (권장)

```
사용자: /cfh-new skill patient-data-handling
Claude: (skill-author 스킬 활성화)
        Phase 1 인터뷰를 시작합니다.
        Q1. 이 스킬은 한 문장으로 무엇을 해결하나요?
사용자: 환자 데이터를 다루는 컴포넌트에서 HIPAA 민감 정보 처리 규칙을 자동 적용
Claude: Q2. 어떤 단어·의도·파일 패턴에서 이 스킬이 떠야 하나요?
사용자: "환자", "patient", "PHI", src/features/patient/** 파일
Claude: Q3. 반대로 떠서는 안 되는 상황은?
...
```

6 질문이 끝나면 Claude가 description 초안을 제시 → 승인받고 → SKILL.md와 references/를 작성 → `cfh validate`로 검증합니다.

결과: `~/.claude/skills/patient-data-handling/SKILL.md` (+ references/).

### 3.2 CLI로 빠르게 (이미 내용이 머리에 있을 때)

```bash
cfh new skill my-rule                       # ~/.claude/skills/my-rule/
cfh new skill project-rule --project        # ./.claude/skills/project-rule/
cfh new command audit                       # ~/.claude/commands/audit.md
cfh new agent security-reviewer --project   # ./.claude/agents/security-reviewer.md
```

파일에 `TODO:` 마커가 들어 있으니 에디터로 채우면 됩니다.

### 3.3 전역 vs 프로젝트 로컬, 언제 어디에?

| 상황 | 경로 |
|---|---|
| 내 개인 취향 (네이밍 규칙, 좋아하는 테스트 스타일) | `~/.claude/skills/` |
| 특정 프로젝트 도메인 (HIPAA, 결제 규칙) | `<project>/.claude/skills/` |
| 팀 공유 (여러 사람이 같은 규칙) | `<project>/.claude/skills/` + git commit |

프로젝트 로컬이 전역보다 우선합니다.

### 3.4 작성한 스킬 안전성

```bash
cfh list
```

→ 내가 만든 스킬은 `user-authored`로 표시. 패키지가 업데이트되어도 `cfh update`가 절대 건드리지 않습니다.

---

## 4. Week 2+ — 팀 에이전트 만들기

혼자서 할 일이 아닌, **여러 관점이 필요한 작업**에 팀을 도입합니다. PR 리뷰, 보안 감사, TDD 오버핏 방지 등.

### 4.1 미리 만들어진 프리셋 쓰기 (빠른 경로)

```bash
cfh generate --list
```

현재 제공:
- `producer-reviewer` — 생성자·검증자 2 에이전트 (TDD 오버핏 방지)
- `pipeline-3stage` — Analyst → Builder → QA 3 에이전트
- `reviewer-team` — security/perf/a11y/types 4 에이전트

```bash
cd my-fe-project
cfh generate reviewer-team
```

생성되는 파일:

```
my-fe-project/
└── .claude/
    ├── agents/
    │   ├── security-reviewer.md
    │   ├── perf-reviewer.md
    │   ├── a11y-reviewer.md
    │   └── types-reviewer.md
    └── skills/
        └── expert-review-pool/
            └── SKILL.md
```

각 파일에 `TODO:` 마커 — 프로젝트에 맞게 편집. Claude Code 재시작 후 "리뷰해줘" → 4 에이전트 병렬 호출.

### 4.2 대화로 설계하기 (복잡한 팀)

프리셋에 맞지 않는 구조가 필요하면:

```
사용자: /cfh-team 결제 모듈을 오버핏 없이 TDD로 구현
Claude: (harness-factory 스킬 활성화)
        Phase 1 — Domain Interview
        Q1. 태스크 성격은? (선형 / 병렬 / 다축 평가 / 검증 중심 / 동적 분기 / 계층)
사용자: 검증 중심. 테스트 통과만 하는 가짜 구현이 만들어지는 게 제일 무서워.
Claude: Q2. 입력과 출력은?
...
        → 추천 패턴: Producer-Reviewer
        → 이유: 실패 비용이 크고 테스트-구현 자기확증 위험이 명확함
        → cfh generate producer-reviewer 실행을 제안합니다.
```

6 Phase 순차 수행: 도메인 인터뷰 → 패턴 선택 → 에이전트 역할 확정 → 스킬 설계 → 파일 생성 → 시운전.

### 4.3 6 아키텍처 패턴 언제 뭐 쓰나

| 패턴 | 쓸 때 |
|---|---|
| **Pipeline** | 단계가 명확한 선형 변환 (요구사항 → 스펙 → 코드 → 테스트) |
| **Fan-out / Fan-in** | 큰 입력을 독립 부분으로 쪼개서 병렬 처리 후 병합 |
| **Expert Pool** | 같은 입력을 여러 축(보안·성능·a11y·타입)에서 평가 |
| **Producer-Reviewer** | 생성과 검증을 인격 분리 — 오버핏 방지 |
| **Supervisor** | 경로가 런타임에 결정되는 모호한 멀티스텝 |
| **Hierarchical Delegation** | 여러 하위 팀으로 자연 분해되는 초대형 이슈 |

각 패턴 상세는 `~/.claude/skills/harness-factory/references/patterns/<name>.md`.

### 4.4 에이전트가 서로 메시지를 주고받아야 하면

Agent Teams 실험 플래그 필요:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Pipeline이나 Expert Pool처럼 **오케스트레이터가 한 번씩 호출**하는 경우는 플래그 불필요. Fan-in/Aggregator에서 worker가 서로 메시지를 주고받아야 할 때만 필요.

---

## 5. 일상 운영

### 패키지 업데이트

```bash
npm update -g @han-kyeon/claude-skills
cfh update
```

`cfh update`는 **managed 항목만** 갱신. 내가 편집한 스킬(`user-modified`)이나 직접 만든 스킬(`user-authored`)은 건드리지 않습니다. 강제로 덮어쓰려면 `--force`.

### 뭔가 안 뜨면 진단 순서

1. `cfh list` — 설치돼 있나?
2. `cfh validate` — frontmatter 유효한가?
3. `cfh doctor` — 트리거 중복·고아 manifest·shadowing·키워드 0개·tools "*"·5+ 단일 레벨 에이전트 있나?
4. `cfh doctor --usage` *(0.6.0)* — 사용 현황으로 미발동 스킬 후보 식별
5. `cfh trace "<내 발화>"` — 어느 스킬이 매칭되는지 점수로 확인
6. `cfh evolve <skill>` — description 개선 제안 받기
7. SKILL.md `description`에 구체 키워드 3개 이상 있나?
8. Claude Code 세션 재시작 (`.claude/` 캐시 갱신)

### 내가 편집한 번들 스킬을 영구 보호하기 (0.3.0 신규)

```bash
cfh diff refactoring-strategy           # 내가 뭘 바꿨는지 확인
cfh adopt refactoring-strategy          # managed → user-authored 전환
```

`adopt` 후에는 `user-authored (adopted)`로 분류되어 `cfh update`가 자동으로 건너뜁니다.

### 제거

```bash
cfh remove refactoring-strategy     # managed는 바로 제거
cfh remove my-custom-skill          # user-authored는 --force 필요
```

---

## 6. 전형적 사용 흐름 (종합 예시)

### Scene 1 — 새 프로젝트 투입 첫날

```bash
# 패키지 글로벌 설치 (이미 돼 있음)
cfh list

# 프로젝트 로컬에 코드 리뷰 팀 세팅
cd my-fe-project
cfh generate reviewer-team

# 팀의 규칙을 스킬로 내리기
cfh new skill our-naming-conventions --project
# 에디터로 TODO 채움
cfh validate
git add .claude && git commit -m "chore: add Claude Code team harness"
```

### Scene 2 — 기능 개발

```
사용자: /cfh-tdd src/features/checkout/validateCoupon.ts
Claude: (tdd-first 5 Phase) ...
```

### Scene 3 — PR 올리기 전

```
사용자: /cfh-review develop
Claude: (/.claude/agents/ 의 reviewer-team 호출)
        → 4 에이전트 병렬 리뷰 → REVIEW.md 생성
```

### Scene 4 — 배포 전 리팩터링

```
사용자: /cfh-refactor src/legacy/patient-api
Claude: (refactoring-strategy) Scope 질문부터 시작
```

### Scene 5 — 패키지 업그레이드

```bash
npm update -g @han-kyeon/claude-skills
cfh update
cfh list   # my-custom-skill이 user-authored로 여전히 남아있는지 확인
```

---

## 7. 한눈에 보는 명령어 치트시트

| 일상 | 명령 |
|---|---|
| 처음 설치 | `cfh install` |
| 상태 확인 | `cfh list` (전역+프로젝트) |
| 패키지 갱신 | `cfh update` |
| 특정 스킬 제거 | `cfh remove <name>` |
| 내 스킬 만들기 (대화) | `/cfh-new skill <name>` |
| 내 스킬 만들기 (CLI) | `cfh new skill <name>` |
| 내 커맨드 만들기 | `cfh new command <name>` |
| 내 에이전트 만들기 | `cfh new agent <name> --project` |
| 검증 | `cfh validate` |
| 팀 생성 (빠름) | `cfh generate <preset>` |
| 팀 생성 (대화) | `/cfh-team [도메인 설명] [--deep|--fast]` |
| 프리셋 목록 | `cfh generate --list` |
| 번들 스킬 편집 보호 | `cfh adopt <name>` |
| 내 변경분 확인 | `cfh diff <name>` |
| 전체 건강 점검 | `cfh doctor` |
| **30일 사용 현황** *(0.6.0)* | `cfh doctor --usage` |
| 트리거 시뮬레이션 | `cfh trace "<query>"` 또는 `/cfh-trace` |
| **즉석 피드백** *(0.6.0)* | `/cfh-feedback <skill> "<comment>"` |
| **키워드 검색** *(0.7.0)* | `cfh search "<keyword>" [--kind skill\|command]` |
| **자산 편집** *(0.7.0)* | `cfh open <name>` |
| **자산 번들 내보내기** *(0.7.0)* | `cfh export [--all] [--output FILE]` |
| **자산 번들 가져오기** *(0.7.0)* | `cfh import <bundle.json>` |
| 버전 확인 | `cfh --version` 또는 `cfh -v` |

| 대화에서 | 발동 |
|---|---|
| "리팩터링 해줘" | refactoring-strategy 자동 |
| "TDD로 시작" | tdd-first 자동 |
| "스킬 만들어줘" | skill-author 자동 |
| "팀 만들어줘" | harness-factory 자동 |
| `/cfh-refactor <target>` | refactoring-strategy 명시 |
| `/cfh-tdd <target>` | tdd-first 명시 (FE) |
| `/cfh-tdd-gen <target>` *(0.6.0)* | tdd-general 명시 (BE/일반) |
| `/cfh-review [branch]` | 코드 리뷰 (4-옵션 인터뷰) |
| `/cfh-tc [path]` | 테스트 작성 (FE) |
| `/cfh-tc-gen [path]` *(0.6.0)* | 테스트 작성 (BE/일반) |
| `/cfh-new <kind> <name>` | skill-author 명시 |
| `/cfh-team [domain] [--deep|--fast]` | harness-factory 명시 (Deep-dive bypass 옵션) |
| `/cfh-make [requirement]` | 자산 dispatcher — 뭘 만들지부터 분류 |
| `/cfh-plan [goal]` | 작업 dispatcher — 목표부터 상의 (명시 호출 전용) |
| `/cfh-trace [query]` | 트리거 시뮬레이션 |
| `/cfh-feedback <skill> "<comment>"` *(0.6.0)* | 사용 피드백 기록 |
| `/cfh-guide [topic]` | 사용 가이드 |

---

## 8. API Reference — 슬래시 커맨드

각 커맨드의 전체 스펙. 실제 파일은 `~/.claude/commands/<name>.md`.

---

### `/cfh-make [requirement]`

**언제**: 무엇을 만들지(skill/command/team/agent) 모를 때의 **기본 엔트리**. "자동화하고 싶다"는 막연한 요구에서 출발할 때.

**인자**: `$ARGUMENTS` — 한 문장 요구사항 (선택). 비어있으면 Claude가 질문.

**동작**: `asset-factory` 메타-스킬 활성화 (0.4.0+ goal-first 구조):
- **Phase 1 Intent Capture**
  - Step 1a: 한 문장 요구사항 (`$ARGUMENTS` 또는 질문)
  - Step 1b: **Scoped Pre-scan** — 요구사항 토큰과 30%+ 겹치는 기존 자산만 노출
  - Step 1c: 3 분류 질문 (반복성/협업/트리거 방식)
- **Phase 2 Delegation**: `skill-author` / `harness-factory` / 인라인 커맨드 중 적절한 경로로 위임

**예시**:
```
/cfh-make 팀 API 에러 처리 규약을 claude가 자동 적용하게
/cfh-make                       # 요구사항부터 인터뷰
```

**관련**: `/cfh-new` (skill 확정 시), `/cfh-team` (팀 확정 시), `/cfh-plan` (자산이 아닌 실제 작업을 시작할 때).

---

### `/cfh-plan [goal]`

**언제**: 복잡·모호한 **실제 작업**을 시작할 때. 목표·제약을 명확히 전달하고 접근법을 상의한 뒤 실행·위임. **명시 호출 전용**, 자동 트리거 없음.

**인자**: `$ARGUMENTS` — 작업 목표 한 문장 (선택). 비어있으면 Phase 1 Q1부터 질문.

**동작**: 3 Phase (0.4.0+ goal-first 구조 — 목표 먼저, 스캔은 목표 기반)
- **Phase 1 Intent Capture**
  - Step 1a: Q1 목표 한 문장 (`$ARGUMENTS` 또는 질문)
  - Step 1b: **Scoped Pre-scan** — 목표에 필요한 영역만 읽기 (대상 디렉터리·CLAUDE.md·package.json scripts). 전체 git log·전체 source 훑기 금지.
  - Step 1c: Q2~Q4 (성공 기준 / 제약·out-of-scope / 긴급도) — 스캔 결과 참고
- **Phase 2 Approach Proposal** — 태스크 분류(신규/버그/리팩터/테스트/리뷰/탐색/복합) + 접근법 카드, 사용자 승인
- **Phase 3 Execution** — 전용 스킬로 위임(`/cfh-tdd`·`/cfh-refactor`·`/cfh-tc`·`/cfh-review`) 또는 직접 실행

**위임 시 컨텍스트 이관**: Phase 1~2 답변을 요약으로 전달하여 위임받은 스킬이 중복 질문하지 않음.

**예시**:
```
/cfh-plan legacy 결제 모듈에 쿠폰 검증 로직 추가
/cfh-plan                       # 목표부터 질문
```

**/cfh-make와의 차이**:
| | `/cfh-make` | `/cfh-plan` |
|---|---|---|
| 목적 | 재사용 자산 생성 (skill/command/team) | 실제 작업 실행 |
| 자동 트리거 | 일부 발화로 가능 | 없음 (명시 호출만) |
| 위임 대상 | skill-author / harness-factory | tdd-first / refactoring-strategy / /cfh-tc / /cfh-review |

**관련**: 작업 종류 확정 시 `/cfh-tdd`·`/cfh-refactor`·`/cfh-tc`·`/cfh-review` 직접. 자산 생성은 `/cfh-make`.

---

### `/cfh-new <kind> <name>`

**언제**: 만들 자산 종류가 **이미 확정됐을 때**. 주로 skill.

**인자**: `<kind> <name>` — `kind`: `skill`|`command`|`agent`, `name`: kebab-case 1~63자.

**동작**: `skill-author` 메타-스킬 활성화 → Phase 0 Pre-scan → Phase 1 6 질문 + 조건부 follow-up + Sanity check → Phase 2~5 작성·검증.

**예시**:
```
/cfh-new skill our-payment-rules
/cfh-new command project-audit
/cfh-new agent security-reviewer
```

**관련**: `/cfh-make` (종류 미확정 시), `cfh new` CLI (인터뷰 없이 스캐폴드만).

---

### `/cfh-team [domain] [--deep|--fast]`

**언제**: 여러 에이전트가 협업하는 팀이 필요하다고 확정됐을 때. Producer-Reviewer, Expert Pool, Pipeline 등.

**인자**: `$ARGUMENTS` — 도메인 설명 (선택) + 플래그(선택).
- 도메인 예: "프론트엔드 PR 다축 리뷰", "결제 모듈 TDD 오버핏 방지"
- `--deep` *(0.6.0)*: Deep-dive 게이트에서 (b) 모두 yes 자동 응답 (시니어용)
- `--fast` *(0.6.0)*: Deep-dive 게이트에서 (c) skip 자동 응답 (단순 팀)

**동작**: `harness-factory` 메타-스킬 활성화 (0.6.0):
- Phase 0 Pre-scan
- Phase 1 Domain Interview — **기본 6 질문**(Q1~Q5 + Q6 관측성 0.6.0 신규) → Deep-dive 옵트인 게이트 (a/b/c 3지선 + CLI 플래그 bypass) → Sanity check R1~R8 (R8 신규: 관측성 공백 vs 실패 비용)
- Phase 2 6 패턴 중 1개 추천
- Phase 3~6 에이전트·스킬·시운전

**출력 위치**: `./.claude/agents/*.md` + `./.claude/skills/<team>/SKILL.md` (프로젝트 로컬).

**Phase 복귀 규칙** *(0.6.0)*: "intent 재인터뷰" / "패턴 재선택" / "roster 수정" / "skill 재설계" 트리거로 이전 Phase로 돌아갈 수 있음.

**예시**:
```
/cfh-team 결제 모듈을 오버핏 없이 TDD로 구현
/cfh-team --deep 시니어 PR 리뷰 다축 (모든 Deep-dive 축 질문)
/cfh-team --fast 단순 2-에이전트 검증 (Deep-dive skip)
/cfh-team                       # 도메인부터 질문
```

**관련**: `cfh generate <preset>` (4종 프리셋에 맞을 때 더 빠름), `/cfh-make` (팀 확정 안 됐을 때).

---

### `/cfh-tdd <target>`

**언제**: 새 기능을 TDD로 처음부터 설계. 파일이 아직 없거나 새로 작성.

**인자**: `$ARGUMENTS` — 대상 파일 경로 (선택).

**동작**: `tdd-first` 스킬 → Phase 0 Scope Narrowing 7 질문 → Phase 1 Intent Interview 6 질문 → Phase 2 테스트 아웃라인 승인 → Phase 3 실패 테스트 커밋(구현 파일 접근 금지) → Phase 4 최소 구현(hard-code 금지, 테스트 수정 금지) → Phase 5 리팩터 + 의도 보존 체크.

**예시**:
```
/cfh-tdd src/utils/formatPrice.ts
/cfh-tdd                        # 대상부터 질문
```

**관련**: `/cfh-tc` (기존 파일 테스트 보강), `/cfh-tdd-gen` (BE/일반 TDD), `cfh generate producer-reviewer` (오버핏 방지 팀 구성).

---

### `/cfh-tdd-gen <target>` *(0.6.0)*

**언제**: 백엔드·CLI·라이브러리·순수 함수·데이터 파이프라인 등 React/Vue 가정이 적용되지 않는 영역의 TDD.

**인자**: `$ARGUMENTS` — 대상 파일 경로 (선택).

**동작**: `tdd-general` 스킬 → 동일 5 Phase 구조이나 stack-neutral. Test Outline은 Arrange-Act-Assert 또는 given-when-then. 스택별 관용구(Node vitest/jest, Python pytest, Go testing, Rust `#[test]`, Java JUnit) 자동 적용.

**예시**:
```
/cfh-tdd-gen src/api/createUser.ts          # Node Express
/cfh-tdd-gen src/services/auth.py           # Python FastAPI
/cfh-tdd-gen pkg/handlers/user.go           # Go
/cfh-tdd-gen src/lib/parser.rs              # Rust 라이브러리
```

**`/cfh-tdd`와 차이**:

| | `/cfh-tdd` | `/cfh-tdd-gen` |
|---|---|---|
| 가정 스택 | React/Vue + RTL + jest/vitest | 임의 (Node·Python·Go·Rust 등) |
| Test Outline | `describe('X') { it('renders Y') }` | Arrange-Act-Assert / given-when-then / table-driven |
| 쿼리·인터랙션 | getByRole·userEvent | 함수 호출·HTTP 요청·CLI 인자 |
| 모킹 | MSW·vi.mock | DI 우선·외부 IO만 mock |
| 안티패턴 | DOM class 검증·내부 state·렌더 카운팅 | private 메서드 호출·시간 의존·글로벌 상태 누수 |

**관련**: `/cfh-tc-gen` (BE 기존 파일 보강), `/cfh-tdd` (FE).

---

### `/cfh-tc <path>`

**언제**: 테스트 코드 작성. 파일 존재 여부로 TDD Mode(신규) vs Test-Fill Mode(기존 보강) 자동 감지.

**인자**: `$ARGUMENTS` — 파일 또는 디렉터리 경로.

**동작**:
- 파일 **존재** → Test-Fill Mode: 현재 동작 Characterization → Priority 1~5 시나리오(Core/Async/Edge/A11y/Integration)
- 파일 **부재** → TDD Mode: `/cfh-tdd`와 동일 흐름
- 파일 **모호** → 사용자에게 "TDD인가 보강인가" 질문

**공통 규칙**: Testing Library 쿼리 우선순위(getByRole > getByLabelText > …), userEvent 기반, 내부 상태 접근 금지.

**예시**:
```
/cfh-tc src/components/Button/Button.tsx    # 파일 있음 → Test-Fill
/cfh-tc src/hooks/useAuth.ts                 # 파일 없음 → TDD
/cfh-tc src/features/checkout/                # 디렉터리 하위 전부
```

**관련**: `/cfh-tdd` (명시적 TDD만), `/cfh-tc-gen` (BE/일반 테스트 보강), 시나리오 가이드 3번(보강) · 4번(TDD).

---

### `/cfh-tc-gen <path>` *(0.6.0)*

**언제**: 백엔드·라이브러리·CLI·순수 함수의 테스트 작성. React/Vue·DOM 가정이 없음.

**인자**: `$ARGUMENTS` — 파일 또는 디렉터리 경로.

**동작**: TDD/Test-Fill Mode 자동 감지. TDD는 `/cfh-tdd-gen`으로 안내, 보강은 이 커맨드로:
- 파일 존재 → Test-Fill: 현재 동작 Characterization → Priority 1~5 (Core / IO / Edge / Error / Integration)
- 파일 부재 → TDD Mode 안내

**공통 규칙**: Arrange-Act-Assert 또는 given-when-then, 의존성 주입 우선, 외부 IO(HTTP·DB·파일·시간)만 mock, public 인터페이스로만 검증, table-driven 테스트 권장.

**스택 자동 감지**: `package.json`/`pyproject.toml`/`go.mod`/`Cargo.toml` 기반.

**예시**:
```
/cfh-tc-gen src/services/auth.ts             # Node 백엔드
/cfh-tc-gen app/api/users.py                  # Python FastAPI
/cfh-tc-gen pkg/db/queries.go                 # Go
```

**관련**: `/cfh-tdd-gen` (신규), `/cfh-tc` (FE).

---

### `/cfh-refactor <target>`

**언제**: 행동 보존을 유지한 채 코드 구조 개선. 버그 수정·기능 추가와 구분.

**인자**: `$ARGUMENTS` — 파일 또는 디렉터리 경로.

**동작**: `refactoring-strategy` 스킬 → Step 1 Scope Narrowing 8 질문 → Step 2 Project Profile → Step 3 Blast Radius 분석 → Step 4 Safety Net(테스트 없으면 Characterization Test 강제) → Step 5 Small PR 계획(50~200줄, 5파일 이내) → Step 6~8 실행·검증·Legacy 기록.

**5대 원칙**: 작은 PR / 행동 보존 / Blast Radius 우선 / Legacy 허용 / 라이브러리 공식 기준만.

**예시**:
```
/cfh-refactor src/legacy/patient-api
/cfh-refactor src/components/ui              # 디렉터리 전체
```

**관련**: `/cfh-review` (리팩터 전 현황 파악), `/cfh-tc` (Safety Net 준비).

---

### `/cfh-review [parent-branch]`

**언제**: PR 올리기 전 자체 점검, 또는 외부 리뷰 전 사전 정리.

**인자**: `$ARGUMENTS` — 부모 브랜치 (선택). 생략 시 자동 추정: `hotfix/*` → `release`, `release/*` → `main`, 그 외 → `develop`.

**동작**: diff 규모 측정 → 적응형 서브에이전트 배치:

| 규모 | 파일 수 | 서브에이전트 |
|---|---|---|
| Tiny | 1~3 | 1 (통합) |
| Small | 4~15 | 3 (Convention, Logic, Test) |
| Medium | 16~50 | 5 (+ Performance, Security) |
| Large | 51~200 | 5 + 도메인 청크 |
| Huge | 200+ | 범위 축소 먼저 |

**출력**: 프로젝트 루트 `REVIEW.md`. `❓ Questions to Resolve` 섹션 상단에 모호 의도 분리.

**예시**:
```
/cfh-review                     # 자동 부모 추정
/cfh-review main                # 명시적
```

**관련**: `cfh generate reviewer-team` (상시 다축 리뷰 팀 세팅), `/cfh-refactor`.

---

### `/cfh-trace [query]`

**언제**: 새 스킬 description 작성 중 트리거 의도 확인, 또는 기존 스킬의 오발동·미발동 원인 분석.

**인자**: `$ARGUMENTS` — 시뮬레이션할 발화 (선택). 생략 시 발화를 묻는 인터뷰 모드.

**동작**: CLI `cfh trace` 래핑 또는 직접 스캔. positive/negative(반-트리거) 분리 후 키워드 가중치 매칭 → 상위 5개 스킬 점수 리포트.

**예시**:
```
/cfh-trace "리팩터링 좀"
/cfh-trace                      # 인터뷰 모드
```

**관련**: `cfh doctor` (overlap 정적 감지), `cfh evolve` (로그 기반 개선 제안).

---

### `/cfh-feedback <skill> "<comment>"` *(0.6.0)*

**언제**: 스킬 사용 중·후 자발적 피드백 기록. miss·friction·positive 어떤 종류든.

**인자**: `<skill-name>` + `"<comment>"` (따옴표 선택). 누락 시 Claude가 질문.

**전제**: `cfh log --enable`로 옵트인 활성화 필요. 미활성화 시 안내만.

**동작**:
1. 옵트인 상태 확인
2. comment를 자동 분류 (miss / success / friction / positive)
3. `~/.claude/.cfh-logs/<skill>.jsonl`에 기록
4. `cfh evolve` 다음 실행 시 분석에 반영

**예시**:
```
/cfh-feedback tdd-first "테스트 보강만 원했는데 TDD 모드로 들어갔음"
/cfh-feedback refactoring-strategy "Scope Q3 옵션이 모호했음"
/cfh-feedback skill-author "Phase 1 인터뷰가 잘 짜여 있음. 만족"
```

**관련**: `cfh log` (CLI 직접 기록), `cfh evolve` (분석·제안).

---

### `/cfh-guide [topic]`

**언제**: 사용법 확인. 새 세션이나 오랜만에 쓸 때.

**인자**: `$ARGUMENTS` — 토픽 키워드 (선택). 다음 중 하나: `overview`, `install`, `new`, `team`, `make`, `maintain`, `evolve`, `trigger`, `commands`.

**동작**: 토픽에 해당하는 섹션을 **그대로** 출력 (요약·재작성 금지). 섹션 끝에 다음 토픽 제안.

**예시**:
```
/cfh-guide                      # overview
/cfh-guide install
/cfh-guide team
```

**관련**: README.md (정적 문서), `/cfh-make` (대화로 분류까지 받고 싶을 때).

---

## 9. API Reference — CLI 명령

`cfh` 또는 `claude-skills` 바이너리. 모두 Node 18+ 전제.

### 설치·라이프사이클

#### `cfh install [name...]`

**역할**: 패키지 번들 스킬·커맨드를 대상 디렉터리(`~/.claude/` 기본)로 복사·설치 + manifest 기록.

**플래그**:
- `--link` — 심볼릭 링크 방식(npm update 자동 반영, Windows는 권한 없으면 copy fallback)
- `--only skills|commands` — 한 종류만
- `--target <path>` — 대상 경로 override
- `--force, -f` — 기존 덮어쓰기
- `--dry-run` — 미리보기

**예시**:
```bash
cfh install                     # 전체 번들 설치
cfh install --link              # 심볼릭 링크
cfh install tdd-first           # 특정 항목만
cfh install --target ./.sandbox # 커스텀 타깃
```

---

#### `cfh update [name...]`

**역할**: managed 항목만 최신 패키지 버전으로 갱신. `user-authored`·`user-modified`는 건너뜀.

**플래그**: `--only`, `--target`, `--force`, `--dry-run` (install과 동일).

**예시**:
```bash
cfh update                      # 전체 managed 갱신
cfh update --only skills        # 스킬만
cfh update --force              # user-modified 강제 덮어쓰기
```

---

#### `cfh list` / `cfh ls`

**역할**: 설치 상태 조회. 0.3.0부터 `./.claude`가 있으면 전역·프로젝트 두 섹션 자동 표시.

**플래그**:
- `--global` — 전역(~/.claude)만
- `--project` — 현재 프로젝트 `./.claude`만
- `--target <path>` — 커스텀 경로

**출력 상태 의미**:
- `managed@<ver>` — 설치 상태 그대로
- `managed@<ver> (user-modified)` — 설치 후 편집됨
- `managed@<ver> (symlink)` — `--link`로 설치
- `user-authored` — 사용자 작성 (update 자동 보호)
- `user-authored (adopted)` — `cfh adopt`로 전환된 번들 자산

---

#### `cfh remove <name>` / `cfh rm <name>`

**역할**: 설치 항목 제거. `user-authored`·`user-modified`는 `--force` 필요.

**예시**:
```bash
cfh remove tdd-first
cfh remove my-custom --force    # 사용자 작성물도 강제 제거
```

---

### 작성·검증

#### `cfh new <kind> <name>`

**역할**: 인터뷰 없이 **빈 스캐폴드**만 생성 (TODO 마커 포함). `/cfh-new`는 스캐폴드 + 인터뷰 전체, `cfh new`는 스캐폴드만.

**인자**: `<kind>`: `skill`|`command`|`agent`, `<name>`: kebab-case 1~63자.

**플래그**:
- `--project` — `./.claude/`에 생성 (기본은 `~/.claude/`)
- `--target <path>` — 커스텀
- `--force` — 기존 덮어쓰기

**예시**:
```bash
cfh new skill my-rule                         # ~/.claude/skills/my-rule/
cfh new skill team-rule --project             # ./.claude/skills/team-rule/
cfh new command audit
cfh new agent security-reviewer --project
```

---

#### `cfh validate`

**역할**: 모든 스킬·커맨드의 frontmatter + 본문 구조 검증.

**체크**: frontmatter 존재 / `name` ↔ 디렉터리명 일치 / `description` 20자+ / 커맨드 `$ARGUMENTS` 또는 구조화 태그.

**종료 코드**: 에러 있으면 1 (CI 용이).

**플래그**: `--target <path>`.

---

#### `cfh generate <preset>`

**역할**: 프리셋 기반 팀 자산(에이전트 + 스킬)을 `./.claude/`에 생성.

**프리셋**:
- `producer-reviewer` — Producer + Reviewer 2 에이전트
- `pipeline-3stage` — Analyst → Builder → QA 3 에이전트
- `reviewer-team` — security / perf / a11y / types 4 에이전트 (FE)
- `reviewer-team-backend` *(0.6.0)* — security / perf / types / data-integrity 4 에이전트 (BE — a11y 대신 데이터 무결성)

**플래그**: `--list` (프리셋 목록), `--target`, `--force`, `--dry-run`.

**예시**:
```bash
cfh generate --list
cfh generate producer-reviewer
cfh generate reviewer-team                  # FE PR 다축 리뷰
cfh generate reviewer-team-backend          # BE/API PR 리뷰
cfh generate reviewer-team --target ./.sandbox
```

---

### 유지보수 (0.3.0 신규)

#### `cfh adopt <name>`

**역할**: managed 항목을 `user-authored`로 전환(manifest 제거). 이후 `cfh update`에서 자동 보호됨.

**플래그**:
- `--yes, -y` — y/N 프롬프트 건너뛰기
- `--dry-run` — 미리보기
- `--target <path>`

**예시**:
```bash
cfh adopt refactoring-strategy        # y/N 확인
cfh adopt my-edit --yes                # 자동 승인
```

**역방향 없음**: 되돌리고 싶으면 `cfh update --force`로 패키지 버전 덮어쓰기.

---

#### `cfh diff <name>`

**역할**: 설치 당시 manifest 해시와 현재 파일 비교. "내가 뭘 바꿨는지" 요약.

**플래그**:
- `--full` — 현재 패키지 소스와의 unified diff 전체 출력 (요약만으로 부족할 때)
- `--target <path>`

**예시**:
```bash
cfh diff tdd-first                    # 요약(파일명 목록)
cfh diff tdd-first --full             # unified diff
```

**주의**: manifest는 해시만 저장하므로 `--full`은 설치 당시 스냅샷이 아닌 **현재 패키지 소스**와 비교. upstream 변경 + 로컬 변경이 섞일 수 있음.

---

#### `cfh doctor`

**역할**: 설치 전체 9 항목 점검 (0.6.0에서 3개 추가) + 옵션으로 30일 사용 현황.

**점검 항목**:
1. frontmatter 유효성 (name/description/20자+)
2. 스킬 간 트리거 키워드 중복
3. 고아 manifest (파일 없는데 manifest 잔존)
4. 깨진 symlink
5. 전역·프로젝트 동일 이름 (프로젝트가 전역 가림)
6. 커맨드 `$ARGUMENTS`·`<invocation>` 태그 누락
7. *(0.6.0)* 트리거 키워드 0개 스킬 (자동 트리거 불가)
8. *(0.6.0)* 에이전트 5+개 단일 레벨 (Hierarchical 권고)
9. *(0.6.0)* 에이전트 `tools: "*"` (최소 권한 위반)

**종료 코드**: 문제 있으면 1.

**플래그**:
- `--warn-only` — 항상 exit 0 (CI 경고용)
- `--target <path>`
- `--usage` *(0.6.0)* — 30일 사용 현황 추가 출력 (`~/.claude/.cfh-logs/` 기반)

**`--usage` 출력 예**:
```
📊 최근 30일 스킬 사용 현황
  tdd-first             12회 (success 11, helpful 9, not-helpful 2)
  harness-factory        3회 (success 3)
  refactoring-strategy   0회 ← 쓴 적 없음. 제거 또는 트리거 개선 검토?
```

---

#### `cfh trace "<query>"`

**역할**: 주어진 발화가 어느 스킬을 트리거할지 키워드 매칭 시뮬레이션.

**알고리즘**: positive(반-트리거 앞) +2 / negative +(−3) / 부분일치 +0.5.

**플래그**:
- `--top <N>` — 상위 N개 (기본 5)
- `--target <path>`

**예시**:
```bash
cfh trace "리팩터링 좀 해줘"
cfh trace "PR 리뷰" --top 10
```

**슬래시 버전**: `/cfh-trace`는 인자 없을 때 인터뷰 모드로 전환.

---

### 유틸리티 (0.7.0 신규)

#### `cfh search "<keyword>"`

**역할**: 설치된 스킬·커맨드의 name·description·본문에서 키워드 검색. `cfh trace`가 발화 시뮬레이션이라면 `search`는 명시적 키워드 검색.

**플래그**: `--kind skill|command`, `--case-sensitive`, `--target <path>`

**예시**:
```bash
cfh search "TDD"
cfh search "리팩터링" --kind skill
cfh search "React" --case-sensitive
```

#### `cfh open <name>`

**역할**: 설치된 자산을 `$EDITOR`로 열기. 프로젝트 로컬 > 전역 우선.

**플래그**: `--editor <cmd>` (예: `"code -w"`), `--target <path>`

**예시**:
```bash
cfh open tdd-first
cfh open cfh-review --editor "code -w"
```

#### `cfh export [names...]`

**역할**: user-authored 자산을 JSON 번들로 내보내기. 팀 공유·PC 이식용.

**플래그**: `--output <path>`, `--all` (managed 포함), `--target <path>`

**예시**:
```bash
cfh export                               # 전체 user-authored
cfh export my-skill my-cmd               # 특정 항목만
cfh export --all --output full.json
```

번들 포맷: `cfh-bundle-v1` JSON. zero-dep.

#### `cfh import <bundle.json>`

**역할**: 번들을 풀어 설치. 가져온 자산은 **user-authored로 취급**.

**플래그**: `--force`, `--yes`, `--dry-run`, `--target <path>`

**예시**:
```bash
cfh import my-bundle.json
cfh import my-bundle.json --force --yes
cfh import my-bundle.json --dry-run
```

---

### 진화 (0.3.0 신규, 옵트인)

#### `cfh log <skill>`

**역할**: 사용 이벤트를 `~/.claude/.cfh-logs/<skill>.jsonl`에 기록. 로컬 전용, 외부 전송 없음.

**제어 플래그**:
- `--enable` — 텔레메트리 활성화 (최초 프롬프트로 확인)
- `--disable` — 비활성화
- `--status` — 현재 상태 + 로그 파일 수

**이벤트 플래그**:
- `--event trigger|success|miss` — 이벤트 종류
- `--utterance "<문자열>"` — 트리거 발화 원문
- `--helpful y|n` — 사용자 만족도
- `--note "<메모>"` — 자유 기록

**예시**:
```bash
cfh log --enable                                        # 옵트인
cfh log tdd-first --event trigger --utterance "TDD 시작" --helpful y
cfh log tdd-first --event miss --utterance "테스트만"
cfh log --status
cfh log --disable
```

**자동화**: Claude Code `settings.json` 훅으로 연결하면 실제 사용 시점에 자동 기록 가능.

---

#### `cfh evolve [<skill>]`

**역할**: 정적 분석 + (옵트인 시) 로그 기반 제안 출력. **자동 수정 없음**.

**정적 분석**:
- description 길이 (40자 미만 경고)
- 반-트리거 절 유무
- 다른 스킬과 트리거 토큰 공유 (3개+ 경고)
- 고유 트리거 토큰 수 (5개 미만 경고)

**로그 기반** (로그 있을 때만):
- helpful/not-helpful 비율
- miss 이벤트 반복 패턴
- 자주 등장한 발화 토큰 top 10

**예시**:
```bash
cfh evolve                      # 모든 스킬 분석
cfh evolve tdd-first            # 특정 스킬만
```

**주의**: 0.3.0에는 `--apply` 기능 없음. 제안 확인 후 SKILL.md를 직접 편집하세요.

---

### 공통 플래그

| 플래그 | 의미 |
|---|---|
| `--target <path>` | 대상 경로 override |
| `--dry-run` | 미리보기 (실제 파일 변경 없음) |
| `--force`, `-f` | 안전장치 해제(덮어쓰기·user-authored 강제 제거) |
| `--help`, `-h` | 도움말 |
| `--version`, `-v` *(0.4.0+)* | 버전 출력 |
| `--deep` *(0.6.0)* | `/cfh-team`의 Deep-dive 게이트 (b) 모두 yes 자동 |
| `--fast` *(0.6.0)* | `/cfh-team`의 Deep-dive 게이트 (c) skip 자동 |
| `--usage` *(0.6.0)* | `cfh doctor`에 30일 사용 현황 추가 |
| `--kind skill\|command` *(0.7.0)* | `cfh search` 자산 종류 필터 |
| `--case-sensitive` *(0.7.0)* | `cfh search` 대소문자 구분 |
| `--editor <cmd>` *(0.7.0)* | `cfh open` 에디터 override |
| `--output <path>` *(0.7.0)* | `cfh export` 출력 파일 경로 |
| `--all` *(0.7.0)* | `cfh export` managed 자산 포함 |
| `--yes` *(0.7.0)* | `cfh import` 충돌 일괄 승인 |

---

## 10. 다음에 읽을 것

- **[README.md](./README.md)** — 전체 레퍼런스, FAQ, 디렉터리 구조, CI 통합, 시나리오 가이드
- **[DESC_CFL.md](./DESC_CFL.md)** — Confluence 페이스트용 종합 가이드 (이 문서와 중복되나 외부 공유용)
- **[preview.md](./preview.md)** — 외부 평가자 피드백 + 채택 결정 로그
- `~/.claude/skills/skill-author/SKILL.md` — 스킬 작성 메타-스킬의 6 Phase (Pre-scan + 조건부 follow-up + Sanity check + (z) 모르겠음 fallback)
- `~/.claude/skills/harness-factory/SKILL.md` — 팀 생성 메타-스킬 + 6 패턴 (Pre-scan + 기본 6Q + Deep-dive 3지선 + Sanity R1~R8)
- `~/.claude/skills/asset-factory/SKILL.md` — Dispatcher 2 Phase + 분류 트리 (0.5.0 goal-first)
- `~/.claude/skills/asset-factory/references/unknown-answer-playbook.md` *(0.6.0)* — 모든 인터뷰의 (z) 모르겠음 처리 protocol
- `~/.claude/skills/tdd-general/SKILL.md` *(0.6.0)* — framework-agnostic TDD (BE·CLI·라이브러리)
- `~/.claude/skills/harness-factory/references/patterns/*.md` — 각 아키텍처 패턴의 언제·어떻게
