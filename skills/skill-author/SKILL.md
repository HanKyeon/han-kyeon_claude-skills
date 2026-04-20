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

1. **인터뷰 먼저, 파일 작성은 승인 후.** Phase 1의 질문에 답이 모이기 전에는 파일을 쓰지 않음.
2. **트리거 조건을 구체적으로.** description에 "when X or Y or Z"를 명시. 모호하면 발동되지 않거나 오발동.
3. **Progressive disclosure 원칙.** SKILL.md는 요약·지침, 상세는 `references/`. SKILL.md가 200줄을 넘으면 분리 고려.
4. **기존 스킬과 중복 점검.** 이미 있는 스킬(`~/.claude/skills/`)과 트리거가 겹치면 사용자에게 병합할지 분리할지 물어볼 것.
5. **생성 후 `cfh validate` 실행 안내.** 프런트매터 누락·이름 불일치를 즉시 검증.

## 5 Phase

```
Phase 1: Purpose Interview       (질문 6개 → 답변 수집)
   ↓
Phase 2: Trigger Design          (description 초안 + 사용자 승인)
   ↓
Phase 3: Outline                 (SKILL.md 섹션·references 목록 제안)
   ↓
Phase 4: Write Files             (cfh new로 스캐폴드 + Edit으로 채움)
   ↓
Phase 5: Validate + Iterate      (cfh validate 실행 + 드라이런 시험 트리거)
```

## Phase 1 — Purpose Interview

아래 질문에 **답이 모이기 전에는** 파일 생성 금지 (→ `references/purpose-interview.md`):

1. **한 문장 목적** — 이 스킬은 무엇을 해결합니까?
2. **트리거 상황** — 사용자가 어떤 단어·의도·파일 패턴에서 이것이 떠야 하나요?
3. **반-트리거** — 비슷하지만 **이것이 떠서는 안 되는** 상황은 무엇입니까? (오발동 차단)
4. **핵심 원칙** — 이 스킬이 활성화되면 Claude가 꼭 지켜야 할 규칙 3~5개
5. **출력** — 스킬이 활성화되었을 때 사용자가 받을 결과물 형태 (질문 리스트 / 워크플로 단계 / 코드 / 리포트?)
6. **참조 자료** — SKILL.md 본문 밖으로 뺄 만한 긴 자료가 있습니까? (예시, 안티패턴 목록, 체크리스트)

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

1. `cfh new skill <name>` (또는 `--project`로 프로젝트 로컬) 실행으로 스캐폴드 생성 지시. 사용자가 CLI 실행 권한이 없으면 Claude가 Write tool로 동일 구조 생성.
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

- `purpose-interview.md` — Phase 1 질문 상세 + 답변 해석 가이드
- `trigger-patterns.md` — 좋은 description 예시 10개, 나쁜 예시 5개
- `skill-structure.md` — SKILL.md 섹션 구성 규칙 + progressive disclosure 기준
