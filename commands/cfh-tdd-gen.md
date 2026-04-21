<s>
이 커맨드는 `tdd-general` 스킬을 활성화하여 **framework-agnostic TDD 워크플로**를 시작합니다.
React/Vue·Testing Library 가정이 적용되지 않는 영역(백엔드 서비스, CLI, 라이브러리, 순수 함수, 데이터 파이프라인)에 적합합니다.
스킬이 자동 트리거되지 않았다면 지금 `~/.claude/skills/tdd-general/SKILL.md`를 읽고 5 Phase에 따라 진행하세요.

**🔀 잘못 진입하셨다면**:
- React/Vue 컴포넌트 TDD라면 → `/cfh-tdd` (FE-friendly RTL 관용구 적용)
- 기존 코드 테스트만 보강이라면 → `/cfh-tc` (FE) 또는 `/cfh-tc-gen` (백엔드)
</s>

<invocation>
Framework-agnostic TDD 워크플로를 시작합니다.

**대상**: `$ARGUMENTS`

- 파일 경로 주어졌고 **존재한다면**: 기존 코드 보강 모드 권장 → `/cfh-tc-gen` 안내
- 파일 경로 주어졌고 **존재하지 않는다면**: TDD 모드로 진행 (신규 작성)
- 비어있다면 사용자에게 "어떤 모듈·함수·엔드포인트를 새로 만드시겠습니까?"를 질문

</invocation>

<workflow>

## Phase 0 — Scope Narrowing

`tdd-general/SKILL.md`의 5 Phase 흐름을 따라 진행. 단 단위는 stack-neutral:

- 작업 단위 (함수 / 모듈 / 엔드포인트 / 워크플로 / CLI 커맨드)
- 테스트 계층 (Unit / Module / Integration / E2E)
- 커버리지 목표 (Happy만 / Happy+Edge / 전체 + Property-based)
- 모킹 경계 (의존성 주입만 / 외부 IO mock 추가)
- 의존성 처리 (함께 만듦 / 스텁 / 격리된 test container)

## Phase 1 — Intent Interview

6 질문 (`tdd-first` 동일 구조, 단 stack-neutral 표현):

1. **목표** — 한 문장으로
2. **Happy Path** — 대표 입력 1개 → 기대 결과
3. **Edge Cases** — 빈 입력 / null / 경계값 / 타입 에러 / 동시성 등 처리 대상
4. **Error Cases** — 어떤 입력이 throw / Result.error / panic 인가
5. **Out of Scope** — 이번에 하지 않을 것
6. **관찰 방법** — 반환값 / 표준 출력 / 파일 / DB row / HTTP 응답 / 로그 중 무엇으로 검증

**(z) 모르겠음 옵션 모든 질문에 기본 탑재** — 선택 시 `~/.claude/skills/asset-factory/references/unknown-answer-playbook.md` 적용.

## Phase 2~5

`tdd-general/SKILL.md`의 워크플로 그대로 — Test Outline 승인 → 실패 테스트 작성 → 최소 구현 → 리팩터 + Intent Preservation.

스택별 예시(Node·Python·Go) 코드는 SKILL.md 참고.

</workflow>

<output_format>

각 Phase 종료 시 사용자에게 보고:
- **Phase 0 완료**: Scope 답변 요약 + 다음 진행 확인
- **Phase 1 완료**: Intent 6 답변 요약 + Phase 2 outline 제안 진입
- **Phase 2 완료**: Test outline 승인 카드 + Phase 3 진입
- **Phase 3 완료**: 실패 테스트 커밋 + 검증 ("모든 테스트 FAIL 확인")
- **Phase 4 완료**: GREEN 확인 + 구현 요약
- **Phase 5 완료**: Refactor 결과 + Intent Preservation 체크 결과 + 다음 단계 권장 (아래)

## Phase 5 종료 시 다음 단계 권장 (필수 출력)

```
✅ TDD 5 Phase 완료 (framework-agnostic)

다음 단계:
- 머지 전 자체 점검 → /cfh-review
- 이번 워크플로 피드백 → /cfh-feedback tdd-general "<comment>"
```

</output_format>

<constraints>
- React/Vue·Testing Library 관용구를 강제하지 말 것. 사용자 스택의 관용구를 따른다.
- 테스트 러너·라이브러리는 사용자 프로젝트에서 감지하거나 명시 질문.
- Phase 3에서 구현 파일 본문 접근 금지 (시그니처만).
- Phase 4에서 테스트 파일 수정 금지 (TEST CHANGE REQUEST 후 사용자 승인 시만).
- 한국어 설명, 코드와 테스트는 해당 스택의 관용 언어.
</constraints>
