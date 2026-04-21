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

끝. 두 번째 줄이 `~/.claude/skills/`와 `~/.claude/commands/`에 번들된 4개 스킬 + 8개 슬래시 커맨드를 복사합니다.

### 확인

```bash
cfh list
```

아래와 같이 나오면 성공:

```
=== Global (~/.claude) ===

Skills (C:\Users\<you>\.claude\skills):
  harness-factory          managed@0.3.0
  refactoring-strategy     managed@0.3.0
  skill-author             managed@0.3.0
  tdd-first                managed@0.3.0

Commands (C:\Users\<you>\.claude\commands):
  cfh-guide, cfh-new, cfh-refactor, cfh-review,
  cfh-tc, cfh-tdd, cfh-team, cfh-trace           (모두 managed@0.3.0)
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
3. `cfh doctor` — 트리거 중복·고아 manifest·shadowing 있나?
4. `cfh trace "<내 발화>"` — 어느 스킬이 매칭되는지 점수로 확인
5. SKILL.md `description`에 구체 키워드 3개 이상 있나?
6. Claude Code 세션 재시작 (`.claude/` 캐시 갱신)

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
| 팀 생성 (대화) | `/cfh-team [도메인 설명]` |
| 프리셋 목록 | `cfh generate --list` |
| 번들 스킬 편집 보호 | `cfh adopt <name>` |
| 내 변경분 확인 | `cfh diff <name>` |
| 전체 건강 점검 | `cfh doctor` |
| 트리거 시뮬레이션 | `cfh trace "<query>"` 또는 `/cfh-trace` |

| 대화에서 | 발동 |
|---|---|
| "리팩터링 해줘" | refactoring-strategy 자동 |
| "TDD로 시작" | tdd-first 자동 |
| "스킬 만들어줘" | skill-author 자동 |
| "팀 만들어줘" | harness-factory 자동 |
| `/cfh-refactor <target>` | refactoring-strategy 명시 |
| `/cfh-tdd <target>` | tdd-first 명시 |
| `/cfh-review [branch]` | 코드 리뷰 |
| `/cfh-tc [path]` | 테스트 작성 |
| `/cfh-new <kind> <name>` | skill-author 명시 |
| `/cfh-team [domain]` | harness-factory 명시 |
| `/cfh-trace [query]` | 트리거 시뮬레이션 |
| `/cfh-guide [topic]` | 사용 가이드 |

---

## 8. 다음에 읽을 것

- **[README.md](./README.md)** — 전체 레퍼런스, FAQ, 디렉터리 구조, CI 통합
- `~/.claude/skills/skill-author/SKILL.md` — 스킬 작성 메타-스킬의 5 Phase 상세
- `~/.claude/skills/harness-factory/SKILL.md` — 팀 생성 메타-스킬 + 6 패턴 문서
- `~/.claude/skills/harness-factory/references/patterns/*.md` — 각 아키텍처 패턴의 언제·어떻게
