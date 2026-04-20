# Reasoning Format — Why / What / How / What if

## 이 포맷은 **결과 설명(출력)에만** 적용합니다

- ✅ **적용**: 리뷰 이슈 해설, 리팩터링 제안, 대안 비교, PR 분리 결정, Intent Preservation 체크 결과
- ❌ **비적용**: 사용자에게 개발 정보를 얻기 위한 질문 (Scope Narrowing, Intent Interview는 별도 프로토콜)
- 즉 이 포맷은 "AI가 사용자에게 설명할 때" 쓰는 도구이지, "질문을 4축으로 던지는" 도구가 아닙니다.
- 개발에 정말 필요한 정보가 모자라면 자연스러운 질문으로 확인하세요. 포맷 유지를 위해 질문을 남발하지 마세요.

모든 **중요한 제안·결정·변경을 사용자에게 설명할 때** 적용하는 4축 추론 포맷입니다. 사용자가 AI의 판단을 검증할 수 있도록 추론 과정을 명시적으로 드러냅니다.

## 4축 정의

| 축 | 질문 | 내용 |
|----|------|------|
| **Why** | 왜 이걸 하는가? | 문제의 근본 원인, 동기, 가치, 안 할 때의 비용 |
| **What** | 구체적으로 무엇을? | 대상 파일·함수·행, 변경 전후 비교, 명확한 Scope |
| **How** | 어떻게 실행? | 단계별 절차, 도구, 커밋 전략, 검증 방법 |
| **What if** | 다른 선택지라면? | 대안, 리스크, 트레이드오프, 엣지 케이스, 예외 |

## 적용 지점

다음 상황에서 **반드시** 이 포맷 사용:

1. **리팩터링 제안** (리뷰에서 지적할 때 포함)
2. **PR 분리 결정** (왜 N개로 쪼개는가)
3. **라이브러리 안티패턴 지적**
4. **Characterization Test 도입 제안**
5. **Scope Narrowing 답변 해설**
6. **대안 비교 (Adapter 계층 vs 직접 교체 등)**

단순한 사실 확인 (파일 목록 출력 등)에는 불필요.

## 템플릿

```markdown
### 제목: <간결한 결정/제안명>

**Why**
- <근본 원인 또는 동기 — 1~3줄>
- <안 할 때의 비용/리스크>
- <이 변경이 주는 가치>

**What**
- 대상: `<파일 경로:라인>` 또는 `<함수명/컴포넌트명>`
- 변경 전:
  ```<언어>
  // 현재 코드
  ```
- 변경 후:
  ```<언어>
  // 제안 코드
  ```
- 범위 한정: <Scope 밖은 건드리지 않음 명시>

**How**
1. <첫 단계>
2. <둘째 단계>
3. <검증 방법>
4. <커밋 메시지 초안>

**What if**
- 대안 A: <다른 방법> — 장단점
- 대안 B: <또 다른 방법> — 장단점
- 적용 안 할 경우: <기술 부채 누적, 성능 저하 등>
- 엣지 케이스: <어떤 상황에서 이 해결이 깨지는가>
- 롤백: <문제 시 되돌리는 방법>
```

---

## 예시 1 — 리팩터링 제안

### 제목: `PatientTable`의 `rowClassName` 콜백을 `useMemo`로 안정화

**Why**
- `rowClassName={(row, i) => ...}`이 매 렌더 새 함수 참조로 생성됨. 테이블 행 수가 많을 때 `React.memo`로 감싼 하위 `<tr>` 컴포넌트가 무효화됨.
- 한 스낵바 도착만으로도 테이블 전체 diff가 수행되어 렌더 비용이 O(n).
- 안 할 경우: 환자 수 100+ 환경에서 알림 push마다 UI가 수백 ms 프리즈.

**What**
- 대상: `src/components/patient-table/PatientTable.tsx:171-183`
- 변경 전:
  ```tsx
  <NewTable
    rowClassName={(row, i) => ...}   // 매 렌더 새 함수
    rowStyle={(row, i) => ...}
  />
  ```
- 변경 후:
  ```tsx
  const rowMeta = useMemo(
    () => list.map((_, i) => ({
      className: ..., style: ...
    })),
    [list, checkedSet]
  );
  <NewTable rowMeta={rowMeta} />
  ```
- 범위 한정: `PatientTable.tsx` 1개 파일. `NewTable` 컴포넌트의 props 인터페이스 확장 1줄 포함.

**How**
1. `NewTable.tsx`에 `rowMeta?: Array<{className?, style?}>` prop 추가 (하위 호환 유지)
2. `PatientTable.tsx`에서 `rowMeta` 기반으로 전달, 기존 콜백 props 제거
3. `npx tsc --noEmit` 통과 확인
4. `PatientTable.test.tsx` GREEN 확인
5. Playwright smoke: `/patients` 페이지 로딩 + 체크박스 토글 확인
6. 커밋: `refactor(PatientTable): stabilize row metadata with useMemo`

**What if**
- **대안 A — `rowClassName` 콜백 자체를 `useCallback`**: 간단하나 `useCallback`이 deps 변경 시 여전히 재생성되므로 메모이제이션 효과 부분적. 제안안보다 이득 작음.
- **대안 B — `NewTable`을 `React.memo` 제거**: 리렌더를 허용하되 각 행을 가볍게 유지. 테이블이 단순하면 가능하나 현재는 행당 Chart.js를 포함해 부적합.
- **적용 안 할 경우**: 환자 수 증가 시 선형으로 프리즈 심화. INP 지표 악화.
- **엣지 케이스**: `list`가 빈 배열일 때 `rowMeta`도 빈 배열 — 정상. `checkedSet`이 undefined인 경우 옵셔널 체이닝 필요.
- **롤백**: 단일 파일 변경이라 `git revert <commit>` 한 번으로 복구.

---

## 예시 2 — PR 분리 결정

### 제목: 568 파일 리팩터링을 **5개 PR**로 분리

**Why**
- 단일 PR로 처리 시 리뷰 불가능 (공식 연구: 400줄 초과부터 결함 발견율 급락).
- 롤백이 전부 아니면 전무 구조가 되어 부분 문제 대응 불가.
- 도메인별 영향 범위가 달라서 리뷰어가 다를 수 있음.

**What**
- 대상: `refactor/setup-project` 브랜치의 568 파일 변경
- 분리안:
  1. `PR#1` — 설정 파일 + 빌드 (30 파일)
  2. `PR#2` — `src/api/` 도메인 재편 (150 파일)
  3. `PR#3` — `src/components/` → `src/components` (180 파일)
  4. `PR#4` — 페이지 재명명 (140 파일)
  5. `PR#5` — 테스트 보강 + legacy 폴더 제거 (68 파일)

**How**
1. 현재 브랜치를 `refactor/setup-project-original`로 백업
2. develop에서 새 브랜치 `refactor/p1-config` 생성
3. `git cherry-pick` 또는 `git diff ... | git apply --include`로 PR#1 범위만 이식
4. PR#1 리뷰·머지 후 PR#2 동일 절차
5. 각 PR은 독립 실행 가능해야 함 (중간 상태도 빌드·런타임 OK)

**What if**
- **대안 A — 5개가 아니라 2~3개로**: 리뷰 부담은 비슷, 롤백 단위가 커짐.
- **대안 B — 모든 PR 동시 오픈**: 의존성 꼬임, 리뷰어 혼란.
- **적용 안 할 경우**: 현 상태 그대로 머지 시도 → 리뷰 실패 → 브랜치 장기 방치 위험.
- **엣지 케이스**: PR#2에서 type export 구조 변경이 PR#3의 컴포넌트에 필요한 경우 — 그 경우 PR#2를 먼저 머지 후 PR#3 작업 시작 (순서 의존).
- **롤백**: PR 단위로 revert 가능. 5개 중 마지막 하나만 문제 시 앞 4개는 유지.

---

## 예시 3 — 라이브러리 안티패턴 지적

### 제목: `useQuery` 결과를 `useState`로 복사하는 패턴 제거

**Why**
- React Query 공식 문서가 명시적으로 **"Don't"** 로 경고한 안티패턴.
- 출처: https://tkdodo.eu/blog/practical-react-query#dont-use-the-query-cache-as-a-local-state-manager
- 이유: 두 소스 오브 트루스가 생겨 race condition·stale 표시·메모리 2배 사용.

**What**
- 대상: `src/pages/details/hooks/useDetails.ts:44-52`
- 변경 전:
  ```ts
  const { data } = useQuery(...);
  const [items, setItems] = useState([]);
  useEffect(() => setItems(data ?? []), [data]);
  ```
- 변경 후:
  ```ts
  const { data: items = [] } = useQuery(...);
  ```

**How**
1. `items` state 제거
2. `setItems` 호출하는 다른 지점 스캔
3. 있으면 `queryClient.setQueryData(...)` 또는 mutation의 `onSuccess`로 대체
4. 타입체크 + 기존 테스트 GREEN 확인
5. 커밋: `refactor(useDetails): remove redundant useState copy of query data`

**What if**
- **대안 A — 로컬 변형이 필요한 경우**: `useMemo(() => transform(data), [data])` 로 파생값만 만들기.
- **대안 B — 낙관적 업데이트 위해 필요**: React Query의 `setQueryData` 사용, useState 금지.
- **적용 안 할 경우**: 동기화 버그, 특정 타이밍에 이전 값 표시.
- **엣지 케이스**: 여러 쿼리 결과를 합쳐야 하면 `useQueries` 또는 별도 selector.
- **롤백**: 단순 되돌리기. 영향 범위는 이 파일 + 이 파일 consumer.

---

## 축약 버전 (짧은 결정)

매우 짧은 결정엔 한 줄씩 작성해도 됩니다:

> **Why**: `any` 사용이 타입 체인 전체를 약화. **What**: `src/foo.ts:12`의 `any`를 `Patient`로 변경. **How**: import 추가 + 1줄 수정. **What if**: Patient가 바뀌면 여기도 같이 수정 필요 (정상적 의존성).

## 규칙

1. **네 축 모두 채우기**. 하나라도 비면 깊이 부족 → 다시 생각.
2. **What if가 가장 중요**. 대안 비교 없이는 "이것만 정답"이라는 착각에 빠짐.
3. **사실·추측 구분**. 추측이면 "추정:" 접두사 붙이기.
4. **수치·출처 명시**. "빠르다"보다 "30% 감소 (측정: Chrome Profiler)".
5. **사용자가 반론 가능한 형태로**. 결정이 아니라 제안. 사용자가 "B로 갑시다" 할 수 있어야 함.
