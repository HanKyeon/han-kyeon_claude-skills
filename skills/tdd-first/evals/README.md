# Skill evals (`cfh eval`)

이 디렉터리는 **이 스킬이 의도대로 작동하는지 측정**하는 eval 케이스 모음입니다.
`cfh eval tdd-first` 또는 `cfh eval --list`로 실행·확인.

## 케이스 형식

각 `.json` 파일은 **하나 또는 배열의 케이스**:

```json
{
  "name": "case description (kebab-case 권장)",
  "prompt": "사용자 발화 — 이 스킬이 트리거되어야 하는 입력",
  "skill_should_trigger": "tdd-first",
  "assertions": [
    { "type": "contains", "value": "Phase 1" },
    { "type": "contains", "value": "Intent Interview" },
    { "type": "not_contains", "value": "TypeError" },
    { "type": "regex", "value": "Phase\\s+\\d" }
  ],
  "tags": ["happy-path", "scope-narrowing"],
  "notes": "왜 이 케이스가 중요한지 1~2줄 (선택)"
}
```

### 필드

| 필드 | 필수 | 설명 |
|---|---|---|
| `name` | ✅ | 케이스 이름. 디렉터리 안에서 unique |
| `prompt` | ✅ | LLM에 보낼 사용자 발화 |
| `skill_should_trigger` | ❌ | 이 발화가 어느 스킬을 트리거해야 하는지 — 출력에 스킬 이름 또는 표지가 있어야 통과 |
| `assertions` | ✅ | 출력에 대한 검증 배열. 모두 통과해야 케이스 pass |
| `tags` | ❌ | 그룹핑·필터용 |
| `notes` | ❌ | 사람용 메모 |

### Assertion 타입

| type | 의미 |
|---|---|
| `contains` | 출력에 `value` 문자열이 (대소문자 구분) 포함 |
| `not_contains` | 출력에 `value` 문자열이 **없음** |
| `regex` | 출력이 `value` 정규식과 일치 (한 군데라도) |

## 실행 모드

```bash
# 케이스 목록만 (정적 검증, 실행 X)
cfh eval tdd-first --list

# 프롬프트·assertion만 출력 (LLM 호출 X)
cfh eval tdd-first --dry-run

# 사용자가 직접 claude에 붙여넣고 결과 paste (LLM 호출은 사용자 책임)
cfh eval tdd-first --manual

# Claude CLI 서브프로세스로 자동 실행 (실험적, claude CLI 필요)
cfh eval tdd-first --executor claude
```

`--executor claude` 모드는 토큰을 실제 소비하므로 `cfh cost`로 사후 확인 권장.

## 케이스 작성 가이드

1. **happy-path 1~2개**: 스킬이 정확히 트리거되어야 하는 발화
2. **anti-trigger 1개**: 인접 스킬과 겹치는 발화 — **이 스킬이 떠선 안 됨** (`skill_should_trigger`를 비우거나 다른 스킬 지정)
3. **edge case 1~2개**: 모호하거나 부분 정보만 있는 발화
4. **assertion은 행동 기반으로**: "Phase 1 Intent Interview가 시작됐는가" — 내부 토큰·class 검증 금지

## 예시 케이스 보기

이 디렉터리의 다른 `.json` 파일을 참고.
