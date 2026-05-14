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


## 트리거 조건 (1.0 컨벤션 — 본문 참고용, frontmatter description이 권위)

```
TRIGGER:  framework-agnostic TDD — '백엔드 TDD', 'library TDD', 'pure function TDD',
          'TDD without React'.
SKIP:     React/Vue 컴포넌트 → tdd-first (FE-specific RTL 관용구).
EXAMPLES:
  - 'FastAPI 엔드포인트 TDD로' → tdd-general의 Arrange-Act-Assert 가이드
  - 'CLI 도구 TDD' → table-driven test 권장
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
   ↓
Phase 4: Implementation      (최소 구현으로 GREEN, hard-code 금지, 테스트 수정 금지)
   ↓
Phase 5: Refactor + Intent Preservation (리팩터링 + Phase 1 답변 재확인)
```

각 Phase의 절차·원칙은 `tdd-first` 본문과 동일. **차이는 예시·관용구·라이브러리 가정**입니다.

## 스택별 Test Outline 예시

### Node.js (vitest/jest)

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

### Python (pytest)

```python
class TestValidateCoupon:
    def test_returns_valid_for_unexpired_code(self):
        # Arrange
        code = "SUMMER2026"
        # Act
        result = validate_coupon(code)
        # Assert
        assert result.valid is True

    @pytest.mark.parametrize("input_value, expected_reason", [
        ("", "empty"),
        (None, "null"),
        ("   ", "whitespace"),
    ])
    def test_rejects_invalid_inputs(self, input_value, expected_reason):
        result = validate_coupon(input_value)
        assert result.valid is False
        assert result.reason == expected_reason
```

### Go

```go
func TestValidateCoupon(t *testing.T) {
    t.Run("happy path", func(t *testing.T) {
        result := ValidateCoupon("SUMMER2026")
        if !result.Valid {
            t.Errorf("expected valid=true, got %v", result)
        }
    })
    t.Run("edge cases", func(t *testing.T) {
        cases := []struct {
            name  string
            input string
        }{
            {"empty", ""},
            {"whitespace", "   "},
        }
        for _, tc := range cases {
            t.Run(tc.name, func(t *testing.T) {
                result := ValidateCoupon(tc.input)
                if result.Valid {
                    t.Errorf("expected valid=false for %s", tc.name)
                }
            })
        }
    })
}
```

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

## references

이 스킬은 SKILL.md 자체로 완결됩니다. 추가 참조가 필요하면:
- `~/.claude/skills/tdd-first/references/intent-interview-template.md` — 6 질문 템플릿 (FE 예시이지만 일반화 가능)
- `~/.claude/skills/tdd-first/references/anti-overfit-rules.md` — 오버핏 방지 5룰 (전부 일반)
- `~/.claude/skills/tdd-first/references/scope-narrowing.md` — Phase 0 7 질문 (대부분 일반)
