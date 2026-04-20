# @hankyeon/claude-skills

> A **framework** for authoring, installing, and orchestrating Claude Code skills, slash commands, and team agents. Ships a small set of FE/TDD starter assets, a skill authoring meta-skill, and a revfactory-style team factory.

---

## 무엇을 하는 라이브러리인가

Claude Code는 세션 시작 시 아래 경로를 자동 스캔합니다:

- `~/.claude/skills/<name>/SKILL.md` — 사용자 전역 스킬
- `~/.claude/commands/<name>.md` — 사용자 전역 슬래시 커맨드
- `<project>/.claude/agents/<name>.md` — 프로젝트 서브에이전트
- `<project>/.claude/skills/<name>/SKILL.md` — 프로젝트 스킬
- `<project>/.claude/commands/<name>.md` — 프로젝트 슬래시 커맨드

이 라이브러리는 위 경로에 **깔끔하게 설치·관리·검증·확장**할 수 있는 CLI + 스킬 세트입니다. 세 가지 역할:

1. **Installer** — 패키지에 번들된 스킬·커맨드를 `~/.claude/`에 복사/심볼릭.
2. **Authoring framework** — `cfh new`로 스캐폴드, `cfh validate`로 검증. 사용자가 작성한 스킬은 `cfh update`에서 **절대 덮어쓰지 않음** (manifest 기반 보호).
3. **Team-agent factory** — `cfh generate <preset>` 또는 `/harness` 슬래시 커맨드로 프로젝트 `.claude/agents/` + `.claude/skills/`에 **6가지 아키텍처 패턴** 기반 에이전트 팀을 찍어냄.

---

## 빠른 시작

```bash
# 1. 설치
npm install -g @hankyeon/claude-skills

# 2. 번들 스킬·커맨드를 ~/.claude에 설치
cfh install

# 3. Claude Code 재시작 후 아래를 대화에 던져보기
#    (자동 트리거) "리팩터링 도와줘"  → refactoring-strategy 발동
#    (자동 트리거) "TDD로 시작하자"   → tdd-first 발동
#    (수동 호출)   /refactor src/components/Button.tsx
#    (수동 호출)   /tdd src/utils/format.ts
#    (수동 호출)   /r develop          (PR 리뷰)
#    (메타)        /new skill my-auth-flow  (새 스킬 대화형 작성)
#    (메타)        /harness            (팀 에이전트 자동 생성)
```

---

## 번들 자산 전체 목록

### Skills (`skills/`)

| 스킬 | 트리거 | 역할 |
|---|---|---|
| `refactoring-strategy` | "리팩터링", "refactor", "legacy cleanup" | Small PR · Blast Radius · Characterization test · 라이브러리 공식 안티패턴 |
| `tdd-first` | "TDD", "테스트 먼저", 새 기능/버그 시작 | Intent Interview → Test Outline → Failing Test → Implement → Refactor 5 Phase |
| `skill-author` | "스킬 만들", "create a skill", "write a skill" | 인터뷰 기반 SKILL.md 작성 메타-스킬 (5 Phase) |
| `harness-factory` | "팀 에이전트", "agent team", "build a harness" | 6 패턴 중 선택해 `.claude/agents/` 및 `.claude/skills/` 생성 |

### Slash commands (`commands/`)

| 커맨드 | 인자 | 역할 |
|---|---|---|
| `/r` | `[parent-branch]` | 적응형 AI 코드 리뷰 — diff 규모별 서브에이전트 수 조정 |
| `/t` | `[path]` | 테스트 작성 — TDD Mode / Test-Fill Mode 자동 감지 |
| `/refactor` | `[target]` | `refactoring-strategy` 스킬 명시적 활성화 |
| `/tdd` | `[target]` | `tdd-first` 5 Phase 순차 실행 |
| `/new` | `<kind> <name>` | `skill-author` 활성화 + 인터뷰 기반 자산 작성 |
| `/harness` | `[domain]` | `harness-factory` 활성화 + 팀 생성 워크플로 |

### Team presets (`templates/presets/`)

| 프리셋 | 패턴 | 산출물 |
|---|---|---|
| `producer-reviewer` | Producer-Reviewer | producer / reviewer 2 에이전트 + 트리거 스킬 |
| `pipeline-3stage` | Pipeline | analyst / builder / qa 3 에이전트 + 파이프라인 스킬 |
| `reviewer-team` | Expert Pool | security / perf / a11y / types 4 에이전트 + 리뷰 풀 스킬 |

---

## 설치

### 전역 설치 (복사 방식, 기본)

```bash
npm install -g @hankyeon/claude-skills
cfh install
```

기본적으로 `~/.claude/skills/`와 `~/.claude/commands/`에 **파일을 복사**하고 각 항목에 `.cfh-manifest.json` 또는 `.<file>.cfh.json` 메타파일을 함께 기록합니다. 메타파일은 아래 역할:

- `source`, `version` — 어느 패키지 버전에서 왔는지
- `merkle`, `files` — 설치 시점의 SHA-256 해시 (사용자 편집 감지용)

### 심볼릭 링크 방식

```bash
cfh install --link
```

`npm update -g`만 하면 자동 반영 (링크가 유지). 커스터마이징하려면 복사 방식이 적합.

**Windows 주의**: 디렉터리는 junction, 파일은 일반 symlink. 권한이 없으면 **자동으로 복사로 fallback**합니다.

### 특정 항목만 설치

```bash
cfh install refactoring-strategy tdd-first     # 이름으로 골라서
cfh install --only skills                       # 스킬만
cfh install --only commands                     # 커맨드만
```

### 대상 경로 변경

```bash
cfh install --target ./.my-sandbox
# → ./.my-sandbox/skills, ./.my-sandbox/commands
```

### 미리보기 (dry-run)

```bash
cfh install --dry-run
```

---

## Installer 명령어

### `cfh install [name...]`

패키지 자산을 `~/.claude/`에 설치. 이미 있으면 skip (manifest 상태와 사용자 수정 여부 표시). `--force`로 덮어쓰기.

### `cfh update [name...]`

**managed 항목만** 덮어씌웁니다. 사용자가 작성한 스킬 (`manifest 없음`) 또는 설치 후 수정된 항목 (`merkle 불일치`)은 건너뛰고 사유를 출력. 강제 갱신은 `--force`.

```bash
cfh update                       # 전체
cfh update --only skills         # 스킬만
cfh update refactoring-strategy  # 특정 항목
```

### `cfh list` / `cfh ls`

설치 현황을 출력. 각 항목 옆에 상태 표시:

```
Skills (C:\Users\me\.claude\skills):
  refactoring-strategy     managed@0.2.0
  tdd-first                managed@0.2.0 (user-modified)
  my-custom-skill          user-authored
  legacy-skill             unmanaged (name matches package, pre-0.2 install?)
```

상태 의미:
- `managed@<ver>` — 이 패키지가 설치한 상태 그대로
- `managed@<ver> (user-modified)` — 이 패키지가 설치했으나 이후 편집됨
- `managed@<ver> (symlink)` — `--link`로 설치됨 (편집 시 원본 변경)
- `user-authored` — 사용자가 작성 — `update`·`remove`에서 자동 보호
- `unmanaged` — 0.2.0 이전에 설치되어 manifest 없음. 수동 재설치 또는 `--force` 필요

### `cfh remove <name>` / `cfh rm <name>`

설치 항목 제거. **user-authored** 또는 **user-modified** 항목은 기본 거부 (실수로 사용자 작업 지우지 않도록). 강제 제거는 `--force`.

---

## Authoring commands (framework mode)

이 라이브러리의 본체. 사용자는 자신의 스킬·커맨드·에이전트를 **스캐폴드에서 출발해 자유롭게** 작성합니다.

### `cfh new <kind> <name>`

- `kind`: `skill` | `command` | `agent`
- `name`: kebab-case (소문자, 숫자, 대시), 1~63자

기본 대상은 `~/.claude/...`. 프로젝트 로컬로 생성하려면 `--project`.

```bash
cfh new skill my-auth-flow          # ~/.claude/skills/my-auth-flow/
cfh new skill my-flow --project     # ./.claude/skills/my-flow/
cfh new command audit               # ~/.claude/commands/audit.md
cfh new agent security-reviewer --project   # ./.claude/agents/security-reviewer.md
```

생성된 파일에는 `TODO:` 마커가 들어 있으며, `skill-author` 메타-스킬과 연계하면 Claude가 인터뷰로 채워줍니다.

### `cfh validate`

모든 스킬·커맨드의 frontmatter + 본문 구조를 검증:

- SKILL.md에 YAML frontmatter 존재
- `name` 필드가 디렉터리명과 일치
- `description`이 최소 20자 (트리거 약함 경고)
- 커맨드에 `$ARGUMENTS` 또는 구조화 태그(`<invocation>` 등) 존재

에러 있으면 exit code 1 (CI에 유용).

```bash
cfh validate                         # 패키지 + 설치 대상 모두
cfh validate --target ./.my-sandbox  # 특정 경로
```

### `cfh generate <preset>`

프리셋 매니페스트(`templates/presets/<name>.json`)에 따라 **현재 디렉터리의 `.claude/` 아래**에 에이전트 + 스킬 세트를 생성. revfactory/harness 스타일.

```bash
cfh generate --list                   # 사용 가능 프리셋 목록
cfh generate producer-reviewer        # .claude/agents/producer.md + reviewer.md + skills/producer-reviewer-flow/
cfh generate pipeline-3stage --dry-run
cfh generate reviewer-team --target ./other-project
```

생성 후 Claude Code 재시작 (또는 `/agents`로 인식 확인). Agent Teams 간 통신이 필요한 경우 환경변수:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

---

## 대화형 워크플로 (슬래시 커맨드)

### `/new <kind> <name>` — 새 스킬 대화형 작성

1. `skill-author` 스킬 활성화
2. 6 질문 인터뷰 (목적 / 트리거 / 반-트리거 / 핵심 원칙 / 출력 / 참조)
3. description 초안 제시 → 승인
4. SKILL.md + references/ 생성 (CLI `cfh new` 또는 Claude Write)
5. `cfh validate` + 시험 트리거

```
사용자: /new skill react-query-patterns
Claude: (Phase 1 질문 6개 순차 진행)
        (Phase 2 description 초안)
        (Phase 3 SKILL.md 구조 제안)
        (Phase 4 Write)
        (Phase 5 validate + 시험 트리거)
```

### `/harness [도메인 설명]` — 팀 에이전트 자동 생성

1. `harness-factory` 스킬 활성화
2. 5 질문 도메인 인터뷰
3. 6 패턴 중 1개 추천 (Pipeline / Fan-out-Fan-in / Expert Pool / Producer-Reviewer / Supervisor / Hierarchical)
4. 각 에이전트 책임 확정
5. 프리셋 매칭 시 `cfh generate`, 아니면 Claude가 Write로 직접 생성
6. `cfh validate` + 시운전

```
사용자: /harness FE PR의 다축 코드 리뷰
Claude: (Phase 1 5 질문)
        → 추천 패턴: Expert Pool (security/perf/a11y/types)
        → cfh generate reviewer-team 실행 제안
        → 생성 후 시운전 태스크 제안
```

### `/refactor <target>` / `/tdd <target>`

기존 스킬을 명시적으로 활성화. `/refactor`는 `refactoring-strategy`의 Scope Narrowing → Blast Radius → Small PR 계획 흐름. `/tdd`는 `tdd-first`의 5 Phase.

### `/t <path>` / `/r <parent-branch>`

- `/t`: 테스트 작성. 파일이 있으면 Test-Fill Mode, 없으면 TDD Mode.
- `/r`: 코드 리뷰. diff 규모 측정 후 서브에이전트 1~5개 병렬 실행해 `REVIEW.md` 생성.

---

## 전형적 시나리오

### 시나리오 1 — FE 프로젝트에 처음 설치

```bash
npm install -g @hankyeon/claude-skills
cfh install
cfh list
```

→ 4 skills + 6 commands 설치 완료. Claude Code에서 "리팩터링", "TDD" 등 자동 트리거 확인.

### 시나리오 2 — 자기만의 스킬 작성

```
사용자: /new skill payment-validation
Claude: (skill-author Phase 1~5 진행)
```

→ `~/.claude/skills/payment-validation/SKILL.md` 생성. `cfh list`에서 `user-authored`로 분류. 이후 `cfh update`가 건드리지 않음.

### 시나리오 3 — 프로젝트에 코드 리뷰 팀 만들기

```bash
cd my-fe-project
cfh generate reviewer-team
# → ./.claude/agents/{security,perf,a11y,types}-reviewer.md 생성
# → ./.claude/skills/expert-review-pool/SKILL.md 생성
```

각 에이전트 파일의 TODO 마커 편집. Claude Code 재시작 후 "리뷰해줘" → 4 에이전트 병렬 호출.

### 시나리오 4 — 커스텀 팀 설계

```
사용자: /harness 결제 모듈을 TDD 오버핏 없이 구현
Claude: (도메인 인터뷰)
        → 실패 비용 높음 → Producer-Reviewer 패턴 추천
        → cfh generate producer-reviewer 제안
```

생성 후 `.claude/agents/producer.md`, `reviewer.md` 편집해 결제 도메인 제약 추가.

### 시나리오 5 — 패키지 업데이트, 커스텀 작업 보존

```bash
npm update -g @hankyeon/claude-skills
cfh update              # 번들 자산만 갱신
cfh list                # 커스텀 스킬은 그대로 user-authored로 남음
```

---

## 디렉터리 구조 (패키지 내부)

```
@hankyeon/claude-skills/
├── bin/cli.js                   # CLI 진입점
├── lib/
│   ├── install.js               # install (manifest 기록)
│   ├── update.js                # managed만 갱신
│   ├── list.js                  # manifest 기반 상태 표시
│   ├── remove.js                # user-authored 보호
│   ├── new.js                   # 스캐폴드
│   ├── generate.js              # 프리셋 적용
│   ├── validate.js              # frontmatter 검증
│   ├── manifest.js              # .cfh-manifest.json 읽기·쓰기·해싱
│   ├── frontmatter.js           # 미니멀 YAML 파서 (zero deps)
│   └── paths.js                 # 경로 헬퍼
├── skills/
│   ├── refactoring-strategy/
│   ├── tdd-first/
│   ├── skill-author/            # 메타: 스킬 작성
│   └── harness-factory/         # 메타: 팀 생성
├── commands/
│   ├── r.md, t.md, refactor.md, tdd.md
│   ├── new.md                   # /new → skill-author 활성화
│   └── harness.md               # /harness → harness-factory 활성화
└── templates/
    ├── skill/{SKILL.md, references/example.md}
    ├── command.md
    ├── agent.md
    └── presets/
        ├── producer-reviewer.json
        ├── pipeline-3stage.json
        └── reviewer-team.json
```

---

## 설계 원칙

- **Zero runtime dependencies** — Node 내장 API만. 크기·보안 공격면 최소.
- **Progressive disclosure** — SKILL.md는 요약·규칙, 상세는 `references/`. 트리거 시 SKILL.md만 로드되어 토큰 절약.
- **Framework first, starter assets second** — 번들 4 스킬은 예시. 본체는 CLI + 메타-스킬.
- **Manifest 기반 안전성** — 사용자 작성물은 `user-authored`로 태깅되어 update/remove 기본 거부.
- **프로젝트 컨벤션 우선** — 팀의 기존 규칙이 외부 베스트 프랙티스보다 우선. 안티패턴 지적은 라이브러리 공식 문서 인용으로만.
- **OS 중립** — POSIX + Windows (junction fallback).

---

## 6 아키텍처 패턴 요약

`harness-factory/references/patterns/` 참조. 각 패턴은 독립 파일로 상세 문서화.

| 패턴 | 에이전트 수 | 통신 | 대표 용도 |
|---|---|---|---|
| **Pipeline** | 2~4 | 순차 | Analyst → Builder → QA. 선형 단계 변환 |
| **Fan-out / Fan-in** | 2~N + Aggregator | 병렬 + 집계 | 독립 부분 문제 분할 처리 |
| **Expert Pool** | 2~6 + Merger | 병렬 | 같은 입력을 여러 축에서 평가 (PR 다축 리뷰) |
| **Producer-Reviewer** | 2 | 2-step | 오버핏 방지. 비즈니스 크리티컬 |
| **Supervisor** | 1 + N | 중앙집중 | 동적 경로 선택. 모호한 멀티스텝 |
| **Hierarchical Delegation** | 3~N (트리) | 상위-하위 | 초대형 cross-functional |

---

## CI 통합

`cfh validate`를 CI에 넣어 잘못된 스킬 merge를 차단:

```yaml
# .github/workflows/skills.yml
name: Validate skills
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npx -y @hankyeon/claude-skills validate --target ./.claude
```

---

## 자주 하는 질문

### Q. `cfh update`가 내 스킬을 지울까 봐 걱정됩니다

지우지 않습니다. `user-authored` 상태는 `update`에서 자동 제외됩니다 (`cfh list`로 확인). `managed@<ver>` 스킬도 **설치 후 편집된 경우** (`user-modified`) `--force` 없이는 덮어쓰지 않습니다.

### Q. 0.1.x에서 0.2.0으로 업그레이드 했는데 `unmanaged`로 뜹니다

0.1.x는 manifest를 기록하지 않았습니다. 재설치하면 manifest가 생성됩니다:

```bash
cfh install --force
```

### Q. `/harness` 대신 CLI로만 팀을 만들 수 있나요?

`cfh generate --list`로 프리셋 확인 후 `cfh generate <name>`. 프리셋에 없는 커스텀 조합은 `/harness`가 Claude 대화로 설계해 Write tool로 생성합니다.

### Q. 스킬이 자동 트리거되지 않습니다

1. `cfh list`로 설치 확인 (symlink/copy 상태도 확인)
2. `cfh validate`로 frontmatter 검증
3. SKILL.md `description`에 **구체 키워드** 3개 이상 있는지 확인
4. Claude Code 세션 재시작 (`.claude/` 또는 `~/.claude/` 변경 시 캐시 갱신 필요)

### Q. 프로젝트별로 다른 스킬을 쓰고 싶습니다

전역(`~/.claude/`) 대신 프로젝트 로컬(`<project>/.claude/`)을 사용:

```bash
cfh new skill project-specific-rule --project
cfh generate reviewer-team --target ./   # 현재 프로젝트에 팀 생성
```

프로젝트 로컬이 전역보다 **우선**합니다.

---

## 로컬 개발

```bash
git clone <this-repo>
cd claude-fe-harness
npm link

# 다른 디렉터리에서
cfh install --target ./.my-sandbox --dry-run
cfh list --target ./.my-sandbox
cfh validate --target ./.my-sandbox
```

---

## 라이선스

MIT
