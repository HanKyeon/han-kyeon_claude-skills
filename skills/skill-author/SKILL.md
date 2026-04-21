---
name: skill-author
description: |
  Use this skill when the user wants to create, refine, or edit a Claude Code skill
  (keywords: "create a skill", "write a skill", "새 스킬", "스킬 만들", "author a skill",
  "turn this workflow into a skill"). Interviews the user for purpose and triggers,
  drafts SKILL.md frontmatter, proposes a references/ layout, and validates the result
  before Claude writes files. Do NOT trigger for questions about *using* an existing skill,
  only for authoring a new or modifying an existing one.
---

# Skill Author

사용자와 대화하며 **Claude Code 스킬을 설계·작성**하는 메타-스킬입니다. 이 스킬이 활성화되면 Claude는 아래 프로토콜을 따라 사용자와 함께 `SKILL.md` + `references/`를 만듭니다.

## 활성화 시 반드시

1. **Pre-scan 먼저, 질문은 그 위에.** Phase 0에서 프로젝트 파일을 훑어 기본 답을 초안으로 만든 뒤 Phase 1 진입. 빈 종이 질문 금지.
2. **인터뷰 먼저, 파일 작성은 승인 후.** Phase 1의 질문에 답이 모이기 전에는 파일을 쓰지 않음.
3. **트리거 조건을 구체적으로.** description에 "when X or Y or Z"를 명시. 모호하면 발동되지 않거나 오발동.
4. **Progressive disclosure 원칙.** SKILL.md는 요약·지침, 상세는 `references/`. SKILL.md가 200줄을 넘으면 분리 고려.
5. **기존 스킬과 중복 점검.** 이미 있는 스킬(`~/.claude/skills/`)과 트리거가 겹치면 사용자에게 병합할지 분리할지 물어볼 것. Sanity check에서 자동 검출.
6. **생성 후 `cfh validate` 실행 안내.** 프런트매터 누락·이름 불일치를 즉시 검증.
7. **(z) 모르겠음 fallback.** 모든 Q1~Q6에 `(z) 모르겠음` 옵션 기본 탑재. 선택 시 `~/.claude/skills/asset-factory/references/unknown-answer-playbook.md`의 3단계 처리 — 예시 2~3개 → 안전한 기본값 제안 → y/n.

## 6 Phase

```
Phase 0: Pre-scan                (프로젝트 파일 스캔 → Phase 1 답변 초안)
   ↓
Phase 1: Purpose Interview       (질문 6개 + 조건부 follow-up + Sanity check)
   ↓
Phase 2: Trigger Design          (description 초안 + 사용자 승인)
   ↓
Phase 3: Outline                 (SKILL.md 섹션·references 목록 제안)
   ↓
Phase 4: Write Files             (cfh new로 스캐폴드 + Edit으로 채움)
   ↓
Phase 5: Validate + Iterate      (cfh validate 실행 + 드라이런 시험 트리거)
```

## Phase 복귀 규칙 (공통)

Phase 2 이후에 초반 답변이 틀렸다고 판단되면 아래 트리거로 이전 Phase 복귀:
- **"purpose 재인터뷰"** → Phase 1 Purpose Interview 재수행 (Q1~Q6)
- **"trigger 재설계"** → Phase 2 Trigger Design (description 초안 재작성)
- **"outline 수정"** → Phase 3 Outline (섹션·references 재구성)
- **"write 재실행"** → Phase 4 Write Files 복귀 (생성 파일 삭제 후 재생성 또는 편집)

복귀 시 이전 답변은 참고용으로 유지하고 변경된 부분만 갱신. 생성된 `~/.claude/skills/<name>/`이나 `./.claude/skills/<name>/`은 git으로 추적·되돌리기 가능.

## Phase 0 — Pre-scan

인터뷰 시작 전에 `CLAUDE.md`, `package.json`, `~/.claude/skills/`, `./.claude/skills/`를 훑어 Phase 1의 답변 초안을 만듭니다. 사용자는 "맞음/틀림"만 확인하면 됩니다 (→ `references/pre-scan.md`).

**출력**: Pre-scan 카드
```
🔎 Pre-scan 결과
- 프로젝트: <name>
- 주요 스택: <libs>
- 기존 스킬 (이름만): <list>
- Phase 1 답변 초안: Q1~Q6 <초안 or (모름)>
```

사용자가 초안을 부분 또는 전부 승인하면 Phase 1에서는 **수정·보완해야 할 질문만** 다룹니다. 빈 프로젝트·스캔할 것 없음이면 Pre-scan 건너뛰고 Phase 1 정상 진행.

## Phase 1 — Purpose Interview

아래 6개 기본 질문 + **조건부 follow-up** + **Sanity check**로 구성됩니다. 답이 모이기 전에는 파일 생성 금지 (→ `references/purpose-interview.md`).

### 기본 6 질문

1. **한 문장 목적** — 이 스킬은 무엇을 해결합니까?
2. **트리거 상황** — 사용자가 어떤 단어·의도·파일 패턴에서 이것이 떠야 하나요?
3. **반-트리거** — 비슷하지만 **이것이 떠서는 안 되는** 상황은 무엇입니까? (오발동 차단)
4. **핵심 원칙** — 이 스킬이 활성화되면 Claude가 꼭 지켜야 할 규칙 3~5개
5. **출력** — 스킬이 활성화되었을 때 사용자가 받을 결과물 형태 (질문 리스트 / 워크플로 단계 / 코드 / 리포트?)
6. **참조 자료** — SKILL.md 본문 밖으로 뺄 만한 긴 자료가 있습니까? (예시, 안티패턴 목록, 체크리스트)

### 조건부 follow-up

각 답변이 특정 조건에 걸리면 추가 질문을 3개 이내로 던집니다. 예: Q4 원칙에 "좋은"·"올바른" 같은 주관어가 있으면 측정 가능 형태로 재질문. 전체 룰은 `references/purpose-interview.md`의 F1a~F6b 참조.

### Sanity check (요약 카드 직전)

6개 답변 + follow-up 응답을 `references/sanity-check.md`의 R1~R6 룰로 검사:
- R1 목적 vs 반-트리거 충돌
- R2 트리거 범위 vs 키워드 수 불일치
- R3 원칙 vs 출력 형태 불일치
- R4 원칙 수/추상도
- R5 기존 스킬과 트리거 겹침 (Pre-scan 결과 활용)
- R6 범용성 vs 구체 파일 패턴

모순 발견 시 재확인 → 통과하면 **요약 카드** 제시하고 사용자 승인.

## Phase 2 — Trigger Design

description 초안을 3~5줄로 작성:

```yaml
description: |
  Use this skill when <구체 상황 1>, <구체 상황 2>, or <키워드 나열>.
  <한 문장 행동>. Do NOT trigger for <반-트리거>.
```

→ `references/trigger-patterns.md` 참조. 사용자에게 보여주고 키워드 추가/삭제 승인.

## Phase 3 — Outline

SKILL.md 섹션 구조 제안 (→ `references/skill-structure.md`):

```
# <Title>
## 활성화 시 반드시 (3~5개 규칙)
## 워크플로 (단계별 + references/ 링크)
## 자주 하는 실수
## references/ 목록
```

`references/`에 들어갈 파일 목록도 함께 제안. 사용자 승인 후 Phase 4.

## Phase 4 — Write Files

### 4a. 이름 충돌 체크 (Write 전 필수)

작성할 경로(`~/.claude/skills/<name>/` 또는 `./.claude/skills/<name>/`)의 **존재 여부를 반드시 확인**. 존재 시:

```
⚠️ 이름 충돌: `<name>` 스킬이 이미 존재합니다.
   위치: <경로>
   상태: <managed@X | user-authored | user-modified | user-authored (adopted)>

어떻게 진행할까요?
  (a) 다른 이름으로 새로 생성 — 이름 제안 받기
  (b) 기존을 편집 모드로 전환 — 현재 SKILL.md를 Phase 2·3 결과에 맞춰 Edit
  (c) 기존을 덮어쓰고 새로 생성 — ⚠️ 아래 경고
  (d) 취소
```

**(c) 덮어쓰기 선택 시 추가 확인**:
- 기존이 `user-authored` 또는 `user-modified`면 명시적 y/N:
  ```
  🚨 기존 `<name>`은 사용자 작성물입니다 (삭제 시 복구 불가).
  정말 덮어쓰시겠습니까? [y/N]
  ```
  `y`만 통과. 그 외 전부 취소.
- 기존이 managed이면 한 줄 경고("패키지 버전이 덮어써집니다") 후 진행.

### 4b. 실제 작성

1. `cfh new skill <name>` (또는 `--project`로 프로젝트 로컬) 실행으로 스캐폴드 생성. 충돌 체크 통과 후 실행하면 에러 없음.
   - CLI 실행 권한이 없거나 덮어쓰기 승인된 경우 Claude가 Write tool로 동일 구조 생성.
   - 덮어쓰기 승인 시 `cfh new ... --force` 사용.
2. `SKILL.md`의 TODO 마커를 Phase 1~3 답변으로 대체.
3. `references/`에 **각 참조 파일을 개별 생성.** 섹션 하나하나에 "언제 로드되는가"를 주석으로 표시.
4. 커밋 메시지 초안: `feat(skill): add <skill-name> for <one-sentence purpose>`

## Phase 5 — Validate + Iterate

1. `cfh validate` 실행 안내. 에러 있으면 즉시 수정.
2. **시험 트리거**: Claude에게 "이 스킬이 떠야 할 상황" 샘플 발화 3개를 테스트하자고 제안. 떠야 할 때 안 뜨면 description 조정. 떠서는 안 될 때 뜨면 반-트리거 문구 강화.
3. `list` 명령으로 `managed`가 아닌 `user-authored`로 잡히는지 확인 (업데이트 보호 확인).

## 자주 하는 실수

| 실수 | 대응 |
|---|---|
| description이 20자 미만 | 최소 2~3 문장, 트리거·반-트리거 모두 포함 |
| 이름이 복수형 (`my-skills`) | 단수 권장 (`my-skill`) — 개념 단위 1:1 |
| 모든 내용을 SKILL.md에 욱여넣음 | 150줄 초과 시 references로 분리 |
| 기존 스킬과 트리거 겹침 | 병합 또는 description에 차별점 명시 |
| "항상 TDD로" 같은 강제 조항 | 프로젝트 컨텍스트 존중. "기본값은 X, 사용자 지시 있으면 조정" 형태로 |

## references/

- `pre-scan.md` — Phase 0 스캔 프로토콜 + 초안 매핑 규칙
- `purpose-interview.md` — Phase 1 질문 상세 + 조건부 follow-up (F1a~F6b) + 답변 해석 가이드
- `sanity-check.md` — Phase 1 요약 직전 모순 감지 룰 (R1~R6)
- `trigger-patterns.md` — 좋은 description 예시 10개, 나쁜 예시 5개
- `skill-structure.md` — SKILL.md 섹션 구성 규칙 + progressive disclosure 기준
