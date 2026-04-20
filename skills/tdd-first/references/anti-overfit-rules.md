# Anti-Overfit Rules

AI가 "테스트를 통과하기 위한 최소 코드"를 써서 **의도가 아닌 테스트 자체에 맞추는** 안티패턴을 막는 방어막 모음.

## 왜 발생하는가

LLM은 즉각적인 보상(테스트 GREEN)을 향해 최적화한다. 다음이 대표적 실패 모드:

1. **Hard-coding 응답**: 테스트 입력에 대한 답을 if문으로 분기하여 박아넣음
2. **테스트 수정**: 구현을 바꾸는 대신 테스트의 기대값을 구현에 맞게 조정
3. **예외 회피**: 테스트가 없는 경로는 완전히 무시 (coverage 100%여도 의미 없음)
4. **Over-fitting to examples**: Phase 2에서 합의한 5개 예시에만 맞춘 구현

## 방어막 5종

### 방어 1 — Test Lock 규칙 (핵심)

**규칙 명문화**:

> *"구현이 테스트를 통과하지 못하면 **구현을 고친다**. 테스트를 고치지 않는다. 테스트가 틀렸다고 판단되면, 먼저 명시적으로 이 형식으로 선언한다:*
>
> *`🚨 TEST CHANGE REQUEST: 테스트 <이름>은 이유 <Y>로 잘못되었습니다. 변경 제안: <변경내용>. 사용자 승인을 기다립니다.`*
>
> *사용자 승인 전에는 테스트 파일을 수정하지 않는다."*

이 한 줄이 70% 이상의 오버핏을 막는다. **승인 절차 강제**로 AI가 조용히 테스트를 약화시키지 못한다.

### 방어 2 — Writer/Implementer 분리

Producer-Reviewer 패턴을 TDD에 적용.

- **Test Writer Agent**: Phase 1~2 결과만 보고 테스트 작성. 구현 파일 접근 금지.
- **Implementer Agent**: 테스트 파일과 시그니처만 보고 구현. 테스트 파일 수정 권한 없음.

두 에이전트가 **다른 컨텍스트**를 가지므로 "내가 짤 코드 맞춤 테스트" 편향이 구조적으로 불가능.

자세한 구현은 `test-producer-reviewer-agents.md` 참조.

### 방어 3 — 행동 기반 테스트 강제

**허용되는 assertion**:
- 반환값
- 호출한 콜백의 인자
- `getByRole`, `getByText` 등 사용자 관점 쿼리
- 최종 DOM 상태 (단, 클래스명은 의미 있는 `data-*`/`aria-*`만)
- 외부 side effect (네트워크 호출, localStorage)

**금지되는 assertion**:
- Class name 직접 비교 (`toHaveClass('translate-x-full')`) — 내부 스타일링 디테일
- Internal state 접근 (`wrapper.state()`)
- Private 함수 호출 검증
- 렌더 횟수 카운팅 (성능 테스트 제외)
- 스냅샷을 **유일한** assertion으로 사용

### 방어 4 — Property-Based Testing

핵심 로직은 specific example만으로 검증하지 말고 **속성** 검증:

```ts
import fc from 'fast-check';

test('정렬 결과는 항상 비내림차순', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      const sorted = mySort(arr);
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i] > sorted[i + 1]) return false;
      }
      return true;
    })
  );
});
```

AI가 "테스트 예시 3개만 통과"하는 if-chain 구현으로 도망갈 수 없음 — 랜덤 입력 수백 개가 날아온다.

자세한 예제는 `property-based-examples.md`.

### 방어 5 — Intent Preservation 체크 (Phase 5 필수)

구현 완료 후 **별도 리뷰**:

> *"Phase 1 Intent Interview 답변을 다시 읽으세요.*
> *구현이 이 의도를 테스트 없이도 충족하는지 검증하세요.*
> *테스트는 참고만, 판단 기준은 Intent입니다."*

체크 항목:
- Phase 1 Q1 "한 문장 목표"와 구현 요약을 비교 → 일치하는가?
- Q3 edge case 중 테스트에 빠진 게 있는가? 구현에서 처리됐는가?
- Q4 error case의 **에러 형식**이 Q1 의도와 일치하는가?
- Q5 out of scope가 구현에 슬쩍 들어가진 않았는가?

이 체크가 "테스트 통과 = 끝"이 아니라 **"의도 충족 = 끝"** 으로 목표를 재설정한다.

## 추가 기법

### Mutation Testing

도구: Stryker (`@stryker-mutator/core`)

코드에 의도적 변형(연산자 뒤집기, 상수 바꾸기 등)을 가하고 테스트가 잡는지 확인. **잡지 못하면 테스트가 허술하다**는 증거.

```bash
npx stryker run
```

핵심 비즈니스 로직만 스폿으로 적용 (전체 적용은 CI 시간 폭발).

### Reviewer Agent의 "test quality" 검사

별도 에이전트가 테스트 품질을 검증:
- assertion이 하나뿐인 테스트 (약함 신호)
- `expect(result).toBeTruthy()` 같은 느슨한 assertion
- 테스트 이름과 본문이 불일치
- `it.only` / `it.skip` 잔재

### Code Coverage는 **보조** 지표

100% coverage여도 오버핏 가능. Coverage는 **누락 감지용**일 뿐, 품질 지표 아님.

## 사용자 측면 습관

AI가 오버핏을 시도하면 사용자가 바로 눈치챌 수 있는 징후:

1. 구현에 `if (input === 'specific-value-from-test') return 'expected'` 같은 hard-coding
2. 테스트 파일이 갑자기 수정됨 (diff에서 발견)
3. 구현이 `// @ts-ignore` 남발
4. 에러 처리가 `throw new Error()` 한 줄뿐 (Q4 답변과 불일치)
5. Edge case 처리가 통째로 누락 (Q3 답변과 불일치)

발견 시 **구현 전체 리뷰**를 요청하거나 **Writer/Implementer 분리** 재적용.

## 최소 실행 세트

모든 방어막을 다 적용하기 어려울 때, **최소 3개**라도 실행:

1. **Test Lock 규칙 명문화** (CLAUDE.md에)
2. **행동 기반 테스트 강제** (Testing Library 철학)
3. **Intent Preservation 체크** (Phase 5)

이 셋만 해도 오버핏이 크게 준다.
