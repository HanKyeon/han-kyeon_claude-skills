# Deprecation Policy

## 원칙

`@han-kyeon/claude-skills`는 1.0.0부터 명시적 deprecation 정책을 따릅니다. 1.x 동안 API contract (CLI 명령·플래그·slash command·frontmatter schema)를 안정적으로 유지하며, breaking change는 다음 major 버전에서만 적용합니다.

## Cycle 정의

```
N.0.0      새 명령·flag 도입 + 구 명령·flag에 deprecation warning
N.0.x      warning 강도 증가 가능, 동작은 유지
(N+1).0.0  legacy 제거
```

- **1 사이클** = 한 major 버전 동안 유지 (예: 1.0.x 내내 alias 유지, 2.0.0에서 제거)
- deprecation warning은 stderr에 한 줄 출력, exit code 영향 없음
- 자동화 스크립트는 한 사이클 동안 계속 작동

## 1.0.0 deprecation 목록

다음 항목은 1.0에서 deprecation warning 출력, **2.0에서 제거** 예정:

| 구 명령·플래그 | 신 명령·플래그 |
|---|---|
| `cfh evolve [skill]` | `cfh feedback [skill]` |
| `cfh log <skill>` | `cfh feedback log <skill>` |
| `cfh log --enable` | `cfh feedback enable` |
| `cfh log --disable` | `cfh feedback disable` |
| `cfh log --status` | `cfh feedback status` |
| `cfh dashboard` | `cfh stats` |
| `cfh eval` (top-level) | `cfh dev eval` |
| `cfh validate` | `cfh check schema` |
| `cfh doctor` | `cfh check skills` |
| `cfh sentry --live` | `cfh sentry live` |
| `cfh sentry --install-hook` | `cfh sentry hook install` |
| `cfh install --link` | 제거됨 (dev 워크플로는 `npm link`) |

## Schema 위반 정책

1.0부터 `cfh check schema` (구 `cfh validate`)는 다음을 default ERROR로 처리:

- SKILL.md frontmatter의 unknown field
- name 패턴 위반 (kebab-case, 1~63자)
- description 길이 (20~1024자)

**Grace period**: `--legacy` flag로 0.x style warn-only 동작 유지 가능. CI에 1.0.x 동안 `--legacy` 통과 후 1.1+에서 제거 권장.

## 사용자 영향

대부분의 사용자는 1.0에서 자동화 스크립트 수정 불필요 — alias가 동일 동작. deprecation warning은 stderr에 출력되므로 stdout 파싱 영향 없음.

- **개인 사용자**: warning 무시 가능, 다음에 명령 입력 시 새 이름 학습
- **CI/자동화**: 사이클 동안 무수정 작동. 다음 major (2.0) 전에 신 명령으로 migration
- **Skill 작성자**: SKILL.md unknown field 있으면 `--legacy` 또는 schema 갱신
