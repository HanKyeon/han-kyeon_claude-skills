---
name: tdd-general
description: |
  Use this skill for **framework-agnostic TDD** workflows — pure logic, backend
  services, CLI tools, data pipelines, libraries — where Testing Library / RTL
  conventions do not apply (keywords: "TDD without React", "백엔드 TDD",
  "library TDD", "pure function TDD"). Runs the same 5-phase TDD discipline
  (Intent Interview → Outline → Failing Test → Implement → Refactor + Intent
  Preservation) but with stack-neutral guidance (Arrange-Act-Assert, given-when-then,
  table-driven tests, property-based optional). Do NOT trigger when the user is
  working on React/Vue components — `tdd-first` covers FE-specific RTL conventions.
commands: [/cfh-tdd-gen, /cfh-tc-gen]
---

# TDD-General Workflow


## 트리거 조건 (1.0급 컨벤션 — 본문 참고용, frontmatter description이 권위)

```
TRIGGER:  non-FE intent TDD (새로 만든다) — '백엔드 TDD', 'library TDD',
          'pure function TDD', 'TDD without React', 'CLI TDD',
          'mobile TDD', 'embedded TDD', 'ML 학습 step TDD'.
SKIP:     React/Vue 컴포넌트 → tdd-first.
          기존 non-FE 파일 *보강*만 (artifact mode) → /cfh-tc-gen 명시 호출 권장.
INTENT vs ARTIFACT (0.17.0 Track 8):
  intent (새 모듈·핸들러·CLI 명령) → tdd-general 자동 트리거
  artifact (기존 *.go·*.py·*.swift 보강) → 자동 트리거 약함, /cfh-tc-gen 명시 호출 권장
EXAMPLES:
  - 'FastAPI 엔드포인트 TDD로' → tdd-general의 Arrange-Act-Assert 가이드
  - 'CLI 도구 TDD' → table-driven test 권장
  - '기존 retry.go 테스트 보강' → /cfh-tc-gen 라우팅 권장 (intent 아님)
```
`tdd-first`의 5 Phase 구조를 그대로 따르되, **테스트 라이브러리·관용구가 stack-neutral**한 버전입니다. 백엔드 서비스·CLI·라이브러리·순수 함수·데이터 파이프라인 등 React/Vue가 끼지 않는 영역에서 사용합니다.

## tdd-first와 차이

| 영역 | `tdd-first` | `tdd-general` (이 스킬) |
|---|---|---|
| 가정 스택 | React/Vue + RTL + jest/vitest | 임의 (Node·Python·Go·Rust + 임의 테스트 러너) |
| Phase 0 Scope Q1 단위 | "함수 / 컴포넌트 / 기능 / 페이지" | "함수 / 모듈 / 엔드포인트 / 워크플로" |
| Test Outline 형식 | `describe('X') { it('renders Y') }` | Arrange-Act-Assert 또는 given-when-then. 표(table-driven) 테스트 권장 |
| 쿼리·선택 | getByRole > getByLabelText 등 RTL 우선순위 | N/A (DOM 없음) |
| 인터랙션 | userEvent | 함수 호출, HTTP 요청, CLI 인자 |
| 모킹 | MSW (HTTP), vi.mock | 의존성 주입 우선, 어쩔 수 없을 때만 mock 라이브러리 (sinon·unittest.mock 등) |
| 비동기 | findBy / waitFor | async/await + assertion 직접 |
| 안티패턴 | DOM class 직접 검증, 내부 state 접근, 렌더 횟수 카운팅 | 내부 private 메서드 직접 호출, 시간 의존 (Date.now), 글로벌 상태 누수 |

## 활성화 시 반드시

1. **(z) 모르겠음 fallback.** 모든 인터뷰 질문에 `(z) 모르겠음` 옵션 기본 탑재. 선택 시 `~/.claude/skills/asset-factory/references/unknown-answer-playbook.md`의 3단계 처리.
2. **테스트 러너 파악 우선.** `package.json`·`pyproject.toml`·`Cargo.toml`·`go.mod` 등에서 테스트 도구 확인. 감지 안 되면 사용자에게 명시 질문.
3. **stack-neutral 표현 사용.** "describe/it" 강제 안 함. Python이면 pytest fixture, Go면 `t.Run`, Rust면 `#[test]` 등 그 스택의 관용구 따름.

## Phase 복귀 규칙 (공통)

Phase 2 이후에 초반 답변이 틀렸다고 판단되면:
- **"scope 재조정"** → Phase 0 복귀
- **"intent 재인터뷰"** → Phase 1 복귀
- **"outline 수정"** → Phase 2 복귀

## 5 Phase (tdd-first 동일)

```
Phase 0: Scope Narrowing    (작업 단위·테스트 계층·커버리지 목표 좁힘)
   ↓
Phase 1: Intent Interview   (의도 6 질문 — Happy Path·Edge·Error·Out-of-scope·관찰 방법 등)
   ↓
Phase 2: Test Outline        (테스트 케이스 제목·구조 제안 → 사용자 승인)
   ↓
Phase 3: Failing Tests       (구현 파일 본문 접근 금지, 시그니처만 확인)
                              • 정적 타입 언어(Rust·Go·Java·Kotlin·TypeScript): 컴파일 실패도 RED의 일부.
                                "테스트 실패" vs "구현 미완"을 구분하려면 `unimplemented!()` / `panic!("TODO")` /
                                `throw NotImplementedError` 등으로 명시 — 컴파일은 통과시키고 런타임에 fail.
   ↓
Phase 4: Implementation      (최소 구현으로 GREEN, hard-code 금지, 테스트 수정 금지)
   ↓
Phase 5: Refactor + Intent Preservation (리팩터링 + Phase 1 답변 재확인)
```

각 Phase의 절차·원칙은 `tdd-first` 본문과 동일. **차이는 예시·관용구·라이브러리 가정**입니다.

### Phase 1.5 — Final Intent Confirm (Phase 2 진입 직전, 0.20.0+)

`tdd-first`와 동일하게 Phase 1 6 답변을 *합산 해석·모호 발화 검사·답변 충돌 자가검증* 후 명시 yes 받기 (→ `~/.claude/commands/references/final-confirm.md`).

**non-FE 도메인 동음이의어 예시** (감지 시 명시):
- "service" → Spring `@Service` bean / OS daemon / domain service / SaaS service
- "controller" → Spring MVC `@RestController` / domain controller / hardware controller
- "client" → HTTP client / DB client / SDK consumer / end-user
- "API" → REST endpoint / library API surface / gRPC stub / public method
- "event" → Kafka event / domain event / lifecycle event / analytics event

**검증 게이트** (`tdd-first` 동일):
- Happy Path / Edge Case / Error Cases / Out of scope 4 카테고리 모두 답
- 관찰 방법 명확
- Phase 0 Scope와 정합

답변: `yes` (Phase 2 진입) / `정정 <Q번호>` / `처음부터` (Phase 0 회귀) / `pass`. 짧은 동의는 ambiguous로 *대기*.

## 스택별 Test Outline 예시

> 도메인 *다양화*: tdd-general이 stack 외에도 *문제 영역*도 stack-agnostic임을 worked example로 보여줍니다. Node 1 anchor + 다른 3 영역으로 분산.

### Node.js (vitest/jest) — coupon validator (익숙한 도메인 anchor)

```js
describe('validateCoupon', () => {
  describe('happy path', () => {
    it('returns valid=true for unexpired code', () => {
      // Arrange / Act / Assert
    });
  });
  describe('edge cases', () => {
    it.each([
      ['empty string', ''],
      ['null', null],
      ['only whitespace', '   '],
    ])('rejects %s', (_label, input) => {
      expect(validateCoupon(input)).toEqual({ valid: false, reason: 'invalid-format' });
    });
  });
});
```

### Python (pytest) — data pipeline transform

> `pytest` 관용구: `@pytest.fixture` (scope: function/module/session)로 setup 격리, `@pytest.mark.parametrize`로 table-driven, `conftest.py`에 공유 fixture, `respx`/`pytest-httpx`로 HTTP mock.

```python
class TestNormalizeUserRecord:
    """ETL stage — raw user record를 분석 가능한 형태로 정규화."""

    def test_returns_normalized_for_well_formed_record(self):
        # Arrange
        raw = {"email": "  Alice@EXAMPLE.com ", "joined": "2024-01-15T10:00:00Z"}
        # Act
        result = normalize_user_record(raw)
        # Assert
        assert result.email == "alice@example.com"
        assert result.joined.year == 2024

    @pytest.mark.parametrize("raw, expected_error", [
        ({"email": None}, "missing-email"),
        ({"email": "no-at-sign"}, "invalid-email"),
        ({"email": "ok@ok.com", "joined": "not-a-date"}, "invalid-joined"),
    ])
    def test_rejects_malformed_records(self, raw, expected_error):
        with pytest.raises(NormalizationError) as exc:
            normalize_user_record(raw)
        assert exc.value.code == expected_error
```

### Go — distributed retry policy

```go
func TestShouldRetry(t *testing.T) {
    t.Run("returns true for transient 5xx after first attempt", func(t *testing.T) {
        decision := ShouldRetry(RetryContext{
            StatusCode: 503, AttemptCount: 1, ElapsedMs: 200,
        })
        if !decision.Retry {
            t.Errorf("expected retry=true for 503 on first attempt")
        }
        if decision.BackoffMs < 100 {
            t.Errorf("expected exponential backoff ≥ 100ms, got %d", decision.BackoffMs)
        }
    })
    t.Run("gives up after max attempts", func(t *testing.T) {
        cases := []struct {
            name    string
            ctx     RetryContext
            wantOk  bool
        }{
            {"max attempts reached", RetryContext{StatusCode: 503, AttemptCount: 5}, false},
            {"timeout budget exhausted", RetryContext{StatusCode: 503, AttemptCount: 1, ElapsedMs: 30000}, false},
            {"non-retryable 4xx", RetryContext{StatusCode: 400, AttemptCount: 1}, false},
        }
        for _, tc := range cases {
            t.Run(tc.name, func(t *testing.T) {
                if got := ShouldRetry(tc.ctx); got.Retry != tc.wantOk {
                    t.Errorf("got retry=%v, want %v", got.Retry, tc.wantOk)
                }
            })
        }
    })
}
```

### Rust (cargo test) — library API surface

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_well_formed_version() {
        let v = Version::parse("1.2.3-beta+build.42").unwrap();
        assert_eq!(v.major, 1);
        assert_eq!(v.pre_release, Some("beta".to_string()));
    }

    #[test]
    fn rejects_malformed_with_typed_error() {
        // table-driven via const slice
        let cases: &[(&str, ParseError)] = &[
            ("", ParseError::Empty),
            ("not-a-version", ParseError::InvalidFormat),
            ("1.2", ParseError::IncompleteSemver),
            ("1.2.3.4", ParseError::TooManySegments),
        ];
        for (input, expected) in cases {
            assert_eq!(Version::parse(input).unwrap_err(), *expected, "input={}", input);
        }
    }
}
```

### JVM (JUnit 5 / Kotlin) — Spring service handler

```kotlin
// Kotlin + JUnit 5 + AssertJ + MockK
@DisplayName("CouponValidator")
class CouponValidatorTest {

    private val repo: CouponRepository = mockk()
    private val sut = CouponValidator(repo)

    @Nested
    @DisplayName("happy path")
    inner class HappyPath {
        @Test
        fun `returns valid when coupon is active and unused`() {
            every { repo.findByCode("SUMMER2026") } returns Coupon(active = true, used = false)
            val result = sut.validate("SUMMER2026")
            assertThat(result.valid).isTrue()
        }
    }

    @ParameterizedTest
    @MethodSource("invalidInputs")
    fun `rejects invalid inputs`(input: String?, expectedReason: String) {
        every { repo.findByCode(any()) } returns null
        val result = sut.validate(input)
        assertThat(result.valid).isFalse()
        assertThat(result.reason).isEqualTo(expectedReason)
    }

    companion object {
        @JvmStatic
        fun invalidInputs() = listOf(
            Arguments.of(null, "empty"),
            Arguments.of("", "empty"),
            Arguments.of("   ", "whitespace"),
        )
    }
}
```

> JVM 관용구: `@Nested` 그룹핑, `@ParameterizedTest` + `@MethodSource`, AssertJ fluent assertion, MockK(Kotlin)/Mockito(Java) DI, `@WebMvcTest`·`@DataJpaTest` slice 분리. Spring slice 선택은 `cfh-grill`로 깊이 결정.

## 안티패턴 (tdd-general 전용)

| ❌ Do NOT | 대신 |
|---|---|
| 내부 private 함수·메서드 직접 호출 | public 인터페이스로만 검증 |
| `Date.now()` / `time.time()` 직접 사용 | 시간을 인자로 주입 또는 mock |
| 글로벌 상태 의존 (env var, singleton) | 의존성 주입 |
| 테스트 간 상태 공유 (file fixture를 mutate) | 각 테스트 독립 setup/teardown |
| HTTP·DB 실제 호출 | mock·stub 또는 격리된 test container |
| 출력 형식 자체를 assertion (e.g., 줄바꿈 위치) | 의미 있는 필드·값만 |

## Property-Based Boost (선택)

순수 함수·파서·reducer·정렬 등 **수학적 속성이 명확한 코드**에는 property-based 테스트 추가:

```js
import fc from 'fast-check';
it('property: parseDate(formatDate(d)) === d', () => {
  fc.assert(fc.property(fc.date(), (d) => {
    expect(parseDate(formatDate(d))).toEqual(d);
  }));
});
```

```python
from hypothesis import given, strategies as st

@given(st.text())
def test_serialize_deserialize_is_identity(s):
    assert deserialize(serialize(s)) == s
```

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn parse_format_roundtrip(d: i64) {
        let s = format_date(d);
        prop_assert_eq!(parse_date(&s).unwrap(), d);
    }
}
```

```kotlin
// JVM (Kotest property-based)
class SerdeProperty : StringSpec({
    "serialize then deserialize is identity" {
        checkAll<String> { s ->
            deserialize(serialize(s)) shouldBe s
        }
    }
})
```

## references

이 스킬은 SKILL.md 자체로 완결됩니다. 추가 참조가 필요하면:
- `~/.claude/skills/tdd-first/references/intent-interview-template.md` — 6 질문 템플릿 (FE 예시이지만 일반화 가능)
- `~/.claude/skills/tdd-first/references/anti-overfit-rules.md` — 오버핏 방지 5룰 (전부 일반)
- `~/.claude/skills/tdd-first/references/scope-narrowing.md` — Phase 0 7 질문 (대부분 일반)
