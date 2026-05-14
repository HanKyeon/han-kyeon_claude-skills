<s>
**`-gen` suffix 컨벤션 (1.0)**: suffix 없는 `/cfh-tc`는 FE(React/Vue) 치중, `-gen` suffix는 **BE·스택 중립** 의미. 이 컨벤션은 `cfh-tdd` ↔ `cfh-tdd-gen`에도 동일 적용.

이 커맨드는 **백엔드·라이브러리·CLI·순수 함수**를 위한 테스트 작성 워크플로입니다.
React/Vue 컴포넌트는 `/cfh-tc`(FE-friendly RTL)로 가세요.

**🔀 잘못 진입하셨다면**:
- React/Vue 컴포넌트 테스트 → `/cfh-tc`
- 새 기능을 TDD로 처음부터 → `/cfh-tdd-gen`
- TDD 일반 워크플로 (Phase 0~5) → `/cfh-tdd-gen`

**핵심 원칙**:
- 테스트는 **public 인터페이스의 동작**을 검증한다. 내부 구현·private 메서드 금지.
- 의존성 주입 우선. mock·stub은 외부 IO(HTTP·DB·파일·시간)에 한정.
- 테스트는 **격리** — 글로벌 상태 누수·시간 의존·파일 mutation 금지.
- 기존 테스트 컨벤션을 따른다. 새 패턴 도입 금지.
</s>

<target>
대상: `$ARGUMENTS`

- 파일 경로 (예: `src/services/auth.ts`, `app/api/users.py`): 해당 파일의 테스트 작성
- 디렉토리 경로 (예: `src/services/`): 하위 모든 파일
- **아무 것도 안 주면**: 사용자에게 "TDD로 새 코드 작성인가요? 기존 코드 테스트 보강인가요?"를 먼저 질문 — 후자면 이 커맨드, 전자면 `/cfh-tdd-gen` 안내
</target>

<scope_narrowing>

## Scope Narrowing — Mode 결정 전에

대상이 명확해도 **작업 단위·테스트 계층·커버리지 목표·모킹 경계** 등을 먼저 질문으로 좁힙니다 (`~/.claude/skills/tdd-general/SKILL.md` 참조).

범위가 크면 여러 세션으로 분해 제안.

**(z) 모르겠음 fallback 모든 질문에 기본 탑재** — `~/.claude/skills/asset-factory/references/unknown-answer-playbook.md`.

</scope_narrowing>

<mode_detection>

## Mode 결정

| Mode | 조건 | 절차 |
|---|---|---|
| **TDD Mode** | 대상 파일 미존재 또는 사용자가 "신규 작성" | `/cfh-tdd-gen` 안내 (이 커맨드는 보강용) |
| **Test-Fill Mode** | 대상 파일 이미 존재, 테스트 보강 | Phase 0(현재 동작 파악)부터 시작. Characterization Test 접근 |
| **Hybrid Mode** | 기존 파일 있으나 리팩터링 예정 | Phase 0로 현재 동작 고정 → 신규 부분만 TDD |

Mode 불명확 시 사용자 질문 후 진행.

</mode_detection>

<test_fill_mode>

## Test-Fill Mode (백엔드·라이브러리·CLI 보강)

### Phase 0: 현재 동작 파악 (Characterization)

- 대상 파일 본문 읽기
- 입출력 동작 포착 (REPL·디버거·로그·실제 실행)
- **관찰된 동작 = 테스트 기준선**. 버그가 있어도 일단 그대로 기록
- 발견한 버그는 `// BUG:` 또는 `# BUG:` 주석만 + 수정은 별도 PR

### Phase 1: 프로젝트 테스트 환경 파악

스택별 감지 대상:
- **Node.js**: `package.json`의 test script, vitest/jest/mocha, supertest/nock/msw, fixture 위치
- **Python**: pytest/unittest, pytest fixtures, requests-mock, factory_boy, conftest.py
- **Go**: 표준 `testing` 패키지, testify, httptest, golden file 패턴
- **Rust**: `#[cfg(test)]`, `#[test]`, mockall, integration tests in `tests/`
- **Java/Kotlin (server)**: JUnit 5, Mockito, MockMvc, AssertJ
- **iOS/Swift**: XCTest, XCTestExpectation, OHHTTPStubs, swift-snapshot-testing
- **Android (Kotlin/Java)**: instrumented JUnit (`androidx.test`), Robolectric, MockK, Espresso (UI)
- **Embedded C/C++**: Unity, CMock, fff (fake function framework), Ceedling
- **공통**: 파일 위치·네이밍 컨벤션 (인접 `*_test.*` vs `tests/`)

### Phase 2: 테스트 시나리오 설계 (우선순위 순)

**Priority 1 — Core**: 기본 happy path, 주요 입력·출력 매핑
**Priority 2 — IO**: 도메인별 — *서버*: HTTP / DB / 파일 / 외부 API mock · *embedded*: 센서·GPIO·디바이스 IO·타이머 인터럽트 · *mobile*: 터치 이벤트·permission·deep link · *ML*: GPU 컨텍스트·디스크 캐시·rng seed
**Priority 3 — Edge**: 빈 입력 / null·undefined / 경계값 / 매우 큰 값 / 동시성
**Priority 4 — Error**: throw·panic / 에러 응답 / 재시도·timeout / circuit breaker
**Priority 5 — Integration**: 실제 의존성과의 통합 (test container·in-memory DB·simulator)

### Phase 3: 테스트 코드 작성

스택별 관용구는 `~/.claude/skills/tdd-general/SKILL.md`의 "스택별 Test Outline 예시" 참조.

### Phase 4: 셀프 검증

`<self_verification>` 체크리스트 적용.

</test_fill_mode>

<common_rules>

## 공통 규칙 (모든 stack 적용)

### Arrange-Act-Assert

```
// Arrange — 입력·의존성 설정
const input = ...
const stub = ...

// Act — 대상 호출
const result = subject(input, stub)

// Assert — 결과 검증
expect(result).toEqual(...)
```

또는 given-when-then:
```
// Given: <상황>
// When: <행동>
// Then: <기대>
```

### 의존성 처리

- **의존성 주입(DI) 우선** — mock 라이브러리 사용 전에 함수 시그니처에 의존성을 인자로 받도록 설계 가능한지 확인
- **외부 IO만 mock** — HTTP / DB / 파일 / 시간 / 환경변수 / 랜덤 / (embedded) GPIO·센서 / (mobile) permission·deep link / (ML) GPU 컨텍스트·rng seed
- **격리된 test container 권장** (Docker testcontainers·in-memory DB·local file system)

### Table-driven 테스트

여러 입력에 대해 같은 동작 검증할 때:
- vitest/jest: `it.each([...])`
- pytest: `@pytest.mark.parametrize`
- Go: `t.Run` + slice of cases
- Rust: macro 또는 단일 `#[test]` 안 loop

### 비동기

- async/await 사용. 콜백·promise.then 직접 검증 금지
- timeout 명시 (전체 테스트의 외부 IO 의존을 통제)
- race condition 의심되면 명시적으로 race 케이스 작성

### 모킹 경계

- **항상 mock**: HTTP·DB·파일 IO·시간 (`Date.now`·`time.time`)·랜덤·환경변수·process.env / (도메인별) GPIO·센서·터치·permission·deep link·GPU 컨텍스트·rng seed
- **DI 우선, 어쩔 수 없을 때만 mock**: 동일 모듈 내 다른 함수
- **금지**: 표준 라이브러리 mock (수정 안 됨), 같은 함수의 다른 호출 mock (테스트가 구현에 결합)

### 안티패턴 (작성 후 자체 체크)

- ❌ private 메서드 직접 호출 (`obj._privateMethod()`)
- ❌ 내부 state 직접 검증 (`obj._cache.size`)
- ❌ `Date.now()` / `time.time()` / `random.random()` 직접 사용 — 주입하거나 mock
- ❌ 환경변수 의존 (`process.env.X`) — 인자로 주입
- ❌ 파일 시스템 mutation 후 cleanup 안 함
- ❌ 글로벌 singleton 의존 (`db`·`logger`·`cache`) — DI 또는 module-level mock
- ❌ 출력 형식 자체 assertion (예: `expect(output).toBe('foo\n  bar')`) — 의미 있는 필드만

발견 시 직접 수정 + 사유 출력에 명시.

</common_rules>

<self_verification>

## 셀프 검증 체크리스트

### 구조
- [ ] 프로젝트 기존 테스트와 동일 import·setup 패턴
- [ ] Arrange-Act-Assert 또는 given-when-then 명확
- [ ] 각 테스트 독립 실행 가능

### 의존성
- [ ] 외부 IO만 mock (내부 모듈 mock 없음)
- [ ] DI로 처리 가능한 것은 mock 안 씀
- [ ] 시간·환경변수·랜덤 모두 통제됨

### 비동기
- [ ] async/await 사용
- [ ] timeout 명시
- [ ] race condition 케이스 (의심되는 경우)

### 격리
- [ ] 글로벌 상태 누수 없음
- [ ] 파일 mutation 후 cleanup 또는 격리된 dir 사용
- [ ] 테스트 간 순서 의존 없음

### 시나리오 완성도
- [ ] Happy path 포함
- [ ] Edge: 빈/null/경계값/동시성 (해당 시)
- [ ] Error: throw·panic·timeout (해당 시)
- [ ] Integration: 외부 의존성 통합 (해당 시)

</self_verification>

<output_format>

## 🔍 프로젝트 테스트 환경

| 항목 | 감지된 설정 |
|:---|:---|
| Mode | Test-Fill / Hybrid (TDD는 `/cfh-tdd-gen` 안내) |
| 스택 | Node / Python / Go / Rust / Java / Kotlin / ... |
| 테스트 러너 | (vitest / pytest / `go test` / cargo test / ...) |
| 모킹 라이브러리 | (msw / vi.mock / pytest-mock / mockall / ...) |
| 파일 위치 | (인접 `*_test.*` / `tests/` / `__tests__/` / ...) |
| 네이밍 | (`.test.ts` / `_test.go` / `test_*.py` / ...) |
| Test container | (있음: 경로 / 없음 / docker-compose 활용) |

---

## 🎯 대상 분석

(역할·책임, public 인터페이스, 외부 의존, 분기 시나리오, 실패 모드)

---

## 📋 테스트 시나리오 (Test-Fill Mode)

| 우선순위 | 분류 | 시나리오 | 검증 대상 |
|:---:|:---|:---|:---|
| 🔴 P1 | Core | ... | ... |
| 🟠 P2 | IO | ... | ... |
| 🟡 P3 | Edge | ... | ... |
| 🟠 P4 | Error | ... | ... |
| 🟢 P5 | Integration | ... | ... |

---

## 💻 테스트 코드

**파일 경로**: `<절대 경로>`

```<language>
// 전체 테스트 코드
```

---

## ✅ 셀프 검증 결과

| 항목 | 결과 | 비고 |
|:---|:---:|:---|
| 구조 | ✅/⚠️ | ... |
| 의존성 (DI·mock 경계) | ✅/⚠️ | ... |
| 비동기 | ✅/⚠️ | ... |
| 격리 | ✅/⚠️ | ... |
| 시나리오 완성도 | ✅/⚠️ | ... |

---

## 🔎 다음 단계 제안

- 추가로 필요한 테스트 (Property-based 후보 등)
- 모킹 의존성 정리 권장 사항
- 환경 설정 추가 사항 (test container, fixture seed 등)

## 종료 시 다음 단계 권장 (필수 출력)

```
✅ 테스트 작성 완료 (framework-agnostic)

다음 단계:
- 머지 전 자체 점검 → /cfh-review
- 이번 워크플로 피드백 → /cfh-feedback tdd-general "<comment>"
```

</output_format>

<constraints>
- 프로젝트의 기존 테스트 컨벤션 준수. 새 패턴 도입 금지.
- React/Vue·DOM·ARIA·userEvent 관용구 사용 금지 (그건 `/cfh-tc`).
- Mode 불명확 시 사용자에게 질문.
- public 인터페이스로만 검증. private 메서드 직접 호출 금지.
- 외부 IO만 mock. 내부 모듈은 DI로 처리.
- 한국어 설명, 코드는 해당 스택의 관용 언어.
</constraints>
