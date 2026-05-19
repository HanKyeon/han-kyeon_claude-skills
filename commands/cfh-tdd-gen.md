<s>
**`-gen` suffix 컨벤션 (1.0급)**: suffix 없는 `/cfh-tdd`는 FE(React/Vue) 치중, `-gen` suffix는 **non-FE 전반** — BE/library/CLI/mobile/embedded/ML. 이 컨벤션은 `cfh-tc` ↔ `cfh-tc-gen`에도 동일 적용.

이 커맨드는 `tdd-general` 스킬을 활성화하여 **non-FE intent 모드 TDD 워크플로**를 시작합니다 (테스트→구현 순서, 새로 짜는 코드 대상).
React/Vue·Testing Library 가정이 적용되지 않는 영역에 적합합니다.

**🔀 잘못 진입하셨다면** (stack × mode 매트릭스, 0.17.0):

|   | **intent** (새로) | **artifact** (기존) |
|---|---|---|
| **FE** | `/cfh-tdd` | `/cfh-tc` |
| **non-FE** | `/cfh-tdd-gen` ← 여기 | `/cfh-tc-gen` |

- React/Vue 컴포넌트 *새로* 짜시면 → `/cfh-tdd <목적>`
- 기존 non-FE 파일 테스트 추가·보강이면 → `/cfh-tc-gen <path>`
- 기존 FE 파일이면 → `/cfh-tc <path>`
</s>

<invocation>
Non-FE *intent* 모드 TDD 워크플로를 시작합니다. **새 BE handler·라이브러리 API·CLI 명령·mobile/embedded 모듈·ML 학습 step 작성 — 테스트 먼저, 구현 나중.**

**입력**: `$ARGUMENTS` — *목적* 또는 *새로 만들 모듈명*. 미존재 OK.

- 목적 (예: "결제 API idempotency key 적용") → Phase 1 Intent Interview 진입
- 새 파일/모듈 경로 (예: "internal/retry/policy.go" — *아직 없는*) → 같은 흐름
- 기존 파일 경로 (이미 존재) → **Track 8 deprecation warning**: "/cfh-tdd-gen은 신규 작성 대상입니다. 기존 파일 보강이면 /cfh-tc-gen을 사용하세요. (0.17.x deprecation — 향후 자동 차단)" 후 사용자 yes 시 진행, 아니면 종료
- 비어있다면 사용자에게 "어떤 모듈·함수·엔드포인트를 새로 만드시겠습니까?"를 질문

</invocation>

<workflow>

## Phase 0a — Stack misroute suggestion (Track 9, 0.18.0)

입력 받은 직후 stack 신호 자가 평가. opposite(`/cfh-tdd`) 신호가 강하면 (`[verified]`/`[inferred]` 2+) 다음 형식으로 제안 (강제 X):

```
   📌 이대로 진행: tdd-general (non-FE intent)
   💡 **더 적합해 보이는 대안 — /cfh-tdd** — 신호: <인용>
   진행: yes / switch / explain
```

상세는 `commands/references/soft-routing.md`. 신호 약하면 출력 안 함.

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
- (조건부) 💡 Team 활용 가능 — 신호 강도 따라 1~2줄 hint
```

**Team Suggestion** (0.22.0+, 조건부 출력 — `commands/references/team-suggestion.md` § A):

Producer-Reviewer 패턴 추천 신호 (tdd-first와 동일):
- **strong**: Edge Case ≥ 5 + Intent Preservation 위험 → 2줄 hint (`💡 (옵션) Producer-Reviewer 가치 큼: ... — \`why teams\``)
- **medium**: 모듈 규모 큼 (10+ 분기·함수) → 1줄 hint (`💡 (옵션) team 활용 가능 — \`why teams\``)
- **weak**: 단순 함수·CLI → 출력 X

사용자 `why teams` 입력 시 full 분석 lazy load.

</output_format>

<constraints>
- React/Vue·Testing Library 관용구를 강제하지 말 것. 사용자 스택의 관용구를 따른다.
- 테스트 러너·라이브러리는 사용자 프로젝트에서 감지하거나 명시 질문.
- Phase 3에서 구현 파일 본문 접근 금지 (시그니처만).
- Phase 4에서 테스트 파일 수정 금지 (TEST CHANGE REQUEST 후 사용자 승인 시만).
- 한국어 설명, 코드와 테스트는 해당 스택의 관용 언어.
</constraints>
