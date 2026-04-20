# Property-Based Testing — 실전 예제

`fast-check` 기반. Example-based 테스트가 잡지 못하는 엣지 케이스를 **랜덤 입력**으로 찾아낸다.

## 설치

```bash
npm install --save-dev fast-check
# 또는
pnpm add -D fast-check
```

Vitest/Jest에서 그대로 사용 가능.

## 기본 패턴

### Pattern 1 — 역연산 (Round-trip)

```ts
import fc from 'fast-check';

describe('JSON stringify ↔ parse', () => {
  it('round-trip preserves value', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(JSON.parse(JSON.stringify(value))).toEqual(value);
      })
    );
  });
});
```

검증 대상이 **양방향 변환**이면 항상 적용 가능.

### Pattern 2 — 불변 속성 (Invariant)

```ts
describe('sort()', () => {
  it('result is non-decreasing', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = sort([...arr]);
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i]).toBeLessThanOrEqual(sorted[i + 1]);
        }
      })
    );
  });

  it('result has same length as input', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        expect(sort([...arr]).length).toBe(arr.length);
      })
    );
  });

  it('result contains the same elements', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        expect(sort([...arr]).sort()).toEqual([...arr].sort());
      })
    );
  });
});
```

### Pattern 3 — 수치 성질

```ts
describe('formatPrice()', () => {
  it('never throws for finite numbers', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (n) => {
        expect(() => formatPrice(n)).not.toThrow();
      })
    );
  });

  it('preserves sign', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (n) => {
        expect(formatPrice(-n)).toMatch(/^-/);
        expect(formatPrice(n)).not.toMatch(/^-/);
      })
    );
  });
});
```

### Pattern 4 — 멱등성 (Idempotent)

```ts
describe('normalize()', () => {
  it('is idempotent', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(normalize(normalize(s))).toBe(normalize(s));
      })
    );
  });
});
```

### Pattern 5 — 모델 기반 (Model-Based)

복잡한 state machine 검증:

```ts
class CounterModel {
  value = 0;
}

class IncrementCommand implements fc.Command<CounterModel, Counter> {
  check = () => true;
  run(m: CounterModel, r: Counter): void {
    m.value += 1;
    r.increment();
    expect(r.get()).toBe(m.value);
  }
  toString = () => 'increment';
}

class DecrementCommand implements fc.Command<CounterModel, Counter> {
  check = (m: CounterModel) => m.value > 0;
  run(m: CounterModel, r: Counter): void {
    m.value -= 1;
    r.decrement();
    expect(r.get()).toBe(m.value);
  }
  toString = () => 'decrement';
}

it('counter follows model', () => {
  const allCommands = [
    fc.constant(new IncrementCommand()),
    fc.constant(new DecrementCommand()),
  ];
  fc.assert(
    fc.property(fc.commands(allCommands), (cmds) => {
      fc.modelRun(() => ({ model: new CounterModel(), real: new Counter() }), cmds);
    })
  );
});
```

## Arbitrary 조합 레시피

### 도메인 객체 생성

```ts
const patientArb = fc.record({
  id: fc.integer({ min: 1 }),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  age: fc.integer({ min: 0, max: 120 }),
  bp: fc.option(fc.record({
    systolic: fc.integer({ min: 60, max: 200 }),
    diastolic: fc.integer({ min: 40, max: 120 }),
  })),
});

it('calculateRisk handles any valid patient', () => {
  fc.assert(
    fc.property(patientArb, (patient) => {
      const risk = calculateRisk(patient);
      expect(['low', 'medium', 'high']).toContain(risk);
    })
  );
});
```

### 제약 있는 날짜

```ts
const pastDateArb = fc.date({
  min: new Date('2000-01-01'),
  max: new Date(),
});

it('formatRelative returns non-empty for past dates', () => {
  fc.assert(
    fc.property(pastDateArb, (d) => {
      expect(formatRelative(d)).toMatch(/ago$/);
    })
  );
});
```

## FE에서의 적용 지점

적용 적합:
- **유틸 함수** (날짜/숫자/문자열 포맷, 검증 로직)
- **순수 비즈니스 로직** (가격 계산, 경고 분류, 정렬)
- **Parser / Serializer**
- **Reducer / Zustand action**

적용 부적합:
- **UI 렌더링 자체** (Chromatic/Percy가 더 적합)
- **네트워크 I/O** (MSW로 시뮬레이션)
- **Side effect heavy 로직**

## 실패 재현 (Shrinking)

fast-check는 실패 시 자동으로 **최소 재현 케이스**를 축소 시도한다.

```
Property failed after 47 tests
{ seed: -1234567, path: "2:3:1" }
Counterexample: [[0]]   ← 최소 실패 입력
```

이 seed를 CI 로그에 남기고 버그 수정 후 명시적으로 재현 테스트 추가:

```ts
it('regression: [[0]] case', () => {
  expect(flatten([[0]])).toEqual([0]);
});
```

## 주의

- **실행 시간**: 기본 100 runs. CI에서 무거우면 `{ numRuns: 50 }` 축소.
- **결정론 필요**: 테스트 대상이 `Math.random()`, `Date.now()`를 쓰면 shrinking이 실패. DI로 주입받는 구조로.
- **개발 초기에는 부담**: 처음엔 example-based로 시작, 안정화되면 property 추가.

## AI 에이전트에게 권장

- Phase 2 Test Outline에 **최소 1개 property-based 테스트 포함 제안**.
- 순수 함수 / 유틸 / reducer는 기본적으로 property test 대상.
- 성공 시 오버핏 방지 효과가 매우 큼.
