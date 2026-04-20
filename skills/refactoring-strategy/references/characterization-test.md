# Characterization Test

Michael Feathers, *Working Effectively with Legacy Code*의 핵심 개념.

**정의**: 기존 코드의 **현재 동작을 그대로 기록**하는 테스트. 이상적 동작이 아니라 **"지금 어떻게 동작하는지"** 를 고정한다.

## 왜 필요한가

리팩터링은 "같은 입력 → 같은 출력"을 보장해야 하는데, 테스트가 없으면 **무엇을 보존해야 하는지 자체를 모른다.** Characterization Test는 "현재"를 기준선으로 박아두는 장치다.

## 일반 테스트와의 차이

| 항목 | 일반 테스트 (TDD) | Characterization Test |
|---|---|---|
| 작성 시점 | 구현 전 | 리팩터링 전 (코드는 이미 존재) |
| 기준 | **의도한** 동작 | **현재** 동작 (버그 포함) |
| 실패 시 | 구현이 틀림 | 리팩터링으로 동작이 바뀜 (의도된 변경이면 테스트 업데이트) |
| 목표 | 올바른 설계 검증 | 행동 변화 감지 |

**중요**: 현재 동작에 버그가 있어도 **일단 그대로 테스트로 기록**. 버그 수정은 별도 PR에서.

## 작성 순서

### 1. 입출력 포착

대상 함수/컴포넌트에 **여러 입력**을 던져 결과를 관찰. console.log나 디버거 활용.

```ts
// 포착 단계
console.log(calculatePrice({ items: [], discount: 0 }));        // → 0
console.log(calculatePrice({ items: [{p:100}], discount: 0 })); // → 100
console.log(calculatePrice({ items: [{p:100}], discount: 10 }));// → 90
console.log(calculatePrice(null));                              // → throws
```

### 2. 관찰 결과를 assertion으로 고정

```ts
describe('calculatePrice - current behavior (characterization)', () => {
  it('returns 0 for empty items', () => {
    expect(calculatePrice({ items: [], discount: 0 })).toBe(0);
  });

  it('returns item price when discount is 0', () => {
    expect(calculatePrice({ items: [{ p: 100 }], discount: 0 })).toBe(100);
  });

  it('applies discount as percentage', () => {
    expect(calculatePrice({ items: [{ p: 100 }], discount: 10 })).toBe(90);
  });

  it('throws on null input', () => {
    expect(() => calculatePrice(null)).toThrow();
  });
});
```

### 3. 리팩터링 진행

테스트가 GREEN인 상태에서 구조만 변경. 모든 변경 후 테스트가 여전히 GREEN이어야 한다.

### 4. 버그 발견 시

Characterization Test를 짜다가 "어? 이거 버그 아닌가?" 발견했다면:
- **일단 현재 동작대로 테스트 작성** (버그 포함)
- 테스트에 `// BUG: ...` 주석
- 리팩터링 완료 후 **별도 PR**로 버그 수정 + 테스트 갱신

## UI 컴포넌트의 경우

### 시각 회귀 테스트

Percy, Chromatic, Playwright의 `toHaveScreenshot()` 등을 활용.

```ts
// Playwright 예시
test('PatientTable renders as before', async ({ page }) => {
  await page.goto('/patients');
  await expect(page).toHaveScreenshot('patient-table.png');
});
```

리팩터링 후 스크린샷 diff가 0이면 시각적으로 동일함을 보장.

### DOM 구조 스냅샷

Testing Library + `toMatchSnapshot`:

```tsx
it('renders current DOM structure', () => {
  const { container } = render(<PatientTable data={sampleData} />);
  expect(container).toMatchSnapshot();
});
```

## 도구

| 도구 | 용도 |
|---|---|
| Vitest/Jest `toMatchSnapshot` | 객체·DOM 구조 고정 |
| Playwright `toHaveScreenshot` | 픽셀 단위 시각 회귀 |
| Percy / Chromatic | 클라우드 기반 시각 회귀 (협업) |
| Approval Tests | 긴 출력을 파일로 저장·비교 |

## 한계와 주의

- Characterization Test는 **설계 품질을 보장하지 않는다**. 단지 변화만 감지.
- 너무 구현 세부에 묶이면 리팩터링을 막는다. **관찰 가능한 행동 수준**(반환값, DOM, side effect)에만 assertion.
- 스냅샷에 과의존하면 스냅샷 갱신이 의례가 되어 의미를 잃는다. 스냅샷 diff는 반드시 수동 검증.

## 리팩터링 흐름 요약

```
기존 코드
   ↓
Characterization Test 작성 (현재 동작 고정)
   ↓
테스트 GREEN 확인
   ↓
리팩터링 (구조만 변경)
   ↓
테스트 여전히 GREEN 확인
   ↓
필요 시 의도된 행동 변경 (별도 PR)
```
