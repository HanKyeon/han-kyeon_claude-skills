---
name: asset-factory
description: |
  Use this skill when the user wants to build something with Claude Code but is unsure whether
  it should be a skill, slash command, subagent, or agent team (keywords: "자동화해줘",
  "이거 만들어줘", "반복 작업 줄이고 싶어", "claude가 알아서 하게", "뭔가 만들고 싶은데",
  "automate this", "turn into a workflow"). Classifies the request via 3-question decision tree
  and delegates to skill-author (for skills), cfh-harness (for teams), or inline interview
  (for commands). Do NOT trigger when the user already specified the asset kind (use
  skill-author or cfh-harness directly), or for one-shot requests that do not need
  persistence.
commands: [/cfh-make]
---

# Asset Factory


## 트리거 조건 (1.0 컨벤션 — 본문 참고용, frontmatter description이 권위)

```
TRIGGER:  '자동화해줘', '이거 만들어줘', '반복 작업 줄이고 싶어', 'automate this',
          'turn into a workflow' 같이 만들 자산 종류가 아직 정해지지 않은 경우.
SKIP:     이미 skill/command/team 종류가 명확하면 (skill-author/cfh-harness 직접 호출).
          One-shot 요청(영속성 불필요)에도 트리거 안 됨.
EXAMPLES:
  - '리뷰 응답 검증 자동화하고 싶어' → 분류 인터뷰 → skill/command/team 결정
  - '뭔가 만들고 싶은데' → 3 질문 디스패치
```
사용자의 "뭔가 만들어줘" 발화를 받아, **skill / command / agent / team 중 어느 것이 맞는지**를 분류하고 해당 메타-스킬로 위임하는 **dispatcher 메타-스킬**입니다. 사용자가 Claude Code의 자산 종류를 구분하지 못해도 목적에서 출발해 올바른 생성 경로로 인도합니다.

## 활성화 시 반드시

1. **요구사항 먼저, 스캔은 그 위에.** 한 문장 요구사항을 받은 뒤, 그 요구사항 토큰으로 매칭되는 자산만 scoped 스캔. Broad scan 금지.
2. **분류 먼저, 위임은 그 다음.** 3단계 질문 전에 파일 생성·다른 스킬 호출 금지.
3. **one-shot 요청 걸러내기.** 진짜 반복 가능한 작업인지부터 확인. 한 번 쓰고 끝날 일이면 스킬·커맨드 불필요 — 바로 Claude에게 말하면 됨.
4. **분류 결과 공개.** "skill로 판단했습니다. 이유: X. 다릅니까?"로 사용자에게 판단 근거를 보여주고 교정 기회 제공.
5. **위임 시 컨텍스트 전달.** Q1~Q3 답변을 위임받는 메타-스킬이 재질문하지 않도록 충분히 넘겨줌.
6. **중복 생성 금지.** 요구사항 토큰 기반 scoped 스캔에서 유사 자산 감지 시 생성 대신 편집·확장 제안.
7. **(z) 모르겠음 fallback.** Q1~Q3에 `(z) 모르겠음` 옵션 기본 탑재. 선택 시 `references/unknown-answer-playbook.md`의 3단계 처리 — 예시 2~3개 → 안전한 기본값 제안 → y/n.

## 2 Phase 워크플로

```
Phase 1: Intent Capture          (요구사항 → scoped Pre-scan → 3 분류 질문)
   ↓
Phase 2: Delegation              (분류 결과에 따라 skill-author / cfh-harness / 인라인)
```

## Phase 1 — Intent Capture

### Step 1a — 한 문장 요구사항

`$ARGUMENTS`가 있으면 그대로 사용 ("이대로 이해했는데 맞으십니까?"로 확인만). 없으면:
> *"무엇을 Claude가 하도록 만들고 싶으신가요? 한 문장으로 설명해 주세요."*

### Step 1b — Scoped Pre-scan (이름 충돌 + 요구사항 기반 중복 검사)

**두 단계 검사**를 수행 (→ `references/classification-tree.md`의 Pre-scan 섹션):

#### (i) 정확한 이름 일치 검사 (우선순위 높음)

요구사항에서 이름 후보가 추출되면(예: "payment-rules", "audit-command") 다음 위치에서 **정확한 이름 일치**를 먼저 확인:
- `~/.claude/skills/<name>/SKILL.md`
- `./.claude/skills/<name>/SKILL.md`
- `~/.claude/commands/<name>.md`
- `./.claude/commands/<name>.md`
- `./.claude/agents/<name>.md`

**이름 일치 발견 시**:
```
⚠️ 이름 충돌: `<name>` 자산이 이미 존재합니다.
   위치: <경로>
   상태: <managed@X | user-authored | user-modified | user-authored (adopted)>

어떻게 진행할까요?
  (a) 기존 자산 편집 모드로 전환 — skill-author·cfh-harness가 '기존 편집'으로 위임
  (b) 다른 이름으로 새로 생성 — 이름 제안 인터뷰로 이동
  (c) 기존을 덮어쓰고 새로 생성 — ⚠️ 아래 경고 참고
  (d) 취소
```

**(c) 덮어쓰기 선택 시 추가 확인**:
- 기존이 `user-authored` 또는 `user-modified`면 다시 y/n 명시 확인:
  ```
  🚨 기존 `<name>`은 사용자 작성물입니다 (삭제 시 복구 불가).
  정말 덮어쓰시겠습니까? [y/N]
  ```
  `y`만 통과. 그 외 (N·공백·Enter·다른 문자) 전부 취소 처리.
- 기존이 managed이면 경고만("패키지 버전이 덮어써집니다") 후 진행.

#### (ii) 요구사항 토큰 기반 유사도 검사 (기존)

이름 일치가 없고 사용자가 (b) "다른 이름으로 새로 생성"을 선택한 경우에만 수행:

1. `~/.claude/skills/*/SKILL.md`, `./.claude/skills/*/SKILL.md` frontmatter description만 추출
2. `~/.claude/commands/*.md`, `./.claude/commands/*.md` 파일명과 1~3줄 요약 추출
3. `./.claude/agents/*.md` (있으면) 존재 여부 확인
4. 요구사항 토큰과 각 description 매칭 → **30% 이상 겹침**만 노출

유사도 발견 시:
```
🔎 기존에 유사한 자산이 있습니다:
- `<name>` (<skill|command|team>): <1줄 설명>

(a) 이 자산을 확장·편집 (b) 별도로 새로 생성 (c) 이 자산을 먼저 보고 결정 중 어느 쪽인가요?
```

없으면 "✅ 유사 자산 없음" 한 줄 후 Step 1c로.

### Step 1c — 3 분류 질문

아래 3 질문을 순서대로. **Q2에서 (예)가 나오면 Q3 스킵하고 팀으로 확정.**

#### Q1. 반복 가능한 워크플로인가?

> *"이 작업을 다음에도, 그 다음에도 같은 방식으로 반복하실 계획인가요?"*

- (a) **반복함** — Claude가 매번 같은 규칙·절차로 도와야 함 → Q2로
- (b) **이번 한 번만** — 지금 필요한 작업일 뿐 → **자산 생성 불필요**. "지금 그냥 요청해 주시면 바로 처리합니다"로 안내하고 Phase 2 skip

#### Q2. 여러 전문가가 협업해야 하는가?

> *"서로 다른 전문 관점이 각자 평가·기여해야 하는 구조인가요? (예: 보안·성능·접근성(a11y) / 일관성·멱등성·지연 / 공정성·robustness / 생성자·검증자 / 단계별 담당 — 도메인에 맞는 축 3~5개 선택)"*

- (a) **예** — 2명 이상의 독립 역할이 필요 → **team** 확정. Phase 2에서 cfh-harness로 위임.
- (b) **아니요** — 단일 역할·단일 관점 → Q3로
- (c) **모르겠음** — 다음 힌트로 재질문: "단일 에이전트가 처음부터 끝까지 담당해도 괜찮다면 (b), 두 명이 나뉘어 일해야 실패가 줄어든다면 (a)입니다."

#### Q3. 트리거 방식

> *"이 작업이 Claude와의 대화 중 자연스럽게 필요해질 때 **자동으로** 활성화되어야 하나요, 아니면 사용자가 `/커맨드`로 **명시적으로** 호출할 때만 동작해야 하나요?"*

- (a) **자동 트리거** (키워드·의도 기반) → **skill** 확정. Phase 2에서 skill-author로 위임.
- (b) **명시 호출만** (`/cfh-something`) → **command** 확정. Phase 2에서 인라인 커맨드 인터뷰.
- (c) **둘 다** → **skill 권장** (skill은 내부에서 커맨드로도 짝지을 수 있음). skill-author가 Phase 2에서 커맨드 동반 생성을 묻도록 넘김.

### Step 3 — 분류 결과 공개

```
🎯 분류 결과

요구사항: <Q1 직전 한 문장 요구사항>
Q1 반복: <답변>
Q2 협업: <답변>
Q3 트리거: <답변>

→ **<skill | command | team>** 로 생성을 권장합니다.
근거: <한 줄>

이대로 진행할까요? 아니면 다시 분류하시겠습니까?
```

사용자 승인 후 Phase 2.

## Phase 2 — Delegation

분류 결과별 위임 절차 (→ `references/delegation-map.md`):

### skill 으로 분류됨

1. 사용자에게 스킬 이름 제안 (kebab-case, `cfh-` 접두 **금지** — user-authored 네임스페이스)
2. `skill-author` 스킬로 컨텍스트 전달:
   - 이 스킬의 Q1~Q3 답변을 **Pre-scan 결과로 전달**하여 `skill-author`의 Phase 0을 일부 대체
   - "목적" 초안은 사용자의 요구사항 한 문장
3. skill-author의 Phase 1~5 수행

### command 로 분류됨

별도 메타-스킬이 없으므로 **인라인 인터뷰** (3 질문):

1. **목적·입력**: 이 커맨드는 무엇을 받아서 무엇을 하나요? `$ARGUMENTS`에 무엇이 들어오나요?
2. **출력**: 결과물 형태는? (파일 생성 / 리포트 / 질문 / 수정 제안)
3. **워크플로**: 3~5 단계로 나누면?

답변 모이면 `cfh new command <name>` 실행 안내 + Write로 TODO 채움. 이후 `cfh validate` + `cfh trace "<발화>"`로 발동 여부 확인.

### team 으로 분류됨

`cfh-harness` 스킬로 위임:
- 이 스킬의 Q1~Q3 답변을 `cfh-harness`의 Phase 0 Pre-scan 결과 일부로 전달
- 특히 "독립적 전문 축"이 이미 파악되었으면 cfh-harness Phase 1의 Q3 초안으로 사용
- cfh-harness의 Phase 1~6 수행

### agent (단독) 로 분류됨

드문 케이스. 단독 에이전트는 보통 팀의 일부로 만들어지거나 오케스트레이터에서 위임받는 구조입니다. 사용자에게 확인:

```
단독 에이전트는 대개 팀의 일부로 작성됩니다. 아래 중 어느 쪽인가요?
(a) 기존 스킬 안에서 위임받을 서브에이전트 → `cfh new agent <name> --project` 스캐폴드만 + 직접 편집
(b) 새 팀의 첫 에이전트 → cfh-harness로 위임 (나중에 추가 에이전트)
(c) 잘못 분류됨 — 다시 Phase 1로
```

## 자주 하는 실수

| 실수 | 대응 |
|---|---|
| one-shot 요청을 스킬로 만들려 함 | Q1에서 (b) 답이면 생성 중단하고 "그냥 요청하세요" 안내 |
| 팀인데 혼자 해도 될 것 같아서 skill로 보냄 | Q2에 "모르겠음" 답변 시 (c) 힌트 제시 |
| 기존 스킬 있는데 새로 만듦 | Step 1b scoped Pre-scan 중복 체크 강제 |
| 분류를 Claude가 혼자 결정 | 반드시 공개 + 사용자 승인 후 Phase 2 |
| 위임하면서 답변 재질문 | Q1~Q3 답변을 위임 대상 메타-스킬에 컨텍스트로 전달 |

## references/

- `classification-tree.md` — 3 분류 질문 상세, 경계 케이스 (hybrid·애매한 경우), Pre-scan 프로토콜
- `delegation-map.md` — skill-author / cfh-harness / inline command 인터뷰 각각의 위임 시 전달 컨텍스트·프롬프트 템플릿
