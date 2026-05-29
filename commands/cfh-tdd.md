<s>
이 커맨드는 `tdd-first` 스킬을 활성화하여 **FE 컴포넌트 intent 모드 TDD 워크플로**를 시작합니다 (테스트→구현 순서, 새로 짜는 코드 대상).
스킬이 자동 트리거되지 않았다면 지금 `~/.claude/skills/tdd-first/SKILL.md`를 읽고 그 5 Phase에 따라 진행하세요.

**🔀 잘못 진입하셨다면** (stack × mode 매트릭스):

|   | **intent** (새로) | **artifact** (기존) |
|---|---|---|
| **FE** | `/cfh-tdd` ← 여기 | `/cfh-tc` |
| **non-FE** | `/cfh-tdd-gen` | `/cfh-tc-gen` |

- 기존 FE 파일 테스트 추가·보강이면 → `/cfh-tc <path>`
- 백엔드/라이브러리/CLI/mobile/embedded/ML 새 자산 TDD라면 → `/cfh-tdd-gen <목적>`
- 기존 백엔드 파일 테스트 추가·보강이면 → `/cfh-tc-gen <path>`
</s>

<invocation>
FE 컴포넌트 *intent* 모드 TDD 워크플로를 시작합니다. **새 컴포넌트·훅·유틸 작성 — 테스트 먼저, 구현 나중.**

**입력**: `$ARGUMENTS` — *목적* 또는 *새로 만들 파일명*. 미존재 OK.

- 목적 (예: "쿠폰 검증 컴포넌트") → Phase 1 Intent Interview 진입
- 새 파일 경로 (예: "src/components/CouponInput.tsx" — *아직 없는*) → 같은 흐름
- 기존 파일 경로 (이미 존재) → **deprecation warning**: "/cfh-tc는 기존 파일 대상입니다. 새 컴포넌트면 /cfh-tdd, 보강이면 /cfh-tc를 사용하세요. (0.17.x deprecation — 향후 자동 차단)" 후 사용자 yes 시 진행, 아니면 종료
- 비어있다면 사용자에게 "무엇을 새로 만드시겠습니까?"를 질문

</invocation>

<workflow>

## Phase 0a — Stack misroute suggestion

Scope Narrowing 전에 *입력 받은 직후* stack 신호를 자가 평가. **opposite stack 신호가 강하면** 아래 형식으로 대안 제안 (강제 X — 사용자 명시 `switch` 후만 분기):

```
   📌 이대로 진행: tdd-first (FE 컴포넌트 TDD intent)
        이유: /cfh-tdd 명시 호출 — 사용자가 FE 컨텍스트 의도

   💡 **더 적합해 보이는 대안 — /cfh-tdd-gen**
        신호:
          - [<verified|inferred>] <키워드 — 발화/인자에서 인용>
          - [<...>] <키워드 2>
          - [verified|inferred] cfh trace top-1 = <skill>
        대안 사용 시: /cfh-tdd-gen "<same utterance>"

   진행: yes / switch / explain
```

판정 룰·키워드 휴리스틱·confidence marker·explain 모드 상세는 `commands/references/soft-routing.md` 참조. **자가검증 — 신호가 약하면 (`[guessed]`만) 이 블록 출력 안 함** (정책 § 0 명시 분기 유지).

## Phase 0 — Scope Narrowing (Phase 1 전 필수)

`tdd-first/references/scope-narrowing.md`의 7 질문으로 작업 범위 먼저 좁히기:

- Q1 작업 단위 (함수 / 컴포넌트 / 기능 / 페이지)
- Q2 테스트 계층 (Unit / Component / Integration / E2E)
- Q3 커버리지 목표 (Happy만 / Happy+Edge / 전체)
- Q4 모킹 경계 (외부 API만 / 브라우저 API까지 / 의존 모듈까지)
- Q5 의존성 처리 (함께 만듦 / 스텁 / 모킹)
- Q6 시간 박스 (Phase 어디까지)
- Q7 Writer/Implementer 분리 여부 (크리티컬 코드?)

범위가 크면 **분해 제안**. 답변 받기 전에 Phase 1 진입 금지.

## Phase 1 — Intent Interview (반드시 먼저)

**코드 쓰기 전에** 사용자에게 아래 질문을 한 번에 리스트로 던지세요:

```
새 기능의 테스트를 작성하기 전에 의도를 확인하고 싶습니다. 답변해 주세요:

1. **목표**: 이 기능이 하는 일을 한 문장으로?
2. **Happy Path**: 대표 입력 1개와 기대 결과는?
3. **Edge Cases**: 아래 중 처리해야 할 것?
   - null / undefined / 빈 값
   - 0 / 음수 / 매우 큰 수
   - 빈 배열 / 중복 / 정렬되지 않음
4. **Error Cases**: 어떤 입력은 거부/실패해야? (throw / return null / default)
5. **Out of Scope**: 이번에 **하지 않을 것**은?
6. **관찰 방법**: 무엇으로 검증? (반환값 / DOM / 콜백 / store / 네트워크)

(유형별 추가)
- [컴포넌트] Props / 인터랙션 / 외부 데이터 / ARIA
- [훅] 입출력 / 내부 훅 / side effect / cleanup
- [API] endpoint / method / 요청·응답 스키마 / 에러 형식 / 재시도
- [순수 함수] 입출력 타입 / 결정론적인가?
```

답변이 불충분하면 **옵션 제시 / 가정 공개**로 재질문. 추정하지 말 것.

## Phase 2 — Test Outline (제목만 먼저)

describe/it 제목만 제시하고 사용자 승인 받기:

```ts
describe('<subject>', () => {
  describe('happy path', () => {
    it('does X for valid input');
  });
  describe('edge cases', () => {
    it('returns null for empty array');
    it('throws on negative');
  });
});
```

사용자가 추가/삭제/재명명. **승인 전 Phase 3 금지.**

## Phase 3 — Failing Tests

**규칙**:
- 대상 파일의 **시그니처(export 선언)만** 확인. 본문 읽지 말 것.
- Phase 1~2 합의만 기반으로 테스트 본문 작성.
- 모든 테스트가 **FAIL 상태**여야 함.
- 커밋 메시지: `test: add failing tests for <subject>`
- 프로젝트 테스트 컨벤션(위치·네이밍·커스텀 render) 준수.

## Phase 4 — Implementation (최소 구현)

**규칙**:
- 테스트를 GREEN으로 만드는 **최소** 구현
- 테스트 입력에 대한 hard-coded 분기 금지
- 테스트 파일 수정 금지
- 테스트가 틀렸다고 판단되면 **필수 선언**:

```
🚨 TEST CHANGE REQUEST
- 테스트: <it name>
- 문제: <이유>
- 제안: <변경>
(사용자 승인 전 테스트 파일 수정 금지)
```

커밋 메시지: `feat: implement <subject>` (또는 `fix:`)

## Phase 5 — Refactor + Intent Preservation

### Refactor
- 테스트 GREEN 유지하며 구조 개선 (매직 넘버 추출, 함수 분리)
- 커밋 메시지: `refactor: <what>`

### Intent Preservation 체크 (필수)
아래를 **테스트와 독립적으로** 검증:

1. Phase 1 Q1 "한 문장 목표"와 구현 요약 일치?
2. Q3 edge case 중 테스트에 빠진 게 있는데 구현이 처리하는가?
3. Q4 error 형식이 Q1 의도와 일치?
4. Q5 out-of-scope가 구현에 섞이지 않았나?
5. 프로젝트 컨벤션 위반 없는가?

결과를 최종 출력에 명시.

## Property-Based 보강 (선택)

대상이 **순수 함수 / 유틸 / reducer**면 `fast-check`로 최소 1개 property 테스트 추가:

```ts
import fc from 'fast-check';
it('property: ...', () => {
  fc.assert(fc.property(fc.array(fc.integer()), (arr) => { ... }));
});
```

상세: `tdd-first/references/property-based-examples.md`

</workflow>

<anti_overfit>

## 오버핏 방지 규칙 (반드시 출력에 명시)

1. **테스트 잠금**: 구현이 통과 못 하면 **구현을 고침**. 테스트 수정은 TEST CHANGE REQUEST로만.
2. **행동 기반 assertion**: class name/internal state 금지. getByRole, 반환값, 최종 DOM.
3. **Hard-coding 금지**: 테스트 입력에 대한 `if (x === 'specific') return ...` 금지.
4. **Phase 1 답변 활용**: 구현이 Phase 1의 모든 요구를 충족하는지 자체 점검.
5. **Intent Preservation 체크**: Phase 5에서 테스트와 독립적으로 의도 검증.

</anti_overfit>

<output_format>

## 결과 설명 포맷 (출력 전용)

테스트 시나리오 해설, Property-based 도입 제안, TEST CHANGE REQUEST, Intent Preservation 체크 결과는 **Why/What/How/What if 4축**(`tdd-first/references/reasoning-format.md`)으로 작성.

질문(Phase 0·1)에는 이 포맷을 적용하지 말 것. 질문은 자연스러운 형태로.

## Phase 5 종료 시 다음 단계 권장 (필수 출력)

```
✅ TDD 5 Phase 완료

검증 수행: <테스트 결과·타입체크·lint>
생성·수정 파일: <목록>

🔄 Retro
  효과 있었음: <bullet 1~3>
  실패·삽질: <bullet 1~3 또는 "해당 없음">
  다음엔 바꿀 것: <bullet 1~3 또는 "해당 없음">
  저장: /cfh-retro로 영구 기록 가능

📝 제안 커밋
  메시지 초안: <subject + body — 컨벤션은 git log로 추정>
  스테이지 범위: <테스트·구현·리팩터 파일 목록>
  분할 추천:
    - 권장: 3개 분할 (test → feat → refactor) — Phase 3·4·5 경계
    - 또는: 단일 (작은 변경)
  진행: yes / edit-msg / split-differently / no-commit

다음 단계:
- 머지 전 자체 점검 → /cfh-review
- 이번 워크플로 피드백 → /cfh-feedback tdd-first "<comment>"
- (조건부) 💡 Team 활용 가능 — 신호 강도 따라 1~2줄 hint (`commands/references/team-suggestion.md` § A)
```

**Team Suggestion** (조건부 출력):

신호 분류 — Producer-Reviewer 패턴 추천:
- **strong**: Edge Case ≥ 5 + Intent Preservation 위험 (구현 복잡·overfit 패턴 의심) → 2줄 hint
- **medium**: 컴포넌트 규모 큼 (10+ states / 7+ branches) → 1줄 hint
- **weak**: 단순 컴포넌트 → 출력 X (자가검증)

medium 예: `💡 (옵션) team 활용 가능 — \`why teams\``
strong 예: `💡 (옵션) Producer-Reviewer 가치 큼: Intent Preservation 위험 신호 — \`why teams\``

사용자 `why teams` 입력 시 full 분석 lazy load.

`/cfh-review`는 작성한 테스트 + 구현을 PR 단위로 다축 점검. `/cfh-feedback`은 Intent Interview·Test Outline·구현 흐름 등에서 마찰 있었던 부분을 기록 → 추후 `cfh evolve`가 description·원칙 개선에 활용.

**Retro·Commit 블록 형식**: `commands/references/retro-and-commit.md` 단일 출처. **TDD 특성상 분할 추천이 기본** — Phase 3(test) → 4(feat) → 5(refactor) 경계가 자연스러운 분할 지점이라 단일 커밋보다 3개 분할을 우선 제안.

</output_format>

<constraints>
- `tdd-first` 스킬의 5 Phase 순서를 **건너뛰지 마세요**. 특히 Phase 1 Intent Interview.
- Phase 3에서 구현 파일 본문 접근 금지. Phase 4에서 테스트 파일 수정 금지.
- 프로젝트의 기존 테스트 컨벤션을 준수. 새 패턴 도입 금지.
- 한국어 설명, describe/it과 코드는 영어.
- 각 Phase 완료 시 사용자에게 확인 받고 다음 Phase 진입.
- Phase 5 종료 보고에서 **Retro·제안 커밋 블록 생략 금지**. 형식은 `commands/references/retro-and-commit.md`.
- 자동 commit 금지. 제안만 하고 사용자 명시 yes 후 진행.
</constraints>
