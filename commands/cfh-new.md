<s>
이 커맨드는 `skill-author` 메타-스킬을 활성화하여 **새 스킬·커맨드·에이전트를 대화형으로 작성**하는 워크플로를 시작합니다.
스킬이 자동 트리거되지 않은 상태라면 지금 `~/.claude/skills/skill-author/SKILL.md`를 읽고 그 5 Phase에 따라 진행하세요.
</s>

<invocation>
새 자산을 작성합니다.

**인자**: `$ARGUMENTS` (형식: `<kind> <name>`, 예: `skill my-auth-flow`)

- 비어있거나 파싱 불가 → 사용자에게 "어떤 종류(skill/command/agent)를, 어떤 이름으로 만드시겠습니까?"를 질문
- `kind`가 `skill|command|agent` 중 하나가 아니면 재질문
- `name`이 kebab-case가 아니면 교정 제안

</invocation>

<workflow>

## Phase 1 — Purpose Interview (skill-author)

`skill-author/references/purpose-interview.md`의 6 질문 수행:

1. 한 문장 목적
2. 트리거 상황 (키워드·의도·파일 패턴)
3. 반-트리거
4. 핵심 원칙 3~5개
5. 출력 형태
6. 참조 자료

답변 모이기 전에는 **파일 작성 금지**.

## Phase 2 — Trigger Design

`trigger-patterns.md` 참조. description 초안 3~5줄 작성 → 사용자 승인.

## Phase 3 — Outline

`skill-structure.md` 참조. SKILL.md 섹션 구조 + references/ 파일 목록 제안 → 승인.

## Phase 4 — Write Files

### 스캐폴드 생성 (CLI 사용 가능 시)

```bash
cfh new <kind> <name> --project      # 프로젝트 로컬에 생성
# 또는
cfh new <kind> <name>                # ~/.claude/ 에 생성
```

### Claude가 직접 Write (CLI 실행 불가 시)

`templates/` 구조를 참고해 Write tool로 동일 구조 생성. TODO 마커를 Phase 1~3 답변으로 대체.

## Phase 5 — Validate + Iterate

```bash
cfh validate
```

에러 있으면 수정. 이후 **시험 트리거** — 이 스킬이 떠야 할 샘플 발화 3개를 Claude에게 보내 발동 여부 확인.

## Phase 6 — Commit (선택)

```
git add .claude/ ~/.claude/skills/<name>/
git commit -m "feat(skill): add <name> for <purpose>"
```

</workflow>

<output_format>

생성 완료 시 사용자에게 보고:

- 생성된 파일 경로
- description 최종본
- 시험 트리거 결과 (3개 샘플 발화 각각의 발동 여부)

## 종료 시 다음 단계 권장 (필수 출력)

```
✅ 자산 생성 완료

다음 단계:
- 검증 → cfh validate
- 추가 트리거 시뮬레이션 → cfh trace "<다른 발화>"
- 설치 확인 → cfh list
- references/ 채우기 / 커밋 / 팀 공유
- 이번 작성 흐름 피드백 → /cfh-feedback skill-author "<comment>"
```

</output_format>
