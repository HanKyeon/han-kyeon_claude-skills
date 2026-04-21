# @han-kyeon/claude-skills

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
#    (dispatcher) /cfh-make                (무엇을 만들지 모를 때 — 분류부터)
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

작업 성격별로 **시나리오 가이드(다음 섹션) 중 하나를 고르는 것**이 기본 동작입니다. 막막하시면 아래 2개 중 하나로 시작:

- `/cfh-guide overview` — 이 도구의 전체 그림을 대화로 받기
- `/cfh-make <한 줄 요구사항>` — dispatcher가 분류해서 적절한 메타-스킬로 위임

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

**추천 흐름**:
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

**추천 흐름**:
```
1. /cfh-tc src/legacy/validateCoupon.ts
   → Test-Fill Mode 자동 전환 (파일 존재 감지)
   → Phase 0 현재 동작 관찰 (Characterization Test 접근)
   → Priority 1~5 시나리오 설계 (Core → Async → Edge → A11y → Integration)

2. 테스트 작성 중 버그 발견 시
   → `// BUG:` 주석만 달고 수정은 별도 PR (Characterization 원칙)

3. 완료 후 /cfh-review
```

**자동 트리거**: "테스트 보강해줘" / "커버리지 올리고 싶어" 같은 발화만으로 `tdd-first` 스킬이 뜹니다.

---

### 4. TDD 개발

**상황**: 설계를 테스트로 먼저 표현하고 싶음. 오버핏 방지가 중요.

**추천 흐름**:
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

**상황**: 렌더링·런타임·번들 사이즈 개선.

**추천 흐름**:
```
1. 현황 파악 — /cfh-review HEAD~5..HEAD 같은 특정 범위로 Performance 축 리뷰
   (Medium+ diff면 Performance 에이전트 자동 포함)

2. 집중 최적화 팀 필요 시
   cfh generate reviewer-team
   → 생성된 perf-reviewer.md를 편집해 프로젝트 특화 규칙 추가
   (예: React Query staleTime, RHF watch 남용, Zustand selector 등)

3. 구조적 성능 리팩터면 /cfh-refactor
   → Blast Radius 분석에서 "성능" 축을 명시하면 적절한 safety net 제안
```

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
  Phase 0: 기존 유사 자산 스캔
  Phase 1: 3 분류 질문 (반복성 / 협업 / 트리거 방식)
  Phase 2: skill-author / harness-factory / 인라인 커맨드 중 위임
```

**언제 쓰지 말아야**: 만들려는 게 skill·command·team 중 이미 확정됐다면 `/cfh-new`·`/cfh-team` 직접. 일회성 요청이면 그냥 Claude에게 바로 말하시면 됩니다.

---

## 커맨드·CLI 선택 가이드

### 슬래시 커맨드 (Claude Code 대화 중)

| 상황 | 추천 | 언제 쓰나 | 대안 |
|---|---|---|---|
| 새 기능 구현 | `/cfh-tdd <file>` | 처음부터 TDD로 가고 싶을 때 | 자유 작성 + `/cfh-tc`로 뒤에 테스트 보강 |
| 기존 코드 테스트 | `/cfh-tc <file>` | 구현 있고 테스트만 추가 | — |
| 코드 구조 개선 | `/cfh-refactor <target>` | 행동 변경 없는 리팩터 | 버그 수정이면 일반 대화 |
| PR 리뷰 | `/cfh-review [branch]` | 머지 전 자체 점검 | 외부 코드 리뷰 먼저 받고 보조로 사용 |
| 새 스킬 만들기 (확정) | `/cfh-new skill <name>` | skill이 필요한 게 확실할 때 | — |
| 팀 구성 (확정) | `/cfh-team [domain]` | 다축 리뷰·생성-검증 분리가 확정 | `cfh generate <preset>`이 더 빠를 수 있음 |
| 뭘 만들지 미정 | `/cfh-make [요구사항]` | skill/command/team 구분 안 설 때 | — |
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
| **로깅 제어** | `cfh log --enable/--disable/--status` | 옵트인 텔레메트리 제어 |
| **이벤트 기록** | `cfh log <skill> --event --utterance --helpful` | 사용 패턴 수집 |
| **스킬 제안** | `cfh evolve [<name>]` | description·원칙 개선 포인트 제안 |

**굵은 글씨**는 0.3.0 신규 명령입니다.

### 결정이 어려울 때 순서

1. **아무것도 모르겠다** → `/cfh-make` 또는 `/cfh-guide overview`
2. **무엇이 어디에 있나** → `cfh list` (전역+프로젝트), `cfh doctor` (문제 진단)
3. **내 발화가 안 먹힌다** → `cfh trace "<발화>"` → description에 키워드 보충 → `cfh evolve`로 보강 포인트 확인
4. **번들 스킬을 내 것으로 만들고 싶다** → `cfh diff <name>` → `cfh adopt <name>`
5. **새 프로젝트 온보딩** → 시나리오 7번 흐름 따라가기

---

## 번들 자산 전체 목록

### Skills (`skills/`)

| 스킬 | 트리거 | 역할 |
|---|---|---|
| `refactoring-strategy` | "리팩터링", "refactor", "legacy cleanup" | Small PR · Blast Radius · Characterization test · 라이브러리 공식 안티패턴 |
| `tdd-first` | "TDD", "테스트 먼저", 새 기능/버그 시작 | Intent Interview → Test Outline → Failing Test → Implement → Refactor 5 Phase |
| `skill-author` | "스킬 만들", "create a skill", "write a skill" | 인터뷰 기반 SKILL.md 작성 메타-스킬 (6 Phase: Pre-scan + 조건부 follow-up + Sanity check) |
| `harness-factory` | "팀 에이전트", "agent team", "build a harness" | 6 패턴 중 선택해 `.claude/agents/` 및 `.claude/skills/` 생성 (7 Phase: Pre-scan + Deep-dive 옵트인 + Sanity check) |
| `asset-factory` | "자동화해줘", "뭔가 만들고 싶은데", "automate this" | **Dispatcher** — 3 분류 질문으로 skill/command/team/agent 판단 후 적합한 메타-스킬로 위임 |

### Slash commands (`commands/`)

번들 커맨드는 0.3.0부터 **`cfh-` 접두사**로 통일되어 사용자 작성 커맨드와 네임스페이스가 분리됩니다.

| 커맨드 | 인자 | 역할 |
|---|---|---|
| `/cfh-review` | `[parent-branch]` | 적응형 AI 코드 리뷰 — diff 규모별 서브에이전트 수 조정 |
| `/cfh-tc` | `[path]` | 테스트 작성 — TDD Mode / Test-Fill Mode 자동 감지 |
| `/cfh-refactor` | `[target]` | `refactoring-strategy` 스킬 명시적 활성화 |
| `/cfh-tdd` | `[target]` | `tdd-first` 5 Phase 순차 실행 |
| `/cfh-new` | `<kind> <name>` | `skill-author` 활성화 + 인터뷰 기반 자산 작성 (종류 확정됐을 때) |
| `/cfh-team` | `[domain]` | `harness-factory` 활성화 + 팀 생성 워크플로 |
| `/cfh-make` | `[requirement]` | `asset-factory` dispatcher — 무엇을 만들지부터 분류 |
| `/cfh-trace` | `[query]` | 발화가 어느 스킬을 트리거할지 시뮬레이션 |
| `/cfh-guide` | `[topic]` | 사용 가이드 |

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

설치 상태를 6개 항목에 걸쳐 한 번에 점검합니다.

```bash
cfh doctor                              # 문제 있으면 exit 1
cfh doctor --warn-only                  # 항상 exit 0 (CI에서 경고만)
```

점검 항목:
1. frontmatter 유효성 (`name`/`description`/20자 이상)
2. 스킬 간 트리거 키워드 중복 (오발동 위험)
3. 고아 manifest (파일은 없는데 manifest만 남음)
4. 깨진 symlink
5. 전역(`~/.claude`)과 프로젝트(`./.claude`)에 같은 이름이 있어 프로젝트가 가리는 경우
6. 커맨드의 `$ARGUMENTS` 또는 `<invocation>` 태그 누락

### `cfh trace "<query>"`

주어진 발화가 어떤 스킬을 트리거할지 **키워드 매칭**으로 시뮬레이션합니다. positive/negative(반-트리거) 분리 후 가중치 기반 점수 상위 N개를 보고합니다.

```bash
cfh trace "리팩터링 해줘"                  # 상위 5개
cfh trace "이 PR 리뷰 좀" --top 10         # 상위 10개
```

슬래시 커맨드 `/cfh-trace`는 인자 없이도 동작 — 발화를 묻는 인터뷰 모드로 전환합니다. 점수는 참고용이며, Claude Code의 실제 트리거는 대화 컨텍스트 전체를 고려해 결정됩니다.

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
│   └── paths.js                 # 경로 헬퍼
├── skills/
│   ├── refactoring-strategy/
│   ├── tdd-first/
│   ├── skill-author/            # 메타: 스킬 작성
│   └── harness-factory/         # 메타: 팀 생성
├── commands/
│   ├── cfh-review.md, cfh-tc.md, cfh-refactor.md, cfh-tdd.md
│   ├── cfh-new.md               # /cfh-new → skill-author 활성화
│   ├── cfh-team.md              # /cfh-team → harness-factory 활성화
│   ├── cfh-trace.md             # /cfh-trace → 트리거 시뮬레이션
│   └── cfh-guide.md             # /cfh-guide → 사용 가이드
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
