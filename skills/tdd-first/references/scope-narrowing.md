# TDD Scope Narrowing Protocol

TDD 작업 시 **Phase 1 Intent Interview 전에** 범위를 질문으로 좁히는 프로토콜입니다. Interview 질문이 너무 커지는 것을 막습니다.

## 핵심 질문 7가지

### Q1. 작업 단위 (Unit of Work)
> *"이번 세션의 작업 단위는?"*
- (a) **단일 함수·훅** (예: `formatPrice`, `useDebounce`)
- (b) **단일 컴포넌트**
- (c) **여러 컴포넌트·훅의 조합** (기능 단위)
- (d) **페이지 전체** (통합 수준)

→ 작을수록 Interview 질문도 작아짐. (d)면 통합 시나리오 중심.

### Q2. 테스트 계층 (Test Pyramid Level)
> *"어느 계층의 테스트를 작성하나요?"*
- (a) **Unit** — 순수 함수, 훅 단독
- (b) **Component** — 컴포넌트 렌더링·인터랙션
- (c) **Integration** — 여러 컴포넌트 + 상태 + 라우팅
- (d) **E2E** — 실제 브라우저 (Playwright)

→ (c), (d)는 별도 프레임워크 필요 여부 확인.

### Q3. 커버리지 목표
> *"이번 세션에서 커버할 경로는?"*
- (a) **Happy Path만** 먼저 (빠른 확인)
- (b) **Happy + 핵심 Edge** (2~3개)
- (c) **Happy + 모든 Edge + Error**
- (d) **Happy + Property-based 1~2개 보강**

→ (a)부터 시작하고 점진적 확대 권장.

### Q4. 모킹 경계 (Mock Boundary)
> *"어디에서 경계를 긋고 모킹하나요?"*
- (a) **외부 API만** 모킹 (msw 권장)
- (b) **외부 API + 브라우저 API** (localStorage, IntersectionObserver 등)
- (c) **의존 모듈까지** 모킹 (비권장 — 이유 필요)

→ (c)는 오버모킹 위험. 왜 필요한지 Why 필수.

### Q5. 의존성 처리
> *"아직 없는 의존성(함수/컴포넌트)이 있다면?"*
- (a) **현재 세션에서 함께 만듦**
- (b) **스텁/인터페이스만 정의**하고 구현은 다음 세션
- (c) **모킹**하고 실제 구현은 별도 PR

→ (b)가 TDD의 '인터페이스 먼저' 원칙에 부합.

### Q6. 시간 박스
> *"이번 세션 목표는?"*
- (a) Phase 1~2 (질문 + Outline 합의)까지
- (b) Phase 3 (Failing Tests)까지
- (c) Phase 4 (Implementation)까지
- (d) Phase 5 (Refactor + Intent Check)까지

→ 큰 작업이면 (a)~(b)에서 끊고 사용자가 이어받아 실행.

### Q7. Writer/Implementer 분리 여부
> *"이 작업은 비즈니스 크리티컬합니까? (결제·보안·데이터 손실 관련)"*
- Yes → **Writer/Implementer 분리 에이전트 사용** 권장 (오버핏 방지 강화)
- No → 단일 AI로 5 Phase 진행

---

## Follow-up Questions (유형별)

### 순수 함수
- *"결정론적입니까? (같은 입력 → 같은 출력)"*
- *"Date / Math.random / performance.now 의존이 있나요?"* → 있으면 DI 필요
- *"Property-based 테스트로 보강할 만한 수학·알고리즘 속성이 있나요?"*

### 컴포넌트
- *"상태를 갖습니까, 무상태 presentational인가요?"*
- *"외부 데이터 의존 (Context, Store, Query)은?"*
- *"접근성 테스트 포함? (role, keyboard, focus)"*
- *"시각 회귀 테스트 필요? (Playwright screenshot)"*

### 커스텀 훅
- *"side effect 있나요? (useEffect, 구독)"*
- *"cleanup 필요? 어떤 조건에서?"*
- *"여러 곳에서 쓸 예정? 범용 API 설계 필요?"*

### API 함수
- *"실제 엔드포인트가 준비됐나요? 없으면 스키마만 정의?"*
- *"에러 타입은 어떻게 표현? (throw vs discriminated union)"*

### 버그 수정 TDD
- *"버그 재현 조건이 확인됐나요?"*
- *"먼저 실패 테스트(regression test)로 버그를 고정하고 수정하는 게 목표입니까?"*

---

## 답변이 불충분할 때

### 패턴 1 — 옵션 제시 + 기본값 제안
> *"Q2 (테스트 계층)에 답이 없습니다. 파일명을 보니 `utils/`이라 Unit(a)으로 가정하고 진행합니다. 다르면 알려주세요."*

### 패턴 2 — 대상 분해 제안
> *"이 작업은 단일 세션에 크다고 판단됩니다. 다음으로 쪼개는 건 어떨까요?*
> *세션 1: `formatPrice` 유틸 (Unit)*
> *세션 2: `PriceDisplay` 컴포넌트 (Component)*
> *세션 3: `Cart` 통합 (Integration)"*

### 패턴 3 — TDD vs Test-Fill 재확인
> *"대상 파일이 이미 존재합니다. TDD Mode (동작을 새로 설계)입니까, Test-Fill Mode (현재 동작에 테스트만 추가)입니까?"*

---

## 금지 사항

- ❌ Scope Narrowing 질문 없이 바로 Phase 1 Interview 6개 던지기 (질문 과부하)
- ❌ "일반적으로..."로 범위 추정
- ❌ 대상이 크면 통째로 진행. 분해 제안 필수.
- ❌ 모킹 경계를 사용자에게 묻지 않고 "가능한 모두 모킹"
- ❌ 답변 일부만 받고 나머지는 가정으로 진행
