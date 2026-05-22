# @han-kyeon/claude-skills

> A **framework** for authoring, installing, and orchestrating Claude Code skills, slash commands, and team agents. FE/non-FE friendly starter assets + general-purpose meta-skills (skill authoring, team factory, asset dispatcher, decision-tree grilling).

---

## 5분 시작 (Quick Win)

```bash
# 1. 설치
npm install -g @han-kyeon/claude-skills
cfh install                  # ~/.claude/skills + ~/.claude/commands 복사
cfh list                     # 8 skills + 19 commands + mapping (→ /cfh-*) 확인
```

Claude Code 새 세션 시작 후 대화창에 차례로 입력:

```
(1) /cfh-guide overview
   → 이 도구가 무엇을 하는지 30초 안에 파악

(2) /cfh-trace "이 코드 리팩터링하고 싶어"
   → 어떤 스킬이 자동 트리거되는지 점수로 미리보기

(3) "TDD로 src/utils/foo.ts 짜고 싶어"
   → tdd-first 자동 활성화. 5 Phase 진행

(4) /cfh-make 팀 PR 응답 검증을 자동화하고 싶어
   → asset-factory dispatcher — skill/command/team 분류

(5) /cfh-plan 막연한 작업 — 어디부터 시작할지 모름
   → 목표·성공 기준·제약 받고 접근법 카드 제안

(6) /cfh-feedback tdd-first "인터뷰 중 어색했던 점 짧게"
   → ~/.claude/.cfh-logs/에만 저장 (외부 전송 없음)
```

터미널에서 한 번 확인:

```bash
cfh stats --days 7           # cost + sentry + eval 통합 markdown 리포트
cfh check                    # schema lint + skill 진단 모두
```

익숙해지면 `cfh-guide`·`cfh-trace`·`cfh-make`·`cfh-plan`·`cfh-feedback`·`cfh-grill` 5개 슬래시 커맨드만 기억해도 95% 커버됩니다.

---

## 무엇을 하는 라이브러리인가

이 패키지는 Claude Code를 위한 **인프라 + 자산 묶음**입니다.

- **인프라 (framework-agnostic)**: install·update·list·new·generate·adopt·diff·check·trace CLI · feedback·stats·dev eval · asset-factory dispatcher · skill-author·cfh-harness 메타-skill · grilling 결정 트리 인터뷰 · cfh-plan 작업 dispatcher
- **자산 (FE/non-FE 명시 분기)**:
  - **FE 전용**: `tdd-first` (RTL·MSW), `/cfh-tdd`·`/cfh-tc`·`/cfh-refactor`
  - **non-FE 전반** (`-gen` suffix): `tdd-general` (AAA·table-driven), `/cfh-tdd-gen`·`/cfh-tc-gen`·`/cfh-refactor-gen` — BE/library/CLI/mobile/embedded/ML 모두 커버
  - **stack-neutral**: `debug-investigator` (FE/BE 양쪽 키워드), `grilling`, `refactoring-strategy` (FE/BE 컨텍스트 분기)

**한 문장**: 프로젝트별·팀별 Claude Code 사용 패턴을 자산화·관리·진화시키는 도구.

---

## 개발자 일상에서 — 어떻게 쓰이나

기능 카탈로그가 아니라 *내가 일하는 흐름이 어떻게 달라지는지*. 4 가지 전형 상황:

### 1. 모호한 요구사항 받았을 때 — `/cfh-plan`

> "결제 API에 쿠폰 검증 추가" 같은 요구사항. 어디서 시작할지 막막.

```
/cfh-plan 결제 API에 쿠폰 검증 추가
```

- Phase 1: Q1~Q4 (목표·성공 기준·제약·긴급도) — Claude가 *바로 코드 안 짜고 멈춰서 묻기*
- Phase 2: 접근법 카드 — 추천 + 이유 + 다른 옵션 + Project/Product 축
- Phase 3: 적합한 sub-command로 위임 (tdd/tc/refactor/debug)

→ 막연한 작업이 *3단계 명확한 계획*으로 변환. *Claude Code가 기본으로 안 하는 멈춤*.

### 2. 설계 검증 필요할 때 — `/cfh-grill`

> "이 plan이 정말 맞는가?" 머릿속만으로는 위험 신호 못 잡음.

```
/cfh-grill 쿠폰 검증 plan
또는: /cfh-plan Phase 2 카드에서 (grill) 옵션 선택
```

- Phase 1: 결정 트리 enumerate — 도메인에 맞게 (FE: state 위치·에러 UX·캐싱·검증 위치 / BE: transaction boundary·idempotency·event ordering·error envelope) + *제외된 후보* 가시화 (자가검증)
- Phase 2: 한 가지씩 *깊이* 인터뷰. 매 질문 추천 + 이유 + 대안. 한 번에 하나만.
- Phase 3: 트리 walk 후 *의도 정렬*된 plan 완성

→ mattpocock grilling의 *relentless* 정신 + 자가검증(slot ≠ purpose)·ambiguous 응답 대기 등 cfh 어댑테이션.

### 3. 새 기능·새 모듈 시작 — `/cfh-tdd` / `/cfh-tdd-gen`

> "테스트 먼저 짜고 싶은데 의도 정리부터 막힘."

```
/cfh-tdd 쿠폰 검증 컴포넌트            # FE — RTL·MSW
/cfh-tdd-gen 결제 API idempotency       # non-FE — Arrange-Act-Assert
```

- Phase 1: Intent Interview 6 질문 — Happy path / Edge / Error / Out of scope / 관찰 방법
- Phase 2~5: 실패 테스트 → 구현 → 리팩터 + *AI 오버핏 방지 구조 디펜스*
- stack에 따라 자동 분기 — FE/non-FE 도구·관용구 다름

→ 테스트→구현 순서 강제. AI가 *테스트 통과만을 위한 hardcode*하는 패턴 차단.

### 4. 레거시 리팩터링 — `/cfh-refactor` / `/cfh-refactor-gen`

> "기존 코드 정리하고 싶은데 어디부터·어디까지?"

```
/cfh-refactor src/legacy/checkout       # FE — queryKey·tsc·RTL
/cfh-refactor-gen internal/retry/policy.go            # Go
/cfh-refactor-gen app/services/payment_service.py     # Python
/cfh-refactor-gen com/payment/PaymentService.java     # JVM — Strangler Fig
```

- Step 1: Scope Narrowing 8 질문 + 추천+이유 패턴
- Step 2~3: Project Profile + Blast Radius 분석 (string 참조·queryKey·DB schema·event topic 등)
- Step 4: Safety Net (Characterization Test 자동 권장)
- Step 5: Small PR 분할 (Vertical / Horizontal / Scaffolding / Adapter / Strangler Fig)

→ "한 PR에 너무 많이"·"안전망 없이 리팩터" 같은 흔한 실패 패턴 차단.

### 부가 시나리오

- **PR 리뷰**: `/cfh-review develop` → 규모별 1~7 서브에이전트 병렬 → `REVIEW.md`
- **원인 모를 버그**: 발화에 `500 에러` (server) · `hydration mismatch` (web) · `deadlock` · `OOM` · `asyncio race` 등 → `debug-investigator` 자동 → 5-Phase 증거 기반 조사
- **자산 만들기**: `/cfh-new skill <name>` (skill + mirror command 자동) / `/cfh-make` (자산 종류 분류 dispatcher) / `/cfh-team` (멀티 에이전트 팀 + orchestrator skill)
- **세션 인계**: `/cfh-progress` — `./PROGRESS.md`에 결정 로그·미해결·다음 단계 누적

---

## 자산 매트릭스 (한눈에)

### FE 전용

| 자산                                           | 목적                                              |
| ---------------------------------------------- | ------------------------------------------------- |
| `/cfh-tdd` + `tdd-first` skill                 | **새** React/Vue 컴포넌트 TDD (intent mode)       |
| `/cfh-tc`                                      | **기존** FE 파일 테스트 추가·보강 (artifact mode) |
| `/cfh-refactor` + `refactoring-strategy` skill | FE 리팩터 (queryKey·tsc·RTL)                      |

### non-FE 전반 (`-gen` suffix)

| 자산                                 | 목적                                                               |
| ------------------------------------ | ------------------------------------------------------------------ |
| `/cfh-tdd-gen` + `tdd-general` skill | **새** non-FE 자산 TDD (BE handler·CLI·library·mobile·embedded·ML) |
| `/cfh-tc-gen`                        | **기존** non-FE 파일 테스트 추가·보강                              |
| `/cfh-refactor-gen`                  | non-FE 리팩터 (DB schema·migration·observability·Strangler Fig)    |

### 메타 자산 — 자산 생성·orchestration

| 자산                                  | 목적                                                             |
| ------------------------------------- | ---------------------------------------------------------------- |
| `/cfh-new` + `skill-author` skill     | skill·command·agent 스캐폴드 (skill 시 mirror command 자동 생성) |
| `/cfh-make` + `asset-factory` skill   | 자산 종류 모를 때 3 질문 분류 dispatcher                         |
| `/cfh-team` + `cfh-harness` skill | 에이전트 팀 설계 (6 패턴 중 1)                                   |

### 인터뷰·인사이트

| 자산                                      | 목적                                               |
| ----------------------------------------- | -------------------------------------------------- |
| `/cfh-debug` + `debug-investigator` skill | 5-Phase 증거 기반 디버깅 (FE/BE 양쪽 키워드)       |
| `/cfh-review`                             | PR 7-agent 리뷰 (stack-aware)                      |
| `/cfh-grill` + `grilling` skill           | 결정 트리 깊이 파기 인터뷰 (mattpocock 어댑테이션) |
| `/cfh-plan`                               | 작업 dispatcher (목표→접근법 카드→실행/위임)       |

### 워크플로 보조

| 자산            | 목적                                                       |
| --------------- | ---------------------------------------------------------- |
| `/cfh-progress` | 프로젝트 진행 노트 — `./PROGRESS.md` 누적                  |
| `/cfh-retro`    | 작업 회고 영구 기록 — `~/.claude/.cfh-logs/retros/`        |
| `/cfh-feedback` | 스킬 피드백 — `~/.claude/.cfh-logs/<skill>.jsonl` (옵트인) |
| `/cfh-guide`    | 사용 가이드 출력                                           |
| `/cfh-trace`    | 발화→스킬 매칭 점수 미리보기                               |

설치된 자산의 자세한 description·트리거 키워드는 `cfh list`로 확인 (각 skill의 description은 frontmatter에서 출력).

---

## 설치

```bash
# 글로벌 (기본 — 모든 프로젝트에서 사용)
npm install -g @han-kyeon/claude-skills
cfh install

# 프로젝트 로컬 (팀 공유, git에 포함)
cd my-project
cfh install --target ./.claude

# 일부만
cfh install refactoring-strategy
cfh install --only skills
cfh install --dry-run            # 미리보기
```

확인:

```bash
cfh list                         # 글로벌 + 프로젝트 + mapping 컬럼
cfh list --global                # 글로벌만
cfh list --project               # 프로젝트만
```

업데이트·제거:

```bash
cfh update                       # 패키지 자산 갱신 (user-modified는 자동 skip)
cfh update --force               # 사용자 수정분 덮어쓰기 (warning 후 진행)
cfh remove tdd-first             # 제거
cfh adopt tdd-first              # managed → user-authored 전환 (cfh update 보호)
```

> **dev 워크플로**: 패키지 소스에서 직접 작업하려면 `npm link` 사용. (참고: `cfh install --link` flag는 0.16.x에서 제거됨 — dev iteration은 `npm link`로 통일.)

---

## 표준 사용법

### 새 기능 시작 — TDD

```
"TDD로 src/features/coupon/CouponInput.tsx 만들어줘"
→ tdd-first 자동 활성화 → Phase 1 Intent Interview

또는 명시 호출:
/cfh-tdd 쿠폰 검증 컴포넌트
```

백엔드·라이브러리·CLI는:

```
"FastAPI 엔드포인트 TDD로"
→ tdd-general 자동 활성화

또는:
/cfh-tdd-gen 결제 API idempotency key 적용
```

### 기존 코드 테스트 보강

```
/cfh-tc src/components/UserList.tsx       # FE
/cfh-tc-gen internal/retry/policy.go      # non-FE
```

> `/cfh-tdd`·`/cfh-tc`·`/cfh-tdd-gen`·`/cfh-tc-gen`은 **stack × mode 2×2 매트릭스**. 새 자산은 `tdd` 계열, 기존 보강은 `tc` 계열. 잘못 진입하면 deprecation warning + 대안 안내.

### PR 리뷰

```
/cfh-review develop
→ Tiny/Small/Medium/Large 분류 → 1~7 서브에이전트 병렬 → REVIEW.md
```

### 작업 dispatcher

```
/cfh-plan 결제 페이지에 쿠폰 검증 추가
→ Phase 1 Q1~Q4 (목표·성공·제약·긴급도) → Phase 2 접근법 카드 → Phase 3 실행
```

### 디버깅

```
"500 에러 — 원인 모르겠어"            # BE
"hydration mismatch 어디서 깨졌는지"  # FE
→ debug-investigator 자동 활성화 → 5-Phase Evidence-driven
```

### 자산 생성

```
/cfh-new skill my-skill                  # skill + mirror command 자동 생성
/cfh-new skill my-skill --no-mirror      # mirror 안 만들기
/cfh-make 우리 팀 PR 응답 자동화          # 자산 종류 모를 때 분류기
/cfh-team 결제 모듈 멀티 에이전트 팀       # 6 패턴 중 1 선택
```

### 결정 깊이 파기

```
/cfh-grill 쿠폰 검증 plan
→ 결정 트리 enumerate → 한 가지씩 인터뷰 (mattpocock relentless 정신)
```

---

## Soft routing suggestion (0.18.0)

호출한 명령은 **default 그대로 진행**, opposite stack 신호 강할 때만 **bold + 💡로 대안 제안** (강제 X — yes/switch/explain 선택):

```
입력: /cfh-tdd "결제 API 핸들러 idempotency key"

   📌 이대로 진행: tdd-first (FE 컴포넌트 TDD)
   💡 **더 적합해 보이는 대안 — /cfh-tdd-gen**
        신호: [inferred] 'API 핸들러' BE 키워드 / [inferred] 'idempotency' BE 패턴
   진행: yes / switch / explain
```

대상 페어: `/cfh-tdd ↔ /cfh-tdd-gen`, `/cfh-tc ↔ /cfh-tc-gen`, `/cfh-refactor ↔ /cfh-refactor-gen`. `/cfh-plan` Phase 2 approach card에는 _stack signal_ 추론 섹션 포함.

**휴리스틱 핵심**:

- FE 신호: `.tsx`·`.jsx`·`.vue` 확장자, `React`·`Vue`·`Next.js` 라이브러리, `hydration`·`INP`·`CLS` 키워드
- non-FE 신호: `.go`·`.py`·`.rs`·`.java`·`.kt`·`.swift` 확장자, `handler`·`endpoint`·`migration`·`idempotency`·`p95 latency` 키워드
- 결정 룰: opposite stack score ≥ current + 2 → suggestion 출력 (둘 다 약하면 출력 안 함, 정책 § 0.15.2 자가검증)

설치 후 더 자세한 휴리스틱·confidence marker·explain mode는 `~/.claude/commands/references/soft-routing.md`에서 확인.

---

## 자주 하는 질문

### Q. 스킬이 자동 트리거되지 않습니다

`cfh trace "<발화>"`로 매칭 점수 확인. description 키워드와 발화가 충분히 겹치는지 확인. 명시 호출(`/cfh-foo`)은 항상 자동 trigger를 이깁니다.

### Q. 두 skill이 같은 발화에 충돌해요

`cfh check skills --mapping`로 매핑 확인. trigger-overlap 경고가 있으면 description에 anti-trigger ("Do NOT trigger when ...") 추가.

### Q. cfh-tdd vs cfh-tdd-gen 어느 쪽을 쓰나요

- FE 컴포넌트(React/Vue) → `cfh-tdd`
- BE 핸들러·라이브러리·CLI·mobile·embedded·ML → `cfh-tdd-gen`
- 모호하면 Track 9 soft suggestion이 안내 (0.18.0+)

### Q. /cfh-tc로 새 컴포넌트 시작하면?

Track 8 (0.17.0)부터 `/cfh-tc`·`/cfh-tc-gen`은 **기존 파일 대상 한정**. 새 자산은 `/cfh-tdd`·`/cfh-tdd-gen`. 0.17.x 동안 deprecation warning + 정상 작동. 향후 major에서 자동 차단.

### Q. cfh check --strict 가 unknown field 에러를 뱉어요

1.0급부터 default가 strict — SKILL.md frontmatter의 unknown field가 ERROR. 옵션:

- frontmatter에서 해당 필드 제거
- `schemas/skill-frontmatter.json` 에 필드 추가 후 PR
- `cfh check schema --legacy` — 0.x style warn-only

### Q. cfh install --link 가 안 돼요

1.0급 polish에서 제거됨. dev 워크플로는 `npm link` 권장 (패키지 디렉터리에서 `npm link`, 사용 프로젝트에서 `npm link @han-kyeon/claude-skills`).

### Q. 자동화 스크립트 수정해야 하나요

알 됩니다. 구 명령(`cfh evolve`·`cfh log`·`cfh dashboard`·`cfh eval`·`cfh validate`·`cfh doctor` 등)은 한 사이클 동안 alias로 작동 + stderr deprecation warning. 시간 여유 있을 때 신 명령으로 갱신.

### Q. PROGRESS.md가 자동 생성됐어요. 안 생기게 하려면

자동 생성은 절대 안 됩니다 — `/cfh-progress init`로 사용자 명시 호출만 생성. 자동 생성됐다면 다른 누군가가 호출한 것. 삭제 후 `init` 안 부르면 됩니다.

### Q. 사용자가 작성한 스킬이 cfh update에 덮어써질까 봐 걱정됩니다

user-authored (manifest 없음) 또는 user-modified는 default skip됩니다. `--force`로 덮어쓰기 시 warning 출력 + 명시 진행. 보호 강화하려면 `cfh adopt <name>`으로 user-authored 전환.

### Q. CI에 통합하려면

```yaml
- run: npm install -g @han-kyeon/claude-skills
- run: cfh install
- run: cfh check --strict # schema + 진단 모두
- run: cfh dev eval --executor claude --report junit --output junit.xml
- uses: dorny/test-reporter@v1
  with: { path: junit.xml }
```

`cfh check --legacy` 옵션은 0.x style 호환 (1.0급 strict 우회). 자세한 명령은 `cfh --help`.

### Q. Monorepo·프로젝트별 다른 스킬 쓰기

```bash
cfh install --target ./packages/web/.claude       # 패키지별
cfh new skill my-team-skill --project             # 프로젝트 로컬
cfh list --project                                # 프로젝트 자산만
```

프로젝트 로컬(`./.claude/`)이 글로벌(`~/.claude/`)을 가립니다. `cfh check skills` 가 shadowing 감지.

---

## Migration Guide (0.x → 0.19.x)

0.16.x~0.19.x cycle은 명령 이름·subcommand 구조 정리 + skill 디렉터리 명명 정리가 핵심. **모든 구 명령은 한 사이클 동안 alias 유지** — 자동화 스크립트는 즉시 수정 불필요. 1.0급 안정성 도달 후 사용자 판단으로 1.0 promotion 시점에 alias 제거 단계 시작.

### Skill 디렉터리 rename (0.19.0)

원본 패키지(mattpocock·revfactory)와의 글로벌 네임스페이스 충돌 회피를 위해 2개 skill 디렉터리 rename:

| Before (≤ 0.18.x) | After (0.19+) |
|---|---|
| `~/.claude/skills/grill-me/` | `~/.claude/skills/grilling/` |
| `~/.claude/skills/harness-factory/` | `~/.claude/skills/cfh-harness/` |

**사용자 영향**:

| 측면 | 영향 |
|---|---|
| mirror command (`/cfh-grill`·`/cfh-team`) | **변화 없음** |
| 자동 trigger 발화 (description 키워드) | **변화 없음** |
| `cfh trace`·`cfh list` 출력의 skill 이름 | 변경 (자동화 스크립트가 `grill-me`·`harness-factory` 문자열 의존하면 영향) |

**0.18.x → 0.19.x 마이그레이션** (글로벌 설치 사용자):

```bash
# 1. 새 디렉터리 설치
cfh install --force

# 2. 구 디렉터리 manual 제거 (cfh install이 자동 제거 안 함)
rm -rf ~/.claude/skills/grill-me ~/.claude/skills/harness-factory

# 3. 확인
cfh list                       # grilling·cfh-harness 표시 + 구 이름 없음
cfh trace "grill 좀 해줘"       # grilling 매칭 확인
```

프로젝트 로컬 설치(`./.claude/`) 사용자도 동일 — `./.claude/skills/grill-me/`·`./.claude/skills/harness-factory/`를 manual 제거.

### 이름 변경 요약

```
# Feedback / evolution
cfh evolve [skill]              →  cfh feedback [skill]
cfh log <skill>                 →  cfh feedback log <skill>
cfh log --enable                →  cfh feedback enable

# Observability
cfh dashboard                   →  cfh stats
cfh cost                        →  cfh stats cost (cost는 alias만 유지)
cfh sentry --live               →  cfh sentry live
cfh sentry --install-hook       →  cfh sentry hook install

# Maintainer
cfh eval                        →  cfh dev eval

# Health checks
cfh validate                    →  cfh check schema
cfh doctor                      →  cfh check skills

# Removed
cfh install --link              →  removed (dev: npm link)
```

### TDD/TC mode 분기 (0.17.0 Track 8)

`/cfh-tc`·`/cfh-tc-gen`은 **기존 파일 대상**으로 한정. 새 컴포넌트·모듈은 `/cfh-tdd`·`/cfh-tdd-gen`:

| 기존 발화 (≤ 0.16.x)              | 새 발화 (0.17+)          | 자동 라우팅  |
| --------------------------------- | ------------------------ | ------------ |
| `/cfh-tc 컴포넌트 새로 짤건데`    | `/cfh-tdd 컴포넌트 새로` | tdd-first    |
| `/cfh-tdd UserList.tsx 보강`      | `/cfh-tc UserList.tsx`   | (cfh-tc)     |
| `/cfh-tc-gen 새 API 핸들러`       | `/cfh-tdd-gen 새 API`    | tdd-general  |
| `/cfh-tdd-gen 기존 retry.go 보강` | `/cfh-tc-gen 기존 retry` | (cfh-tc-gen) |

**Stack × Mode 매트릭스**:

|            | **intent** (새로) | **artifact** (기존) |
| ---------- | ----------------- | ------------------- |
| **FE**     | `/cfh-tdd`        | `/cfh-tc`           |
| **non-FE** | `/cfh-tdd-gen`    | `/cfh-tc-gen`       |

### Schema 검증 강화

1.0급부터 `cfh check schema`(구 `cfh validate`)는 default가 strict — SKILL.md frontmatter의 unknown field를 ERROR로 보고. 0.x 동작이 필요하면 `--legacy` flag.

### Deprecation 사이클

**Deprecation 정책 요약**:

- 0.16.x ~ 0.19.x: 구 명령·플래그·발화 작동 + stderr deprecation warning
- 1.0 promotion 후 한 사이클: alias 일괄 제거 (사용자 판단으로 시점 결정)
- BREAKING 차단 안 함 — 한 사이클 안에 자동화 스크립트 migration 권장
- 새 명령으로 갱신 시 *자기 환경*에서 `cfh check --strict`로 자동 검증 가능

### 적용 사이클 (Track 7·8·9)

| 마일스톤    | 범위                                                  | 상태                   |
| ----------- | ----------------------------------------------------- | ---------------------- |
| **0.16.3**  | Track 7 — audit-driven polish 8 항목                  | ✅ release             |
| **0.17.0**  | Track 8 — TDD/TC mode 분기 (intent×artifact 매트릭스) | ✅ release             |
| **0.18.0**  | Track 9 — Soft routing suggestion (bold 강조, 강제 X) | ✅ release             |
| **0.19.0**  | Skill 디렉터리 rename (`grilling`·`cfh-harness`) — 네임스페이스 충돌 회피 | ✅ release             |
| **0.20.0**  | Final Intent Confirm — 작업 실행 직전 답변 합산·모호 발화·충돌 자가검증 (6 자산) | ✅ release             |
| **0.21.0**  | Agent Communication Mode — subagent vs teams 명시 선택 (`cfh-harness`·`cfh-team`·`cfh-review`) | ✅ release             |
| **0.22.0**  | Team Suggestion + Adversary 패턴 — 6 자산 조건부 안내 (`why teams` lazy load) + 7번째 패턴 신설 | ✅ release             |
| **0.23.0**  | PROGRESS.md Audit — 6축 체크리스트 + Adversary side-effect (Tier 1·2, `/cfh-progress-audit` 신설) | ✅ release             |
| **0.23.1**  | cfh-plan Phase 2.5에 side-effect 게이트 (7 영역 카탈로그 자가 확인 + 조건부 Adversary hint) | ✅ release             |
| **0.23.x+** | 다음 audit run 결과 + 외부 사용자 feedback            | 베이킹 + 외부 검증     |
| **1.0.0**   | (사용자 판단 — 자동 게이트 아님)                      | 안정성 체크리스트 검토 |

각 마일스톤의 변경 내역은 `cfh list`로 설치된 자산을 확인 (각 자산의 `managed@<version>` 표시 + frontmatter description).

---

## 라이선스

MIT
