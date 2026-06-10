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

끝. 두 번째 줄이 `~/.claude/skills/`와 `~/.claude/commands/`에 번들된 **8개 스킬 + 21개 슬래시 커맨드 + 11개 reference 파일 + JSON Schema 파일**을 복사합니다.

> 🧭 **정책 anchor**: FE/non-FE **명시 분기 유지**. `cfh-tdd`/`cfh-tc`/`cfh-refactor`는 FE 전용, `-gen` suffix는 **non-FE 전반** (BE/library/CLI/mobile/embedded/ML). 자세한 자산별 매트릭스는 [`DESC_CFL.md` § 8](./DESC_CFL.md) 또는 [`PLAN.md` § 1](./PLAN.md).

> **1.0 변경 요약**: CLI surface가 subcommand 중심으로 정리됨 — `cfh feedback` (구 evolve+log) · `cfh stats` (구 dashboard+cost+sentry summary) · `cfh check` (구 validate+doctor) · `cfh dev eval` (구 eval, maintainer namespace) · `cfh sentry live`/`cfh sentry hook install` (구 --live/--install-hook). 구 명령은 deprecation warning + 1 사이클 alias 유지 (2.0 제거). `cfh install --link` 제거 (dev: `npm link` 사용). 상세 매핑은 [README "Migration Guide"](./README.md) + [docs/deprecation-policy.md](./docs/deprecation-policy.md).

### 확인

```bash
cfh list
```

아래와 같이 나오면 성공 (1.0부터 skill ↔ command mapping이 함께 표시됨):

```
=== Global (~/.claude) ===

Skills (C:\Users\<you>\.claude\skills):
  asset-factory            managed@0.30.0  →  [/cfh-make]
  debug-investigator       managed@0.30.0  →  [/cfh-debug]
  grilling                 managed@0.30.0  →  [/cfh-grill]
  cfh-harness          managed@0.30.0  →  [/cfh-team]
  refactoring-strategy     managed@0.30.0  →  [/cfh-refactor, /cfh-refactor-gen]
  skill-author             managed@0.30.0  →  [/cfh-new]
  tdd-first                managed@0.30.0  →  [/cfh-tdd, /cfh-tc]
  tdd-general              managed@0.30.0  →  [/cfh-tdd-gen, /cfh-tc-gen]

Commands (C:\Users\<you>\.claude\commands):
  cfh-ask*, cfh-clone, cfh-debug, cfh-feedback, cfh-grill, cfh-guide, cfh-make, cfh-new,
  cfh-plan, cfh-progress, cfh-progress-audit, cfh-refactor, cfh-refactor-gen,
  cfh-retro, cfh-review, cfh-tc, cfh-tc-gen, cfh-tdd, cfh-tdd-gen, cfh-team, cfh-trace
                                          (모두 managed@0.30.0 · *=experimental)
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
Claude: (cfh-harness 스킬 활성화)
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

각 패턴 상세는 `~/.claude/skills/cfh-harness/references/patterns/<name>.md`.

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

### Monorepo 사용

여러 패키지가 한 repo에 있는 monorepo (Nx·Turborepo·pnpm workspaces·Lerna·Yarn workspaces 등)에서 패키지별로 다른 스킬을 쓰고 싶을 때:

```bash
# 패키지별 로컬 설치
cfh install --target ./packages/web/.claude       # FE 패키지
cfh install --target ./packages/api/.claude       # BE 패키지

# 패키지별 차별화 — 한쪽에만 특화 스킬
cfh install --target ./packages/web/.claude --only commands cfh-tdd cfh-tc cfh-refactor
cfh install --target ./packages/api/.claude --only commands cfh-tdd-gen cfh-tc-gen cfh-refactor-gen

# 프로젝트 로컬 스킬 신설
cd packages/web
cfh new skill our-fe-pattern --project    # ./.claude/skills/our-fe-pattern/
```

**작동 우선순위**:
1. 프로젝트 로컬 (`./.claude/skills/<name>/`) — *해당 cwd에서 Claude Code 실행 시* 우선
2. 글로벌 (`~/.claude/skills/<name>/`) — fallback

같은 이름이 양쪽에 있으면 **프로젝트 로컬이 글로벌을 가립니다**(shadowing). `cfh check skills`가 shadowing 감지 + 경고 출력.

`cfh list`는 양쪽 모두 표시:
```bash
cfh list                       # 글로벌 + 프로젝트(있으면)
cfh list --global              # 글로벌만
cfh list --project             # 프로젝트만
cfh list --target ./.claude    # 임의 경로
```

**팀 공유 패턴**: 프로젝트 로컬 (`./.claude/`)을 git에 commit → 팀원이 clone하면 자동 적용. cfh 명령을 별도 실행할 필요 없음 (Claude Code가 cwd 기준 자동 인식).

### CI 통합 (상세)

#### Schema·진단 검사

```yaml
# .github/workflows/cfh-check.yml
on: [pull_request]
jobs:
  cfh-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install -g @han-kyeon/claude-skills
      - run: cfh install --target ./.claude --dry-run  # 변경 없이 검증
      - run: cfh check --strict --target .              # frontmatter strict + 진단 모두
      - run: cfh check skills --mapping --target .      # skill ↔ command 매핑 일관성
```

`cfh check --legacy`로 0.x style 호환 (1.0급 strict 우회).

#### Eval 회귀 검사

```yaml
- name: Run skill evals
  run: cfh dev eval --executor claude --report junit --output junit.xml
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
- uses: dorny/test-reporter@v1
  with: { path: junit.xml, reporter: java-junit }
```

`--executor claude` 사용 시 토큰 비용 발생 — 일반적으로 PR마다 실행 아닌 release 사이클·nightly로.

#### Cost 회귀 감지

```yaml
- name: Cost regression check
  run: cfh stats cost --since-commit "$(git rev-parse origin/main)" --days 7 --json
```

±20% 임계 자동 판정 (`lib/cost.js getCommitTimestamp`). commit hash는 hex 4~40자만 허용(injection 차단).

#### 종료 코드

| 명령 | 0 (성공) | 1 (실패) | 옵션 |
|---|---|---|---|
| `cfh check` / `cfh validate` | warning 0건 | error ≥1 | `--warn-only` (always exit 0) |
| `cfh dev eval` | 모든 케이스 pass | 1+ fail | `--report junit` JUnit XML 출력 |
| `cfh trace` | 항상 0 | — | (진단용) |
| `cfh install --dry-run` | 항상 0 | — | (preview only) |

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

### Scene 6 — 작업 종료 시 회고+커밋 자동 흐름 *(0.9.0)*

`/cfh-plan`·`/cfh-tdd`·`/cfh-refactor`·`/cfh-debug`·`/cfh-review` 5개 커맨드의 완료 보고에 **🔄 Retro 블록**과 **📝 제안 커밋 블록**이 자동 포함됩니다:

```
사용자: /cfh-plan checkout 페이지에 쿠폰 검증 추가
Claude: (Phase 1~3 진행) ...
        ✅ 작업 완료 보고
        - 목표 달성: ...
        - 생성·수정 파일: ...

        🔄 Retro
          효과 있었음: scoped pre-scan으로 broad scan 회피
          실패·삽질: 처음에 zustand store 통합 시도 → 폐기
          다음엔 바꿀 것: 검증 결과 캐싱 별도 PR로

        📝 제안 커밋
          메시지 초안: feat: add coupon validation to checkout page
          스테이지 범위: + src/features/coupon/, ~ src/features/checkout/CheckoutPage.tsx
          분할 추천: 단일 커밋 (한 관심사)
          진행: yes / edit-msg / split-differently / no-commit
```

**Stop 훅 자동 트리거**: `~/.claude/settings.json`에 `cfh-retro-hook.sh` 등록 시 Retro 블록 출력된 turn에서 `/cfh-retro`가 자동 발동되어 영구 기록. 가벼운 대화엔 silent.

자세한 형식은 `commands/references/retro-and-commit.md` 참조.

### Scene 7 — 비용·진행 상황 가시화 *(0.10.0)*

```bash
# 어느 명령에 토큰을 가장 많이 쓰는지
cfh cost --days 7 --by command --match my-project
# → /cfh-plan 119M, /cfh-review 27M, …

# 일자별 추세
cfh cost --by day --days 30

# 한 세션의 비용
cfh cost --by session --days 1
```

데이터 출처는 Claude Code transcript(`~/.claude/projects/`) — 별도 텔레메트리 옵트인 불필요. 가격은 모델·테넌트마다 다르므로 토큰 단위만 집계.

**프로젝트 진행 상황 누적** — `/cfh-progress`:

```
사용자: /cfh-progress init           # 첫 세션, PROGRESS.md 생성
        ... 작업 ...
        /cfh-progress                # 직전 결정·다음 단계 추출 → append
        ... 다음 세션에 ...
        /cfh-progress show           # 진척률 + 인계 요약
```

`./PROGRESS.md`는 git에 commit하면 팀원·다른 기계에서 이어받을 수 있음. Stop 훅 옵트인 시 Retro·결정 신호 발생 turn에 자동 prompt.

자세한 형식은 `commands/references/progress-template.md` 참조.

---

## 7. 한눈에 보는 명령어 치트시트 (1.0)

> 🛈 1.0부터 일부 명령이 subcommand로 정리됨. 구 명령은 1.0.x 동안 alias 유지 (deprecation warning + 2.0 제거). 전체 매핑은 §7.5 또는 [README Migration Guide](./README.md).

| 일상 | 명령 |
|---|---|
| 처음 설치 | `cfh install` (`--link` 제거됨 — dev는 `npm link`) |
| 상태 확인 | `cfh list` (skill ↔ command mapping 함께 표시) |
| 패키지 갱신 | `cfh update` |
| 특정 스킬 제거 | `cfh remove <name>` |
| 내 스킬 만들기 | `cfh new skill <name>` (auto-mirror command 함께 생성, `--no-mirror`로 비활성) |
| 기존 스킬 fork | `cfh new skill <name> --from-existing <other>` |
| 내 커맨드 만들기 | `cfh new command <name>` |
| 내 에이전트 만들기 | `cfh new agent <name> --project` |
| 검증 (1.0 umbrella) | `cfh check` (전체) / `cfh check schema` / `cfh check skills` |
| schema 엄격 검사 | `cfh check schema` (1.0 default strict) — 0.x 동작은 `--legacy` |
| 매핑 일관성 검증 | `cfh check skills --mapping` |
| confidence 가이드 검사 | `cfh check skills --strict-confidence` |
| 팀 생성 (빠름) | `cfh generate <preset>` · 목록: `cfh generate --list` |
| 팀 생성 (대화) | `/cfh-team [도메인 설명] [--deep\|--fast]` |
| 번들 스킬 편집 보호 | `cfh adopt <name>` |
| 내 변경분 확인 | `cfh diff <name>` · staleness: `cfh diff --skills-vs-evals` |
| 트리거 시뮬레이션 | `cfh trace "<query>"` 또는 `/cfh-trace` |
| 즉석 피드백 (스킬) | `/cfh-feedback <skill> "<comment>"` |
| 키워드 검색 | `cfh search "<keyword>" [--kind skill\|command]` |
| 자산 편집 | `cfh open <name>` |
| 자산 번들 내보내기 | `cfh export [--all] [--output FILE]` |
| 자산 번들 가져오기 | `cfh import <bundle.json>` |
| 파일 변경 자동 검증 | `cfh watch [--doctor]` |
| 30일 사용 현황 | `cfh check skills --usage` |
| 버전 확인 | `cfh --version` 또는 `cfh -v` |

### Feedback / evolution (1.0)

| 명령 | 동작 |
|---|---|
| `cfh feedback` | 모든 스킬 분석 (구 `cfh evolve`) |
| `cfh feedback <skill>` | 특정 스킬 분석 |
| `cfh feedback enable\|disable\|status` | telemetry 옵트인 토글 |
| `cfh feedback log <skill> --event ... --note ... --helpful y\|n --utterance "..."` | 사용 이벤트 기록 (구 `cfh log <skill>`) |

### Observability — `cfh stats` umbrella (1.0)

| 명령 | 동작 |
|---|---|
| `cfh stats` | 통합 markdown 리포트 (구 `cfh dashboard`) |
| `cfh stats cost --by command\|day\|model\|session --days N --match <substr>` | 토큰 사용량 집계 |
| `cfh stats cost --since-commit <hash>` | commit 시점 기준 회귀 진단 |
| `cfh stats errors --tool <name> --days N` | tool 호출 실패 패턴 (구 `cfh sentry` summary) |
| `cfh sentry live` | 실시간 훅 상태 스냅샷 (구 `cfh sentry --live`) |
| `cfh sentry hook install` | PostToolUse 훅 스크립트 설치 (구 `cfh sentry --install-hook`) |

### Maintainer-facing (1.0 — `cfh dev` namespace)

| 명령 | 동작 |
|---|---|
| `cfh dev eval --list` | 케이스 목록·정적 검증 (구 top-level `cfh eval`) |
| `cfh dev eval <skill> --dry-run` | 프롬프트 미리보기 (LLM 호출 없음, default) |
| `cfh dev eval <skill> --manual` | 사용자 paste 모드 |
| `cfh dev eval <skill> --executor claude` | claude CLI subprocess (토큰 소비) |
| `cfh dev eval --baseline` | A/B (skill 활성 vs anti-trigger prefix) |
| `cfh dev eval --variants <file>` | description A/B/C 비교 (LLM 호출 없음) |
| `cfh dev eval --enable-judge` | judge assertion (semantic, ~500토큰/assertion) |
| `cfh dev eval --report junit --output junit.xml` | CI 통합용 JUnit XML |

| 대화에서 | 발동 |
|---|---|
| "리팩터링 해줘" | refactoring-strategy 자동 |
| "TDD로 시작" | tdd-first 자동 |
| "스킬 만들어줘" | skill-author 자동 |
| "팀 만들어줘" | cfh-harness 자동 |
| `/cfh-refactor <target>` | refactoring-strategy 명시 |
| `/cfh-tdd <target>` | tdd-first 명시 (FE) |
| `/cfh-tdd-gen <target>` *(0.6.0)* | tdd-general 명시 (BE/일반) |
| `/cfh-review [branch]` | 코드 리뷰 (4-옵션 인터뷰) |
| `/cfh-tc [path]` | 테스트 작성 (FE) |
| `/cfh-tc-gen [path]` *(0.6.0)* | 테스트 작성 (BE/일반) |
| `/cfh-new <kind> <name>` | skill-author 명시 |
| `/cfh-team [domain] [--deep|--fast]` | cfh-harness 명시 (Deep-dive bypass 옵션) |
| `/cfh-make [requirement]` | 자산 dispatcher — 뭘 만들지부터 분류 |
| `/cfh-plan [goal]` | 작업 dispatcher — 목표부터 상의 (명시 호출 전용) |
| `/cfh-debug [증상]` *(0.8.0)* | 이슈 조사 dispatcher — 증거부터 (버그·장애·성능·회귀, 명시 호출 전용) |
| `/cfh-trace [query]` | 트리거 시뮬레이션 |
| `/cfh-feedback <skill> "<comment>"` *(0.6.0)* | 사용 피드백 기록 |
| **`/cfh-retro [본문]`** *(0.9.0)* | 작업 회고 영구 기록 (`~/.claude/.cfh-logs/retros/`) — Stop 훅 자동 트리거 가능 |
| **`/cfh-progress [init\|append\|show]`** *(0.10.0)* | 프로젝트 진행 상황을 `./PROGRESS.md`에 누적 — 결정 로그·미해결 질문·다음 단계. Stop 훅 옵트인 |
| **`cfh cost`** *(0.10.0)* | 토큰 사용량 집계 — `--by command\|day\|model\|session` `--days N` `--match <substr>` |
| **`cfh eval [skill]`** *(0.10.0)* | 스킬 행동 검증 — `--list` / `--dry-run` / `--manual` / `--executor claude`. assertion: contains/not_contains/regex |
| **`cfh sentry`** *(0.10.0)* | tool 호출 실패·loop·empty Read 감지 — `--days N` `--tool <name>` |
| **`cfh doctor --strict-confidence`** *(0.10.0)* | 스킬 SKILL.md에 confidence tagging 가이드 부재 시 info 경고 (옵트인) |
| **`cfh dashboard`** *(0.11.0)* | cost+sentry+eval 통합 markdown 리포트, `--output FILE` |
| **`cfh eval --variants <file>`** *(0.11.0)* | description 후보 비교 — trace 점수 기반, LLM 호출 없음 |
| **`cfh eval --report junit`** *(0.11.0)* | JUnit XML 출력 — CI PR 체크 통합 |
| **eval-history** *(0.11.0)* | `--executor claude`/`--manual` 결과를 `~/.claude/.cfh-logs/eval-history/<skill>/`에 영속화 (텔레메트리 옵트인 시) |
| **`cfh cost --since-commit <hash>`** *(0.12.0)* | git commit 시점 이후 vs 이전 토큰 사용 비교 — 회귀 진단 |
| **`cfh diff --skills-vs-evals`** *(0.12.0)* | SKILL.md mtime > evals mtime인 stale 스킬 감지 |
| **`cfh new skill <name> --from-existing <other>`** *(0.12.0)* | 기존 스킬 fork — frontmatter TODO 마커 적용 |
| **`cfh watch [--doctor]`** *(0.12.0)* | 파일 변경 시 validate(+doctor) 자동 재실행 |
| **`cfh validate --strict`** *(0.12.0)* | SKILL.md frontmatter schema 엄격 검증 — 알 수 없는 필드 경고 |
| **`cfh eval --enable-judge`** *(0.13.0)* | Semantic eval — judge assertion으로 의미 검증 (LLM 호출 추가, ~500토큰/assertion) |
| **`cfh eval --judge-model <name>`** *(0.13.0)* | judge 모델 override (기본 claude-haiku-4-5) |
| **`cfh sentry --live`** *(0.14.0)* | PostToolUse 훅 상태 스냅샷 — 실시간 누적 카운트·breach 표시 |
| **`cfh sentry --install-hook`** *(0.14.0)* | 훅 스크립트 ~/.claude/scripts/에 복사 + settings.json 스니펫 출력 |
| **`/cfh-grill`** *(0.14.1)* | 결정 트리 walk + 추천+이유 인터뷰 — 기존 plan 깊이 파기 (mattpocock grilling 어댑테이션) |
| `/cfh-guide [topic]` | 사용 가이드 |

### 7.5 1.0 신/구 명령 매핑 (요약)

| 구 (0.x) | 신 (1.0) | 비고 |
|---|---|---|
| `cfh evolve [skill]` | `cfh feedback [skill]` | alias 1 사이클 |
| `cfh log <skill>` | `cfh feedback log <skill>` | alias 1 사이클 |
| `cfh log --enable\|--disable\|--status` | `cfh feedback enable\|disable\|status` | alias 1 사이클 |
| `cfh dashboard` | `cfh stats` (default = dashboard) | alias 1 사이클 |
| `cfh sentry --live` | `cfh sentry live` | flag → subcommand |
| `cfh sentry --install-hook` | `cfh sentry hook install` | flag → subcommand |
| `cfh eval [skill]` | `cfh dev eval [skill]` | maintainer namespace |
| `cfh validate` | `cfh check schema` | umbrella |
| `cfh doctor` | `cfh check skills` | umbrella |
| `cfh install --link` | **제거됨** | dev: `npm link` |
| `cfh validate` default | `cfh check schema` default = strict | `--legacy` flag로 0.x 동작 |

Deprecation 정책: 1.0.x 동안 구 명령은 stderr deprecation warning + 동작 유지. 2.0에서 제거. 자동화 스크립트는 1.0에서 즉시 수정 불필요. 상세: [`docs/deprecation-policy.md`](./docs/deprecation-policy.md).

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
- **Phase 2 Delegation**: `skill-author` / `cfh-harness` / 인라인 커맨드 중 적절한 경로로 위임

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
- **Phase 2 Approach Proposal** — 태스크 분류(신규/버그/리팩터/테스트/리뷰/탐색/복합) + 접근법 카드, 사용자 승인. **0.8.0부터 카드에 Project Alignment + Product Impact 자동 추론 섹션 포함**(새 질문 없음, Q1~Q4 + Pre-scan으로 Claude 추론)
- **Phase 3 Execution** — 전용 스킬로 위임(`/cfh-tdd`·`/cfh-refactor`·`/cfh-tc`·`/cfh-review`) 또는 직접 실행. **0.9.0부터 직접 실행 종료 보고에 🔄 Retro + 📝 제안 커밋 블록 출력** (위임 경로면 위임받은 커맨드가 출력하므로 중복 회피)

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
| 위임 대상 | skill-author / cfh-harness | tdd-first / refactoring-strategy / /cfh-tc / /cfh-review |

**관련**: 작업 종류 확정 시 `/cfh-tdd`·`/cfh-refactor`·`/cfh-tc`·`/cfh-review` 직접. 자산 생성은 `/cfh-make`. **원인 불명 이슈 조사는 `/cfh-debug`**.

---

### `/cfh-debug [증상]` *(0.8.0)*

**언제**: 버그·장애·성능·회귀 등 **원인이 불분명**한 이슈 조사. **명시 호출** 또는 `debug-investigator` 스킬 **자동 트리거** 양쪽 지원. `/cfh-plan`이 목표 주도라면 이건 **증거 주도** 워크플로.

**인자**: `$ARGUMENTS` — 증상 1~2줄 설명 (선택). 예: "프로덕션에서 쿠폰 적용 시 500 에러".

**동작**: 5 Phase
- **Phase 0 Evidence Gathering** — 유형 분류(a~e) + 유형별 증거 질문 (증상·재현·영향·시점·환경·로그)
  - (a) 기능 버그 / (b) 장애 / (c) 성능 / (d) 회귀 / (e) 복합
  - 장애 유형에서 rollback 가능 + 고심각도 → **조사 전 rollback 먼저** 권고
- **Phase 1 Context Scan** — 증거 기반 scoped 스캔 (git log·blame·관련 PR·스택 파일·의존성 diff·CI 이력)
- **Phase 2 Hypothesis Enumeration** — 최소 3개 가설 + 각 확인 방법 병렬 제시 (확증 편향 방지)
- **Phase 3 Verification** — 체계적 검증 (재현 테스트·git bisect·profiler·rollback A/B)
- **Phase 4 Root Cause + Fix Plan** — 근본 원인 확정 + 수정 전략 (hotfix/proper/둘 다) + 회귀 테스트 + 관찰성 강화 제안. **0.9.0부터 보고에 🔄 Retro 블록** (코드 수정은 위임 커맨드에서 commit, DEBUG-LOG 추가만 별도 제안)
  - 실제 수정은 `/cfh-plan`·`/cfh-tdd`·`/cfh-refactor`로 **위임**

**예시**:
```
/cfh-debug v2.3 배포 후 로그인 2배 느림
/cfh-debug                       # 증상부터 인터뷰
```

**/cfh-plan과 차이**:

| 항목 | `/cfh-plan` | `/cfh-debug` |
|---|---|---|
| 시작 | 목표 | 증상 |
| 성격 | goal-driven | evidence-driven |
| 결과 | 접근 플랜 + 실행 | 원인 확정 + 수정 계획 (실행은 /cfh-plan에 위임) |

**Phase 복귀 트리거**: "증거 재수집" / "context 재스캔" / "가설 재구성" / "검증 방법 변경".

**관련**: Phase 4 이후 수정 실행은 `/cfh-plan`·`/cfh-tdd`·`/cfh-refactor`로 넘김. 조사 내역은 `DEBUG-LOG.md` 또는 Issue에 기록.

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

**동작**: `cfh-harness` 메타-스킬 활성화 (0.6.0):
- Phase 0 Pre-scan
- Phase 1 Domain Interview — **기본 6 질문**(Q1~Q5 + Q6 관측성 0.6.0 신규) → Deep-dive 옵트인 게이트 (a/b/c 3지선 + CLI 플래그 bypass) → Sanity check R1~R8 (R8 신규: 관측성 공백 vs 실패 비용)
- Phase 2 7 패턴 중 1개 추천
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

**동작**: `tdd-first` 스킬 → Phase 0 Scope Narrowing 7 질문 → Phase 1 Intent Interview 6 질문 → Phase 2 테스트 아웃라인 승인 → Phase 3 실패 테스트 커밋(구현 파일 접근 금지) → Phase 4 최소 구현(hard-code 금지, 테스트 수정 금지) → Phase 5 리팩터 + 의도 보존 체크. **0.9.0부터 Phase 5 종료 보고에 🔄 Retro + 📝 제안 커밋 블록 (test→feat→refactor 3분할 우선 제안)**

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

**동작**: `refactoring-strategy` 스킬 → Step 1 Scope Narrowing 8 질문 → Step 2 Project Profile → Step 3 Blast Radius 분석 → Step 4 Safety Net(테스트 없으면 Characterization Test 강제) → Step 5 Small PR 계획(50~200줄, 5파일 이내) → Step 6~8 실행·검증·Legacy 기록. **0.9.0부터 Step 8 보고에 🔄 Retro + PR별 📝 제안 커밋 블록 (Small PR 분할이 이미 Step 5에서 결정됨)**

**5대 원칙**: 작은 PR / 행동 보존 / Blast Radius 우선 / Legacy 허용 / 라이브러리 공식 기준만.

**예시**:
```
/cfh-refactor src/legacy/patient-api
/cfh-refactor src/components/ui              # 디렉터리 전체
```

**관련**: `/cfh-review` (리팩터 전 현황 파악), `/cfh-tc` (Safety Net 준비).

---

### `/cfh-review [parent-branch]`

**언제**: PR 올리기 전 자체 점검, 또는 외부 리뷰 전 사전 정리. **0.8.0부터 코드·프로젝트·프로덕트 3축 평가**.

**인자**: `$ARGUMENTS` — 부모 브랜치 (선택) 또는 4-옵션 인터뷰. 생략 시 자동 추정: `hotfix/*` → `release`, `release/*` → `main`, 그 외 → `develop`.

**동작**: diff 규모 측정 → 적응형 서브에이전트 배치 (0.8.0):

| 규모 | 파일 수 | 서브에이전트 |
|---|---|---|
| Tiny | 1~3 | 1 (통합, Project 1줄 체크) |
| Small | 4~15 | 3 (Convention, Logic, Test) |
| Medium | 16~50 | **7** (+ Performance, Security, **Project Health**, **Product Impact**) |
| Large | 51~200 | 7 + 도메인 청크 |
| Huge | 200+ | 범위 축소 먼저 |

**Medium+에서 Step 2.5 제외 인터뷰**: 7개 중 제외할 에이전트 확인.

**Project Health (F)** 분석 영역:
- 기술 부채 방향 (any·TODO·복잡도)
- 모듈 경계 침식
- 의존성 변화 정당성
- Migration 정렬
- Dead code·Orphan

**Product Impact (G)** 분석 영역:
- 사용자 체감 변화
- 실패 UX·fallback
- 메트릭 영향
- 접근성·i18n
- 롤백 안전성 (feature flag·canary)
- 과잉 엔지니어링 체크 (80% 대안)

**출력**: 프로젝트 루트 `REVIEW.md`. Summary 표에 Project Health·Product Impact 행 추가. `❓ Questions to Resolve` 섹션 상단에 모호 의도 분리. **0.9.0부터 리뷰 종료 시 터미널 보고에 🔄 Retro 블록 (REVIEW.md 자체 commit은 기본 no-commit — 로컬 참고용)**

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

**관련**: `cfh log` (CLI 직접 기록), `cfh evolve` (분석·제안), `/cfh-retro` (작업 한 건의 회고).

---

### `/cfh-retro [본문]` *(0.9.0)*

**언제**: `/cfh-plan`·`/cfh-tdd`·`/cfh-refactor`·`/cfh-debug`·`/cfh-review` 종료 보고에 출력된 **🔄 Retro 블록**(효과 있었음 / 실패·삽질 / 다음엔 바꿀 것)을 영구 파일로 보존하고 싶을 때.

**인자**: `$ARGUMENTS` — 회고 본문 (선택). 비어있으면 직전 turn의 Retro 블록을 자동 추출.

**동작**: 4 Phase
- **Phase 0 자가 판정** (Stop 훅 호출 시) — 직전 turn에 Retro 블록이 출력됐는지 확인, 아니면 silent 종료
- **Phase 1 컨텍스트 수집** — `$ARGUMENTS` → 직전 Retro 블록 → 사용자 질문 순으로 시도
- **Phase 2 옵트인 확인** — `cfh log --enable` 활성 시에만 영구 기록
- **Phase 3 저장** — `~/.claude/.cfh-logs/retros/<YYYYMMDD-HHMM>-<slug>.md`

**파일 형식**:
```markdown
---
date: 2026-04-29T15:38
command: /cfh-plan
goal: <Q1 목표>
files: [...]
---

## 효과 있었음
- ...

## 실패·삽질
- ...

## 다음엔 바꿀 것
- ...
```

**자동 트리거 (Stop 훅)**: `~/.claude/settings.json`의 Stop 훅에 `cfh-retro-hook.sh` 등록 시, Retro 블록 출력된 turn에서만 자동 호출. 가벼운 대화엔 silent.

**`/cfh-feedback`과 차이**:

| | `/cfh-feedback` | `/cfh-retro` |
|---|---|---|
| 대상 | 스킬 자체에 대한 의견 | 작업 한 건의 회고 |
| 저장 | `~/.claude/.cfh-logs/<skill>.jsonl` | `~/.claude/.cfh-logs/retros/<file>.md` |
| 활용 | `cfh evolve`가 description·트리거 개선 | 후속 세션에서 "이전 회고 보여줘" |

**예시**:
```
/cfh-retro                                  # 직전 Retro 블록 자동 추출
/cfh-retro "효과: scoped scan; 실패: ..."   # 본문 직접 전달
```

**관련**: `/cfh-feedback` (스킬 의견), `commands/references/retro-and-commit.md` (블록 형식 정의).

---

### `/cfh-progress [init|append|show]` *(0.10.0)*

**언제**: 프로젝트 한 개의 **결정 로그·미해결 질문·다음 단계**를 `./PROGRESS.md`에 누적해 다음 세션·다른 사람·다른 기계에서 이어받을 때.

**인자**: `$ARGUMENTS` — 모드(선택).
- `init` — 새 PROGRESS.md 생성 (이미 존재하면 거절)
- `append` (기본) — 직전 turn에서 결정·다음 단계 추출 후 prepend
- `show` — 본문 + 진척률 한 줄 출력

**전제**: PROGRESS.md는 자동 생성 안 함. 사용자가 `init` 명시 호출 후에만 동작.

**동작 (append 모드)**:
1. 직전 assistant turn에서 결정·다음 단계·미해결 질문 추출
2. 사용자에게 추출 결과 1차 확인 (yes/adjust)
3. PROGRESS.md prepend, frontmatter `last_updated`·`sessions++` 갱신
4. git commit은 자동으로 하지 않음 — 사용자에게 권유만

**Stop 훅 옵트인**: `cfh-progress-hook.sh` 등록 시 다음 모두 충족할 때만 자동 발동:
1. `./PROGRESS.md` 존재
2. 텔레메트리 옵트인
3. 직전 turn에 Retro 블록 또는 `결정` 섹션

**`/cfh-retro`·`/cfh-feedback`과의 책임 분리**:

| 도구 | 대상 | 위치 |
|---|---|---|
| `/cfh-feedback` | 스킬 자체 의견 | `~/.claude/.cfh-logs/<skill>.jsonl` |
| `/cfh-retro` | 작업 한 건의 회고 | `~/.claude/.cfh-logs/retros/` |
| `/cfh-progress` | 프로젝트 한 개의 결정·다음 | `./PROGRESS.md` (git-tracked) |

**예시**:
```
/cfh-progress init                # 새 PROGRESS.md 생성
/cfh-progress                     # 직전 turn → append
/cfh-progress show                # 본문 + 진척률
```

**관련**: `/cfh-retro` (작업 회고), `commands/references/progress-template.md` (형식 정의).

#### PROGRESS.md 4 섹션 — 각각의 역할

```markdown
## 다음 단계 (Next Up)        ← 다음 세션 시작 시 가장 먼저 읽힐 위치
- [ ] 미완료 작업 체크박스

## 미해결 질문 (Open Questions) ← 누구·언제 해결 필요한지
- ❓ 결제팀 확인 필요 — 쿠폰 캐시 TTL

## 결정 로그 (Decision Log)    ← 미래 audit trail
### 2026-05-07 14:32 — 토픽
**결정**: ...
**이유**: ...
**대안**: 기각된 옵션 + 기각 이유
**참조**: commit hash·PR

## 세션 로그 (Session Log)     ← 1세션 = 1~3줄
### 2026-05-07 14:32 (session 26246d5f)
한 줄 요약. 자세한 회고는 retros/에.
```

#### append 모드의 자동 추출 흐름

직전 assistant turn에서 다음 신호를 감지:

| 신호 | 추출되는 항목 |
|---|---|
| `📝 제안 커밋`·`결정`·`Decision` | 결정 로그 |
| `다음 단계:`·`Next:`·미완료 task list | 다음 단계 |
| `❓ Questions to Resolve`·`확인 필요` | 미해결 질문 |
| transcript 파일명 첫 8자 | 세션 ID |

추출 결과를 사용자에게 1차 확인 → yes 후에만 PROGRESS.md prepend.

#### 한계

- **추출은 정규식·키워드 매칭**: 무형식 자유 서술은 자동 추출 못 함. 수동 입력 가능.
- **요약 품질은 직전 turn의 Retro 블록에 의존**: Retro가 충실해야 의미 있는 항목.
- **append-only 보존**: 잘못된 항목도 새 정정 항목으로 덮어 표시. 역사 보존 우선.

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
  cfh-harness        3회 (success 3)
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

### Cost telemetry (0.10.0)

#### `cfh cost`

**역할**: Claude Code transcript(`~/.claude/projects/`)에서 토큰 사용량을 집계. **새 텔레메트리 수집 안 함** — 기존 transcript를 읽기만 하므로 별도 옵트인 불필요.

**플래그**:
- `--by command|day|model|session` — 집계 축 (기본 command)
- `--days <N>` — 최근 N일만
- `--match <substr>` — 프로젝트 디렉터리명 부분 매칭 (대소문자 무시)
- `--session <id-prefix>` — 단일 세션
- `--target <path>` — `~/.claude` 대신 다른 경로
- `--json` — JSON으로 출력 (스크립팅 용)

**집계 단위**: 토큰 (input·output·cache_creation·cache_read 분리). 모델·테넌트마다 가격이 달라 단가 환산은 하지 않음.

**슬래시 커맨드 attribution**: 가장 최근 user 메시지에 등장한 `/cfh-*` 패턴을 그 이후 assistant turn에 귀속. 새 슬래시 커맨드가 나올 때까지 유지.

**예시**:
```bash
cfh cost                              # 전체
cfh cost --by command --days 7       # 최근 7일, 명령별
cfh cost --by day --match my-proj    # 일자별, 특정 프로젝트
cfh cost --by session                # 최근 20개 세션
cfh cost --by model                  # 모델별
cfh cost --json > usage.json         # JSON dump
```

**출력 예**:
```
📊 Cost telemetry — 4 sessions (last 7d, project~"my-proj")

  Total input (incl. cache):  216,156,523
    cache read:               211,886,098
    cache creation:           4,254,215
    fresh input:              16,210
  Total output:               734,061

By slash command:

command      input+cache  output   turns  sessions
-----------  -----------  -------  -----  --------
/cfh-plan    119,532,002  321,024  326    1
/cfh-review  27,108,122   207,886  202    1
```

**관련**: `cfh doctor --usage` (스킬 사용 빈도, `cfh log` 데이터 기반), `cfh log` (옵트인 텔레메트리).

#### 4가지 view의 의미

| `--by` | 답하는 질문 | 식별되는 것 |
|---|---|---|
| `command` (기본) | "토큰 예산을 가장 많이 쓰는 슬래시 커맨드는?" | 비용 효율 낮은 커맨드 |
| `day` | "최근 추세는? 특정 일에 spike?" | 작업 패턴, 회귀 시점 |
| `model` | "Opus vs Sonnet vs Haiku 비율은?" | 모델 다운그레이드 판단 |
| `session` | "어느 세션이 비용 폭주였나?" | 진단 시작점 |

#### 동작 원리

1. `~/.claude/projects/<슬러그>/<id>.jsonl` 발견 (`--match`로 슬러그 부분 매칭, 대소문자 무시)
2. 각 jsonl의 assistant turn에서 `.message.usage` 4개 필드 누적: `input_tokens` · `cache_creation_input_tokens` · `cache_read_input_tokens` · `output_tokens`
3. `<synthetic>` 모델 turn(시스템 메타)은 제외 — LLM 호출이 아님
4. user turn의 `/cfh-*` 패턴 → 그 이후 assistant turn에 귀속 (휴리스틱, 새 슬래시 등장 시 갱신)

#### 한계

- **Attribution은 휴리스틱**: 한 세션에 여러 커맨드 섞으면 경계 흐림. 정확한 커맨드별 분석은 한 세션 = 한 커맨드일 때 최선.
- **가격 환산 없음**: 토큰만. 단가는 외부 가격표.
- **사용자 자기 데이터 read-only**: 외부 전송 0, 옵트인 게이트 불필요.

---

### Skill eval (0.10.0)

#### `cfh eval [skill]`

**역할**: 스킬이 의도대로 트리거되고 행동하는지 **케이스 단위로 검증**. `cfh evolve`가 description 정적 분석에 머무는 한계를 보완 — 실제 실행 결과 기반 측정.

**eval 케이스**: `~/.claude/skills/<skill>/evals/*.json`에 저장. 각 파일은 단일 케이스 또는 배열.

```json
{
  "name": "fe-tdd-trigger-on-test-first",
  "prompt": "TDD로 src/components/CouponInput.tsx 만들어줘",
  "skill_should_trigger": "tdd-first",
  "assertions": [
    { "type": "contains", "value": "Phase" },
    { "type": "regex", "value": "Intent\\s+Interview|의도|목표" },
    { "type": "not_contains", "value": "TypeError" }
  ],
  "tags": ["happy-path", "fe"],
  "notes": "왜 이 케이스가 중요한지 (선택)"
}
```

**Assertion 타입**: `contains` / `not_contains` / `regex`. 모두 통과해야 케이스 pass.

**실행 모드**:

| 플래그 | 모드 | LLM 호출 |
|---|---|---|
| `--list` | 케이스 목록·검증만 | 없음 |
| `--dry-run` (기본) | 프롬프트·assertion 출력 | 없음 |
| `--manual` | 사용자가 paste | 사용자 책임 |
| `--executor claude` | claude CLI subprocess | 자동 (토큰 소비) |

**기본은 `--dry-run`** — 우발적 토큰 소비 방지. 실제 실행은 `--executor claude` 또는 `--manual` 명시.

**예시**:
```bash
cfh eval --list                       # 모든 스킬의 케이스 목록
cfh eval tdd-first --list             # 특정 스킬
cfh eval tdd-first --dry-run          # 프롬프트만 출력
cfh eval tdd-first --manual           # paste 모드
cfh eval tdd-first --executor claude  # 실제 실행 (토큰 소비)
cfh eval --json                       # 스크립팅용
```

**종료 코드**: fail/error 있으면 exit 1 (CI 통합 용).

**관련**: `cfh cost` (eval 실행 비용 사후 확인), `cfh evolve` (정적 + eval 구조 분석), `cfh trace` (트리거 시뮬레이션 — eval보다 가벼움).

#### `cfh evolve`의 eval 인식 (0.10.0 신규)

`cfh evolve <skill>`는 0.10.0부터 evals/ 디렉터리도 함께 분석:

| 검출 | 제안 |
|---|---|
| evals/ 부재 | "케이스 추가 권장 — 1 happy-path + 1 anti-trigger 최소" |
| anti-trigger 케이스 0개 | "description drift 회귀 못 잡음 — anti-trigger 추가 권장" |
| assertion 타입 단일 (예: contains만) | "regex·not_contains 추가하면 false negative 패턴 잡힘" |
| skill_should_trigger가 자기 자신 아님 | "자기 발동 검증 케이스 추가 권장" |
| eval 파일 파싱 실패 | warn — 즉시 fix |

이전 evolve가 description의 정적 분석만 한 한계를 보완. 측정 인프라 정착의 시작.

#### `cfh trace` vs `cfh eval` — 차이 정리

자주 혼동되는 부분:

| 도구 | 측정 | LLM 호출 |
|---|---|---|
| `cfh trace "<발화>"` | description 키워드 점수로 **어느 스킬이 트리거 후보**인지 정적 판단 | 없음 |
| `cfh eval --dry-run` | 케이스 형식 + 프롬프트·assertion 미리보기 | 없음 |
| `cfh eval --executor claude` | 실제 응답이 **기대 패턴 매칭하는가** (트리거 + 행동) | 케이스당 1회 |
| `cfh eval --baseline` | 스킬 활성 vs 비활성 **A/B 순효과** | 케이스당 2회 |

`trace`는 빠르고 싸고, `eval`은 깊지만 토큰 소비. 양쪽 모두 필요.

#### 동봉된 reference 케이스 (4개)

패키지에 자기 스킬용 evals 작성 시 참고할 수 있는 4개 케이스:

| 파일 | 케이스 | 검증 의도 |
|---|---|---|
| `tdd-first/evals/happy-path.json` | `fe-tdd-trigger-on-test-first` | "TDD로 .tsx" → tdd-first 활성 + Phase 1 Intent Interview |
| 〃 | `fe-tdd-with-jsx-context` | "useAuth 훅 TDD" → Phase 0 Scope Narrowing |
| `tdd-first/evals/anti-trigger.json` | `no-trigger-on-backend-tdd` | "FastAPI TDD" → tdd-first가 떠선 안 됨, RTL/userEvent 등장 시 fail |
| `skill-author/evals/happy-path.json` | `skill-author-explicit-create` | "스킬 만들고 싶어요" → skill-author 직진, asset-factory 우회 |
| 〃 | `skill-author-on-existing-edit` | "기존 description 다듬어줘" → 편집 모드, Phase 1 인터뷰 skip |

특히 `anti-trigger.json`은 **인접 스킬 description drift 회귀** 탐지용 — tdd-first description을 수정한 PR에서 이 케이스가 깨지면 트리거 영역이 백엔드까지 잘못 확장됐다는 신호.

#### 한계 — assertion은 의미 검증이 아님

`contains`/`not_contains`/`regex`는 **단순 문자열·패턴 매칭**입니다:

- "Phase 1 Intent Interview" 문자열만 있으면 통과 → Q1 내용이 의도대로인지는 **사람 확인** 필요.
- 스킬이 잘못된 내용을 자신 있게 말해도 형식 키워드만 맞으면 pass.
- 깊은 의미 정합성은 LLM-judge 패턴 필요 (향후).

따라서 evals의 역할은 **회귀 탐지의 1차 그물망**: description 수정 후 트리거 누락·인접 스킬 충돌 회귀를 빠르게 잡는 것. 깊은 행동 정합성은 사람 리뷰 + `~/.claude/.cfh-logs/retros/`로 보완.

#### A/B baseline mode (`--baseline`)

`cfh eval --baseline`은 같은 케이스를 **두 번** 실행해 스킬의 순효과를 측정:

- **Treatment**: 그대로 (스킬 활성)
- **Baseline**: 프롬프트 앞에 "Do NOT invoke skill <name>. Use general knowledge only." 부착 (soft anti-trigger)

각 케이스마다 diff:
- `+1` skill helped (treatment pass + baseline fail)
- `-1` skill regressed (treatment fail + baseline pass)
- `0` no diff (둘 다 같은 결과)

```bash
cfh eval tdd-first --baseline --executor claude
# → A/B 표 + 누적 헬프/리그레션 카운트 + 비용 추정 (output chars · duration)
```

**한계 (반드시 알 것)**:
- Soft baseline은 *instruction-following*에 의존 — Claude가 명령을 무시하면 false negative.
- Hard baseline (skill 디렉터리 임시 isolate)은 향후 작업.
- 통계적 유의성은 케이스 수에 따라 다름. **N=3은 신호일 뿐** — 회귀 게이트로 쓰지 말 것.

**종료 코드**: regressed > 0이면 exit 1 (CI에서 회귀 차단 가능).

---

### Tool failure sensor (0.10.0)

#### `cfh sentry`

**역할**: Claude Code transcript에서 **tool 호출 실패·loop·empty Read 패턴**을 감지. Production agent의 가장 흔한 신뢰 누수가 "조용히 망가진 tool 호출"이라는 NeuralWired 분석을 반영. 새 텔레메트리 수집 없이 기존 transcript read-only.

**플래그**:
- `--days <N>` — 최근 N일만
- `--match <substr>` — 프로젝트 슬러그 부분 매칭
- `--tool <name>` — 특정 tool만 (`Read`/`Edit`/`Bash` 등)
- `--session <id-prefix>` — 단일 세션
- `--target <path>` — `~/.claude` override
- `--json` — JSON 출력

**3가지 검출 패턴**:

| 패턴 | 의미 | 예 |
|---|---|---|
| Tool errors | `tool_result.is_error: true` | "File has not been read yet" |
| Repeated identical | 같은 tool에 같은 input 연속 호출 | Edit `/x` 같은 old/new 3번 |
| Empty Read | Read의 결과가 ≤2 chars | 빈 파일·잘못된 경로 |

**Loop detection 휴리스틱**: 같은 tool에 input top-level 키 + 문자열 200자 이내 매칭으로 "거의 같은 호출"을 감지. 의도된 retry vs 실패 loop의 구분은 사람 판단.

**예시**:
```bash
cfh sentry                              # 전체
cfh sentry --days 7 --tool Edit         # 최근 7일, Edit만
cfh sentry --match my-project --json    # 스크립팅
```

**출력 예** (이 프로젝트 실데이터):
```
🚨 Tool failure sensor — 4 sessions (last 30d, project~"claude-fe-harness")

  Total tool calls:    1,492
  Errors:              24 (1.6%)
  Repeated identical:  4

Per tool (sorted by errors):

tool   calls  errors  err%
-----  -----  ------  -----
Edit   489    17      3.5%
Bash   210    5       2.4%
Read   181    1       0.6%
```

3.5%가 Edit 실패 — 대부분 "File has not been read yet" → Read→Edit 순서 강제하는 워크플로 개선 신호.

**한계**:
- Loop 신호는 **false positive 가능** — 의도된 polling도 잡힘.
- Empty Read 임계값 임의 (≤2 chars) — 정확한 빈 파일 vs 거의 빈 파일 구분 부정확.
- **자동 차단 안 함** — 보고만, 자동 fix·retry 없음.

**관련**: `cfh cost` (토큰 비용), `cfh doctor` (정적 진단).

---

### Confidence Tagging (0.10.0)

스킬 출력에 근거 확실성을 명시 표기하는 권장 컨벤션. 강제 아님.

#### 마커 (3 단계)

| 마커 | 의미 |
|---|---|
| `[verified]` | 직접 확인한 사실 |
| `[inferred]` | 합리적 추론 |
| `[guessed]` | 근거 약한 추측 — 사용자 검증 권장 |

#### 적용 위치

- **권장**: 스캔·분석 결과, 추천 근거, `/cfh-plan`의 Project Alignment·Product Impact 자동 추론, `/cfh-review`의 Critical/High 지적
- **비권장**: 사용자 질문, 작업 완료 보고, 에러 메시지

#### `cfh doctor --strict-confidence`

옵트인 체크. 각 스킬 SKILL.md에 confidence tagging 가이드 또는 마커 사용이 있는지 검사 후 info 수준 경고. 누락은 fail이 아님.

```bash
cfh doctor --strict-confidence
# ℹ target/skills/asset-factory: no confidence tagging guide ([verified]/[inferred]/[guessed])
```

#### 한계

- LLM이 마커를 일관되게 붙이리란 보장 없음 — 컨벤션일 뿐.
- 마커 정확도는 LLM의 자기 인식에 의존.
- 목적은 완벽한 정확성이 아니라 **사용자에게 압박 지점 신호 제공**.

상세: `commands/references/confidence-tagging.md`.

---

### Dashboard (0.11.0)

#### `cfh dashboard`

**역할**: cost·sentry·eval coverage·eval history를 **markdown 통합 리포트**로 출력. 0.10.0이 만든 도구들이 흩어져 있던 문제 해결 — 한 화면에 다 보임.

**플래그**:
- `--days <N>` — 분석 기간 (기본 30)
- `--match <substr>` — 프로젝트 슬러그 부분 매칭
- `--target <path>` — `~/.claude` override
- `--output <file>` — 파일 저장 (없으면 stdout)

**리포트 섹션**:

| 섹션 | 내용 |
|---|---|
| Overview | 스킬 수·evals 커버리지·텔레메트리 상태 |
| Cost | 총 토큰·캐시 적중률·top 10 명령별 cost |
| Tool failure sensor | 호출/에러/empty/repeat·top 실패 tool |
| Eval coverage | 스킬별 케이스 수·마지막 실행 시각 |
| Eval trend | 스킬별 최근 5회 결과 (영속화 활성 시) |

**예시**:
```bash
cfh dashboard                                # stdout, 30일
cfh dashboard --days 7 --match my-proj       # 최근 7일, 특정 프로젝트
cfh dashboard --output dashboard.md          # 파일 저장
```

**한계**: 단순 markdown — 인터랙티브 chart 없음. cost·sentry 둘 다 transcript read-only이므로 별도 텔레메트리 옵트인 불필요.

---

### Skill eval --variants (0.11.0)

#### `cfh eval <skill> --variants <file>`

**역할**: 스킬 description의 **A/B/C 후보를 비교**하여 어느 변형이 트리거 영역을 가장 잘 잡는지 측정. **LLM 호출 없음** — `cfh trace`의 키워드 매칭 점수 기반.

**입력 (variants.json)**:
```json
[
  { "name": "current",  "description": "Use this skill when ...react/vue... Do NOT trigger backend." },
  { "name": "broader",  "description": "Use this skill for any TDD work — frontend or backend." },
  { "name": "stricter", "description": "Only React/Vue. Do NOT trigger fastapi, django, express." }
]
```

**동작**:
1. 스킬의 evals/ 모든 케이스 prompt 추출
2. 각 케이스 prompt를 각 variant description에 대해 trace 점수 계산
3. 케이스별 winner 표시 + 변형별 누적 점수 + 추천

**예시 출력**:
```
📊 Description variants comparison — tdd-first
  Cases: 3 · Variants: 3

Aggregate scores:
variant   total  wins  description
--------  -----  ----  ----------------------
current   4.0    3/3   ... React/Vue ...
broader   2.0    2/3   ... any framework ...
stricter  -0.5   1/3   ... ONLY React/Vue ...

Per case:
  no-trigger-on-backend-tdd
    ★ current   score=0.5
    ★ broader   score=0.5
      stricter  score=-2.5  −[fastapi]    ← anti-trigger 페널티

Recommendation:
  ✅ "current" wins by 2.0 points (100% over runner-up)
```

**한계**:
- **키워드 매칭만** — 의미 평가는 안 함. 진짜 행동 비교는 SKILL.md 임시 swap 후 `--executor claude` 따로 돌려야 함.
- **케이스 의존**: eval 케이스가 적거나 키워드 빈약하면 신호도 약함.
- **자동 적용 안 함**: 추천만 — SKILL.md 수정은 사람 판단.

---

### Skill eval --report junit (0.11.0)

#### `cfh eval --report junit [--output FILE]`

**역할**: JUnit XML 출력. GitHub Actions·GitLab CI·Jenkins가 표준 인식하는 포맷.

**예시**:
```bash
cfh eval --executor claude --report junit --output junit.xml
# CI에서 actions/upload-artifact + dorny/test-reporter로 PR에 표시
```

**XML 구조**:
- `<testsuites>` = 모든 스킬
- `<testsuite name="<skill>">` = 한 스킬
- `<testcase name="<case>">` = 한 케이스
- pass: 빈 testcase / fail: `<failure>` / error: `<error>` / skip: `<skipped>`
- A/B 모드: treatment 결과를 primary로, baseline diff을 `<system-out>`에

**종료 코드**: fail/error/regressed 있으면 exit 1 — CI 회귀 게이트로 직접 사용.

---

### Eval 결과 영속화 (0.11.0)

`--executor claude` 또는 `--manual` 모드 실행 후, 텔레메트리 옵트인(`cfh log --enable`) 상태면 결과를 자동 저장:

```
~/.claude/.cfh-logs/eval-history/<skill>/<timestamp>.json
```

**파일 형식**:
```json
{
  "timestamp": "2026-05-07T14:32:00Z",
  "skill": "tdd-first",
  "mode": "claude (subprocess) + baseline (A/B)",
  "isAB": true,
  "summary": {
    "treatmentPass": 2,
    "baselinePass": 1,
    "helped": 1,
    "regressed": 0,
    "total": 3
  },
  "results": [...]
}
```

**활용**:
- `cfh dashboard`의 "Eval trend" 섹션이 이 파일들을 읽어 시계열 표시
- 향후 `cfh evolve`가 trend 분석 (예: "3주 전엔 통과했는데 지금 fail" 신호)

**저장 안 하는 경우**:
- `--dry-run` (실제 실행 아님)
- `--list` (조회만)
- 텔레메트리 비활성화

**output 크기**: 케이스당 출력 본문은 저장 안 함 — 메타데이터·assertion 결과만. 한 실행 ≈ 5~20KB.

---

### Cost regression analysis (0.12.0)

#### `cfh cost --since-commit <hash>`

**역할**: 특정 git commit **이후 vs 이전**의 토큰 사용을 비교해 회귀를 진단.

**동작**:
1. `git show -s --format=%cI <hash>`로 commit timestamp 추출
2. 모든 세션 jsonl을 mtime 기준으로 before/after 분리
3. 그룹별 토큰 합 + 명령별 변화량 계산
4. ±20% 이상이면 회귀/개선으로 판정

**예시**:
```bash
cfh cost --since-commit cc1350d --match my-project
```

**출력**:
```
📈 Cost since-commit comparison
  Commit:    cc1350d
  Timestamp: 2026-04-29T04:38:10Z

  Sessions:  3 (before) → 1 (after)

  Input+cache:  556M → 360M    (-195M, -35.2%)
  Output:       1.7M → 1.2M    (-523K, -29.9%)

Top changes by command (input+cache):
command      before       after        delta         turns
-----------  -----------  -----------  ------------  -------
/cfh-plan    448,930,183  119,532,002  -329,398,181  702→326
/cfh-review  0            171,383,351  +171,383,351  0→621

✅ 의미 있는 토큰 감소 (-35.2%) — 효율 개선 확인.
```

**한계**:
- session mtime 기반 — 세션이 commit 시점에 *시작*한 게 아니라 *마지막 활동*이 commit 이후면 after로 분류
- commit timestamp는 author time이 아니라 commit time (`%cI`)
- noise 큼 — N=4 세션 비교는 신호 약함, 의미 있는 변화 보려면 같은 작업의 같은 패턴 반복 필요

---

### Skills-vs-evals staleness (0.12.0)

#### `cfh diff --skills-vs-evals`

**역할**: SKILL.md mtime이 evals/ mtime보다 새로우면 → eval이 description 변경을 따라가지 못한 stale 상태.

**예시**:
```bash
cfh diff --skills-vs-evals
```

**출력**:
```
🕒 Skills vs evals staleness check
  Source: ~/.claude/skills

  Fresh:    2 skills (evals updated after SKILL.md)
  Stale:    1 skills (SKILL.md updated after evals — review evals)
  No evals: 5 skills

  ⚠ Stale skills:
    • tdd-first   SKILL.md 2.1d newer than happy-path.json (3 cases)

  ℹ No evals/ directory:
    • asset-factory
    • debug-investigator
    ...
```

**한계**:
- mtime은 fragile — git pull로 바뀔 수 있음
- 의미 있는 변경 vs 사소한 typo 구분 못 함 (단순 timestamp 비교)
- staleness ≠ broken — 신호이지 결론 아님

---

### Skill fork (0.12.0)

#### `cfh new skill <name> --from-existing <other>`

**역할**: 기존 스킬 **전체 디렉터리 복사** + frontmatter `name` 변경 + description에 TODO 마커.

**예시**:
```bash
cfh new skill our-tdd --from-existing tdd-first
# → ~/.claude/skills/our-tdd/ 생성
# → SKILL.md frontmatter:
#     name: our-tdd
#     description: TODO update for our-tdd — was: ...
```

**적용 시점**:
- 우리 팀만의 TDD 스타일 (e.g., 특정 lint·도메인 컨벤션 추가)
- 기존 스킬 변형 실험 (`--from-existing`로 빠르게 시작 후 description 다듬기)

**구현 디테일**:
- evals/, references/ 등 하위 디렉터리 모두 복사
- `.cfh-manifest.json` 자동 제거 → 새 스킬은 user-authored로 분류 → `cfh update`가 절대 덮어쓰지 않음
- `--force`로 기존 덮어쓰기 가능

**한계**:
- 현재 `kind: skill`만 지원. command/agent는 후속 작업.
- description 자동 변경은 단순 prefix만 — 의미 있는 변형은 사람이 수정 필요

---

### Watch mode (0.12.0)

#### `cfh watch [--doctor]`

**역할**: skills/·commands/ 디렉터리 변경 감지 → validate(+doctor) 자동 재실행. 스킬 작성 중 즉시 피드백.

**예시**:
```bash
cfh watch                  # 변경 시 validate
cfh watch --doctor         # validate + doctor (느림, 더 철저)
cfh watch --target ./.test-target
```

**동작**:
1. `~/.claude/skills`, `~/.claude/commands`, `./.claude/skills`, `./.claude/commands` (있으면) 모두 감시
2. fs.watch + 500ms debounce — 빠른 연속 변경은 한 번으로 묶음
3. 시작 시 한 번 실행, 이후 변경 시마다
4. Ctrl+C로 종료

**제외 파일**:
- `.cfh-manifest.json` (피드백 루프 방지)
- `.cfh-logs/` (로그 변경에 트리거 안 함)

**한계**:
- fs.watch는 OS별 동작 차이 — Windows 일부 케이스에서 누락 가능
- recursive 옵션이 모든 OS에서 동작하진 않음 (macOS/Windows OK, Linux는 chokidar 같은 라이브러리 권장)

---

### Strict schema lint (0.12.0)

#### `cfh validate --strict`

**역할**: SKILL.md frontmatter를 **schema 기반**으로 더 엄격히 검증.

**기본 schema**:
- `name`: kebab-case, 1~63자, dir 이름과 일치
- `description`: 20~1024자
- `allowed_tools`: string 또는 array
- `license`, `version`, `deps`: optional

**`--strict`만의 추가 체크**:
- 알 수 없는 frontmatter 필드 경고 (forward-compat 유지하되 인지 신호)
- 향후: 형식 위반 더 엄격 적용

**예시**:
```bash
cfh validate                # 기본 검증
cfh validate --strict       # schema + 알 수 없는 필드 경고
```

**왜 옵트인인가**: 기존 사용자 SKILL.md에 임의 필드(custom metadata) 들어있을 수 있음. 강제 적용 시 false positive 위험. CI에서 정책으로 활성화 권장.

---

### Semantic eval — LLM-judge (0.13.0)

#### `cfh eval --enable-judge`

**역할**: assertion이 단순 string 매칭으로는 잡을 수 없는 **의미 검증**을 LLM judge에 위임. "응답이 의도대로인가"를 yes/no로 판정.

**기본은 옵트인** — `--enable-judge` 없으면 judge assertion이 있어도 LLM 호출 안 하고 fail로 표시 + 사용자에게 안내. 실수로 토큰 소비 방지.

**Judge assertion 형식**:
```json
{
  "type": "judge",
  "criterion": "응답이 사용자에게 의도 질문을 먼저 하고, 코드부터 작성하지 않는가",
  "model": "claude-haiku-4-5"
}
```

- `criterion` (필수): 판정 기준 문장. 500자 이내. 가능한 한 yes/no로 답할 수 있게 구체적으로.
- `model` (선택): 판정에 쓸 LLM. 기본 `claude-haiku-4-5` (싸고 빠름).

**Judge prompt 표준 형식** (라이브러리 내장):
```
You are evaluating whether an AI response satisfies a specific criterion.

Response to evaluate:
"""
<output>
"""

Criterion: <criterion>

Did the response satisfy the criterion? Reply on a single line:
  YES: <one-line reason>
  NO: <one-line reason>

Be strict — only YES if the response clearly meets the criterion.
```

응답 파싱 — `^YES`로 시작 → pass, `^NO` → fail, 그 외 → "judge verdict unparseable" error.

#### 비용 추정 + 옵트인 흐름

`--enable-judge` 사용 시:

```bash
cfh eval tdd-first --executor claude --enable-judge
```

```
💡 Judge assertions enabled — 2 assertion(s) across 4 case(s).
   Estimated extra LLM calls: 2 (single mode)
   Rough cost: ~1,000 tokens (Haiku-class).
   Verify after via: cfh cost --days 1
```

A/B baseline과 결합:
```bash
cfh eval tdd-first --executor claude --baseline --enable-judge
# A/B doubles judge calls — 2 assertions × 2 (treatment + baseline) = 4 LLM calls
```

#### 4가지 도구의 위계 — 어디에 어떤 assertion?

| 신호 | 적합 assertion |
|---|---|
| 특정 키워드·구문 등장 | `contains` |
| 특정 키워드 *없음* (anti-pattern) | `not_contains` |
| 패턴 매칭 (가변 형식) | `regex` |
| **의미·태도·구조 적합성** | `judge` (LLM 필요) |

**Cascade**: 가능한 한 contains/regex로 잡고, 진짜 의미 검증 필요한 부분만 judge — 비용 최소화.

#### 한계 — 정직한 한 줄

- **Judge 자체가 LLM**: 판정도 비결정적. 같은 입력에도 약간 다른 verdict 가능.
- **Haiku가 항상 정확하지 않음**: 미묘한 criterion은 Sonnet/Opus가 필요할 수도. `--judge-model` 또는 케이스별 `model` 필드로 override.
- **토큰 비용**: assertion당 ~500 토큰. 케이스 10개에 judge 3개씩 + A/B → 60회 LLM 호출. 일상 CI에선 부담 큼.
- **Verdict 파싱 실패**: judge가 "Yes, definitely" 같이 답하면 정규식이 못 잡음. 표준 형식 강제하지만 100% 보장 안 됨.
- **자동 차단 안 함**: judge가 fail해도 단순 보고. 사용자가 결과 보고 SKILL.md 수정 결정.

#### 권장 사용 패턴

1. **개발 중**: `--dry-run` 또는 `--executor claude` (judge 없이) — 빠르게 회귀 확인
2. **PR 직전 1회**: `--enable-judge --baseline` — 의미·트리거 정합성 종합 검증
3. **주간 점검**: dashboard + judge eval-history trend — 의미 정합성 시계열 추적

---

### Sentinel mode — 실시간 안전망 (0.14.0)

#### 후행 분석 → 실시간 모니터링

0.10.0의 `cfh sentry`는 transcript **후행 분석**이었습니다. 0.14.0은 같은 신호를 **실시간**으로 잡음 — PostToolUse 훅으로 매 tool 호출 직후 상태를 누적, threshold 넘으면 즉시 stderr 경고.

#### 설치

```bash
cfh sentry --install-hook
# ✓ Copied hook script: ~/.claude/scripts/cfh-sentry-hook.js
#
# Next: add to your ~/.claude/settings.json under "hooks.PostToolUse":
#   { "PostToolUse": [{ "hooks": [{ "type": "command", "command": "node ~/..." }] }] }
```

**자동 settings.json 편집은 안 함** — 사용자 기존 hooks 손상 위험. snippet 보여주고 사용자가 직접 추가.

#### 감지 패턴 (3종, threshold)

| 패턴 | 임계 | 의미 |
|---|---|---|
| 연속 tool 에러 | 3회 | 다음 호출 전 점검 필요 |
| 동일 input 반복 | 3회 | loop 가능성 (의도된 retry vs 실패의 구분은 사람) |
| 연속 빈 Read | 2회 | 잘못된 경로 가능성 (literal 0자만 empty로 판정 — false positive 회피) |

threshold 넘으면 stderr에 한 줄 경고:
```
🚨 cfh sentry: 3회 연속 tool 에러 — 다음 호출 전에 점검 필요 | Edit 동일 input 3회 반복 — loop 가능성
```

#### 상태 조회 — `cfh sentry --live`

```bash
cfh sentry --live
```

```
🚨 cfh sentry --live (PostToolUse hook state)

  Recent tool calls tracked:    47
  Consecutive errors:           0
  Same-input repeats (current): 1
  Empty Reads (consecutive):    0

  Last call: Edit  ✓ ok  @ 03:14:22

  Recent breaches (last 3):
    2026-05-07 02:51:08  Edit
      ↳ 3회 연속 tool 에러 — 다음 호출 전에 점검 필요
    2026-05-07 02:33:14  Bash
      ↳ Bash 동일 input 3회 반복 — loop 가능성
```

#### 상태 파일

`~/.claude/.cfh-logs/sentry-state.json` — 훅이 매 호출 갱신. 최근 100회 + 마지막 20개 breach 보관.

#### 후행 sentry vs 실시간 sentry — 언제 어느 쪽?

| 도구 | 분석 시점 | 비용 | 용도 |
|---|---|---|---|
| `cfh sentry` (0.10.0) | 후행 (transcript jsonl 읽음) | 0 | 회고·트렌드 |
| `cfh sentry --live` (0.14.0) | 실시간 (state file 스냅샷) | 0 | 진행 중 상태 |
| PostToolUse 훅 (0.14.0) | 매 호출 직후 | 거의 0 | 즉시 경고 |

**같이 쓰는 게 자연스러움**: 훅이 실시간 경고 + 매일 cfh sentry로 전체 트렌드 + cfh sentry --live로 현재 상태.

#### 한계

- **훅이 fail해도 사용자는 모름**: `process.exit(0)` 강제 → tool 호출 절대 안 막음. 단점: 훅 자체 버그가 silent.
- **fakeHome/임시 경로 환경 미지원**: 기본 `~/.claude/`. 다른 위치에 두려면 `CFH_SENTRY_STATE_FILE` env 사용.
- **threshold는 hardcoded**: 3회·3회·2회. 향후 설정파일 기반 조정 (현재는 SKILL.md 임시 패치 권장).
- **자동 수정·차단 안 함**: 보고만. 사용자 판단 신뢰.

---

### Grill-me — 결정 트리 깊이 파기 (0.14.1)

#### `/cfh-grill [topic]`

**역할**: 기존 plan·design의 **결정 트리를 한 가지씩** 파는 인터뷰. mattpocock의 `grilling`를 cfh 가치에 맞게 어댑테이션.

**원본과 차이**:
- 한 번에 한 질문 (원본 동일)
- **추천 + 이유 의무화** (어댑테이션) — 빈 질문 ("어떻게 생각하세요?") 금지
- **코드 우선** (원본 동일 — "explore the codebase instead")
- **결정 트리 enumerate 먼저** (어댑테이션) — 사용자 가지치기 기회
- **종료 조건 명시** (어댑테이션) — 트리 소진 / "enough" / 추측 영역 / 시간 박스
- **`[verified]`/`[inferred]`/`[guessed]` 마커** (어댑테이션)

**호출 경로**:
1. 명시: `/cfh-grill` 또는 `/cfh-grill <topic>`
2. `/cfh-plan` 위임: Phase 2 approach card에서 `(grill)` 선택 → 자동 위임
3. 자동 트리거: "grill me", "stress-test", "진짜 이거 맞아?"

**3 Phase**:
| Phase | 행동 |
|---|---|
| Phase 0 | 직전 컨텍스트 흡수 (`/cfh-plan` answers 또는 mini Pre-scan) |
| Phase 1 | 결정 트리 enumerate + 사용자 가지치기 기회 |
| Phase 2 | 순차 인터뷰 (코드 우선 → 사용자 질문, 추천+이유 동반) |
| Phase 3 | 수렴 — resolved/unresolved 정리 + 다음 단계 추천 |

상세: `skills/grilling/SKILL.md`, `skills/grilling/references/decision-tree.md`.

---

### 추천+이유 패턴 (0.14.1, 전 cfh-* 확산)

cfh 인터뷰·옵션 제시·dispatch 결정에 **빈 질문 금지** 컨벤션. grilling의 핵심 원칙을 결정 지점 전반에 확산.

**적용 위치**:

| 커맨드 | 적용 지점 | 도입 |
|---|---|---|
| `/cfh-plan` | Phase 2 approach card 옵션 (yes/adjust/reclassify/revise-checks/grill) | 0.14.1 |
| `/cfh-make` | dispatch 결정 (skill/command/team/agent) | 0.14.1 |
| `/cfh-debug` | Phase 2 가설 prioritization | 0.14.1 |
| `/cfh-review` | Step 2.5 exclusion 인터뷰 | 0.14.1 |
| `/cfh-refactor` | Step 1 Scope 8질문 (each) + Step 5 분할 전략 | 0.14.2 |
| `/cfh-team` | Phase 2 패턴 선택 (6 중 1) | 0.14.2 |
| `/cfh-grill` | 매 질문 (본질) | 0.14.1 |

**형식**:
```
📌 추천: <기본 선택지>
   이유:
     - [verified] <인용>
     - [inferred] <추론>
     - [guessed] <약한 신호>

다른 옵션:
  - <X> — <조건>일 때 적합
```

상세 컨벤션: `commands/references/recommendation-pattern.md`.

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
| `--strict` *(0.12.0+, 1.0 default)* | `cfh check schema` schema 엄격 검사 |
| `--legacy` *(1.0)* | `cfh check schema` 0.x 동작 (warn-only on unknown frontmatter) |
| `--mapping` *(1.0)* | `cfh check skills` skill ↔ command 매핑 consistency 검증 |
| `--no-mirror` *(1.0)* | `cfh new skill` 시 mirror command 생성 비활성 |
| `--manual` / `--executor claude` / `--baseline` / `--variants` / `--enable-judge` / `--judge-model` / `--report junit` *(0.10.0~0.13.0)* | `cfh dev eval` (구 `cfh eval`) 옵션 |

---

## 10. 0.16.3 patch + 향후 사이클

### 0.16.3 audit-driven polish (이번 patch)

8-agent cross-domain audit (`audit/`) + grasp 자기 검증 결과 8 항목 일괄 적용. 모두 위험 낮음·BREAKING 0.

1. `/cfh-feedback debug-investigator` · `/cfh-feedback cfh-review` — target 식별자 정정
2. `skill-author` Pre-scan 9 stack 인식 (Python·Rust·Go·Java·Kotlin·PHP·Ruby)
3. `cfh-progress` 이름 추출 6 stack 우선순위
4. `debug-investigator` FE 키워드 병기 (hydration mismatch·white screen·INP regression)
5. `cfh-guide` TDD 라우팅 row 분리 (tdd-first FE / tdd-general non-FE)
6. 메타 자산 `a11y` default → alternatives 7종 (consistency·idempotency·latency·fairness 등)
7. `tdd-general` worked example 다양화 (data pipeline·distributed retry·Rust ParseError)
8. `cfh-tc-gen` IO 카테고리 일반화 (embedded·mobile·ML) + 스택 가정 표 확장
- `tests/contract/meta-asset-axes.test.js` — a11y default 회귀 영구 차단

### 0.17.0 — Track 8: TDD/TC mode 분기 (적용 완료)

`/cfh-tc`·`/cfh-tc-gen`은 **기존 파일 대상 (artifact mode)**으로 한정. 새 컴포넌트·모듈은 `/cfh-tdd`·`/cfh-tdd-gen` (intent mode). **stack × mode 2×2 매트릭스**:

|   | **intent** (새로) | **artifact** (기존) |
|---|---|---|
| **FE** | `/cfh-tdd` | `/cfh-tc` |
| **non-FE** | `/cfh-tdd-gen` | `/cfh-tc-gen` |

deprecation 1 사이클 동반 — 기존 발화 0.17.x 동안 정상 작동 + warning. 향후 자동 차단.

### 0.18.0 — Track 9: Soft routing suggestion (적용 완료)

stack 분기를 *제안*으로 활용 — 강제 X. 사용자가 호출한 명령은 default 그대로 진행, opposite stack 신호 강할 때만 **bold + 💡로 대안 제안**:

```
   📌 이대로 진행: tdd-first (FE 컴포넌트 TDD)
   💡 **더 적합해 보이는 대안 — /cfh-tdd-gen** — 신호: <인용>
   진행: yes / switch / explain
```

대상 페어: `/cfh-tdd ↔ /cfh-tdd-gen`, `/cfh-tc ↔ /cfh-tc-gen`, `/cfh-refactor ↔ /cfh-refactor-gen`. `/cfh-plan` Phase 2에 stack signal 포함. 휴리스틱 상세: `commands/references/soft-routing.md`.

### 다음 단계 — 1.0 promotion 게이트

- 외부 사용자 1~2명 1~2주 데이터 누적 (Phase 0.3)
- 안정성 체크리스트 검토 후 사용자 명시 판단으로 promotion
- 다음 audit run (입력 확장 + 범위 확장) 결과 정합성 확인

상세: [`PLAN.md`](./PLAN.md).

---

## 11. 개발자·기여자 노트

> 패키지에 *기여*하거나 *내부 구조*를 이해해야 하는 경우용. 사용자만 분이라면 skip OK.

### 11.1 디렉터리 구조 (패키지 내부)

```
@han-kyeon/claude-skills/
├── bin/
│   └── cli.js                 # 모든 CLI 진입점 (cfh feedback·stats·check·dev eval 등)
├── lib/                       # CLI 구현
│   ├── install.js · update.js · list.js · remove.js
│   ├── new.js · generate.js · adopt.js
│   ├── validate.js · doctor.js · diff.js
│   ├── trace.js               # 0.18.0 traceScores() 공개 함수
│   ├── evolve.js · cost.js · sentry.js · eval.js · dashboard.js · watch.js
│   ├── manifest.js · frontmatter.js · paths.js · search.js · open.js · export-import.js
├── skills/                    # 번들된 스킬 (8개)
│   ├── tdd-first/ · tdd-general/
│   ├── refactoring-strategy/ · debug-investigator/
│   ├── skill-author/ · cfh-harness/ · asset-factory/
│   ├── grilling/
│   └── <name>/SKILL.md + references/ + evals/
├── commands/                  # 번들된 슬래시 커맨드 (20개)
│   ├── cfh-tdd.md · cfh-tdd-gen.md · cfh-tc.md · cfh-tc-gen.md
│   ├── cfh-refactor.md · cfh-refactor-gen.md
│   ├── cfh-plan.md · cfh-debug.md · cfh-review.md · cfh-grill.md
│   ├── cfh-make.md · cfh-new.md · cfh-team.md
│   ├── cfh-retro.md · cfh-feedback.md · cfh-progress.md · cfh-guide.md · cfh-trace.md
│   └── references/            # 공유 참조 (recommendation-pattern·soft-routing 등)
├── templates/                 # cfh new로 스캐폴드되는 baseline
│   ├── skill/ · command.md · agent.md
│   └── presets/               # 팀 프리셋 (reviewer-team·reviewer-team-backend 등)
├── completions/               # bash·zsh 자동완성 (cfh completions install)
├── scripts/                   # PostToolUse 훅 스크립트 (cfh sentry hook install)
├── schemas/                   # JSON Schema (skill-frontmatter·command-frontmatter)
├── tests/                     # node --test 기반 unit + contract
│   └── contract/              # 0.16.3+ meta-asset-axes·soft-routing
├── docs/                      # deprecation-policy 등 보조 docs
└── package.json
```

`cfh install`은 `skills/` + `commands/`(references/ 포함) + `schemas/` + `docs/`을 사용자 `~/.claude/`에 복사.

### 11.2 설계 원칙

framework가 따르는 핵심 룰:

1. **명시성 > 일반성** (정책 § 0). FE/non-FE 분기·`-gen` suffix·trigger 키워드 — 명시 신호로 사용자 의도 보존.
2. **외부 dep 0** — 모든 lib/ 모듈은 Node 내장만 사용. YAML/TOML/XML 파싱도 정규식 우회.
3. **자동 commit·자동 PROGRESS 갱신 금지** — `/cfh-progress init`·`/cfh-retro`는 *사용자 명시 호출* 후만.
4. **deprecation 사이클 항상 한 major 동안** — alias로 안전 그물, stderr warning, BREAKING 즉시 차단 안 함.
5. **자가검증 (slot ≠ purpose)** — grilling·meta-skill axes·soft-routing 모두 slot 채우기 금지, 사용자 plan에 실제 영향 있을 때만 출력.
6. **회귀 0** — 모든 release는 118+ unit tests + contract tests 통과 필수. baseline snapshot은 외부 사용자가 실측.

### 11.3 6 아키텍처 패턴 (cfh-harness)

`/cfh-team` + `cfh-harness`가 생성하는 multi-agent 팀의 7 패턴 (자세한 결정 트리는 `skills/cfh-harness/SKILL.md`):

| 패턴 | 언제 | 예시 |
|---|---|---|
| **Pipeline** | 단계 명확한 선형 변환 | 요구사항 → 스펙 → 코드 → 테스트 |
| **Fan-out / Fan-in** | 큰 입력을 독립 부분으로 쪼개 병렬 처리 후 병합 | 모노레포 PR 분할 리뷰 |
| **Expert Pool** | 같은 입력을 여러 축에서 평가 | 보안·성능·일관성·멱등성 다축 리뷰 |
| **Producer-Reviewer** | 생성과 검증을 인격 분리 — 오버핏 방지 | 테스트 생성자 ↔ 검증자 |
| **Supervisor** | 런타임에 경로 결정 (동적 분기) | 분류 → 적절한 worker 라우팅 |
| **Hierarchical Delegation** | 여러 하위 팀으로 분해 | 5+ agent 초대형 이슈 |

### 11.4 로컬 개발 (기여자용)

패키지 자체를 수정하면서 즉시 사용 환경 반영:

```bash
# 패키지 디렉터리에서
cd @han-kyeon/claude-skills
npm link

# 사용 환경에서 (테스트할 프로젝트 또는 ~/.claude)
npm link @han-kyeon/claude-skills

# 이제 lib/ 수정이 즉시 반영. cfh install로 skills·commands 사본 갱신:
cfh install --force            # 글로벌 갱신
cfh install --target ./.claude --force  # 프로젝트 로컬 갱신

# unlink
npm unlink -g @han-kyeon/claude-skills
```

> **참고**: `cfh install --link` flag는 1.0급 polish에서 제거됨 (`docs/deprecation-policy.md`). dev iteration은 `npm link`로 통일.

#### 테스트 실행

```bash
# 패키지 디렉터리에서
node --test tests/*.test.js tests/contract/*.test.js

# 특정 파일만
node --test tests/eval.test.js

# Schema strict 검증
node bin/cli.js check --strict --target .
```

#### 새 기여 시 체크리스트

- [ ] `node --test tests/*.test.js tests/contract/*.test.js` 통과
- [ ] `cfh check --strict --target .` 0 errors
- [ ] `cfh check skills --mapping` consistent
- [ ] frontmatter schema 위반 0 (1.0급 strict default)
- [ ] PROGRESS.md 결정 로그 entry 추가 (큰 변경 시)
- [ ] PLAN.md 갱신 (track 추가·완료 시)

### 11.5 외부 사용자 검증 사이클

1.0 promotion 게이트의 핵심 — 외부 사용자 데이터:

```bash
# 텔레메트리 옵트인
cfh feedback enable

# 정기 eval 실행 (1~2주)
cfh dev eval --executor claude --baseline --tag pre-X.Y.Z

# eval-history 시계열 확인
cfh stats                  # trend 섹션이 누적 데이터 표시

# 결과 공유
cfh export --include-evals --output cfh-eval-history.json
```

자세한 외부 검증 흐름: [`PLAN.md` Phase 0](./PLAN.md).

---

## 12. 다음에 읽을 것

- **[README.md](./README.md)** — 전체 레퍼런스, FAQ, 디렉터리 구조, CI 통합, 시나리오 가이드
- **[PLAN.md](./PLAN.md)** — 0.16.3 → 1.0급 polish 마일스톤 + 자산별 매트릭스 (Track 7·8·9)
- **[PROGRESS.md](./PROGRESS.md)** — 결정 로그·미해결 질문·다음 단계 (세션 인계 노트)
- **[DESC_CFL.md](./DESC_CFL.md)** — Confluence 페이스트용 종합 가이드 (이 문서와 중복되나 외부 공유용)
- `~/.claude/skills/skill-author/SKILL.md` — 스킬 작성 메타-스킬의 6 Phase (Pre-scan + 조건부 follow-up + Sanity check + (z) 모르겠음 fallback)
- `~/.claude/skills/cfh-harness/SKILL.md` — 팀 생성 메타-스킬 + 7 패턴 (Pre-scan + 기본 6Q + Deep-dive 3지선 + Sanity R1~R8)
- `~/.claude/skills/asset-factory/SKILL.md` — Dispatcher 2 Phase + 분류 트리 (0.5.0 goal-first)
- `~/.claude/skills/asset-factory/references/unknown-answer-playbook.md` *(0.6.0)* — 모든 인터뷰의 (z) 모르겠음 처리 protocol
- `~/.claude/skills/tdd-general/SKILL.md` *(0.6.0)* — framework-agnostic TDD (BE·CLI·라이브러리)
- `~/.claude/skills/cfh-harness/references/patterns/*.md` — 각 아키텍처 패턴의 언제·어떻게
- `~/.claude/commands/references/retro-and-commit.md` *(0.9.0)* — 5개 작업 커맨드가 공유하는 🔄 Retro + 📝 제안 커밋 블록의 단일 출처 형식 정의
