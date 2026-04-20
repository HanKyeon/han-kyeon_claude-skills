# Reasoning Format — Why / What / How / What if

## 이 포맷은 **결과 설명(출력)에만** 적용합니다

- ✅ **적용**: Test Outline 시나리오 해설, Property-based 도입 제안, TEST CHANGE REQUEST, Intent Preservation 체크 결과
- ❌ **비적용**: Phase 0 Scope Narrowing, Phase 1 Intent Interview (이것들은 별도 질문 프로토콜)
- 개발 판단에 정보가 부족하면 자연스러운 질문으로 확인하되, 포맷 유지를 위한 질문 남발은 금지.

TDD 워크플로의 모든 중요한 **결정·제안·테스트 설계 설명**에 적용하는 4축 추론 포맷입니다.

## 4축 정의 (TDD 맥락)

| 축 | 질문 | TDD 맥락 |
|---|---|---|
| **Why** | 왜 이 테스트·설계? | 의도, 보호 대상, 실패 시 영향 |
| **What** | 무엇을 검증? | 관찰 대상 (반환값·DOM·호출), 구체 assertion |
| **How** | 어떻게 작성? | 쿼리 방법, 유저 이벤트, 비동기 처리 |
| **What if** | 다른 설계라면? | 대안 테스트, 엣지 케이스, 취약성 |

## 적용 지점

반드시 이 포맷 사용:

1. **Test Outline (Phase 2) 설명**
2. **Edge Case 선정 근거**
3. **모킹 경계 결정**
4. **Property-based 테스트 추가 제안**
5. **Intent Preservation 체크 결과**
6. **TEST CHANGE REQUEST 제출**

## 템플릿 — 테스트 시나리오 설명용

```markdown
### 시나리오: <it 이름>

**Why**
- 보호하려는 행동: <Phase 1 Intent와 연결>
- 실패 시 영향: <사용자 관점 문제>

**What**
- 관찰 대상: <반환값 / DOM 요소 / 콜백 인자 / 네트워크 호출>
- Assertion:
  ```ts
  expect(...).toBe(...)
  ```

**How**
- 쿼리: <getByRole / findByText / ...>
- 유저 이벤트: <user.click / user.type / 없음>
- 비동기: <findBy / waitFor / 동기>
- 모킹: <msw handler / vi.mock / 없음>

**What if**
- 만약 이 테스트가 **구현 세부에 묶였다면**: <예: class name 검증 → getByRole로 변경>
- 만약 구현이 **테스트만 통과**시켰다면: <Property-based로 보강 가능성>
- 엣지 케이스: <이 테스트가 잡지 못하는 케이스>
```

---

## 예시 1 — Test Outline 설명

### 시나리오: `formatBloodPressure` — returns dash for null input

**Why**
- Phase 1 Q3에서 "null 입력은 '-' 표시"로 합의됨.
- 실패 시: UI에 "undefined mmHg" 또는 "NaN / NaN"이 노출되어 사용자 혼란 + 접근성 스크린리더 오독.

**What**
- 관찰: 함수 반환값
- Assertion:
  ```ts
  expect(formatBloodPressure(null)).toBe('-');
  ```

**How**
- 쿼리: 해당 없음 (순수 함수)
- 유저 이벤트: 없음
- 비동기: 동기 함수, `await` 불필요
- 모킹: 없음

**What if**
- 만약 **undefined도 같은 동작**이어야 하면 별도 `it` 추가: `'returns dash for undefined'`. Phase 1 Q3에서 undefined 답변을 다시 확인.
- 만약 **`'-'` 대신 공백 문자열**이어야 하면 명세가 바뀐 것. Intent Interview Q6 (관찰 방법)를 다시 합의 후 테스트·구현 동시 갱신 (TEST CHANGE REQUEST 필수).
- 엣지 케이스: `NaN`, `Infinity` 입력. 별도 `it`로 분리하거나 `it.each`로 파라미터화.

---

## 예시 2 — Property-based 테스트 추가 제안

### 시나리오: property — `sortByPriority` output length equals input length

**Why**
- Example-based 5개로는 "입력 길이 보존"을 증명하기 어려움. 실제 버그가 특정 길이(예: 2의 거듭제곱)에서 발생하는 사례가 있음.
- 보호하려는 속성: "정렬은 요소를 **삽입·삭제하지 않는다**".

**What**
- 관찰: `result.length === input.length`
- Assertion:
  ```ts
  fc.assert(
    fc.property(fc.array(itemArb), (arr) => {
      expect(sortByPriority([...arr]).length).toBe(arr.length);
    })
  );
  ```

**How**
- `fast-check` 설치: `pnpm add -D fast-check`
- `itemArb` Arbitrary 정의 (도메인 객체)
- 기본 100 runs, CI에서 부담이면 `{ numRuns: 50 }`

**What if**
- 만약 **중복 제거도 요구사항**이면 이 속성은 틀림. Phase 1 Q5 (Out of Scope) 재확인 필요.
- 만약 **Math.random 의존이 구현에 있어 shrinking 실패**하면 DI로 seed 주입.
- 만약 Property가 통과하는데 example-based는 실패: 구현이 **특정 값**을 hard-code 처리 중일 가능성. 오버핏 안티패턴 신호.

---

## 예시 3 — TEST CHANGE REQUEST

### 🚨 TEST CHANGE REQUEST: `returns null for empty array`

**Why**
- 구현 중 발견: Phase 1 Q3에서 "빈 배열 → `null` 반환"으로 합의됐으나, Q1 "한 문장 목표"를 다시 보면 "**배열의 첫 요소를 반환**"이라 명시됨.
- 두 진술이 충돌: 빈 배열에는 첫 요소가 없음 → `undefined`가 자연스러움. `null` 고집은 의도와 불일치.
- 다른 호출부(`src/components/PatientList.tsx:45`)가 `undefined` 체크를 이미 하고 있음.

**What**
- 현재 테스트:
  ```ts
  it('returns null for empty array', () => {
    expect(getFirst([])).toBe(null);
  });
  ```
- 제안 변경:
  ```ts
  it('returns undefined for empty array', () => {
    expect(getFirst([])).toBeUndefined();
  });
  ```

**How**
1. 사용자 승인 받기 (이 문서가 승인 요청)
2. 승인 시 테스트 파일 수정
3. 구현 변경 없음 (구현은 이미 `undefined` 반환 중)
4. 다른 호출부 영향 없음 확인 (`!value` 체크라 null·undefined 모두 처리됨)

**What if**
- **승인 거부**: `null` 반환으로 구현을 변경. 호출부도 `=== null` 체크로 수정 필요 → Scope 확대됨.
- **다른 옵션**: 빈 배열이 호출 자체를 막아야 한다면 Precondition 검증 + throw. 이건 Q4 (Error Cases)와 관련.
- **이 결정을 미루면**: 구현과 테스트가 불일치한 채로 머지 시 런타임 버그.

---

## 예시 4 — Intent Preservation 체크 결과

### Intent Preservation Check: `useUserProfile` 훅

**Why**
- Phase 5의 핵심: 테스트를 다 통과해도 의도를 놓쳤을 수 있음. Phase 1 답변과 구현을 대조.

**What** (체크 결과)

| Phase 1 항목 | 답변 | 구현 상태 | 판정 |
|---|---|---|---|
| Q1 목표 | "프로필을 로드하고 캐싱" | `useQuery` + 5분 staleTime | ✅ |
| Q3 edge (404) | "에러 UI 표시" | `isError` 분기 O, 메시지 UI 없음 | ⚠️ |
| Q4 error | "throw가 아닌 Error state" | `isError` 노출 | ✅ |
| Q5 out of scope | "낙관적 업데이트 제외" | 업데이트 로직 없음 | ✅ |
| 컨벤션 | JSDoc 필수 | 누락 | ⚠️ |

**How** (후속 조치)
1. 404 에러 UI 노출은 소비자 컴포넌트 책임. 훅 자체는 OK지만 문서에 **에러 표시는 호출부 책임**임을 명시.
2. JSDoc 추가: `@example` 포함.
3. 커밋: `docs(useUserProfile): add JSDoc and error handling note`

**What if**
- **404 UI 책임을 훅으로 옮긴다면**: 훅이 JSX 반환하거나 에러 컴포넌트를 inject해야 함 → 관심사 혼합. 비권장.
- **JSDoc이 과해지면**: 1줄 요약 + `@example` 1개만 유지.
- **Phase 1 답변 자체가 애매했다면**: 다음 세션 전 Interview 재수행.

---

## 규칙

1. **Phase 1 답변과 연결**. TDD의 4축은 특히 Phase 1 Intent에 뿌리내려야 함.
2. **TEST CHANGE REQUEST는 반드시 4축으로**. 수정 욕구가 있을 때마다 스스로를 검증.
3. **What if는 오버핏 감지기**. "이 테스트가 쉽게 통과된다면 왜?"를 항상 물음.
4. **Intent Preservation은 포맷 필수**. Phase 5 체크에서 4축 누락 금지.
5. 단순한 쿼리 변경 (`getByTestId` → `getByRole`)은 축약 버전으로 OK.
