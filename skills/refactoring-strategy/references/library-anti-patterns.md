# Library Anti-Patterns — 공식 문서 기준

라이브러리가 **공식 문서에서 명시적으로 경고한** 안티패턴만 수록. 커뮤니티 취향은 제외.

인용 근거를 반드시 함께 제시하는 것이 원칙. (링크는 문서 개정 시 갱신 필요)

---

## React (공식 규칙)

### 1. Rules of Hooks
- **Hook을 조건문·루프·중첩 함수에서 호출 금지**
- **Hook은 React 함수에서만 호출** (일반 JS 함수 ❌)
- 근거: https://react.dev/reference/rules/rules-of-hooks

### 2. useEffect에 서버 데이터 동기화 금지
- `useEffect`로 fetch 호출 후 `setState`는 안티패턴
- 이유: waterfall, race condition, deduping 불가
- 근거: https://react.dev/reference/react/useEffect#fetching-data-with-effects
- 대안: React Query, SWR, RSC, 프레임워크 loader

### 3. 파생 상태를 useState로 복사 금지
```tsx
// ❌
const [count, setCount] = useState(0);
const [doubled, setDoubled] = useState(0);
useEffect(() => setDoubled(count * 2), [count]);

// ✅
const doubled = count * 2;
// 또는
const doubled = useMemo(() => expensive(count), [count]);
```
- 근거: https://react.dev/learn/you-might-not-need-an-effect

### 4. 의존성 배열 거짓말 금지
- ESLint `react-hooks/exhaustive-deps` 위반 없이 처리
- `// eslint-disable-next-line` 사용 시 **이유 주석 필수**

### 5. key에 index 사용 금지 (리스트 순서가 바뀌는 경우)
- 근거: https://react.dev/learn/rendering-lists#why-does-react-need-keys

---

## React Query / TanStack Query

### 1. useQuery 결과를 useState로 복사 금지
```tsx
// ❌
const { data } = useQuery(...);
const [items, setItems] = useState([]);
useEffect(() => setItems(data ?? []), [data]);

// ✅
const { data: items = [] } = useQuery(...);
```
- 근거: TkDodo "Practical React Query" (공식 블로그 연계)
- https://tkdodo.eu/blog/practical-react-query

### 2. queryKey는 factory 패턴으로
- 인라인 문자열 배열 남용 금지 → invalidation 일관성 깨짐
- `@lukemorales/query-key-factory` 또는 수동 팩토리
- 근거: https://tanstack.com/query/latest/docs/framework/react/guides/query-keys

### 3. staleTime 0 + refetchOnWindowFocus의 남용
- 모든 쿼리가 탭 전환 시마다 refetch → 서버 부하
- 의미 있는 `staleTime` 설정 권장

### 4. onSuccess/onError에서 다른 쿼리 invalidate 시 누락
- 낙관적 업데이트 롤백 로직 누락이 흔함
- 근거: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates

---

## React Hook Form

### 1. Controlled 필드를 register로 감싸기
- `<Select />` 같은 외부 controlled 컴포넌트는 `Controller`를 써야 함
- `register`는 native input에만
- 근거: https://react-hook-form.com/docs/usecontroller/controller

### 2. defaultValues를 런타임 데이터로 늦게 세팅
```tsx
// ❌ — mount 이후 defaultValues 바꿔도 반영 안 됨
<Form defaultValues={dataFromApi}>

// ✅
useForm({ defaultValues: async () => await fetchData() })
// 또는 reset(newValues)
```
- 근거: https://react-hook-form.com/docs/useform#defaultValues

### 3. watch 남용
- `watch()`는 리렌더를 유발. 성능 크리티컬한 곳에서는 `useWatch`.
- 근거: https://react-hook-form.com/docs/usewatch

---

## Tailwind CSS

### 1. @apply 남용 금지
- Tailwind 공식 입장: **최소한만 사용**. 유틸리티의 purging/JIT 이점을 잃음.
- 근거: https://tailwindcss.com/docs/reusing-styles#avoiding-premature-abstraction

### 2. 동적 클래스명 문자열 연결 금지
```tsx
// ❌ — purge가 감지 못함
<div className={`text-${color}-500`} />

// ✅
const colorClass = { red: 'text-red-500', blue: 'text-blue-500' }[color];
<div className={colorClass} />
```
- 근거: https://tailwindcss.com/docs/content-configuration#dynamic-class-names

### 3. important 모드 남용
- 공식 권장: 사용 시 scope 제한
- 근거: https://tailwindcss.com/docs/configuration#important

---

## Zustand

### 1. useStore() 전체 구독
```ts
// ❌ — 스토어 어떤 필드가 바뀌어도 리렌더
const store = useStore();

// ✅
const value = useStore((s) => s.value);
```
- 근거: https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-useshallow

### 2. 배열/객체 리터럴 selector
```ts
// ❌ — 매 렌더 새 참조 → 항상 리렌더
const [a, b] = useStore((s) => [s.a, s.b]);

// ✅
const [a, b] = useStore((s) => [s.a, s.b], shallow);
// 또는 useShallow (v4.5+)
const { a, b } = useStore(useShallow((s) => ({ a: s.a, b: s.b })));
```

---

## TypeScript (공식 핸드북)

### 1. any 사용
- **Escape hatch — 명시적 이유 없이 사용 금지**
- 대안: `unknown` + 타입 가드
- 근거: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#any

### 2. non-null assertion `!` 남용
- 공식 핸드북: "trust me, I know what I'm doing" — 근거 약할 때 사용 금지
- 근거: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#non-null-assertion-operator-postfix-

### 3. enum 대신 as const
- TS 팀 및 다수 스타일 가이드가 `as const` 권장 (tree-shaking, reverse mapping 이슈)
- 근거: https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums

### 4. 타입 단언(as) vs satisfies
- `satisfies`가 타입 좁힘 유지하면서 구조 검증 — TS 4.9+
- 근거: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html

---

## Testing Library

### 1. 구현 세부 테스트 금지
- Class name, state, internal method 접근 금지
- 근거: https://testing-library.com/docs/guiding-principles

### 2. query 우선순위
```
getByRole > getByLabelText > getByPlaceholderText > getByText >
getByDisplayValue > getByAltText > getByTitle > getByTestId
```
- 근거: https://testing-library.com/docs/queries/about#priority

### 3. cleanup 누락
- Vitest/Jest는 자동이지만 명시 cleanup이 필요한 경우 누락 주의
- 근거: https://testing-library.com/docs/react-testing-library/api#cleanup

---

## 사용 규칙

1. **인용 근거 필수**: "이거 안티패턴이다"고 말할 때 반드시 공식 문서 링크 제공.
2. **프로젝트 버전 확인**: 안티패턴은 버전에 따라 바뀐다. `package.json`의 버전 확인 후 해당 문서 인용.
3. **예외 존중**: 공식 문서가 허용하는 예외 케이스는 지적하지 않는다.
4. **대안 함께 제시**: "이건 안 된다"만 말하지 말고 "이렇게 해라"를 같이.

## 유지보수

새 라이브러리를 프로젝트가 도입하면 이 파일에 섹션 추가. 공식 anti-pattern 문서/블로그 링크를 스크랩하고 **인용 허락 범위 내**로 요약.
