# @han-kyeon/claude-skills

> A **framework** for authoring, installing, and orchestrating Claude Code skills, slash commands, and team agents. FE-friendly starter assets + general-purpose meta-skills (skill authoring, team factory, asset dispatcher, evolution).

---

## 5분 시작 (Quick Win)

방금 설치하신 분을 위한 **첫 5분 흐름**입니다. 설치만 했다면 아래 5단계로 핵심 가치를 빠르게 체험하실 수 있습니다.

```bash
# 1. (30초) 설치 + 확인
npm install -g @han-kyeon/claude-skills
cfh install
cfh list                 # 7 skills + 17 commands 보이면 성공

# 2. Claude Code 세션 시작 (또는 재시작)
```

세션이 열리면 **대화창에 차례로 입력**:

```
(1) /cfh-guide overview
   → 이 도구가 무엇을 하는지 30초 안에 파악

(2) /cfh-trace "이 코드 리팩터링하고 싶어"
   → 어떤 스킬이 자동 트리거되는지 점수로 미리보기 (refactoring-strategy가 떠야 함)

(3) "TDD로 src/utils/foo.ts 짜고 싶어"
   → tdd-first 스킬 자동 활성화. Phase 0 Scope Narrowing부터 시작.
   → 답변 끝까지 따라가지 않고 중간에 빠져나와도 OK — 발동 흐름만 체감

(4) /cfh-make 팀 PR 응답 검증을 자동화하고 싶어
   → asset-factory dispatcher가 3 분류 질문으로 skill/command/team 중 무엇이 맞는지 결정

(5) /cfh-plan 막연한 작업 — 어디부터 시작할지 모름
   → 목표·성공 기준·제약 받고 접근법 카드 제안

(6) /cfh-feedback tdd-first "인터뷰 중 어색했던 점 짧게"
   → 피드백은 `~/.claude/.cfh-logs/`에만 저장 (외부 전송 없음).
   → cfh evolve가 이 기록을 분석해 스킬 개선 제안을 만듭니다.
```

위 6단계만 거치면 이 패키지의 **4대 핵심**(자동 트리거 / dispatcher / 자산 작성 / 피드백 루프)을 모두 만져보신 셈입니다. 다음은 [표준 사용법](#표준-사용법) 섹션이나 본인 상황에 맞는 [시나리오 가이드](#언제-무엇을-쓰나--시나리오-가이드)로 가시면 됩니다.

> 익숙해지시면 `cfh-guide`·`cfh-trace`·`cfh-make`·`cfh-plan`·`cfh-feedback` 5개 슬래시 커맨드만 기억하셔도 95% 커버됩니다.

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
npm install -g @han-kyeon/claude-skills

# 2. 번들 스킬·커맨드를 ~/.claude에 설치
cfh install

# 3. Claude Code 재시작 후 아래를 대화에 던져보기
#    (자동 트리거) "리팩터링 도와줘"  → refactoring-strategy 발동
#    (자동 트리거) "TDD로 시작하자"   → tdd-first 발동
#    (수동 호출)   /cfh-refactor src/components/Button.tsx
#    (수동 호출)   /cfh-tdd src/utils/format.ts
#    (수동 호출)   /cfh-review develop      (PR 리뷰)
#    (메타)        /cfh-new skill my-auth-flow  (새 스킬 대화형 작성)
#    (메타)        /cfh-team                (팀 에이전트 자동 생성)
#    (유틸)        /cfh-trace "리뷰 좀"     (발화가 어느 스킬을 트리거할지 시뮬레이션)
#    (dispatcher) /cfh-make                (무엇을 만들지 모를 때 — 자산 분류부터)
#    (dispatcher) /cfh-plan                (작업 목표를 상의하고 접근법부터 — 명시 호출만)
#    (dispatcher) /cfh-debug               (버그·장애·성능·회귀 조사 — 증거 주도)
```

---

## 표준 사용법

`@han-kyeon/claude-skills`의 공식 "이렇게 쓰세요" 플로우입니다. 다음 섹션의 시나리오 가이드와 커맨드 선택 가이드는 이 표준 안에서 움직입니다. 처음이시면 이 섹션만 먼저 훑고 시작하셔도 됩니다.

### 3 원칙

#### 원칙 1 — 프로젝트 로컬 우선

팀·프로젝트 고유 규약은 **항상 `./.claude/`에 작성**하고 git에 커밋합니다. 개인 취향(네이밍·테스트 스타일)만 `~/.claude/` 전역에 둡니다. 런타임에서도 프로젝트 로컬이 전역을 이깁니다.

- ✅ `cfh new skill payment-rules --project`
- ✅ `cfh generate reviewer-team` (기본이 프로젝트 로컬)
- ❌ 팀 규약을 전역(`~/.claude/`)에만 두기 — 팀원이 못 봄, git 추적 안 됨

#### 원칙 2 — 자산 작성 전에 분류

무엇을 만들지 확정되지 않은 상태로 `cfh new` 스캐폴드부터 찍지 않습니다. 다음 우선순위로 진입하세요.

1. 확정됨(skill / command / team) → `/cfh-new`, `/cfh-team`, `cfh generate` 직접
2. 모호함 → `/cfh-make`로 3 분류 질문 먼저
3. 일회성 작업 → 스킬 만들지 말고 Claude에게 바로 요청

#### 원칙 3 — 보호는 명시적으로

번들 스킬을 편집하셨다면 반드시 `cfh adopt`로 **user-authored 전환을 명시**하세요. 그렇지 않으면 `cfh update`가 덮어쓸 수 있습니다.

- `cfh diff <name>` — 내가 뭘 바꿨는지 먼저 확인
- `cfh adopt <name>` — 보호 확정 (y/N 확인 있음)
- `cfh doctor` — 주기적으로 고아 manifest·트리거 충돌 점검

---

### 생명주기 5 단계

#### 단계 1 — 셋업 (설치 직후 1회)

```bash
npm install -g @han-kyeon/claude-skills
cfh install                      # 번들 4 스킬 + 8 커맨드 설치
cfh doctor                       # 초기 상태 점검
cfh list                         # 설치 확인
```

**확인 기준**: `cfh doctor` 결과에 error가 없을 것. warning은 이 단계에서 모두 허용.

**선택**: 심볼릭 링크 방식이면 `cfh install --link` — npm update 시 자동 반영. 단, 커스터마이징은 불가.

---

#### 단계 2 — 프로젝트 온보딩 (새 프로젝트 진입 시 1회)

```bash
cd <project>
cfh list --project               # 프로젝트 로컬 기존 자산 확인
```

**선택지 분기**:

- 프로젝트에 이미 `.claude/`가 있음 → 기존 자산을 **편집·확장** (새로 만들지 않음). `cfh doctor`로 상태 확인.
- 프로젝트에 `.claude/`가 없음 → 아래 중 **필요한 것만** 생성:
  - 팀 규약·도메인 규칙을 Claude가 자동 적용해야 함 → `/cfh-new skill our-conventions --project`
  - PR 리뷰를 다축(보안·성능·a11y·타입)으로 하고 싶음 → `cfh generate reviewer-team`
  - 실패 비용 크고 TDD 오버핏 우려 → `cfh generate producer-reviewer`
  - 뭘 만들지 모름 → `/cfh-make`로 분류부터

**마무리**:
```bash
cfh validate                     # 생성된 자산 검증
git add .claude
git commit -m "chore: add Claude Code harness"
```

이 단계 이후 팀원들은 `git pull` + Claude Code 재시작만 하면 됩니다.

---

#### 단계 3 — 데일리 (매 작업)

작업 성격별로 **시나리오 가이드(다음 섹션) 중 하나를 고르는 것**이 기본 동작입니다. 막막하시면 아래 3개 중 하나로 시작:

- `/cfh-guide overview` — 이 도구의 전체 그림을 대화로 받기
- `/cfh-make <한 줄 요구사항>` — **재사용 자산** 만들기(skill/command/team) — dispatcher가 분류해 메타-스킬로 위임
- `/cfh-plan <작업 목표>` — **실제 작업** 시작 — 목표 캡처·접근법 상의 후 전용 커맨드로 위임 또는 직접 실행 (명시 호출 전용)

**자동 트리거를 신뢰**: "리팩터링해줘", "TDD로 시작", "스킬 만들어줘" 같은 발화만으로도 해당 스킬이 자동 활성화됩니다. 명시적 슬래시 커맨드는 자동 트리거가 안 뜨거나 특정 인자를 넘기고 싶을 때 사용합니다.

**하지 말아야 할 것**:
- 매번 `cfh install`·`cfh update` 실행 — 설치는 1회, 갱신은 단계 4에서.
- Claude 대화 밖에서 SKILL.md 직접 열어 편집 — 대신 `/cfh-new` 또는 `/cfh-make`로 인터뷰 통해 설계.

---

#### 단계 4 — 주기 점검 (주 1회 또는 패키지 업데이트 후)

```bash
npm update -g @han-kyeon/claude-skills
cfh update                       # managed 항목만 갱신 (user-authored는 자동 보호)
cfh doctor                       # 새 오류·trigger 충돌 감지
```

**옵트인 하신 경우 추가**:
```bash
cfh evolve                       # 사용 로그 + 정적 분석 기반 개선 제안
```

**확인 기준**:
- `cfh update` 후 "skipped N user-authored" 메시지 — 내 스킬이 그대로인지 확인
- `cfh doctor`에서 새로 생긴 warning이 있다면 원인 추적 (업스트림 변경 때문인지)
- `cfh evolve` 제안 중 공감되는 것만 골라 SKILL.md 수동 편집

---

#### 단계 5 — 장기 관리 (분기·반기)

이 시점에는 사용자 편집·생성 자산이 쌓여 있습니다. 정리 타이밍입니다.

```bash
cfh list                         # 전체 현황 — managed/user-authored/user-modified 분포 확인
cfh diff <편집한 번들 스킬>       # 어떤 파일을 바꿨는지
cfh adopt <편집한 번들 스킬>      # user-authored로 영구 전환 (update에서 제외)
cfh remove <안 쓰는 스킬>         # 정리
```

**팀 공유·아카이빙**:
- 프로젝트 로컬 `.claude/`에 팀 공유 가치가 있다면 git commit + PR
- 개인 전역 `~/.claude/`에서 팀 공유 가치 있는 것은 `cfh new skill <name> --project`로 **재작성**하여 프로젝트로 이동 (카피만 이동해도 되지만, 원칙 1에 따라 프로젝트 컨텍스트로 새로 설계하는 것이 더 나음)

---

### 핵심 체크포인트 — 멈추고 확인해야 할 순간

**① 새 스킬 작성 직전**
```bash
cfh trace "<이 스킬이 떠야 할 대표 발화>"
```
- 기존 스킬이 먼저 떠오르면 description이 겹치는 것 — 새로 만들지 말고 기존 확장 검토.
- 아무것도 안 뜨면 정상. 새 스킬 작성 진행.

**② PR 올리기 직전**
```bash
/cfh-review develop
```
- Critical·High 지적 해소하지 않으면 머지 금지 (내부 가이드).
- `Questions to Resolve`가 있으면 모호한 의도 — 리뷰어에게 묻기 전에 본인이 먼저 답해두기.

**③ 대규모 리팩터 직전**
- `Safety net(테스트)` 존재 여부 확인. 없으면 **Step 5 진행 전 반드시 Characterization Test 작성** (`/cfh-refactor`가 자동으로 안내합니다).
- 작은 PR로 쪼갤 수 없는 변경이면 범위가 잘못됐다는 신호 — Scope 재질문.

**④ 팀(에이전트 팀) 도입 직전**
- Q4 실패 비용이 (c) 운영 장애/데이터 손실이면 **Producer-Reviewer 강제** (단일 팀이 생성·검증을 겸하면 오버핏 위험).
- 에이전트 5개 넘으면 Hierarchical 재편 검토 — 1 레벨로 나열하면 관리 비용이 작업 비용 초과.

---

### 한 장 요약

```
설치 (1회)          → cfh install → cfh doctor → cfh list
프로젝트 진입 (1회)  → cd <proj> → cfh list --project → 필요 자산 생성 → git commit
매 작업             → 시나리오 가이드 또는 /cfh-make → /cfh-* 실행
주 1회              → cfh update → cfh doctor → (옵션) cfh evolve
분기·반기           → cfh diff → cfh adopt → cfh remove → 팀 공유 정리

원칙:
  1. 프로젝트 로컬 우선 (팀 공유는 ./.claude/ + git)
  2. 자산 작성 전에 분류 (/cfh-make 또는 확정된 엔트리로)
  3. 보호는 명시적으로 (cfh adopt로 user-authored 전환)
```

---

## 언제 무엇을 쓰나 — 시나리오 가이드

본인의 상황에 맞는 시작점을 찾으실 수 있도록 전형적인 8가지 시나리오를 정리했습니다. 상황이 복합적이거나 어느 것도 맞지 않으시면 `/cfh-make`로 시작하시면 Claude가 분류해드립니다.

### 1. 신규 기능 개발

**상황**: 새 기능을 처음부터 설계·구현. 요구사항은 있지만 테스트도 코드도 아직 없음.

**추천 흐름 (FE)**:
```
1. /cfh-tdd src/features/newFeature.ts
   → Phase 0 범위 좁히기 (7 질문) → Phase 1 의도 인터뷰 (6 질문)
   → Phase 2 테스트 아웃라인 승인 → Phase 3 실패 테스트 커밋
   → Phase 4 최소 구현 → Phase 5 리팩터 + 의도 보존 체크

2. (선택) 도메인 규칙이 복잡하면 시작 전에
   /cfh-new skill our-payment-rules --project
   → 팀·도메인 규약을 스킬로 미리 내려두면 이후 Claude가 자동 적용

3. 기능 완성 후
   /cfh-review develop
   → diff 규모 기반 1~5 서브에이전트로 자체 PR 리뷰
```

**추천 흐름 (BE — Node·Python·Go)**:
```
1. /cfh-tdd-gen src/api/users/createUser.ts
   → tdd-general 스킬: framework-agnostic 5 Phase
   → Test Outline은 Arrange-Act-Assert 또는 given-when-then
   → 스택별 관용구 자동 적용 (vitest/pytest/go test)

2. (선택) /cfh-new skill our-api-conventions --project
   → 응답 형식·에러 처리·검증 컨벤션을 스킬로

3. PR 전 /cfh-review develop
   → stack_kind=backend-* 감지 시 SQL injection·N+1·트랜잭션 등 BE 안티패턴으로 분석
```

**언제 팀을 만드나**: 실패 비용이 크거나(결제·인증·의료) 테스트 오버핏이 우려되는 경우 `cfh generate producer-reviewer`로 생성자·검증자 인격 분리.

---

### 2. UI 개발

**상황**: React/Vue 컴포넌트, 인터랙션, 접근성.

**추천 흐름**:
```
1. 컴포넌트 구현 (자유 작성 또는 /cfh-tdd로 TDD)

2. /cfh-tc src/components/Button/Button.tsx
   → 파일 존재 감지 → Test-Fill Mode 또는 TDD Mode 자동 선택
   → Testing Library 쿼리 우선순위(getByRole > getByLabelText > …)
   → userEvent 기반, a11y 테스트 포함

3. PR 전 /cfh-review develop
   → Medium+ diff면 Convention·Logic·Test·Performance·Security 5축
```

**팀 옵션**: UI 전용 다축 리뷰 원하시면 `cfh generate reviewer-team` (security/perf/a11y/types). 특히 접근성이 중요한 프로젝트에서 유용합니다.

**장기 투자**: 디자인 시스템·네이밍 규약이 있으면 `/cfh-new skill our-ui-patterns --project`로 스킬화 — 매번 설명 반복하실 필요 없어집니다.

---

### 3. 테스트 코드 개발 (기존 코드 보강)

**상황**: 구현은 이미 있고, 테스트 커버리지가 부족함.

**FE 추천 흐름**:
```
1. /cfh-tc src/legacy/validateCoupon.ts
   → Test-Fill Mode 자동 전환 (파일 존재 감지)
   → Phase 0 현재 동작 관찰 (Characterization Test 접근)
   → Priority 1~5 시나리오 설계 (Core → Async → Edge → A11y → Integration)

2. 테스트 작성 중 버그 발견 시
   → `// BUG:` 주석만 달고 수정은 별도 PR (Characterization 원칙)
```

**BE 추천 흐름**:
```
1. /cfh-tc-gen src/services/auth.ts
   → tdd-general 기반 — 스택 감지(Node/Python/Go/...) 후 관용구 적용
   → Priority 1~5 (Core → IO → Edge → Error → Integration)
   → DI 우선·외부 IO만 mock·private 메서드 직접 호출 금지

2. test container·in-memory DB 검토 (격리된 통합 테스트)
```

**자동 트리거**: "테스트 보강해줘" / "커버리지 올리고 싶어" 같은 발화만으로 `tdd-first`(FE) 또는 `tdd-general`(BE) 스킬이 뜹니다 — 스택 컨텍스트로 자동 분기.

---

### 4. TDD 개발

**상황**: 설계를 테스트로 먼저 표현하고 싶음. 오버핏 방지가 중요.

**추천 흐름 (FE)**:
```
1. /cfh-tdd src/utils/format.ts
   → Phase 0 범위 좁히기 → Phase 1 의도 인터뷰 (6 질문)
   → Phase 2 describe/it 제목 승인 → Phase 3 실패 테스트
   → Phase 4 최소 구현 (테스트 수정 금지, hard-code 분기 금지)
   → Phase 5 리팩터 + 의도 보존 체크 (Phase 1 답변 재확인)

2. 오버핏 위험 구간이면 팀 구성
   cfh generate producer-reviewer
   → Producer 에이전트는 구현, Reviewer 에이전트는 스펙 대비 검증
```

**추천 흐름 (BE — Node·Python·Go)**:
```
1. /cfh-tdd-gen src/services/auth.ts
   → tdd-general 5 Phase (framework-agnostic)
   → Test Outline은 Arrange-Act-Assert 또는 given-when-then
   → table-driven 테스트 권장 (it.each·parametrize·t.Run+slice)
   → DI 우선·외부 IO만 mock·private 메서드 직접 호출 금지

2. 시간·랜덤·환경변수 등은 모두 인자로 주입
   → Date.now·time.time·os.environ 직접 사용 금지
```

**자동 트리거**: "TDD" / "테스트 먼저" / "red-green" 발화 → `tdd-first` 자동.

**오버핏 방지 5룰**: 테스트 잠금 / Writer·Implementer 분리 / 행동 기반 assertion / Property-based 보강 / 의도 보존 체크. 상세는 `~/.claude/skills/tdd-first/SKILL.md`.

---

### 5. 리팩토링

**상황**: 기존 코드의 구조 개선. 행동 보존 필수.

**추천 흐름**:
```
1. /cfh-refactor src/legacy/patient-api
   → Step 1 Scope Narrowing (8 질문)
   → Step 2 Project Profile 스캔
   → Step 3 Blast Radius 분석 (import·타입·간접 참조·테스트 의존)
   → Step 4 Safety Net (테스트 없으면 Characterization Test 먼저)
   → Step 5 Small PR 계획 (50~200줄, 5파일 이내로 쪼갬)
   → Step 6~8 각 PR 실행·검증·보고

2. 리팩터 중 Scope 외 이슈 발견
   → TODO 주석 금지, Issue 트래커로 분리
```

**5대 원칙**:
- 작은 PR (하나의 주제만)
- 행동 보존 (테스트/타입 안전망 필수)
- Blast Radius 먼저 파악
- Legacy 허용 (범위 밖은 Issue로)
- 라이브러리 공식 기준만 (취향 금지)

**주의**: 테스트가 전혀 없는 영역은 **Step 5 진행 전 반드시** Characterization Test. 안 그러면 "동작이 바뀌었는지 아무도 모름" 상태.

---

### 6. 최적화 (성능)

**상황**: 렌더링·런타임·번들 사이즈·DB 쿼리 개선.

**추천 흐름**:
```
1. 현황 파악 — /cfh-review (4-옵션 인터뷰에서 (b) 최근 N 커밋 또는 (c) 특정 범위 선택)
   stack_kind 자동 감지로 FE는 리렌더·번들·INP, BE는 N+1·트랜잭션·캐시 분석

2. 집중 최적화 팀 필요 시
   - FE: cfh generate reviewer-team (perf-reviewer 편집해 React Query staleTime, RHF watch 등 프로젝트 규칙 추가)
   - BE: cfh generate reviewer-team-backend (perf-reviewer가 N+1·missing index·blocking IO 감지)

3. 구조적 성능 리팩터면 /cfh-refactor
   → Blast Radius 분석에서 "성능" 축 명시하면 적절한 safety net 제안
```

**측정 없는 최적화 금지**: Chrome DevTools·React Profiler·EXPLAIN ANALYZE·load test 결과 근거로만.

**주의**: 측정 없는 최적화는 금지. Chrome DevTools·React Profiler·번들 분석 결과를 근거로 지적하도록 `refactoring-strategy`와 `/cfh-review`가 요구합니다.

---

### 7. 프로젝트 온보딩 (팀 규약 내리기)

**상황**: 새 프로젝트에 투입되거나, 기존 프로젝트에 Claude Code 규약을 처음 도입.

**추천 흐름**:
```
1. 진단부터
   cd <project>
   cfh list --project          # 이미 있는 프로젝트 로컬 자산 확인
   cfh doctor                  # 문제 감지

2. 프로젝트 규약 스킬화
   /cfh-new skill our-conventions --project
   → Pre-scan이 CLAUDE.md·package.json·기존 코드 샘플을 먼저 읽고
     초안 답변을 만들어 드림 → 사용자는 확인만

3. PR 리뷰 팀 세팅 (선택)
   cfh generate reviewer-team
   → 각 에이전트 .md 편집해 프로젝트 고유 규칙 반영
   git add .claude && git commit -m "chore: add Claude Code team harness"

4. 일회성으로 점검
   /cfh-trace "이런 PR이 오면"    # 어느 스킬이 트리거될지 미리 확인
```

---

### 8. 자동화하고 싶은데 무엇을 만들지 모를 때

**상황**: "이런 반복 작업 줄이고 싶은데 skill인지 command인지 팀인지 모르겠다."

**추천**:
```
/cfh-make 팀 API 에러 처리 규약을 claude가 자동 적용하게

→ asset-factory 메타-스킬이
  Phase 1: Intent Capture
    Step 1a 한 문장 요구사항 ($ARGUMENTS 또는 질문)
    Step 1b Scoped Pre-scan — 요구사항 토큰과 30%+ 겹치는 기존 자산만 노출
    Step 1c 3 분류 질문 (반복성 / 협업 / 트리거 방식)
  Phase 2: skill-author / harness-factory / 인라인 커맨드 중 위임
```

**언제 쓰지 말아야**: 만들려는 게 skill·command·team 중 이미 확정됐다면 `/cfh-new`·`/cfh-team` 직접. 일회성 요청이면 그냥 Claude에게 바로 말하시면 됩니다.

---

### 9. 복잡한 작업을 어떻게 시작할지 모를 때 (작업 상의)

**상황**: "작업을 해야 하긴 하는데 어느 스킬을 써야 할지, 어디부터 시작할지 정리가 안 된다."

**추천**:
```
/cfh-plan legacy 결제 모듈에 쿠폰 검증 로직 추가

→ 3 Phase (목표 먼저, 스캔은 목표 기반으로)
  Phase 1 Intent Capture
    Step 1a Q1 목표 한 문장 ($ARGUMENTS 또는 질문)
    Step 1b Scoped Pre-scan — 목표에 필요한 영역만 (CLAUDE.md·대상 파일·package.json scripts)
    Step 1c Q2-Q4 (성공 기준 / 제약·out-of-scope / 긴급도)
  Phase 2 Approach Proposal: 태스크 분류 + 접근법 카드 (사용자 승인)
  Phase 3 Execution: /cfh-tdd·/cfh-refactor·/cfh-tc·/cfh-review 중 위임 또는 직접 실행
```

**특징**: **명시 호출 전용**, 자동 트리거 없음. 자연어 대화가 충분한 가벼운 작업을 방해하지 않습니다.

**언제 쓰지 말아야**:
- 작업 종류 이미 확정 (`/cfh-tdd`·`/cfh-refactor` 등 직접)
- 가벼운 일회성 요청 (자연어로 대화)
- 자산을 만드는 게 목적 (`/cfh-make`)

**/cfh-make와의 차이**: `/cfh-make`는 "Claude Code 자체 확장(skill/command/team 생성)", `/cfh-plan`은 "실제 코드·기능 작업 실행"입니다.

---

### 10. 버그·장애·성능·회귀 조사 *(0.8.0)*

**상황**: 증상은 보이는데 **원인이 불분명**. 수정부터 시작하면 위험.

**추천 흐름**:
```
/cfh-debug 프로덕션에서 쿠폰 적용 시 간헐 500 에러

→ 5 Phase 조사
  Phase 0 증거 수집: 증상·재현·영향·시점·환경 + 유형 분류(버그/장애/성능/회귀)
  Phase 1 Context Scan: git log·blame·관련 PR·스택 파일 scoped 스캔
  Phase 2 가설 나열: 최소 3개 가설 + 각 확인 방법
  Phase 3 체계적 검증: 재현 테스트·git bisect·profiler
  Phase 4 근본 원인 + 수정 계획: hotfix vs proper fix 선택
       → /cfh-plan 또는 /cfh-tdd로 위임
```

**언제 쓰지 말아야**:
- 이미 원인을 아는 경우 → `/cfh-plan`으로 바로
- 단순 오타·간단 수정 → 자연어로 바로

**`/cfh-plan`과 차이**: `/cfh-plan`은 **목표 주도**(뭘 할지 안다), `/cfh-debug`는 **증거 주도**(뭐가 잘못됐는지 찾아야 한다).

**특징**:
- 4 유형 지원: 기능 버그 / 장애·인시던트 / 성능 이슈 / 회귀
- 장애 유형에서 rollback 가능 + 고심각도면 **조사 전에 rollback 먼저** 권고
- 최소 3개 가설 강제 (확증 편향 방지)
- Phase 4 수정 계획은 **계획만** — 실제 수정은 `/cfh-plan` 등에 위임
- 조사 내역 `DEBUG-LOG.md` 또는 Issue에 기록 권장

---

## 커맨드·CLI 선택 가이드

### 슬래시 커맨드 (Claude Code 대화 중)

| 상황 | 추천 | 언제 쓰나 | 대안 |
|---|---|---|---|
| 새 기능 구현 (FE) | `/cfh-tdd <file>` | React/Vue 컴포넌트·훅·유틸 TDD | 자유 작성 + `/cfh-tc`로 뒤에 테스트 보강 |
| 새 기능 구현 (BE/일반) | `/cfh-tdd-gen <file>` | 백엔드·라이브러리·CLI TDD | `/cfh-tdd` (잘못된 스택 권유 시 안내) |
| 기존 코드 테스트 (FE) | `/cfh-tc <file>` | 구현 있고 RTL 테스트 추가 | — |
| 기존 코드 테스트 (BE/일반) | `/cfh-tc-gen <file>` | 구현 있고 BE/라이브러리 테스트 추가 | — |
| 스킬 사용 피드백 기록 | `/cfh-feedback <skill> "<comment>"` | 사용 중·후 즉석 피드백 (옵트인) | `cfh log <skill> --event ...` (CLI 직접) |
| 코드 구조 개선 | `/cfh-refactor <target>` | 행동 변경 없는 리팩터 | 버그 수정이면 일반 대화 |
| PR 리뷰 | `/cfh-review [branch]` | 머지 전 자체 점검 | 외부 코드 리뷰 먼저 받고 보조로 사용 |
| 새 스킬 만들기 (확정) | `/cfh-new skill <name>` | skill이 필요한 게 확실할 때 | — |
| 팀 구성 (확정) | `/cfh-team [domain]` | 다축 리뷰·생성-검증 분리가 확정 | `cfh generate <preset>`이 더 빠를 수 있음 |
| 뭘 만들지 미정 | `/cfh-make [요구사항]` | 만들고 싶은데 skill/command/team 구분 안 설 때 | — |
| 작업 어떻게 시작할지 상의 | `/cfh-plan [목표]` | 복합·모호한 작업의 목표·접근법 정리 후 실행 (명시 호출만) | 확정이면 해당 작업 커맨드 직접 |
| 원인 불명 이슈 조사 | `/cfh-debug [증상]` *(0.8.0)* | 버그·장애·성능·회귀의 증거 주도 조사 (명시 호출만) | 원인 이미 알면 `/cfh-plan` |
| **작업 회고 영구 기록** | `/cfh-retro [본문]` *(0.9.0)* | 직전 turn의 🔄 Retro 블록을 `~/.claude/.cfh-logs/retros/`에 저장. Stop 훅으로 자동 트리거 가능 | `/cfh-feedback` (스킬 자체 의견) |
| **프로젝트 진행 노트** | `/cfh-progress [init\|append\|show]` *(0.10.0)* | 결정·다음 단계·미해결 질문을 `./PROGRESS.md`에 누적 — 다음 세션·팀원 인계용 | `/cfh-retro` (작업 한 건 회고) |
| 트리거 디버깅 | `/cfh-trace "<발화>"` | description 조정 중일 때 | `cfh doctor`로 overlap도 함께 |
| 가이드 | `/cfh-guide [topic]` | 사용법 확인 | 이 README |

### CLI 커맨드 (터미널)

| 상황 | 커맨드 | 언제 쓰나 |
|---|---|---|
| 첫 설치 | `cfh install` | npm 전역 설치 직후 1회 |
| 심볼링크 설치 | `cfh install --link` | npm update 자동 반영 원할 때 |
| 패키지 갱신 후 | `cfh update` | `npm update` 뒤에. managed만 갱신 |
| 설치 현황 | `cfh list` | 뭐가 설치돼 있고 어떤 상태인지 |
| 프로젝트만 보기 | `cfh list --project` | 프로젝트 로컬 `.claude/`만 |
| 검증 | `cfh validate` | 편집 후, CI 파이프라인 |
| 스캐폴드 (빠름) | `cfh new <kind> <name>` | 인터뷰 없이 골격만 필요할 때 |
| 팀 프리셋 | `cfh generate <preset>` | 3종(producer-reviewer/pipeline/expert-pool) 중 하나에 맞을 때 |
| 제거 | `cfh remove <name>` | 더 이상 필요없는 managed 자산 |
| **편집 보호** | `cfh adopt <name>` | 번들 스킬을 내 것으로 편집한 뒤 업데이트에서 보호 |
| **변경 확인** | `cfh diff <name>` | 내가 뭘 바꿨는지 확인 |
| **전체 점검** | `cfh doctor` | 트리거 충돌·고아 manifest·shadowing 진단 |
| **트리거 확인** | `cfh trace "<발화>"` | 어느 스킬이 매칭될지 미리보기 |
| **키워드 검색** | `cfh search "<키워드>"` *(0.7.0)* | 설치 자산을 name·description·본문 검색 |
| **자산 편집** | `cfh open <name>` *(0.7.0)* | $EDITOR로 SKILL.md·command 열기 |
| **자산 내보내기** | `cfh export` *(0.7.0)* | user-authored 자산을 JSON 번들로 |
| **자산 가져오기** | `cfh import <bundle.json>` *(0.7.0)* | 번들을 풀어 설치 |
| **로깅 제어** | `cfh log --enable/--disable/--status` | 옵트인 텔레메트리 제어 |
| **이벤트 기록** | `cfh log <skill> --event --utterance --helpful` | 사용 패턴 수집 |
| **스킬 제안** | `cfh evolve [<name>]` | description·원칙 개선 포인트 제안 |
| **토큰 비용 집계** | `cfh cost` *(0.10.0)* | Claude Code transcript에서 토큰 사용량을 명령·일자·모델·세션별로 집계. 새 텔레메트리 수집 없이 기존 데이터 read-only |
| **스킬 eval** | `cfh eval [skill]` *(0.10.0)* | 스킬 케이스 (`prompt + assertions`) 기반 검증. `--dry-run`(기본) / `--manual` / `--executor claude` / `--baseline` |
| **변형 비교** | `cfh eval --variants <file>` *(0.11.0)* | description A/B/C 변형의 trace 점수 비교 (LLM 호출 없음) |
| **JUnit 리포트** | `cfh eval --report junit` *(0.11.0)* | CI PR 체크용 JUnit XML 출력 |
| **통합 대시보드** | `cfh dashboard` *(0.11.0)* | cost+sentry+eval coverage+trend markdown 리포트 |
| **회귀 진단** | `cfh cost --since-commit <hash>` *(0.12.0)* | git commit 시점 기준 토큰 비교 |
| **staleness 감지** | `cfh diff --skills-vs-evals` *(0.12.0)* | SKILL.md > evals mtime인 스킬 |
| **스킬 fork** | `cfh new skill <name> --from-existing <other>` *(0.12.0)* | 기존 스킬 복제 + TODO 마커 |
| **자동 감시** | `cfh watch [--doctor]` *(0.12.0)* | 파일 변경 시 validate 자동 재실행 |
| **schema 린트** | `cfh validate --strict` *(0.12.0)* | frontmatter schema 엄격 검증 |

**굵은 글씨**는 0.3.0 신규 명령입니다.

### 결정이 어려울 때 순서

1. **아무것도 모르겠다** → `/cfh-guide overview`
2. **작업을 어떻게 시작할지 모르겠다** → `/cfh-plan <목표>`
3. **자산(skill/command/team)을 만들고 싶은데 뭘 만들지 모르겠다** → `/cfh-make <요구사항>`
4. **무엇이 어디에 있나** → `cfh list` (전역+프로젝트), `cfh doctor` (문제 진단)
5. **내 발화가 안 먹힌다** → `cfh trace "<발화>"` → description에 키워드 보충 → `cfh evolve`로 보강 포인트 확인
6. **번들 스킬을 내 것으로 만들고 싶다** → `cfh diff <name>` → `cfh adopt <name>`
7. **새 프로젝트 온보딩** → 시나리오 7번 흐름 따라가기

---

## 번들 자산 전체 목록

### Skills (`skills/`)

| 스킬 | 트리거 | 역할 |
|---|---|---|
| `refactoring-strategy` | "리팩터링", "refactor", "legacy cleanup" | Small PR · Blast Radius · Characterization test · 라이브러리 공식 안티패턴 |
| `tdd-first` | "TDD", "테스트 먼저", 새 기능/버그 시작 | **FE-friendly** TDD 5 Phase (RTL·userEvent 관용구) — Intent Interview → Test Outline → Failing Test → Implement → Refactor |
| `tdd-general` *(0.6.0)* | "TDD without React", "백엔드 TDD", "라이브러리 TDD" | **Framework-agnostic** TDD — 동일 5 Phase, 스택 중립 (Node·Python·Go·Rust·Java). Arrange-Act-Assert·DI·table-driven |
| `skill-author` | "스킬 만들", "create a skill", "write a skill" | 인터뷰 기반 SKILL.md 작성 메타-스킬 (6 Phase: Pre-scan + 조건부 follow-up + Sanity check + (z) 모르겠음 fallback) |
| `harness-factory` | "팀 에이전트", "agent team", "build a harness" | 6 패턴 중 선택해 `.claude/agents/` + `.claude/skills/` 생성 (7 Phase: Pre-scan + 기본 6 질문 + Deep-dive 3지선 + Sanity check R1~R8) |
| `asset-factory` | "자동화해줘", "뭔가 만들고 싶은데", "automate this" | **자산 Dispatcher** — 3 분류 질문으로 skill/command/team/agent 판단 후 적합한 메타-스킬로 위임 (0.5.0 goal-first) |
| `debug-investigator` *(0.8.0)* | "원인 모르겠다", "stack trace", "production 500", "배포 후 깨짐", "장애 났다" | **이슈 조사 Dispatcher** — 증거 주도 5 Phase. `/cfh-debug` 커맨드와 동일 워크플로 자동 진입 |

### Slash commands (`commands/`)

번들 커맨드는 0.3.0부터 **`cfh-` 접두사**로 통일되어 사용자 작성 커맨드와 네임스페이스가 분리됩니다.

| 커맨드 | 인자 | 역할 |
|---|---|---|
| `/cfh-review` | `[parent-branch]` | 적응형 AI 코드 리뷰 — diff 규모별 서브에이전트 수 조정. **0.8.0부터 Project Health·Product Impact 추가 (Medium+에서 7 에이전트)**. **0.9.0부터 리뷰 종료 보고에 🔄 Retro 블록 (REVIEW.md 자체 commit은 기본 no-commit)** |
| `/cfh-debug` *(0.8.0)* | `[증상 설명]` | 증거 주도 조사 워크플로 — 버그·장애·성능·회귀. 5 Phase (증거 → 컨텍스트 → 가설 3+ → 검증 → 원인+수정 계획). `debug-investigator` 스킬로 자동 트리거도 가능. **0.9.0부터 Phase 4 보고에 🔄 Retro 블록 (코드 수정은 위임 커맨드에서 commit)** |
| `/cfh-tc` | `[path]` | 테스트 작성 — TDD Mode / Test-Fill Mode 자동 감지 (FE: RTL 관용구) |
| `/cfh-tc-gen` | `[path]` | 테스트 작성 — BE·라이브러리·CLI 친화적 (DI·supertest·격리된 통합 테스트) |
| `/cfh-feedback` | `<skill> "<comment>"` | 스킬 사용 피드백 기록 (cfh evolve 분석 반영, 옵트인) |
| `/cfh-retro` *(0.9.0)* | `[본문]` | 작업 회고 영구 기록 — `~/.claude/.cfh-logs/retros/`. Stop 훅으로 5개 작업 커맨드 종료 시 자동 트리거 가능 |
| `/cfh-progress` *(0.10.0)* | `[init\|append\|show]` | 프로젝트 결정·다음 단계·미해결을 `./PROGRESS.md`에 누적. 자동 생성 금지 (init 명시 호출 후에만), 자동 commit 금지 |
| `/cfh-refactor` | `[target]` | `refactoring-strategy` 스킬 명시적 활성화. **0.9.0부터 Step 8 보고에 🔄 Retro + 📝 제안 커밋 블록** |
| `/cfh-tdd` | `[target]` | `tdd-first` 5 Phase 순차 실행 (FE-friendly: RTL·userEvent 관용구). **0.9.0부터 Phase 5 보고에 🔄 Retro + 📝 제안 커밋 블록 (test→feat→refactor 3분할 우선 제안)** |
| `/cfh-tdd-gen` | `[target]` | `tdd-general` framework-agnostic 5 Phase (BE·CLI·라이브러리·순수 함수) |
| `/cfh-new` | `<kind> <name>` | `skill-author` 활성화 + 인터뷰 기반 자산 작성 (종류 확정됐을 때) |
| `/cfh-team` | `[domain]` | `harness-factory` 활성화 + 팀 생성 워크플로 |
| `/cfh-make` | `[requirement]` | `asset-factory` dispatcher — 무엇을 만들지부터 분류 |
| `/cfh-plan` | `[goal]` | 작업 dispatcher — 목표 캡처·접근법 상의·실행 (명시 호출 전용, 자동 트리거 없음). **0.8.0부터 Phase 2 접근법 카드에 Project Alignment + Product Impact 자동 검증 섹션 포함**. **0.9.0부터 Phase 3 완료 보고에 🔄 Retro + 📝 제안 커밋 블록** |
| `/cfh-trace` | `[query]` | 발화가 어느 스킬을 트리거할지 시뮬레이션 |
| `/cfh-guide` | `[topic]` | 사용 가이드 |

### Team presets (`templates/presets/`)

| 프리셋 | 패턴 | 산출물 |
|---|---|---|
| `producer-reviewer` | Producer-Reviewer | producer / reviewer 2 에이전트 + 트리거 스킬 |
| `pipeline-3stage` | Pipeline | analyst / builder / qa 3 에이전트 + 파이프라인 스킬 |
| `reviewer-team` | Expert Pool (FE) | security / perf / a11y / types 4 에이전트 + 리뷰 풀 스킬 |
| `reviewer-team-backend` *(0.6.0)* | Expert Pool (BE) | security / perf / types / data-integrity 4 에이전트 + BE 전용 리뷰 풀 스킬 |

---

## 설치

### 전역 설치 (복사 방식, 기본)

```bash
npm install -g @han-kyeon/claude-skills
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

설치 현황을 출력합니다. 0.3.0부터는 **현재 디렉터리에 `./.claude`가 있으면 전역과 프로젝트 두 섹션을 함께** 표시합니다.

```
=== Global (~/.claude) ===

Skills (C:\Users\me\.claude\skills):
  refactoring-strategy     managed@0.3.0
  tdd-first                managed@0.3.0 (user-modified)
  my-custom-skill          user-authored
  adopted-rule             user-authored (adopted)

=== Project (C:\work\my-project\.claude) ===

Skills (C:\work\my-project\.claude\skills):
  project-only-rule        user-authored
```

범위 제어 플래그:

```bash
cfh list                 # 전역 + (있으면) 프로젝트
cfh list --global        # 전역만
cfh list --project       # 현재 프로젝트만
cfh list --target <path> # 임의 경로
```

상태 의미:
- `managed@<ver>` — 이 패키지가 설치한 상태 그대로
- `managed@<ver> (user-modified)` — 이 패키지가 설치했으나 이후 편집됨
- `managed@<ver> (symlink)` — `--link`로 설치됨 (편집 시 원본 변경)
- `user-authored` — 사용자가 작성 — `update`·`remove`에서 자동 보호
- `user-authored (adopted)` — 원래 managed였으나 `cfh adopt`로 사용자 소유로 전환됨

### `cfh remove <name>` / `cfh rm <name>`

설치 항목 제거. **user-authored** 또는 **user-modified** 항목은 기본 거부 (실수로 사용자 작업 지우지 않도록). 강제 제거는 `--force`.

---

## Maintenance commands (0.3.0)

### `cfh adopt <name>`

managed 항목을 **user-authored로 전환**합니다 — 내부적으로 manifest 파일만 제거하는 한 줄 작업이지만, 이후 `cfh update`가 이 항목을 건드리지 않도록 보호됩니다. 기본적으로 y/N 확인 프롬프트가 뜨며, `--yes`로 건너뛸 수 있습니다.

```bash
cfh adopt refactoring-strategy           # 확인 후 전환
cfh adopt refactoring-strategy --yes     # 자동 승인
cfh adopt refactoring-strategy --dry-run # 미리보기
```

역방향(`disown`)은 제공하지 않습니다. 필요하면 `cfh update --force`로 패키지 버전을 덮어쓰십시오.

### `cfh diff <name>`

설치 당시 manifest 해시와 현재 파일 상태를 비교하여 **내가 어떤 파일을 고쳤는지** 알려줍니다.

```bash
cfh diff refactoring-strategy           # 요약 (추가/삭제/수정 파일 목록)
cfh diff refactoring-strategy --full    # 현재 패키지 소스와의 unified diff
```

`--full`은 manifest가 해시만 저장하므로 **현재 패키지 소스**를 기준으로 diff합니다 (설치 당시 스냅샷과 정확히 동일한 비교는 불가능). 순수 upstream 변경 확인은 `cfh update <name> --dry-run`을 사용하십시오.

### `cfh doctor`

설치 상태를 9개 항목에 걸쳐 점검합니다 (0.6.0에서 3개 추가).

```bash
cfh doctor                              # 문제 있으면 exit 1
cfh doctor --warn-only                  # 항상 exit 0 (CI에서 경고만)
cfh doctor --usage                      # 30일 사용 현황 추가 (0.6.0 신규)
```

점검 항목:
1. frontmatter 유효성 (`name`/`description`/20자 이상)
2. 스킬 간 트리거 키워드 중복 (오발동 위험)
3. 고아 manifest (파일은 없는데 manifest만 남음)
4. 깨진 symlink
5. 전역(`~/.claude`)과 프로젝트(`./.claude`)에 같은 이름이 있어 프로젝트가 가리는 경우
6. 커맨드의 `$ARGUMENTS` 또는 `<invocation>` 태그 누락
7. **(0.6.0)** 트리거 키워드 0개 스킬 (자동 트리거 불가)
8. **(0.6.0)** 에이전트 5+개 단일 레벨 (Hierarchical 권고)
9. **(0.6.0)** 에이전트 `tools: "*"` (최소 권한 위반)

`--usage` 시 추가 출력 예:
```text
📊 최근 30일 스킬 사용 현황 (~/.claude/.cfh-logs/ 기반)
  tdd-first             12회 (success 11, helpful 9, not-helpful 2)
  refactoring-strategy   0회 ← 쓴 적 없음. 제거 또는 트리거 개선 검토?
```

### `cfh trace "<query>"`

주어진 발화가 어떤 스킬을 트리거할지 **키워드 매칭**으로 시뮬레이션합니다. positive/negative(반-트리거) 분리 후 가중치 기반 점수 상위 N개를 보고합니다.

```bash
cfh trace "리팩터링 해줘"                  # 상위 5개
cfh trace "이 PR 리뷰 좀" --top 10         # 상위 10개
```

슬래시 커맨드 `/cfh-trace`는 인자 없이도 동작 — 발화를 묻는 인터뷰 모드로 전환합니다. 점수는 참고용이며, Claude Code의 실제 트리거는 대화 컨텍스트 전체를 고려해 결정됩니다.

---

## Utility commands (0.7.0)

### `cfh search "<keyword>"`

설치된 스킬·커맨드의 **name / description / 본문**을 키워드로 검색합니다. `cfh trace`가 발화 시뮬레이션이라면 `search`는 명시적 키워드 검색입니다.

```bash
cfh search "TDD"                         # 기본
cfh search "리팩터링" --kind skill       # 스킬만
cfh search "React" --case-sensitive      # 대소문자 구분
cfh search "bluebird" --target ./.claude # 커스텀 경로
```

출력: 매칭된 자산의 경로 + 매칭 위치(name·description·body 중 어디서).

### `cfh open <name>`

설치된 자산의 파일을 `$EDITOR`로 엽니다. `adopt` 후 편집하거나 `cfh-feedback`으로 받은 개선 제안 반영할 때 편리합니다.

```bash
cfh open tdd-first                       # $EDITOR로 ~/.claude/skills/tdd-first/SKILL.md 열기
cfh open cfh-review --editor "code -w"   # VSCode로
cfh open my-skill --target ./.claude     # 프로젝트 로컬 대상
```

`$EDITOR`·`$VISUAL` 환경변수가 비어있으면 파일 경로만 출력. 프로젝트 로컬과 전역에 같은 이름이 있으면 **프로젝트 쪽이 우선**.

### `cfh export` / `cfh import`

user-authored 자산을 JSON 번들로 묶어 팀원과 공유하거나 다른 PC로 이식.

```bash
# Export — 기본은 user-authored만
cfh export                               # cfh-export-2026-04-22.json 생성
cfh export --output my-bundle.json
cfh export --all                         # managed도 포함
cfh export my-skill my-cmd               # 특정 항목만

# Import
cfh import my-bundle.json                # 충돌 시 에러 (기본)
cfh import my-bundle.json --force        # 덮어쓰기 (user-authored는 여전히 확인 요구)
cfh import my-bundle.json --dry-run      # 미리보기
cfh import my-bundle.json --yes          # 일괄 승인
```

번들 포맷 (`cfh-bundle-v1`): JSON 하나에 파일 내용 전체 포함. zero-dep이라 별도 압축 라이브러리 없음. 작은 스킬 10~20개면 수십 KB 수준.

**Import된 자산은 user-authored로 취급**(manifest 없음) — `cfh update`에서 자동 보호됨.

---

## 프로젝트·프로덕트 축 평가 (0.8.0)

0.8.0부터 `/cfh-review`와 `/cfh-plan`이 **코드 품질 축을 넘어서 프로젝트 건강성·프로덕트 임팩트 축**도 평가합니다. "더 좋은 코드"가 아닌 "더 좋은 프로젝트·더 좋은 프로덕트"를 위한 관점입니다.

### 두 새 축

| 축 | 의미 | 예시 질문 |
|---|---|---|
| **Project Health** | 코드베이스 장기 건강성 | 기술 부채 방향·모듈 경계 침식·의존성 정당성·migration 정렬 |
| **Product Impact** | 사용자·비즈니스 가치 | 사용자 체감·실패 UX·메트릭·롤백 안전성·80% 대안 |

### `/cfh-review`에서 (Medium+ diff)

기본 5개 서브에이전트(Convention·Logic·Test·Performance·Security)에 **Project Health (F)·Product Impact (G)** 2개 추가 → 총 7개.

**Step 2.5에 제외 인터뷰 추가**: "7개 기본 포함됩니다. 제외할 에이전트가 있나요? (예: 'E 제외' / 'F,G 제외')"

출력 `REVIEW.md`에 🏗️ Project Health·🎯 Product Impact 섹션이 Summary 표에 포함되어 생성.

### `/cfh-plan`에서 (모든 작업)

Phase 2 Approach Proposal 카드에 **자동 추론 섹션**이 추가됩니다 (새 질문은 없음):

```
📦 Project Alignment Check
  - 기술 부채 영향: 중립 — 신규 의존성 없음, any 사용 없음
  - 모듈 경계: 기존 payments/·orders/ 경계 유지
  - Migration 정렬: TypeScript strict 전환과 일치 ✅

🎯 Product Impact Check
  - 사용자 체감: 쿠폰 입력 시 즉시 할인액 표시
  - 실패 UX: 코드 무효·네트워크 실패·서버 오류 3가지 메시지 명시 필요
  - 롤백: feature flag 권장 (coupons.validation.enabled)
  - 80% 대안: 클라이언트 whitelist는 보안 이슈로 기각
```

### 컨텍스트 부족 시

`CLAUDE.md`에 제품 맥락(사용자 segment·핵심 메트릭)이나 migration 정보가 없으면 두 축 분석이 얕아집니다. 이때 "ℹ 추론 기반 분석" 명시. 보완 권장은 프로젝트 로컬 `CLAUDE.md`에 맥락 추가 (본 패키지가 표준 포맷을 강요하진 않음 — 자유 서술).

---

## 작업 회고 + 커밋 제안 (0.9.0)

0.9.0부터 5개 작업 커맨드(`/cfh-plan`·`/cfh-tdd`·`/cfh-refactor`·`/cfh-debug`·`/cfh-review`)의 완료 보고에 두 블록이 자동 포함됩니다. **"무엇이 효과 있었고 무엇이 실패했는가"를 매 작업마다 정리**하고, 코드 수정이 있으면 커밋 메시지·범위·분할까지 제안합니다.

### 🔄 Retro 블록 (작업 회고)

3섹션 고정:

```
🔄 Retro
  효과 있었음 (계속할 것):
    - <접근법·도구·순서 중 잘 작동한 것>
  실패·삽질 (반복 금지):
    - <헛수고였던 시도·잘못된 가정>
  다음엔 바꿀 것:
    - <개선 아이디어·후속 과제>
```

### 📝 제안 커밋 블록 (코드 수정 시)

```
📝 제안 커밋
  메시지 초안: feat: add coupon validation to checkout
  스테이지 범위: + src/features/coupon/, ~ src/features/checkout/...
                 (제외: .env·credentials.* 등 비밀파일 자동 제외)
  분할 추천: 단일 커밋 / 또는 N개로 분할 (다른 모듈·관심사 혼재 시)
  진행: yes / edit-msg / split-differently / no-commit
```

**자동 commit 금지** — 제안만, 사용자 명시 yes 후에만 진행.

**메시지 컨벤션 추정**: `git log -10 --pretty=format:"%s"`로 Conventional Commits / Square-bracket scope / 자유형 중 가장 빈번한 것 자동 채택.

**분할 휴리스틱** (2개+ 신호 시 분할 제안): 다른 top-level 디렉터리 / 리팩터+기능 혼재 / 무관한 의존성 추가 / 5+ 파일 + 2+ 모듈.

### 🪝 Stop 훅 자동 트리거

`~/.claude/settings.json`의 Stop 훅에 `cfh-retro-hook.sh`를 등록하면, **Retro 블록이 출력된 turn에서만** `/cfh-retro`가 자동 호출되어 회고를 `~/.claude/.cfh-logs/retros/<date>-<slug>.md`에 영구 기록합니다. 가벼운 대화엔 silent.

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "bash ~/.claude/scripts/cfh-retro-hook.sh" }
        ]
      }
    ]
  }
}
```

훅 스크립트는 4개 필터로 필요할 때만 발동:
1. Retro 블록 패턴 존재 (`효과 있었음` + `Retro` 동시 매칭)
2. 이미 저장됨/옵트아웃 상태가 아닐 것
3. 직전 메시지가 `/cfh-retro` 자체 출력이 아닐 것
4. Stop hook loop 방지

### 5개 커맨드별 분할 전략

| 커맨드 | 분할 방식 |
|---|---|
| `/cfh-plan` | 작업 단위가 단일이면 단일 커밋, 복합이면 위임 커맨드 별로 |
| `/cfh-tdd` | **3분할 우선**: test (Phase 3) → feat (Phase 4) → refactor (Phase 5) |
| `/cfh-refactor` | **PR 단위 이미 분할** (Step 5): 각 Small PR마다 별도 커밋 메시지 |
| `/cfh-debug` | 보통 코드 수정 없음 (위임). DEBUG-LOG 추가만 별도 |
| `/cfh-review` | REVIEW.md 자체 commit은 기본 no-commit (로컬 참고용) |

상세 형식·휴리스틱은 `commands/references/retro-and-commit.md` 단일 출처.

### `/cfh-feedback`과의 차이

| | `/cfh-feedback` | `/cfh-retro` |
|---|---|---|
| 대상 | 스킬 자체에 대한 의견 | 작업 한 건의 회고 |
| 저장 | `~/.claude/.cfh-logs/<skill>.jsonl` | `~/.claude/.cfh-logs/retros/<file>.md` |
| 활용 | `cfh evolve`가 description 개선 | 후속 세션 회상·작업 패턴 분석 |

---

## 비용 가시화 + 프로젝트 진행 노트 (0.10.0)

0.10.0의 두 신규 기능은 **"측정"과 "연속성"**의 갭을 메웁니다 — `cfh evolve` 이름이 약속하는 *측정 기반 진화*에 데이터를 공급하고, 세션 간 의도 drift를 줄입니다.

### `cfh cost` — 토큰 사용량 집계

```bash
cfh cost                              # 전체
cfh cost --by command --days 7       # 최근 7일, 명령별
cfh cost --by day --match my-proj    # 일자별, 특정 프로젝트
cfh cost --by session                # 최근 20개 세션
cfh cost --by model                  # 모델별
cfh cost --json > usage.json         # 스크립팅
```

**핵심 설계**:
- **새 텔레메트리 수집 없음** — Claude Code의 기존 transcript(`~/.claude/projects/<slug>/<id>.jsonl`)를 read-only.
- 별도 `cfh log --enable` 옵트인 불필요 (이미 사용자 자기 데이터).
- 토큰 단위만 집계, 가격은 외부 (모델·테넌트마다 달라서).
- 슬래시 커맨드 attribution: 가장 최근 user 메시지의 `/cfh-*` 패턴이 그 이후 assistant turn을 귀속.

#### 어떻게 동작하나 — 데이터 흐름 풀이

1. **소스 발견**: `~/.claude/projects/<프로젝트-슬러그>/<세션-id>.jsonl`을 찾음. `--match my-proj`로 슬러그 부분 매칭(대소문자 무시).
2. **세션별 파싱**: 각 jsonl은 한 줄 = 한 turn. assistant turn에서 `.message.usage`를 읽음:
   - `input_tokens` — 새로 보낸 입력
   - `cache_creation_input_tokens` — 5분/1시간 ephemeral 캐시 새로 작성
   - `cache_read_input_tokens` — 캐시 적중 (대부분 여기로 들어감)
   - `output_tokens` — 모델 생성 분
3. **모델 필터**: `<synthetic>` 모델 turn(예: 시스템 메타 응답)은 LLM 호출이 아니므로 제외.
4. **슬래시 커맨드 attribution**: user turn에서 `/cfh-*` 패턴 감지 → 그 이후 assistant turn을 그 커맨드에 귀속. 새 슬래시가 나올 때까지 유지. **휴리스틱이라 정확하지 않음** — 예: 사용자가 `/cfh-plan`을 띄운 뒤 다른 잡담을 길게 해도 그 잡담의 토큰까지 plan에 귀속.
5. **집계**: 세션·일자·모델·커맨드 4축으로 dictionary에 누적.

#### 4가지 view의 의미

| `--by` | 답하는 질문 |
|---|---|
| `command` (기본) | "내 토큰 예산을 가장 많이 쓰는 슬래시 커맨드는?" — 비용 효율이 낮은 커맨드 식별 |
| `day` | "최근 추세는? 특정 일에 spike 있었나?" — 작업 패턴 가시화 |
| `model` | "Opus vs Sonnet vs Haiku 비율은?" — 모델 다운그레이드 판단 |
| `session` | "어느 세션이 비용 폭주였나?" — 회귀 진단 시작점 |

#### 실제 출력 예 (이 프로젝트의 실데이터)

```
📊 Cost telemetry — 4 sessions (last 30d, project~"claude-fe-harness")

  Total input (incl. cache):  772,879,313
    cache read:               759,110,257    ← 98% 캐시 적중
    cache creation:           13,722,158
    fresh input:              46,898         ← 진짜 새로 보낸 것
  Total output:               2,485,852

By slash command:

command      input+cache  output     turns  sessions
-----------  -----------  ---------  -----  --------
/cfh-plan    119,532,002  321,024    326    1
/cfh-review  27,108,122   207,886    202    1
```

이 결과로 두 가지가 즉시 보임:
- **캐시 적중률 98%** — Claude Code의 prompt caching이 잘 동작 중. 대부분 토큰은 cache_read.
- **`/cfh-plan`이 가장 비싼 커맨드** — 326턴 동안 119M 입력 — multi-phase 인터뷰가 길어서 누적이 큼. 이걸 정량적으로 처음 보는 순간.

#### 한계 — 정직한 한 줄

- **Attribution은 휴리스틱**: "직전 user 메시지의 슬래시 커맨드"가 후속 turn을 흡수. 한 세션에 여러 커맨드를 섞으면 경계가 흐림.
- **가격 환산 없음**: 토큰만 보여줌. 모델·테넌트·할인에 따라 달라 단가는 외부 가격표 참조.
- **`<synthetic>` 제외**: 시스템 메타 응답은 카운트에서 빠짐 (의도된 동작 — 사용자가 쓴 토큰만).
- **사용자가 자기 데이터 read-only**: 외부 전송 없음, 옵트인 게이트 불필요.

**왜 가치 있나**: `cfh evolve`가 description의 정적 분석에 머무는 한계를 보완. "이 스킬이 비용 대비 가치 있나"를 처음으로 정량 답할 수 있게 됨.

### `/cfh-progress` — 프로젝트 진행 노트

3 도구의 cascade가 완성됩니다:

| 도구 | 대상 | 위치 | 영속성 |
|---|---|---|---|
| `/cfh-feedback` | 스킬 자체 의견 | `~/.claude/.cfh-logs/<skill>.jsonl` | jsonl |
| `/cfh-retro` | 작업 한 건 회고 | `~/.claude/.cfh-logs/retros/` | md |
| `/cfh-progress` | 프로젝트 한 개 | `./PROGRESS.md` | md, **git-tracked** |

세 도구는 **scope의 cascade**: feedback < retro < progress. 가장 작은 단위(스킬 한 개) → 작업 한 건 → 프로젝트 한 개. 각각이 답하는 질문이 다릅니다:

- feedback: "이 스킬이 미발동했나? 잘못 떴나?"
- retro: "이번 작업에서 무엇이 효과 있었나?"
- progress: "이 프로젝트에서 어떤 결정을 했고 다음에 뭘 해야 하나?"

#### 3가지 모드

```bash
/cfh-progress init      # 새 PROGRESS.md 생성 (이미 있으면 거절)
/cfh-progress           # (기본 append) 직전 turn에서 결정·다음 단계 추출 → prepend
/cfh-progress show      # 본문 + 진척률 한 줄 출력
```

#### PROGRESS.md 구조 — 4 섹션

```markdown
---
project: my-fe-app
created: 2026-04-20T10:00:00Z
last_updated: 2026-05-07T14:32:00Z
sessions: 7
---

# PROGRESS — my-fe-app

## 다음 단계 (Next Up)
- [ ] 쿠폰 캐싱 별도 PR
- [x] checkout 페이지 쿠폰 검증 (완료)

## 미해결 질문 (Open Questions)
- ❓ 쿠폰 캐시 TTL — 24h vs 5min, 결제팀 확인 필요

## 결정 로그 (Decision Log)
### 2026-05-07 14:32 — 쿠폰 검증 zustand 통합 폐기
**결정**: 별도 hook으로 분리, store 통합 안 함.
**이유**: store 결합 시 다른 페이지 영향 큼.
**대안**: store에 pendingValidation 필드 추가 — 검증 결과 외 다른 데이터까지 흐름 복잡해져 기각.
**참조**: commit a3cd9f8

## 세션 로그 (Session Log)
### 2026-05-07 14:32 (session 26246d5f...)
/cfh-plan → 쿠폰 검증 4시간 작업, 8 task 중 6 완료.
```

각 섹션의 역할:
- **다음 단계**: 항상 최상단 — 다음 세션 시작 시 가장 먼저 읽힐 위치
- **미해결**: ❓ 표시 — 누구·언제 해결 필요한지 명시
- **결정 로그**: 결정/이유/대안/참조 4축 — 미래의 자기 또는 팀원이 "왜 이렇게 됐지"를 추적할 근거
- **세션 로그**: 1세션 = 1~3줄 — 자세한 회고는 `~/.claude/.cfh-logs/retros/`에 따로 (PROGRESS는 요약, retros는 상세)

#### append 모드의 흐름

`/cfh-progress`(append)를 호출하면:

1. **추출 대상 자동 감지** — 직전 assistant turn에서 다음을 찾음:
   - "📝 제안 커밋", "결정", "Decision" → 결정 항목
   - "다음 단계:", "Next:", 미완료 task list → 다음 단계
   - "❓ Questions to Resolve" → 미해결 질문
   - transcript 파일명 첫 8자 → 세션 ID
2. **사용자에게 추출 결과 1차 확인** — "이대로 PROGRESS.md에 추가할까요?" yes/adjust
3. **승인 후 prepend** — 결정 로그·세션 로그 최상단에 새 항목, 다음 단계는 끝에 append (이전 미완료 유지). frontmatter `last_updated`·`sessions` 갱신
4. **commit 안 함** — 사용자에게 commit 권유만, 명시 yes 후 진행

#### 원칙 — 왜 이렇게 보수적인가

- **`init` 명시 호출 후에만 동작.** 자동 생성 안 함 — 사용자 모르게 PROGRESS.md가 git에 들어가지 않도록.
- **append-only.** 이전 항목 수정·삭제 안 함, 정정은 새 항목으로. 의사결정 이력의 audit trail 유지.
- **자동 commit 금지.** PROGRESS.md 갱신만, commit은 사용자 판단.
- **민감 정보 자동 검출.** 키·토큰·내부 URL 의심 시 "마스킹할까요?" 한 번 물음.

#### Stop 훅 옵트인 (`cfh-progress-hook.sh`)

자동 트리거는 다음 **모두** 충족할 때만 발동:

1. **`./PROGRESS.md` 존재** — 자동 생성 안 함
2. **텔레메트리 옵트인** — `~/.claude/.cfh-logs/telemetry.json`의 `enabled:true`
3. **직전 turn 신호** — `🔄 Retro` 블록 또는 `## 결정`/`## Decision` 섹션 존재
4. **이미 처리되지 않음** — 직전 turn에 `PROGRESS.md 갱신됨`·`진척률:` 등의 출력 없음
5. **Stop hook loop 방지** — `stop_hook_active=false`

5단 필터 중 하나라도 빠지면 silent 종료. **PROGRESS.md 없으면 절대 발동 안 함** — 가벼운 대화·새 프로젝트에 영향 없도록.

#### 한계 — 정직한 한 줄

- **추출은 정규식 + 키워드 매칭**: assistant 출력에 "결정", "다음 단계:" 같은 신호가 있어야 인식. 무형식 자유 서술은 자동 추출 못 함.
- **요약 품질은 직전 turn에 의존**: Retro 블록이 충실해야 의미 있는 항목 생성. 빈 Retro면 빈 progress 항목.
- **append-only라 잘못된 항목도 남음**: 정정 항목으로 덮어 표시 (역사 보존).

**왜 가치 있나**: half-clone·세션 종료 후 컨텍스트 손실에서 가장 큰 통증인 "결정·다음 단계가 어디 있는지"를 git-tracked 단일 파일로 해결. 팀원·다른 기계에서 즉시 인계 가능.

상세 형식은 `commands/references/progress-template.md` 단일 출처.

### 설치 권장 — Stop 훅 (옵트인)

`~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "bash ~/.claude/scripts/cfh-retro-hook.sh" },
          { "type": "command", "command": "bash ~/.claude/scripts/cfh-progress-hook.sh" }
        ]
      }
    ]
  }
}
```

두 훅 모두 자체 필터로 조건 안 맞으면 silent — 가벼운 대화엔 영향 없음.

---

## 스킬 eval harness (0.10.0)

`cfh evolve`가 description의 정적 분석에 머무르는 한계를 메우기 위한 **실행 기반 측정 도구**. 각 스킬마다 `evals/*.json` 케이스를 두고 발화 → 출력 → assertion으로 행동을 검증합니다.

### 케이스 형식

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
  "tags": ["happy-path", "fe"]
}
```

각 파일은 단일 객체 또는 객체 배열. 위치는 `~/.claude/skills/<skill>/evals/`. 패키지에는 `tdd-first`·`skill-author`의 reference 케이스가 동봉됨.

### Assertion 타입 (3종)

| type | 의미 |
|---|---|
| `contains` | 출력에 `value` 문자열 포함 |
| `not_contains` | 출력에 `value` 없음 |
| `regex` | 출력이 `value` 정규식과 매칭 |

행동 기반 검증만 — 내부 토큰·class 검증 금지.

### 케이스 해부 — 한 케이스가 무엇을 검증하나

`tdd-first/evals/happy-path.json`의 첫 케이스로 **실제 검증 흐름**을 풀어봅니다:

```json
{
  "name": "fe-tdd-trigger-on-test-first",
  "prompt": "TDD로 src/components/CouponInput.tsx 만들어줘. 테스트 먼저 작성하면서.",
  "skill_should_trigger": "tdd-first",
  "assertions": [
    { "type": "contains", "value": "Phase" },
    { "type": "regex", "value": "Intent\\s+Interview|의도|목표" },
    { "type": "not_contains", "value": "TypeError" }
  ]
}
```

`--executor claude`로 돌리면:

1. **Claude에 `prompt` 전송** — "TDD로 src/components/CouponInput.tsx 만들어줘…"
2. 응답을 받아 **4가지 검증** (`skill_should_trigger` 1개 + assertions 3개):
   - 응답에 `tdd-first` 등장? (`skill_should_trigger`) — 스킬이 트리거됐다는 신호
   - 응답에 `Phase` 포함? (`contains`) — Phase 1·2·3 등 단계 안내가 있어야 함
   - 응답에 `Intent Interview` 또는 `의도`/`목표` 매칭? (`regex`) — Phase 1 인터뷰 진입 확인
   - 응답에 `TypeError` **없음**? (`not_contains`) — 에러 폭주 없음
3. **4개 모두 통과해야 ✅ pass.** 하나라도 빠지면 ❌ fail + 어느 assertion이 깨졌는지 보고.

스킬이 정상이라면 응답은 "Phase 1 Intent Interview를 시작합니다. Q1: 목표는…" 같은 형태 → 4 assertion 모두 만족.

### 동봉된 reference 케이스 (4개)

패키지에 다음 케이스가 동봉돼 있어 사용자가 자기 스킬용 evals를 작성할 때 참고할 수 있습니다:

#### `tdd-first/evals/happy-path.json` — 정상 트리거 시나리오

| 케이스 | 발화 | 검증 의도 |
|---|---|---|
| `fe-tdd-trigger-on-test-first` | "TDD로 .tsx 만들어줘" | FE + TDD → tdd-first 활성, Phase 1 Intent Interview 진입 |
| `fe-tdd-with-jsx-context` | "useAuth 훅 TDD로 하고 싶어요" | hook + TDD → Phase 0 Scope Narrowing의 Q1이 먼저 떠야 함 |

#### `tdd-first/evals/anti-trigger.json` — **인접 스킬 충돌 회귀 테스트**

```json
{
  "name": "no-trigger-on-backend-tdd",
  "prompt": "FastAPI 엔드포인트 TDD로 짜고 싶어요",
  "skill_should_trigger": "tdd-general",
  "assertions": [
    { "type": "not_contains", "value": "RTL" },
    { "type": "not_contains", "value": "userEvent" },
    { "type": "not_contains", "value": "getByRole" },
    { "type": "regex", "value": "tdd-general|stack-neutral|Arrange-Act-Assert" }
  ]
}
```

**검증 의도**: 백엔드(Python FastAPI) TDD 발화에 **tdd-first가 잘못 발동하는 회귀**를 잡음.
- 응답에 `RTL`·`userEvent`·`getByRole`(FE 관용구) 등장하면 즉시 fail — tdd-first가 잘못 떴다는 신호
- 대신 `tdd-general`·`stack-neutral`·`Arrange-Act-Assert`가 등장해야 pass

이게 **인접 스킬 간 description drift 회귀**의 가장 빠른 그물망입니다. tdd-first description을 수정한 PR에서 이 케이스가 깨지면 백엔드 발화까지 흡수하는 trigger로 변했다는 뜻.

#### `skill-author/evals/happy-path.json` — 명시 호출 + 편집 모드

| 케이스 | 발화 | 검증 의도 |
|---|---|---|
| `skill-author-explicit-create` | "스킬 만들고 싶어요. HIPAA…" | 종류가 명시(skill)됐으니 asset-factory 우회, **skill-author 직진** + Phase 1 Q1 |
| `skill-author-on-existing-edit` | "기존 tdd-first description 다듬어줘" | 편집 모드 — Phase 1 인터뷰 없이 description만 수정 |

### `cfh trace` vs `cfh eval` — 오해하기 쉬운 차이

`cfh eval`은 **트리거 검출이 아닙니다**. 두 도구의 역할이 다릅니다:

| 도구 | 입력 | 측정 | LLM 호출 | 비용 |
|---|---|---|---|---|
| `cfh trace "<발화>"` | 발화 | **어느 스킬이 뜰지** 키워드 점수로 미리보기 | 없음 | 0 |
| `cfh eval --dry-run` | 케이스 파일 | 케이스 형식 유효성 + 프롬프트 미리보기 | 없음 | 0 |
| `cfh eval --executor claude` | 케이스 파일 | **실제 응답이 기대 패턴 맞는가** (트리거 + 행동) | 케이스당 1회 | 토큰 |
| `cfh eval --baseline` | 케이스 파일 | 스킬 활성 vs 비활성 차이 (A/B 순효과) | 케이스당 2회 | 토큰 ×2 |

`trace`는 description 키워드만 보고 **"어떤 스킬이 트리거 후보인가"**를 정적으로 판단. `eval`은 실제로 발화를 던져서 **"트리거됐고, 행동도 기대대로인가"**를 검증. 양쪽 다 필요 — trace는 빠르고 싸고, eval은 깊지만 토큰 소비.

### 한계 — 정직한 한 줄

assertion은 **단순 문자열·정규식 매칭**입니다. 의미 검증은 안 함:

- "Phase 1 Intent Interview" 문자열만 있으면 통과 → 실제 Q1 질문 내용이 의도대로인지는 **사람이 확인**해야 함.
- 스킬이 잘못된 내용을 자신 있게 말해도 형식 키워드만 맞으면 pass.
- 깊은 의미 정합성 검증은 LLM-judge 패턴이 필요 (향후 작업).

따라서 현재 evals의 역할은 **회귀 탐지의 1차 그물망**: description 수정 후 트리거가 안 잡히거나 인접 스킬과 충돌하는 회귀를 빠르게 잡는 것. 깊은 행동 정합성은 사람 리뷰 + retro 데이터로 보완.

### 실행 모드

```bash
cfh eval --list                       # 케이스 목록·정적 검증
cfh eval tdd-first --dry-run          # 프롬프트·assertion만 출력 (기본)
cfh eval tdd-first --manual           # 사용자가 claude에 붙여넣고 결과 paste
cfh eval tdd-first --executor claude  # claude CLI subprocess (토큰 소비)
cfh eval --json                       # 스크립팅용
```

**기본은 `--dry-run`** — 의도치 않은 토큰 소비 방지. 실제 실행은 명시 플래그 필요. `--executor claude` 사용 후 `cfh cost`로 비용 사후 확인 가능.

### A/B baseline mode (`--baseline`)

같은 케이스를 두 번 돌려 **스킬의 순효과**를 측정합니다:

| 모드 | 프롬프트 |
|---|---|
| Treatment | 그대로 |
| Baseline | 앞에 `Do NOT invoke skill <name>. Use general knowledge only.` prepend |

각 케이스 결과:
- `+1` skill helped — treatment pass, baseline fail
- `-1` skill regressed — treatment fail, baseline pass
- `0` no diff — 둘 다 같은 결과

```bash
cfh eval tdd-first --baseline --executor claude
# →
# T/B    diff           name
# pass/fail  ⬆ +1 helped     fe-tdd-trigger-on-test-first
# pass/fail  ⬆ +1 helped     fe-tdd-with-jsx-context
# fail/pass  ⬇ -1 regressed  no-trigger-on-backend-tdd
#
# A/B Summary:
#   Treatment pass rate: 2/3
#   Baseline pass rate:  1/3
#   Net effect: +1
#   Cost (approx): 4,231 chars across 6 LLM calls
```

**한계 (반드시 알 것)**:
- Soft baseline은 instruction-following에 의존. Claude가 명령을 무시하면 false negative.
- Hard baseline (skill 디렉터리 isolate)은 후속.
- 통계적 유의성은 케이스 수에 따름 — N=3은 신호일 뿐, 회귀 게이트로 쓰지 말 것.

**종료 코드**: regressed > 0이면 exit 1 → CI에서 회귀 차단 가능.

### CI 통합

```yaml
# .github/workflows/skill-eval.yml
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g @han-kyeon/claude-skills
      - run: cfh install
      - run: cfh eval --list                # 정적 검증, 토큰 소비 없음
```

`--executor claude`까지 CI에서 돌리려면 ANTHROPIC API 키와 모델 액세스가 필요 — 비용 동의 후 별도 워크플로 권장.

### 0.10.0의 측정 cascade

| 도구 | 측정 대상 | 비용 |
|---|---|---|
| `cfh cost` (0.10.0) | 실제 사용 중 발생한 토큰 | 0 (read-only) |
| `cfh eval` (0.10.0) | 가상 시나리오에서의 행동 | dry-run 0 / executor 토큰 소비 |
| `cfh evolve` (0.3.0) | description 정적 분석 + **eval 구조 인식 (0.10.0)** | 0 |
| `cfh sentry` (0.10.0) | tool 호출 실패·loop·empty Read 감지 | 0 (read-only) |

cascade: evolve(정적+eval) → eval(케이스) → cost(실사용) + sentry(tool 안전망). "이 스킬이 여전히 가치 있나?"를 처음으로 정량 답할 수 있게 됩니다.

---

## evolve가 eval 구조를 읽음 (0.10.0)

`cfh evolve <skill>`는 0.10.0부터 정적 description 분석에 더해 **`evals/` 디렉터리 구조**도 함께 본 후 후속 제안을 만듭니다.

### 무엇이 추가됐나

```bash
cfh evolve tdd-first
```

기존 출력 (description·trigger·logs)에 더해:

```
ℹ [eval-coverage] 3 case(s) defined (2 #happy-path, 1 #anti-trigger), 9 assertions
ℹ [eval-diversity] all cases use a single assertion type — adding "not_contains" or "regex" can catch different failure modes
```

또는 evals/ 없는 스킬은:

```
ℹ [eval-coverage] no evals/ directory — consider adding case files to enable cfh eval. each skill benefits from at least 1 happy-path + 1 anti-trigger case.
```

### 검출되는 패턴

| 신호 | 의미 |
|---|---|
| **evals/ 부재** | 스킬에 케이스 0개 — 회귀 그물망 없음 |
| **케이스 단 1개** | happy-path만 있고 anti-trigger 없으면 인접 스킬 충돌 못 잡음 |
| **anti-trigger 부재** | description drift 회귀 못 잡음 → 인접 스킬 흡수 위험 |
| **assertion 타입 단일** | contains만 있으면 false negative 패턴 못 잡음 |
| **skill_should_trigger가 자기 자신 아님** | 케이스가 다른 스킬을 검증할 뿐, 자기 발동 검증은 빠짐 |
| **eval 파일 파싱 실패** | JSON 깨짐 — 즉시 fix 필요 (warn) |

### 왜 가치 있나

`cfh evolve`가 약속하는 "evolution"의 가장 큰 갭이었음 — description만 보고 "트리거 키워드가 부족합니다" 같은 정적 제안은 했지만, **실제 케이스 기반 회귀 그물망이 있는지**를 못 봤음. 이제 evolve가 evals/ 부재를 발견하면 사용자에게 추가를 권장 → 측정 인프라 정착의 시작.

### 한계

- **케이스 *내용* 평가는 안 함** — 케이스 수·태그·assertion 타입만 봄. "이 케이스가 좋은 케이스인가"는 사람 판단.
- **실행 결과는 미반영** — 마지막 `--executor claude` 결과가 어땠는지 모름. 향후 작업 (eval 결과 영속화 → evolve가 trend 분석).
- **자동 케이스 생성 안 함** — "anti-trigger 추가 권장"까지만, 어떤 케이스 추가할지는 사람이 작성.

---

## cfh sentry — Tool failure sensor (0.10.0)

`cfh sentry`는 Claude Code transcript에서 **tool 호출 실패 패턴**을 감지합니다. Production agent의 가장 흔한 신뢰 누수가 "조용히 망가진 tool 호출"이라는 NeuralWired 분석을 반영한 안전망.

### 무엇을 감지하나

3가지 패턴:

1. **Tool errors** — `tool_result.is_error: true`로 끝난 호출
2. **Repeated identical calls** — 같은 tool에 같은 input을 반복 (잠재 loop)
3. **Empty reads** — `Read` tool이 사실상 빈 결과 반환 (≤2 chars)

### 사용

```bash
cfh sentry                                # 전체
cfh sentry --days 7                       # 최근 7일
cfh sentry --match my-project             # 프로젝트 부분 매칭
cfh sentry --tool Edit                    # 특정 tool만
cfh sentry --json > sentry.json           # 스크립팅
```

### 실제 출력 (이 프로젝트의 실데이터)

```
🚨 Tool failure sensor — 4 sessions (last 30d, project~"claude-fe-harness")

  Total tool calls:    1,492
  Errors:              24 (1.6%)
  Empty reads:         0
  Repeated identical:  4

Per tool (sorted by errors):

tool   calls  errors  empty  repeats  err%
-----  -----  ------  -----  -------  -----
Edit   489    17      —      1        3.5%
Bash   210    5       —      2        2.4%
Read   181    1       —      —        0.6%

Recent errors (top 5):
  Edit  [26246d5f]
    input:  {"file_path":"...cfh-refactor.md","old_…
    error:  <tool_use_error>File has not been read yet. Read it first…
```

3.5%가 Edit에서 실패 — 대부분 "File has not been read yet" 패턴(Edit 전에 Read 안 함). **사람이 보고 패턴을 인지**해야 다음 세션부터 Read→Edit 순서를 강제하는 워크플로 개선 가능.

### Loop detection 휴리스틱

같은 tool에 **거의 같은 input**(top-level 키 + 문자열 200자 이내 매칭)을 연속 호출하면 loop 의심:

- ✅ 잡힘: `Edit /x` 같은 old_string·new_string으로 3번 → "왜 같은 edit을 또 하지?" 신호
- ✅ 잡힘: `Bash "git status"` 연속 호출 → 의도된 polling일 수도, 헛수고일 수도
- ❌ 잡히지 않음: `Read /a` → `Read /b` → `Read /a` (다른 파일 사이에 있어 패턴 깨짐)

**의도된 retry vs 실패 loop의 구분은 사람 판단**. sentry는 신호이지 결론 아님.

### 출력 형식 — 4 view

| 표시 | 의미 |
|---|---|
| `Total tool calls` | 모든 assistant turn의 tool_use 합 |
| `Errors` | `is_error: true` 받은 호출 (절대값 + %) |
| `Per tool` 표 | tool별 호출/에러/empty/repeats 분해 — 어느 tool이 가장 깨지는지 |
| `Recent errors` 샘플 | 최근 5개 에러의 tool·input·에러 메시지 |
| `Recent repeated calls` | loop 의심 호출 + 반복 횟수 |

### 무엇에 쓰나

1. **Workflow 개선의 출발점**: Edit 실패율 높음 → "Read 먼저 → Edit" 강제 컨벤션 도입
2. **회귀 진단**: 특정 commit 이후 Bash 실패율 spike → 새 hook이 tool 환경 망가뜨림
3. **CI 통합 가능**: PR diff 후 sentry 돌려 새 실패율 N% 초과면 fail (수동 임계값)

### 한계 — 정직한 한 줄

- **Loop 신호는 false positive 가능**: 의도된 polling(예: `until <ready>; do sleep; done`)도 잡힘. 사람 판단 필요.
- **Empty Read 임계값은 임의**: 2 chars 이하만 empty로 봄. 실제 빈 파일과 거의 빈 파일의 구분 부정확.
- **사용자 자기 데이터 read-only**: 외부 전송 없음, 옵트인 게이트 불필요 (cost와 동일).
- **자동 차단 안 함**: 보고만, 자동 fix·자동 retry 안 함 — 사용자 판단을 신뢰.

---

## Confidence Tagging 컨벤션 (0.10.0)

스킬 출력에 **근거의 확실성**을 명시적으로 표기하는 권장 컨벤션. LLM 에이전트의 가장 흔한 신뢰 누수인 "알고 있는 것 / 추론한 것 / 추측한 것의 미구분"을 가리는 약한 그물망.

### 권장 마커 (3 단계)

| 마커 | 의미 |
|---|---|
| `[verified]` | 코드·문서·사용자 답변에서 직접 확인 |
| `[inferred]` | 직접 보지 않았지만 합리적 추론 |
| `[guessed]` | 근거 약한 추측 — 사용자 검증 권장 |

### Before vs After

```
Before:
- React 18.3.1 사용
- Vitest + MSW 환경
- strict mode 작성

After:
- [verified] React 18.3.1 (package.json 확인)
- [verified] Vitest 5.x (vite.config.ts setup)
- [inferred] MSW 가능성 (테스트에서 fetch mock 발견)
- [guessed] strict mode 선호 — tsconfig 미확인
```

→ 사용자가 `[guessed]` 부분만 빠르게 검증 가능.

### 적용 위치

**적용 권장**:
- 스캔·분석 결과 (Pre-scan, Project Profile, Blast Radius)
- 추천·제안의 근거
- `/cfh-plan`의 Project Alignment·Product Impact 자동 추론 섹션
- `/cfh-review`의 Critical/High 지적

**적용 비권장**:
- 사용자 질문 (질문은 답변 자리, 자기 추측 끼어들 일 없음)
- 작업 완료 보고 (실제 변경 결과는 fact)
- 에러 메시지·tool 호출 결과 (그대로)

### 강제성 — 약하게

이 컨벤션은 **권장**이지 강제 아님:
- 모든 출력에 마커 붙이면 노이즈
- LLM 출력 자동 lint 어려움 — `[verified]`라고 표시했지만 실제론 추론인 경우 있음
- 사용자 톤 선호 차이

대신: **스킬 작성 시 가이드로 권장**, 정직성 우선 프로젝트(의료·결제·법적)에서 명시 채택.

### `cfh doctor --strict-confidence` (옵트인 체크)

```bash
cfh doctor --strict-confidence
```

기본 doctor에는 없는 추가 체크 — 각 스킬 SKILL.md에 confidence tagging 가이드 또는 마커 사용이 있는지 검사 후 info 수준 경고. 누락은 fail이 아니라 **인지 신호**.

### 한계

- LLM이 마커를 일관되게 붙이리란 보장 없음 — 컨벤션일 뿐, 자동 강제 아님
- 마커 정확도는 LLM의 자기 인식에 의존
- 스킬마다 채택 정도가 달라 일관된 사용자 경험 어려움

목적은 **완벽한 정확성이 아니라 사용자에게 압박 지점 신호 제공**. 100%는 아니어도 70%만 맞아도 가치 있음.

상세 가이드: `commands/references/confidence-tagging.md`.

---

## 측정 cascade 완성 (0.11.0)

0.10.0이 측정 도구를 만들었다면, 0.11.0은 **그 도구들을 엮음**. 4가지 신규 기능이 측정 → 행동 루프를 닫습니다.

### 1. `cfh dashboard` — 한 화면에 다 보기

```bash
cfh dashboard                                # stdout, 30일
cfh dashboard --days 7 --match my-proj
cfh dashboard --output dashboard.md          # 파일 저장
```

**보여주는 것** (markdown):
- **Overview**: 스킬 수, evals 커버리지 %, 텔레메트리 상태
- **Cost**: 총 토큰, 캐시 적중률, top 10 명령별 cost
- **Tool failure sensor**: 호출/에러/empty/repeat 표
- **Eval coverage**: 스킬별 케이스 수 + 마지막 실행 시각
- **Eval trend**: 스킬별 최근 5회 결과 (영속화 활성 시)

**왜 가치 있나**: 0.10.0에서 만든 도구들을 사용자가 따로따로 호출해야 했던 마찰 해소. 한 번의 `cfh dashboard`로 프로젝트 전체 건강도가 markdown으로 → README나 PROGRESS.md에 붙여넣기 가능.

### 2. `cfh eval --variants <file>` — description A/B 자동 비교

스킬 description을 어떻게 손댈지 데이터로 결정:

```json
[
  { "name": "current",  "description": "...React/Vue... Do NOT trigger backend." },
  { "name": "broader",  "description": "...any TDD work..." },
  { "name": "stricter", "description": "...Only React. Do NOT trigger fastapi." }
]
```

```bash
cfh eval tdd-first --variants variants.json
```

**동작**:
1. 각 케이스 prompt × 각 variant description → trace 점수 계산
2. 케이스별 winner 표시 + 변형별 누적 점수 + 추천

**핵심 설계**: **LLM 호출 없음**. trace의 키워드 매칭만 사용 → 토큰 0, 빠름.

**한계**:
- 키워드 매칭만 — 의미 평가 안 함
- 진짜 행동 비교는 SKILL.md 임시 swap 후 `--executor claude` 따로 돌려야 함
- 스킬에 evals 케이스가 풍부해야 신호도 풍부

**왜 가치 있나**: description 튜닝의 추측이 데이터로 변함. "react를 더 강조해야 하나, 백엔드 anti-trigger를 추가해야 하나?"를 케이스별 점수로 바로 답.

### 3. `cfh eval --report junit` — CI 통합

```bash
cfh eval --executor claude --report junit --output junit.xml
```

**XML 구조**:
- `<testsuites>` = 모든 스킬
- `<testsuite name="<skill>">` = 한 스킬
- `<testcase name="<case>">` = 한 케이스 (pass: 빈 / fail: `<failure>` / error: `<error>` / skip: `<skipped>`)
- A/B 모드: treatment 결과 + baseline diff을 `<system-out>`에

**GitHub Actions 통합 예**:
```yaml
- run: cfh install
- run: cfh eval --executor claude --report junit --output junit.xml
- uses: dorny/test-reporter@v1
  with:
    name: Skill evals
    path: junit.xml
    reporter: jest-junit
```

**종료 코드**: fail/error/regressed 있으면 exit 1 → 회귀 PR 차단.

### 4. Eval 결과 영속화 — evolve trend의 토대

`--executor claude` 또는 `--manual` 실행 후, **텔레메트리 옵트인** 상태면 자동 저장:

```
~/.claude/.cfh-logs/eval-history/<skill>/<timestamp>.json
```

**저장 내용**: 메타데이터(timestamp, mode, summary) + assertion 결과만. 출력 본문은 저장 안 함 (≈5~20KB/run).

**활용**:
- `cfh dashboard`의 Eval trend 섹션이 시계열 표시
- 향후 `cfh evolve`가 trend 분석 ("3주 전엔 통과했는데 지금 fail" 신호)

**저장 안 하는 경우**: `--dry-run`, `--list`, 텔레메트리 비활성화.

### 0.10.0 → 0.11.0 cascade

| 단계 | 도구 | 역할 |
|---|---|---|
| 1. 측정 | `cfh cost` (0.10.0) | 실 사용 토큰 |
| 2. 검증 | `cfh eval` (0.10.0) | 케이스 기반 행동 |
| 3. **튜닝** | `cfh eval --variants` (0.11.0) | description 후보 비교 |
| 4. 영속화 | eval-history (0.11.0) | trend 데이터 축적 |
| 5. 통합 보기 | `cfh dashboard` (0.11.0) | 한 화면 |
| 6. CI 통합 | `cfh eval --report junit` (0.11.0) | PR 회귀 차단 |
| 7. 안전망 | `cfh sentry` (0.10.0) | tool 호출 신뢰도 |

**0.11.0의 핵심 가치**: 0.10.0 도구가 있어도 **사용자가 매일 활용하긴 어려웠던** 마찰을 해소. dashboard로 가시화, junit으로 CI 통합, variants로 description tuning 자동화, history로 trend 축적.

---

## Cost 회귀 + DX 폴리시 (0.12.0)

0.11.0이 측정 cascade를 완성했다면, 0.12.0은 **일상 작업의 마찰**을 정리. 5개 항목, 큰 기능 없지만 마찰 큰 부분 제거.

### 1. `cfh cost --since-commit <hash>` — 회귀 진단

특정 commit 이후 **토큰 사용 변화**를 정량 비교:

```bash
cfh cost --since-commit abc1234 --match my-project
```

```
📈 Cost since-commit comparison
  Commit:    cc1350d
  Timestamp: 2026-04-29T04:38:10Z

  Sessions:  3 (before) → 1 (after)
  Input+cache:  556M → 360M    (-195M, -35.2%)
  Output:       1.7M → 1.2M    (-523K, -29.9%)

Top changes by command:
  /cfh-plan    448M → 119M    (-329M)  702→326 turns
  /cfh-review  0    → 171M    (+171M)  0→621 turns

✅ 의미 있는 토큰 감소 (-35.2%)
```

**동작**: `git show -s --format=%cI <hash>`로 commit 시점 추출 → session jsonl을 mtime으로 before/after 분리 → 명령별 변화량 + ±20% 임계 판정.

**한계**: session mtime 기반이라 commit과 무관하게 단순 시간 분리. N=4 세션 비교는 신호 약함 — 의미 있는 변화 보려면 같은 패턴 반복 필요.

### 2. `cfh diff --skills-vs-evals` — staleness 감지

description 수정됐는데 evals 안 바뀐 스킬 자동 발견:

```bash
cfh diff --skills-vs-evals
```

```
🕒 Skills vs evals staleness check

  Fresh:    2 skills (evals updated after SKILL.md)
  Stale:    1 skills (SKILL.md updated after evals — review evals)
  No evals: 5 skills

  ⚠ Stale:
    • tdd-first   SKILL.md 2.1d newer than happy-path.json (3 cases)

  ℹ No evals/:
    • asset-factory, debug-investigator, harness-factory, ...
```

**왜 가치 있나**: 0.11.0 eval 측정 인프라가 정착하려면 evals가 description과 동기 — 이 도구가 동기 깨짐을 자동 감지.

**한계**: mtime fragile (git pull로 바뀜) — 의미 있는 변경 vs typo 구분 못 함. 신호이지 결론 아님.

### 3. `cfh new skill <name> --from-existing <other>` — 스킬 fork

기존 스킬을 빠르게 변형:

```bash
cfh new skill our-tdd --from-existing tdd-first
# → ~/.claude/skills/our-tdd/ 생성 (전체 디렉터리 복사)
# → frontmatter:
#     name: our-tdd
#     description: TODO update for our-tdd — was: ...
# → .cfh-manifest.json 자동 제거 → user-authored 분류
```

**적용**: 우리 팀만의 TDD 스타일, 기존 스킬 변형 실험. progressive disclosure — `cfh new skill foo` (빈 스캐폴드) vs `--from-existing` (작동하는 시작점).

**한계**: 현재 `kind: skill`만 지원. description 자동 변경은 prefix뿐 — 의미 변형은 사람이 수정.

### 4. `cfh watch [--doctor]` — 자동 감시

스킬 편집 중 즉시 피드백:

```bash
cfh watch                  # 변경 시 validate
cfh watch --doctor         # validate + doctor (느림, 더 철저)
```

**동작**: `~/.claude/skills`, `~/.claude/commands`, 프로젝트 로컬까지 fs.watch로 감시 → 500ms debounce 후 validate 재실행. Ctrl+C로 종료.

**제외**: `.cfh-manifest.json`, `.cfh-logs/` (피드백 루프·로그 변경 무시).

**한계**: fs.watch는 OS별 차이 — Linux의 recursive 옵션이 일부 케이스 누락 가능. 작업 중 즉시 피드백 정도로 사용, CI 검증은 별도 명령.

### 5. `cfh validate --strict` — schema 린트

SKILL.md frontmatter를 **schema 기반**으로 더 엄격히 검증:

```bash
cfh validate                # 기본 (현 동작 그대로)
cfh validate --strict       # schema + 알 수 없는 필드 경고
```

**Schema (0.12.0)**:
- `name`: kebab-case, 1~63자, dir 이름과 일치
- `description`: 20~1024자
- `allowed_tools` / `license` / `version` / `deps`: optional, 타입 검증

**`--strict`의 추가 체크**: 알 수 없는 frontmatter 필드 경고 (forward-compat 유지). CI에서 정책으로 활성화 권장.

**왜 옵트인인가**: 기존 사용자 SKILL.md에 임의 필드 들어있을 수 있음 — 강제 적용 시 false positive 위험.

### 0.10.0 → 0.11.0 → 0.12.0 누적

| 단계 | 도구 | 추가된 가치 |
|---|---|---|
| 측정 | cost·eval·sentry | 데이터 수집 |
| 측정 cascade (0.11.0) | dashboard·variants·junit·history | 데이터 활용·시각화 |
| **DX 폴리시 (0.12.0)** | cost --since-commit·diff --skills-vs-evals·watch·--from-existing·--strict | **일상 마찰 제거** |

다음 0.13.0은 **Semantic eval (LLM-judge)** — string 매칭 한계 돌파.

---

## Evolution commands (0.3.0, opt-in)

스킬을 쓰다 보면 description이 실제 사용 패턴과 어긋납니다. `cfh evolve`는 정적 분석 + (옵트인 시) 사용 로그 기반 제안을 출력하여 이를 교정하도록 돕습니다. **모든 수정은 사용자가 직접** — 자동 적용은 0.3.0에 없습니다.

### `cfh log`

로그는 기본 비활성화. 로컬 파일(`~/.claude/.cfh-logs/<skill>.jsonl`)에만 저장되며 외부 전송 없음.

```bash
cfh log --enable                    # 동의 후 활성화 (최초 실행 시 프롬프트로 확인)
cfh log --disable                   # 언제든 비활성화
cfh log --status                    # 현재 상태 + 로그 파일 수

cfh log <skill> --event trigger --utterance "리팩터링 좀" --helpful y
cfh log <skill> --event miss --utterance "그냥 고쳐줘" --note "too-generic"
```

Claude Code `settings.json`의 hook로 연결하면 실제 사용 시점에 자동 기록할 수 있습니다(사용자 구성 영역).

### `/cfh-feedback <skill> "<comment>"` *(0.6.0 신규)*

세션 중 즉석 피드백을 기록하는 슬래시 커맨드입니다 — `cfh log`의 사용자 친화 인터페이스.

```text
/cfh-feedback tdd-first "테스트 보강만 원했는데 TDD 모드로 들어갔음"
/cfh-feedback refactoring-strategy "Scope Q3 옵션이 모호했음"
/cfh-feedback skill-author "Phase 1 인터뷰가 잘 짜여 있음. 만족"
```

옵트인 활성화 필요 (`cfh log --enable`). Claude가 comment를 자동 분류(miss/success/friction/positive)하여 JSONL에 기록합니다. `cfh evolve` 다음 실행 시 분석에 반영됩니다.

### `cfh evolve [<name>]`

모든 스킬 또는 특정 스킬 분석:

```bash
cfh evolve                          # 전체
cfh evolve tdd-first                # 하나만
```

**정적 분석** (로그 없어도 동작):
- description 길이 (40자 미만 경고)
- 반-트리거 절 유무
- 다른 스킬과 트리거 토큰 공유 (3개+ 겹치면 경고)
- 고유 트리거 토큰 수 (5개 미만 경고)

**사용 로그 기반** (로그 있을 때만):
- helpful/not-helpful 비율
- miss 이벤트 반복 (놓친 키워드 후보)
- 자주 등장한 발화 토큰 top 10

**출력 예시**:
```
── tdd-first [global] ──
  ⚠ [description-short] description이 35자로 짧습니다. 트리거 키워드 추가 권장.
  ⚠ [trigger-overlap] "refactoring-strategy"와 트리거 토큰 4개 공유 (refactor, test, …). 반-트리거 명시 권장.
  ℹ [usage-summary] 총 42회 기록 (helpful 28, not-helpful 10, miss 4).
  ℹ [top-tokens] 자주 등장한 발화 토큰: tdd(18), 테스트(14), 먼저(9), …
  ⚠ [recurring-miss] miss 이벤트 4회 기록됨. 최근 예: "테스트만 보강" / "기존 코드 검증".
```

제안이 마음에 들면 `SKILL.md`를 직접 편집한 뒤 `cfh validate`로 확인. 향후 버전에서 `--apply` 플래그로 인터랙티브 diff 적용을 추가할 계획입니다.

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

### `/cfh-new <kind> <name>` — 새 스킬 대화형 작성

1. `skill-author` 스킬 활성화
2. 6 질문 인터뷰 (목적 / 트리거 / 반-트리거 / 핵심 원칙 / 출력 / 참조)
3. description 초안 제시 → 승인
4. SKILL.md + references/ 생성 (CLI `cfh new` 또는 Claude Write)
5. `cfh validate` + 시험 트리거

```
사용자: /cfh-new skill react-query-patterns
Claude: (Phase 1 질문 6개 순차 진행)
        (Phase 2 description 초안)
        (Phase 3 SKILL.md 구조 제안)
        (Phase 4 Write)
        (Phase 5 validate + 시험 트리거)
```

### `/cfh-team [도메인 설명]` — 팀 에이전트 자동 생성

1. `harness-factory` 스킬 활성화
2. 5 질문 도메인 인터뷰
3. 6 패턴 중 1개 추천 (Pipeline / Fan-out-Fan-in / Expert Pool / Producer-Reviewer / Supervisor / Hierarchical)
4. 각 에이전트 책임 확정
5. 프리셋 매칭 시 `cfh generate`, 아니면 Claude가 Write로 직접 생성
6. `cfh validate` + 시운전

```
사용자: /cfh-team FE PR의 다축 코드 리뷰
Claude: (Phase 1 5 질문)
        → 추천 패턴: Expert Pool (security/perf/a11y/types)
        → cfh generate reviewer-team 실행 제안
        → 생성 후 시운전 태스크 제안
```

### `/cfh-refactor <target>` / `/cfh-tdd <target>`

기존 스킬을 명시적으로 활성화. `/cfh-refactor`는 `refactoring-strategy`의 Scope Narrowing → Blast Radius → Small PR 계획 흐름. `/cfh-tdd`는 `tdd-first`의 5 Phase.

### `/cfh-tc <path>` / `/cfh-review <parent-branch>`

- `/cfh-tc`: 테스트 작성. 파일이 있으면 Test-Fill Mode, 없으면 TDD Mode.
- `/cfh-review`: 코드 리뷰. diff 규모 측정 후 서브에이전트 1~5개 병렬 실행해 `REVIEW.md` 생성.

### `/cfh-trace [query]`

발화가 어느 스킬을 트리거할지 시뮬레이션. 인자 없으면 발화를 묻는 인터뷰 모드.

---

## 전형적 시나리오

### 시나리오 1 — FE 프로젝트에 처음 설치

```bash
npm install -g @han-kyeon/claude-skills
cfh install
cfh list
```

→ 4 skills + 8 commands 설치 완료. Claude Code에서 "리팩터링", "TDD" 등 자동 트리거 확인.

### 시나리오 2 — 자기만의 스킬 작성

```
사용자: /cfh-new skill payment-validation
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
사용자: /cfh-team 결제 모듈을 TDD 오버핏 없이 구현
Claude: (도메인 인터뷰)
        → 실패 비용 높음 → Producer-Reviewer 패턴 추천
        → cfh generate producer-reviewer 제안
```

생성 후 `.claude/agents/producer.md`, `reviewer.md` 편집해 결제 도메인 제약 추가.

### 시나리오 5 — 패키지 업데이트, 커스텀 작업 보존

```bash
npm update -g @han-kyeon/claude-skills
cfh update              # 번들 자산만 갱신
cfh list                # 커스텀 스킬은 그대로 user-authored로 남음
```

---

## 디렉터리 구조 (패키지 내부)

```
@han-kyeon/claude-skills/
├── bin/cli.js                   # CLI 진입점
├── lib/
│   ├── install.js               # install (manifest 기록)
│   ├── update.js                # managed만 갱신
│   ├── list.js                  # manifest 기반 상태 표시 (전역+프로젝트)
│   ├── remove.js                # user-authored 보호
│   ├── adopt.js                 # managed → user-authored 전환
│   ├── diff.js                  # 사용자 변경분 확인
│   ├── doctor.js                # 6-point 점검
│   ├── trace.js                 # 트리거 시뮬레이션
│   ├── new.js                   # 스캐폴드
│   ├── generate.js              # 프리셋 적용
│   ├── validate.js              # frontmatter 검증
│   ├── manifest.js              # .cfh-manifest.json 읽기·쓰기·해싱
│   ├── frontmatter.js           # 미니멀 YAML 파서 (zero deps)
│   ├── cost.js                  # transcript 토큰 집계 + since-commit (0.10.0+)
│   ├── eval.js                  # skill eval + variants + junit + history (0.10.0+)
│   ├── sentry.js                # tool 호출 실패 sensor (0.10.0)
│   ├── dashboard.js             # 통합 markdown 리포트 (0.11.0)
│   ├── watch.js                 # 파일 변경 감시 (0.12.0)
│   └── paths.js                 # 경로 헬퍼
├── skills/
│   ├── refactoring-strategy/
│   ├── tdd-first/                # FE-friendly TDD
│   │   └── evals/                # eval 케이스 (0.10.0)
│   ├── tdd-general/              # framework-agnostic TDD (0.6.0)
│   ├── skill-author/             # 메타: 스킬 작성
│   │   └── evals/                # eval 케이스 (0.10.0)
│   ├── harness-factory/          # 메타: 팀 생성
│   ├── debug-investigator/       # 메타: 이슈 조사 (0.8.0)
│   └── asset-factory/            # 메타: 자산 dispatcher (0.4.0+)
├── commands/
│   ├── cfh-review.md, cfh-tc.md, cfh-refactor.md, cfh-tdd.md
│   ├── cfh-tdd-gen.md            # framework-agnostic TDD (0.6.0)
│   ├── cfh-tc-gen.md             # framework-agnostic 테스트 (0.6.0)
│   ├── cfh-debug.md              # /cfh-debug → 이슈 조사 (0.8.0)
│   ├── cfh-new.md                # /cfh-new → skill-author 활성화
│   ├── cfh-team.md               # /cfh-team → harness-factory 활성화
│   ├── cfh-make.md               # /cfh-make → asset-factory 활성화
│   ├── cfh-plan.md               # /cfh-plan → 작업 dispatcher (0.4.0+)
│   ├── cfh-trace.md              # /cfh-trace → 트리거 시뮬레이션
│   ├── cfh-feedback.md           # /cfh-feedback → 사용 피드백 (0.6.0)
│   ├── cfh-retro.md              # /cfh-retro → 작업 회고 영구 기록 (0.9.0)
│   ├── cfh-progress.md           # /cfh-progress → 프로젝트 진행 노트 (0.10.0)
│   ├── cfh-guide.md              # /cfh-guide → 사용 가이드
│   └── references/
│       ├── retro-and-commit.md      # 5개 커맨드 공유 Retro+Commit 블록 형식 (0.9.0)
│       ├── progress-template.md     # PROGRESS.md 표준 형식 (0.10.0)
│       └── confidence-tagging.md    # [verified]/[inferred]/[guessed] 컨벤션 (0.10.0)
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

## Monorepo 사용

Nx / Turborepo / Yarn Workspaces / pnpm Workspaces 등 모노레포에서는 **패키지별로 다른 규약·스킬이 필요한 상황**이 생깁니다. 본 패키지는 monorepo 전용 기능은 제공하지 않지만, **Claude Code의 cwd 기준 `.claude/` 탐색**을 활용해 간단히 구성할 수 있습니다.

### 3가지 배치 패턴

#### A. 루트만 — 공통 `.claude/` (가장 단순)

```
monorepo/
├── .claude/              # 모든 패키지에 공통 적용될 규약
│   ├── skills/
│   └── commands/
├── CLAUDE.md
├── packages/
│   ├── web-fe/
│   ├── api-backend/
│   └── shared-lib/
└── package.json
```

**언제 쓰나**: 패키지 간 규약 차이가 크지 않고 공통 스타일·TDD 원칙을 공유할 때.
**한계**: 패키지별 스택 차이(FE vs BE)가 크면 스킬이 오발동.

#### B. 패키지 로컬만 — 각 패키지에 `.claude/`

```
monorepo/
├── packages/
│   ├── web-fe/
│   │   ├── .claude/           # FE 전용 규약 (예: /cfh-tdd 기반 RTL)
│   │   │   ├── skills/
│   │   │   └── commands/
│   │   └── CLAUDE.md
│   ├── api-backend/
│   │   ├── .claude/           # BE 전용 규약 (예: /cfh-tdd-gen 기반)
│   │   │   ├── skills/
│   │   │   └── commands/
│   │   └── CLAUDE.md
│   └── shared-lib/
│       └── .claude/           # 라이브러리 전용
└── package.json
```

**언제 쓰나**: 패키지가 서로 다른 스택·도메인이라 공통 규약이 거의 없을 때.
**사용법**: 해당 패키지 디렉터리에 `cd` 한 뒤 Claude Code 실행. cwd 기준 `.claude/`가 잡힘.
```bash
cd packages/api-backend
claude    # 이 패키지의 .claude/만 인식됨
```

#### C. 하이브리드 — 루트 + 패키지별 override (권장, 대부분 실무)

```
monorepo/
├── .claude/                   # 공통 최소 (skill-author·refactoring-strategy 등 메타만)
├── packages/
│   ├── web-fe/
│   │   └── .claude/           # FE 특화 추가 (RTL 관례·디자인 시스템 규약)
│   ├── api-backend/
│   │   └── .claude/           # BE 특화 추가 (DB 마이그레이션 체크 등)
│   └── shared-lib/
│       └── .claude/           # 라이브러리 특화 (API stability 규약)
```

**언제 쓰나**: 공통 원칙은 있지만 패키지별 특화가 필요한 일반적 모노레포.

### 명령 실행 위치 지침

| 작업 | 실행 위치 | 결과 |
|---|---|---|
| 공통 규약 자산 생성 | 모노레포 **루트** | `<root>/.claude/`에 생성 |
| 패키지 특화 자산 생성 | **해당 패키지 디렉터리** | `<root>/packages/<pkg>/.claude/`에 생성 |
| `cfh generate <preset>` | 팀이 적용될 위치에서 | 실행한 위치의 `.claude/`에 생성 |
| `cfh install` | 어디서든 | 항상 `~/.claude/` 전역 (변경 없음) |
| `cfh list` | 패키지 디렉터리 | 전역 + 해당 패키지 `.claude/` 표시 |
| `cfh doctor` | 패키지 디렉터리 | 해당 패키지 관점에서 점검 |

### 알려진 한계

- **자산 상속·오버라이드는 Claude Code 자체의 `.claude/` 탐색 규칙에 의존**합니다. 현재 Claude Code가 상위 디렉터리까지 자동 탐색하는지는 버전에 따라 다릅니다. 루트 공통 `.claude/`가 패키지 로컬 `.claude/`와 섞이길 기대하신다면 실제 동작을 **`cfh trace`·샘플 발화로 검증**하세요.
- 본 패키지의 `cfh` CLI는 항상 **실행한 cwd 기준**으로 `./.claude/`를 봅니다. 여러 패키지를 한 번에 점검하는 `cfh --workspaces` 옵션은 0.7.0에 포함되지 않습니다 (실제 수요 확인 후 0.8.0+ 검토).
- 패키지별 `.claude/`를 **git commit**하면 팀원이 clone 시 자동 적용되나, `~/.claude/` 전역 자산은 각자 `cfh install`이 필요.

### 간단한 전략

1. **처음에는 A 패턴** (루트 공통)으로 시작. 특화가 필요하면 그때 B·C로 확장.
2. 각 패키지의 `CLAUDE.md`에 **"이 패키지 스택·규약"**을 짧게 명시 — cfh-review의 `stack_kind` 감지가 정확해짐.
3. 공통 규약은 **`refactoring-strategy`·`skill-author`·`harness-factory`** 같은 메타-스킬 위주로, 패키지별로는 **도메인 스킬**(결제·인증·UI 컴포넌트 등)을 분리.

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
      - run: npx -y @han-kyeon/claude-skills validate --target ./.claude
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

### Q. `/cfh-team` 대신 CLI로만 팀을 만들 수 있나요?

`cfh generate --list`로 프리셋 확인 후 `cfh generate <name>`. 프리셋에 없는 커스텀 조합은 `/cfh-team`이 Claude 대화로 설계해 Write tool로 생성합니다.

### Q. 스킬이 자동 트리거되지 않습니다

1. `cfh list`로 설치 확인 (symlink/copy 상태도 확인)
2. `cfh validate`로 frontmatter 검증
3. `cfh doctor`로 키워드 중복·고아 manifest·shadowing 확인
4. `cfh trace "<내 발화>"`로 어느 스킬이 매칭되는지 점수 확인
5. SKILL.md `description`에 **구체 키워드** 3개 이상 있는지 확인
6. Claude Code 세션 재시작 (`.claude/` 또는 `~/.claude/` 변경 시 캐시 갱신 필요)

### Q. 내가 편집한 스킬이 `cfh update`에 덮어써질까 걱정됩니다

편집된 managed 항목(`user-modified`)은 기본적으로 보호되며, 완전히 사용자 소유로 선언하고 싶으면 `cfh adopt <name>`을 쓰시면 됩니다. 이후 `user-authored (adopted)`로 분류되어 업데이트에서 자동 제외됩니다.

### Q. /cfh-team의 Deep-dive가 항상 (b) 모두 yes로 가게 하고 싶습니다 *(0.6.0)*

`--deep` 플래그로 매번 (b)를 자동 응답하실 수 있습니다.
```text
/cfh-team --deep <도메인 설명>
```
반대로 단순 팀이라 빠르게 가시려면 `--fast`로 (c) skip 자동.

### Q. 인터뷰 질문에 답을 모르겠어요 *(0.6.0)*

모든 메타-스킬의 모든 질문에 `(z) 모르겠음` 옵션이 기본 탑재되어 있습니다. 선택 시 Claude가 자동으로 다음 3단계를 적용합니다:
1. 비슷한 상황 예시 2~3개 제시 → 사용자가 가까운 쪽 선택
2. 그래도 모르면 안전한 기본값 제안 + "나중에 수정 가능" 안내
3. y로 진행 또는 n으로 보류

상세 protocol: `~/.claude/skills/asset-factory/references/unknown-answer-playbook.md`.

### Q. cfh-tdd vs cfh-tdd-gen 어느 쪽 쓰나요 *(0.6.0)*

| | `cfh-tdd` | `cfh-tdd-gen` |
|---|---|---|
| 가정 스택 | React/Vue + RTL | 임의 (Node·Python·Go·Rust 등) |
| 테스트 관용구 | getByRole·userEvent·MSW | Arrange-Act-Assert·DI·table-driven |
| 안티패턴 | DOM class 검증·내부 state 접근 | private 메서드·시간 의존·글로벌 상태 누수 |

본인 프로젝트가 React/Vue면 `cfh-tdd`, 백엔드·라이브러리·CLI면 `cfh-tdd-gen`. 모노레포라면 대상 파일 위치로 결정.

### Q. 팀 산출물이 잘못됐을 때 감지 못 할까 봐 걱정됩니다 *(0.6.0)*

`/cfh-team` Phase 1 Q6 관측성 질문이 정확히 그 우려를 다룹니다. (e) 감지 경로 없음 + Q4 실패 비용 (b)/(c)이면 Sanity check R8이 트리거되어 Producer-Reviewer 강제 권고 또는 사람 승인 관문 추가를 제안합니다.

### Q. Shell에서 cfh 자동완성을 쓰고 싶어요 *(0.7.0)*

bash·zsh 자동완성 스크립트가 `completions/` 디렉터리에 포함돼 있습니다.

```bash
# bash
echo 'source '$(npm root -g)'/@han-kyeon/claude-skills/completions/cfh.bash' >> ~/.bashrc

# zsh
echo 'fpath=('$(npm root -g)'/@han-kyeon/claude-skills/completions $fpath)' >> ~/.zshrc
echo 'autoload -Uz compinit && compinit' >> ~/.zshrc
```

Tab을 누르면 서브커맨드·플래그·자산 이름(`remove <TAB>` 등)이 자동완성됩니다. 상세: `completions/README.md`.

### Q. 자산을 팀원에게 공유하고 싶어요 *(0.7.0)*

두 가지 방법:

**방법 1 — 프로젝트 로컬 + git**: 팀 공유가 목적이면 `./.claude/`에 작성하고 git commit. 팀원은 `git pull`만 하면 자동 적용.

**방법 2 — export/import 번들**: 전역 자산(`~/.claude/`)을 다른 PC로 옮기거나 일회성으로 공유할 때.
```bash
# 내보내기
cfh export --output my-skills.json

# 받은 사람
cfh import my-skills.json
```

### Q. Hooks로 사용 로그를 자동 수집하고 싶어요

`HOOKS.md`에 Claude Code `settings.json`의 `PostToolUse`·`Stop`·`UserPromptSubmit` 훅에 `cfh log`를 연결하는 7가지 레시피가 있습니다. CI에서 `cfh doctor`·`cfh evolve` 돌리는 예제도 포함.

### Q. Monorepo에서는 어떻게 쓰나요 *(0.7.0)*

`./.claude/`는 Claude Code가 cwd 기준으로 탐색하므로 **패키지 디렉터리에 cd한 뒤 Claude Code 실행**이 기본 패턴입니다. 3가지 배치(루트만 / 패키지만 / 하이브리드) 가이드는 이 README의 "Monorepo 사용" 섹션 참고.

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
