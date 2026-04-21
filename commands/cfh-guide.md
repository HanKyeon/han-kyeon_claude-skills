<s>
이 커맨드는 `@han-kyeon/claude-skills` 패키지의 **사용 가이드**를 사용자에게 보여줍니다.
`$ARGUMENTS`로 받은 토픽 키워드에 해당하는 섹션만 출력하고, 키워드가 없거나 `all`이면 전체를 출력합니다.
**이 파일 아래의 해당 섹션을 그대로 옮겨 출력**하세요. 임의 요약·재작성 금지.
</s>

<invocation>
토픽: `$ARGUMENTS`

라우팅 규칙 (대소문자 무시, 부분 매치 허용):
- 비어있음 / `all` / `overview` → Overview 섹션
- `install` / `update` / `설치` → Install 섹션
- `new` / `author` / `skill` / `작성` → Authoring 섹션
- `team` / `harness` / `agent` / `팀` → Team 섹션
- `make` / `dispatcher` / `asset` / `무엇` / `분류` → Make 섹션
- `plan` / `상의` / `접근` / `계획` → Plan 섹션
- `commands` / `cheat` / `치트` / `명령` → Cheatsheet 섹션
- `trigger` / `trace` / `발동` → Trigger 섹션
- `maintain` / `adopt` / `diff` / `doctor` / `점검` → Maintain 섹션
- `evolve` / `log` / `telemetry` / `진화` → Evolve 섹션
- 그 외 → "알려진 토픽이 아닙니다" + 토픽 목록
</invocation>

---

## Section: Overview

**@han-kyeon/claude-skills** — Claude Code를 위한 스킬·커맨드·팀 에이전트 프레임워크.

3 역할:
1. **Installer** — 번들된 스킬·커맨드를 `~/.claude/`에 설치
2. **Authoring framework** — `cfh new`로 스킬 스캐폴드, `cfh validate`로 검증. 사용자 작성물은 업데이트에서 자동 보호
3. **Team-agent factory** — `cfh generate <preset>` 또는 `/cfh-team`으로 `.claude/agents/` + `.claude/skills/` 자동 생성

세부 토픽: `/cfh-guide install`, `/cfh-guide new`, `/cfh-guide team`, `/cfh-guide make`, `/cfh-guide plan`, `/cfh-guide maintain`, `/cfh-guide commands`, `/cfh-guide trigger`.

두 가지 dispatcher를 구분해서 기억하시면 편합니다:
- **어떤 것을 만들지 모를 때** → `/cfh-make` — 재사용 자산(skill/command/team/agent) 분류·위임
- **어떤 작업을 어떻게 시작할지 상의하고 싶을 때** → `/cfh-plan` — 목표 캡처·접근법 상의·작업 분류·실행 (명시 호출 전용)

---

## Section: Install

### 최초 설치 (1회)

```bash
npm install -g @han-kyeon/claude-skills
cfh install
```

→ `~/.claude/skills/`와 `~/.claude/commands/`에 번들 스킬 4개 + 커맨드 8개 복사.

### 설치 옵션

```bash
cfh install --link                       # 심볼릭 링크 (npm update 시 자동 반영)
cfh install --only skills                # 스킬만
cfh install --only commands              # 커맨드만
cfh install refactoring-strategy         # 특정 항목만
cfh install --target ./.sandbox          # 대상 경로 변경
cfh install --dry-run                    # 미리보기
```

### 상태 확인

```bash
cfh list                 # 전역(~/.claude). 현재 디렉터리에 ./.claude가 있으면 두 섹션 모두 표시
cfh list --global        # 전역만
cfh list --project       # 현재 프로젝트의 ./.claude만
```

- `managed@<ver>` — 패키지 설치 상태 그대로
- `managed@<ver> (user-modified)` — 설치 후 내가 편집
- `user-authored` — 내가 처음부터 만듦 (update에서 자동 보호)

### 업데이트

```bash
npm update -g @han-kyeon/claude-skills
cfh update
```

`cfh update`는 **managed 항목만** 갱신. 사용자 수정·사용자 작성물은 건드리지 않음. 강제는 `--force`.

### 제거

```bash
cfh remove <name>                        # managed는 즉시 제거
cfh remove <name> --force                # user-authored·user-modified 강제 제거
```

---

## Section: Authoring (New)

자기만의 스킬·커맨드·에이전트를 만드는 방법.

### 대화형 (권장)

```
사용자: /cfh-new skill patient-data-handling
Claude: (skill-author 메타-스킬 자동 활성화, 6 질문 인터뷰 진행)
```

Phase 1 — Purpose Interview (6 질문):
1. 한 문장 목적
2. 트리거 상황 (키워드·의도·파일 패턴)
3. 반-트리거 (떠서는 안 되는 상황)
4. 핵심 원칙 3~5개
5. 출력 형태
6. 참조 자료

이후 description 초안 → 승인 → SKILL.md + references/ 생성 → `cfh validate`.

### CLI 스캐폴드 (내용이 머리에 있을 때)

```bash
cfh new skill my-rule                       # ~/.claude/skills/my-rule/
cfh new skill my-rule --project             # ./.claude/skills/my-rule/
cfh new command audit                       # ~/.claude/commands/audit.md
cfh new agent code-reviewer --project       # ./.claude/agents/code-reviewer.md
```

이름 규칙: kebab-case, 소문자+숫자+대시, 1~63자. **주의**: 번들 커맨드는 `cfh-` 접두사를 사용하므로, 사용자 커맨드는 `cfh-`로 시작하지 마시기를 권장합니다(네임스페이스 보호).

### 전역 vs 프로젝트 로컬

| 상황 | 경로 |
|---|---|
| 개인 취향 | `~/.claude/skills/` (기본) |
| 프로젝트 도메인 | `<project>/.claude/skills/` (`--project`) |
| 팀 공유 | `<project>/.claude/skills/` + git commit |

프로젝트 로컬이 전역보다 우선.

### 검증

```bash
cfh validate                             # 모든 스킬·커맨드
cfh validate --target ./.claude          # 특정 경로
```

체크 항목: frontmatter 존재, `name` 디렉터리 일치, `description` 20자+, 커맨드 `$ARGUMENTS`/구조화 태그 존재.

---

## Section: Team (Agent teams)

여러 에이전트가 협력하는 팀을 만드는 방법.

### 프리셋 (빠른 경로)

```bash
cfh generate --list                      # 목록 확인

cfh generate producer-reviewer           # 2 에이전트 (오버핏 방지)
cfh generate pipeline-3stage             # Analyst → Builder → QA
cfh generate reviewer-team               # 4 전문 리뷰어 (security/perf/a11y/types)
```

생성 위치: **현재 디렉터리의 `.claude/agents/`와 `.claude/skills/`** (프로젝트 로컬).

### 대화형 설계 (커스텀)

```
사용자: /cfh-team 결제 모듈을 오버핏 없이 TDD로 구현
Claude: (harness-factory 6 Phase 워크플로)
```

1. Domain Interview (5 질문)
2. Pattern Selection (6 패턴 중 1개)
3. Agent Roster (책임·도구·입출력)
4. Skill Design (팀 트리거 스킬)
5. Scaffold (`cfh generate` 또는 Claude Write)
6. Validate + Dry Run

### 6 아키텍처 패턴

| 패턴 | 쓸 때 | 에이전트 수 |
|---|---|---|
| **Pipeline** | 선형 단계 변환 (스펙 → 코드 → 테스트) | 2~4 |
| **Fan-out / Fan-in** | 독립 부분 병렬 처리 + 병합 | 2~N |
| **Expert Pool** | 같은 입력을 여러 축에서 평가 (PR 리뷰) | 2~6 |
| **Producer-Reviewer** | 생성·검증 인격 분리 (오버핏 방지) | 2 |
| **Supervisor** | 런타임 동적 경로 (모호한 멀티스텝) | 1+N |
| **Hierarchical** | 하위 팀으로 자연 분해되는 초대형 | 3~N |

상세: `~/.claude/skills/harness-factory/references/patterns/<name>.md`

### Agent Teams 실험 플래그

에이전트 간 직접 메시지 교환이 필요할 때만:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Pipeline·Expert Pool처럼 오케스트레이터가 한 번씩 호출하는 경우는 불필요.

---

## Section: Make (Dispatcher)

"뭔가 만들고 싶은데 skill인지 command인지 team인지 잘 모르겠다" — 바로 이 상황을 위한 0.3.0 신규 dispatcher입니다.

### 기본 흐름

```
사용자: /cfh-make 팀 API 응답 규칙을 claude가 자동 적용하게
Claude: (asset-factory 메타-스킬 활성화)
        Phase 0: 기존 유사 자산 스캔
        Phase 1: 3 분류 질문
          Q1 반복 가능한 워크플로인가?
          Q2 여러 전문가 협업인가?
          Q3 트리거 방식?
        → 분류 결과 공개 (예: "skill로 판단")
        → 사용자 승인
        Phase 2: skill-author / harness-factory / 인라인 커맨드 인터뷰로 위임
```

### 언제 쓰나

- 만들려는 게 **skill**인지 **command**인지 **team**인지 구분이 안 설 때
- "자동화하고 싶다"는 막연한 요구사항에서 출발할 때
- 기존에 유사 자산이 있는지 먼저 확인하고 싶을 때

### 분류 결과별 다음 단계

| 결과 | 위임 대상 | 비고 |
|---|---|---|
| skill | `skill-author` | asset-factory가 Phase 0 + Q1 초안을 이미 채움 |
| team | `harness-factory` | 태스크 성격 힌트 포함 전달, Deep-dive는 정상 수행 |
| command | asset-factory 인라인 (3 질문) | `cfh new command <name>` 스캐폴드 호출 |
| agent (단독) | 대부분 team으로 재분류 권장 | 명확한 경우만 `cfh new agent` |

### 언제 쓰지 말아야 하나

- 이미 어떤 자산인지 확정됐을 때 → `skill-author`(`/cfh-new skill …`) 또는 `harness-factory`(`/cfh-team …`) 직접
- 일회성 요청일 때 → 그냥 Claude에게 바로 말하세요

---

## Section: Plan (Task dispatcher)

"뭔가 해야 하는데 어떻게 접근하지" — 복잡·모호한 실제 작업을 시작할 때 쓰는 dispatcher입니다. **명시 호출 전용**이며 자동 트리거되지 않습니다(자연어로 대화하며 진행해도 되는 일에 방해되지 않게 하기 위함).

### 기본 흐름

```
사용자: /cfh-plan legacy 결제 모듈에 쿠폰 검증 로직 추가
Claude: (4 Phase 진행)
        Phase 0: Pre-scan — CLAUDE.md·git log·대상 파일·package.json 수집
        Phase 1: Goal Capture — 4 질문
          Q1 목표 (한 문장)
          Q2 성공 기준 (완료 판단 기준)
          Q3 제약·out-of-scope
          Q4 긴급도
        Phase 2: Approach Proposal — 태스크 분류 + 접근법 카드 (사용자 승인)
        Phase 3: Execution — 전용 스킬 위임 또는 직접 실행
```

### /cfh-make와의 차이

| | `/cfh-make` | `/cfh-plan` |
|---|---|---|
| 목적 | **재사용 자산 생성** (skill/command/team) | **실제 작업 실행** |
| 결과물 | `.claude/` 아래 파일 | 코드 수정·기능 구현·리팩터·리뷰 등 |
| 자동 트리거 | "자동화해줘" 등 일부 발화 | **없음** (명시 호출만) |
| 후속 위임 | skill-author / harness-factory | tdd-first / refactoring-strategy / /cfh-tc / /cfh-review 등 |

### 언제 쓰나

- 작업 성격이 복합이거나 어느 스킬을 써야 할지 모호할 때
- 목표·제약을 명확히 전달하고 Claude의 접근법 제안을 받고 싶을 때
- PR 단위 이상의 작업 시작 시

### 언제 쓰지 말아야 하나

- 작업 종류가 이미 확정 → 해당 슬래시 커맨드 직접 (`/cfh-tdd`, `/cfh-refactor` 등)
- 가벼운 일회성 요청 → 자연어로 대화
- 재사용 자산 만들기 → `/cfh-make`

---

## Section: Maintain (Upkeep)

설치된 스킬·커맨드를 관리·진단하는 0.3.0 신규 도구.

### `cfh adopt <name>` — managed → user-authored

설치된 managed 항목의 manifest를 제거하여 **사용자 작성물**로 선언합니다. 이후 `cfh update`에서 자동 보호됩니다.

```bash
cfh adopt refactoring-strategy           # y/N 확인 후 manifest 제거
cfh adopt refactoring-strategy --yes     # 확인 건너뛰기
cfh adopt refactoring-strategy --dry-run # 미리보기
```

역방향(`disown`)은 의도적으로 제공하지 않습니다. 필요하면 `cfh update --force`로 패키지 버전을 덮어쓰시면 됩니다.

### `cfh diff <name>` — 사용자 변경분 확인

설치 당시 manifest 해시와 현재 파일 상태를 비교하여 **내가 어떤 파일을 고쳤는지** 보여 줍니다.

```bash
cfh diff refactoring-strategy            # 요약 (변경 파일 목록)
cfh diff refactoring-strategy --full     # unified diff 전체
```

패키지 최신 버전과의 비교는 `cfh update --dry-run`을 쓰시면 됩니다.

### `cfh doctor` — 전체 점검

6개 항목을 한 번에 검사합니다.

```bash
cfh doctor                               # 문제 있으면 exit 1
cfh doctor --warn-only                   # 항상 exit 0 (CI에서 경고만)
```

점검 항목:
1. frontmatter 유효성 (name/description/20자 이상)
2. 스킬 간 트리거 키워드 중복 (오발동 위험)
3. 고아 manifest (파일 없는데 manifest만 남음)
4. 깨진 symlink
5. 전역과 프로젝트에 같은 이름 (프로젝트가 가림)
6. 커맨드 `$ARGUMENTS`·`<invocation>` 태그 누락

### `cfh trace <query>` / `/cfh-trace [query]` — 트리거 시뮬레이션

어떤 발화가 어느 스킬을 트리거할지 미리 확인합니다.

```bash
cfh trace "이 PR 리뷰 좀 해줘"              # 상위 5개 스킬 + 매칭 점수
cfh trace "리팩터링 도와줘" --top 10       # 상위 N개
```

슬래시 커맨드는 인자 없이도 동작합니다 — 발화를 묻고 시뮬레이션해 드립니다.

```
/cfh-trace                               # 인터뷰 모드
/cfh-trace "새 스킬 만들어 주세요"         # 직접 조회
```

---

## Section: Evolve (Skill evolution)

스킬을 오래 쓰다 보면 description이 실제 사용 패턴과 어긋납니다. `cfh evolve`는 정적 분석 + (옵트인 시) 사용 로그 기반 제안을 내서 이를 교정합니다. **자동 수정은 하지 않으며** 제안만 보고합니다.

### 옵트인이 필요합니다

로그 기록은 기본 비활성화입니다. 로컬 파일(`~/.claude/.cfh-logs/`)에만 저장되며 외부 전송은 없습니다.

```bash
cfh log --enable                          # 동의 후 활성화
cfh log --disable                         # 언제든 비활성화
cfh log --status                          # 현재 상태 + 로그 파일 수
```

### 로그 기록

수동 또는 Claude Code `settings.json` hook로 연결:

```bash
cfh log tdd-first --event trigger --utterance "TDD로 시작" --helpful y
cfh log tdd-first --event miss --utterance "그냥 테스트 빨리 짜줘"
```

필드:
- `--event` (`trigger` / `success` / `miss`)
- `--utterance` — 사용자 발화 원문
- `--helpful` (`y` / `n`)
- `--note` — 자유 메모

### 제안 생성

```bash
cfh evolve                                # 모든 스킬 분석
cfh evolve tdd-first                      # 특정 스킬만
```

정적 분석 (로그 없어도 동작):
- description 길이 (40자 미만 경고)
- 반-트리거 절 유무
- 다른 스킬과 트리거 토큰 겹침 (3개+ 공유 시)
- 고유 트리거 토큰 수 (5개 미만 경고)

사용 로그 기반 (로그 있을 때만):
- not-helpful > helpful → description·원칙 재검토 권장
- miss 3회 이상 → 놓친 키워드 후보 제시
- 자주 등장한 발화 토큰 top 10

### 제안 적용

0.3.0에는 `--apply` 기능이 없습니다. 제안을 참고해 사용자가 SKILL.md를 직접 편집하신 뒤 `cfh validate`로 확인하시면 됩니다.

---

## Section: Trigger (발동 방식)

### 자동 트리거 (대화 중 키워드 감지)

| 말하면 | 발동 |
|---|---|
| "리팩터링", "refactor", "cleanup" | `refactoring-strategy` |
| "TDD", "테스트 먼저", "test-driven" | `tdd-first` |
| "스킬 만들", "create a skill" | `skill-author` |
| "팀 에이전트", "agent team", "build a harness" | `harness-factory` |
| "자동화해줘", "뭔가 만들고 싶은데", "automate this" | `asset-factory` (dispatcher) |

### 명시 호출 (슬래시 커맨드)

| 커맨드 | 역할 |
|---|---|
| `/cfh-refactor <target>` | `refactoring-strategy` 스킬 활성화 |
| `/cfh-tdd <target>` | `tdd-first` 5 Phase 순차 실행 |
| `/cfh-tc <path>` | 테스트 작성 (TDD Mode / Test-Fill Mode 자동 감지) |
| `/cfh-review [parent-branch]` | 적응형 PR 리뷰 |
| `/cfh-new <kind> <name>` | `skill-author` 대화 (무엇을 만들지 확정됐을 때) |
| `/cfh-team [domain]` | `harness-factory` 대화 |
| `/cfh-make [requirement]` | `asset-factory` dispatcher (분류부터 시작) |
| `/cfh-plan [goal]` | 작업 dispatcher (목표 캡처·접근법 상의·실행, 명시 호출 전용) |
| `/cfh-trace [query]` | 트리거 시뮬레이션 |
| `/cfh-guide [topic]` | 이 가이드 |

### 트리거가 안 될 때

1. `cfh list` — 설치돼 있나
2. `cfh validate` — frontmatter 유효한가
3. `cfh doctor` — 키워드 중복이나 고아 manifest 있는가
4. `cfh trace "<내 발화>"` — 어느 스킬이 매칭되는지 확인
5. Claude Code 세션 재시작 (`.claude/` 캐시 갱신)

---

## Section: Cheatsheet (Commands)

### CLI

```bash
# Installer
cfh install [names...]                   # 번들 자산 설치
cfh update [names...]                    # managed만 갱신
cfh list                                 # 상태 확인 (프로젝트 있으면 양쪽)
cfh list --global|--project              # 범위 지정
cfh remove <name>                        # 제거

# Authoring
cfh new skill <name> [--project]         # 스킬 스캐폴드
cfh new command <name>                   # 커맨드 스캐폴드
cfh new agent <name> --project           # 에이전트 스캐폴드
cfh validate                             # 검증

# Team factory
cfh generate --list                      # 프리셋 목록
cfh generate <preset>                    # 팀 생성 (./.claude/에)

# Maintain (0.3.0 신규)
cfh adopt <name>                         # managed → user-authored
cfh diff <name> [--full]                 # 내 변경분 확인
cfh doctor [--warn-only]                 # 전체 점검
cfh trace "<query>" [--top N]            # 트리거 시뮬레이션

# Evolve (0.3.0 신규, 옵트인)
cfh log --enable|--disable|--status      # 텔레메트리 제어
cfh log <skill> --event E --utterance U  # 사용 이벤트 기록
cfh evolve [<skill>]                     # 제안 출력 (자동 수정 없음)

# 공통 옵션
--link                                   # 심볼릭 링크 (install)
--force, -f                              # 덮어쓰기 / 안전장치 해제
--yes                                    # y/N 프롬프트 건너뛰기 (adopt)
--dry-run                                # 미리보기
--target <path>                          # 대상 경로
--only skills|commands                   # 한 종류만 (install/update)
--project                                # 프로젝트 로컬 (new, list)
--global                                 # 전역만 (list)
```

### 슬래시 커맨드 (Claude Code 세션)

```
/cfh-refactor <target>                   # 리팩터링 워크플로
/cfh-tdd <target>                        # TDD 5 Phase
/cfh-tc <path>                           # 테스트 작성
/cfh-review [parent-branch]              # PR 리뷰
/cfh-new <kind> <name>                   # 스킬 대화 작성 (자산 종류 확정됐을 때)
/cfh-team [domain]                       # 팀 대화 설계
/cfh-make [requirement]                  # 자산 dispatcher — 무엇을 만들지부터 분류
/cfh-plan [goal]                         # 작업 dispatcher — 목표부터 상의 (명시 호출 전용)
/cfh-trace [query]                       # 트리거 시뮬레이션
/cfh-guide [topic]                       # 이 가이드
```

### 경로 요약

| 용도 | 경로 |
|---|---|
| 전역 스킬 | `~/.claude/skills/` |
| 전역 커맨드 | `~/.claude/commands/` |
| 프로젝트 스킬 | `<project>/.claude/skills/` |
| 프로젝트 커맨드 | `<project>/.claude/commands/` |
| 프로젝트 에이전트 | `<project>/.claude/agents/` |

---

<output_format>

사용자가 `/cfh-guide <topic>`을 입력했을 때:

1. `$ARGUMENTS`를 읽어 토픽 결정.
2. 해당 섹션 헤더(`## Section: ...`) 아래 내용을 **그대로** 출력.
3. 섹션 끝에서 사용자에게 관련 다른 토픽을 제안:
   - Install → "다음: `/cfh-guide new`"
   - New → "다음: `/cfh-guide team`"
   - Team → "다음: `/cfh-guide make`"
   - Make → "다음: `/cfh-guide plan`"
   - Plan → "다음: `/cfh-guide maintain`"
   - Maintain → "다음: `/cfh-guide evolve`"
   - Evolve → "다음: `/cfh-guide trigger`"
   - Trigger → "다음: `/cfh-guide commands`"
   - Cheatsheet → "다음: `/cfh-guide overview`"
4. 토픽 불명 시:
   ```
   알려진 토픽이 아닙니다: "<인자>"
   사용 가능: overview, install, new, team, make, plan, maintain, evolve, trigger, commands
   예: /cfh-guide install
   ```

</output_format>
