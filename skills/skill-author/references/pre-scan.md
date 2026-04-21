# Phase 0 — Pre-scan

인터뷰 시작 **전에** 프로젝트 파일을 훑어 Phase 1의 답변 초안을 미리 만드는 단계입니다. 사용자는 빈 종이에서 답하는 대신 "이 초안 맞습니까?"에 확인만 하면 되어 질문 부담이 줄어듭니다.

## 원칙

1. **읽기만, 쓰기 없음.** Pre-scan은 파일 생성·수정 금지. 순수 관찰.
2. **초안은 초안일 뿐.** 확신 없으면 `(추정)`·`(모름)` 태그를 붙여 사용자가 구분하도록.
3. **빠르게.** 여기서 2~3분 이상 소모하면 오히려 사용자 흐름 끊음. 상위 N개 파일만 샘플링.
4. **건너뛰기 허용.** 프로젝트 성격상 무의미하면(예: 새 빈 디렉터리) "스캔 결과 없음. 바로 Phase 1로 진행하겠습니다"로 종료.

## 스캔 대상

### 필수

| 파일 | 어디서 쓰는가 |
|---|---|
| `CLAUDE.md` / `CONTRIBUTING.md` / `.cursorrules` | 프로젝트 규칙 — 스킬이 따라야 할 기본 컨벤션 |
| `package.json` | 라이브러리 스택 → 트리거 파일 패턴 추정 (React? Vue? Node-only?) |
| `~/.claude/skills/` (이름 목록만) | 중복·트리거 충돌 가능성 있는 기존 스킬 |
| `./.claude/skills/` (있으면) | 프로젝트 로컬 기존 스킬 |

### 선택 (있으면 참고)

| 파일 | 활용 |
|---|---|
| `tsconfig.json` | 프로젝트가 TS인지, strict 모드인지 → 출력 예시의 타입 수준 |
| `.eslintrc*`, `.prettierrc*` | 자동화된 규칙 → SKILL.md가 강제할 필요 없음 |
| `README.md` (프로젝트 루트) | 도메인 맥락 |
| `src/` 대표 파일 3개 | 기존 스타일 샘플링 |

## 스캔 결과 → Phase 1 초안 매핑

| Phase 1 질문 | Pre-scan에서 추출 가능한 것 |
|---|---|
| Q1 한 문장 목적 | 사용자가 `/cfh-new`에 준 name과 `$ARGUMENTS`에서 유추 — "payment-validation"이면 "결제 도메인 검증" |
| Q2 트리거 상황 | `package.json` 라이브러리로 파일 패턴 추정 (예: `react` 발견 → `src/**/*.tsx`) |
| Q3 반-트리거 | `~/.claude/skills/`의 기존 스킬 description에서 인접 키워드 수집 → "이 키워드는 저쪽 스킬이 이미 담당" 후보 |
| Q4 핵심 원칙 | `CLAUDE.md`의 규칙 섹션에서 관련 항목 3~5개 발췌 |
| Q5 출력 형태 | 기존 스킬 중 유사한 것의 출력 형태 참고 |
| Q6 참조 자료 | `CLAUDE.md` 길이 기반으로 추천 — 200줄+이면 references 분리 제안 |

## 스캔 프로토콜 (Claude 실행 순서)

```
1. Glob "./CLAUDE.md", "./.cursorrules", "./CONTRIBUTING.md" (읽을 것 존재 여부)
2. Read package.json (있으면) — name, dependencies 키만 필요
3. Glob "~/.claude/skills/*/SKILL.md" → 각 파일 frontmatter만 추출 (description 전체 읽지 않음 — 이름·키워드만)
4. Glob "./.claude/skills/*/SKILL.md" (프로젝트 로컬)
5. 사용자 인자(`$ARGUMENTS`)에서 kind·name 파싱
6. 위 정보로 Q1~Q6 초안 작성
```

## 사용자에게 제시하는 방식

```
🔎 Pre-scan 결과 (확인만 해주세요)

- 프로젝트: <package.json name 또는 디렉터리명>
- 주요 스택: <React 18.3, TS 5.5, Vitest 등>
- 기존 규칙 문서: <CLAUDE.md L1-239>
- 기존 스킬 (이름만): <refactoring-strategy, tdd-first, ...>

아래는 Phase 1 답변 초안입니다. 틀린 부분·비어있는 부분만 알려주세요.

Q1 (목적): <초안 or (모름)>
Q2 (트리거 키워드): <초안 3개 or (모름)>
Q2 (파일 패턴): <초안 or (모름)>
Q3 (반-트리거): <인접 스킬과 겹치지 않게 제외할 영역>
Q4 (핵심 원칙): <CLAUDE.md 관련 규칙 발췌 3~5개>
Q5 (출력 형태): <초안 or (모름)>
Q6 (참조 자료): <분리 권장 여부>
```

사용자 응답 방식:
- "전부 맞음" → Phase 1 전부 skip, 바로 Sanity check로.
- "Q1, Q3만 고치겠음" → 해당 질문만 다시 받기. 나머지 초안 유지.
- "전부 다시" → 초안 폐기, 기본 Phase 1 수행.

## Pre-scan 실패 케이스

- **CLAUDE.md 없음** → "규칙 문서 없음. Phase 1에서 원칙을 직접 수집하겠습니다."
- **빈 프로젝트** → Pre-scan skip 선언. Phase 1 정상 진행.
- **기존 스킬 다수(10+)** → 트리거 충돌 가능성 높음. Phase 1 Q3(반-트리거)을 특히 중요하게 다룰 것.

## 하지 말 것

- 파일을 전부 읽기 — 대표 3~5개만. 토큰 낭비.
- 추측을 확정으로 제시 — `(추정)` 태그 필수.
- Pre-scan에서 얻은 답을 Phase 2~5로 반영하지 않기 — Phase 1의 승인 과정을 거쳐야만 채택.
