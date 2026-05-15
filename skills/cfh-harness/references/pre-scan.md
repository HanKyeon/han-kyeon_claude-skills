# Phase 0 — Pre-scan

팀 설계 인터뷰 시작 **전에** 프로젝트 구조를 훑어 Phase 1 기본 5 질문의 초안을 미리 만드는 단계입니다.

## 원칙

1. **읽기만, 쓰기 없음.**
2. **초안은 초안일 뿐.** 확신 없으면 `(추정)`·`(모름)` 태그.
3. **2~3분 내 완료.** 상위 N개 파일만 샘플링.
4. **건너뛰기 허용.** 새 디렉터리라 스캔할 것 없으면 "Phase 1 정상 진행"으로 종료.

## 스캔 대상

### 필수

| 파일 | 어디서 쓰는가 |
|---|---|
| `CLAUDE.md` / `CONTRIBUTING.md` | 프로젝트 규칙 — 팀이 따라야 할 컨벤션 |
| `package.json` | 스택·테스트 프레임워크 → 에이전트 도구 선택 기준 |
| `./.claude/agents/` | 이미 있는 에이전트 — 중복·계층 재편 검토 |
| `./.claude/skills/` | 기존 스킬 — 트리거 충돌 검토 |
| `~/.claude/skills/cfh-harness/references/patterns/*.md` | 6 패턴 카드 — 추천 시 참조용 |

### 선택

| 파일 | 활용 |
|---|---|
| `src/` 대표 디렉터리 구조 | 도메인 경계 (결제·인증·UI 등) — 에이전트 책임 분할 힌트 |
| `.github/workflows/` | CI 구조 → 팀 산출물이 CI와 연동 필요한지 |
| `REVIEW.md` 이력 | 기존 리뷰 패턴 → Expert Pool vs Pipeline 취향 추정 |

## 스캔 결과 → Phase 1 초안 매핑

| Phase 1 질문 | Pre-scan에서 추출 가능 |
|---|---|
| Q1 태스크 성격 | `$ARGUMENTS`의 도메인 설명 + `.github/workflows/`에 리뷰 자동화가 있으면 "다축 평가" 가능성 |
| Q2 입력·출력 | `./.claude/agents/` 중 비슷한 팀이 있으면 입출력 구조 참고 |
| Q3 전문성 축 | `src/` 도메인 경계로 축 후보 자동 생성 (결제·인증·UI 있으면 각각 축 후보) |
| Q4 실패 비용 | `CLAUDE.md`에 "프로덕션"·"결제"·"의료" 등 키워드 있으면 **(c) 높음**으로 기본값 |
| Q5 규모 | 기존 `.claude/agents/` 개수 + 도메인 축 개수로 초안 |

## 스캔 프로토콜

```
1. Glob "./CLAUDE.md", "./.github/**/*.yml" (존재 확인)
2. Read package.json (name, dependencies)
3. Glob "./.claude/agents/*.md" → 이름과 frontmatter description만
4. Glob "./.claude/skills/*/SKILL.md" → 이름만
5. Read CLAUDE.md (있으면, 상위 50줄만) — 도메인 키워드 추출
6. 사용자 인자 `$ARGUMENTS`와 결합하여 Q1~Q5 초안
```

## 사용자에게 제시하는 방식

```
🔎 Pre-scan 결과

- 프로젝트: <name>
- 스택: <React/Node/...>
- 기존 에이전트: <none | list>
- 기존 팀 스킬: <none | list>
- 도메인 경계 (추정): <결제, 인증, UI, ...>

Phase 1 답변 초안:

Q1 (태스크 성격): <초안 (추정)>
Q2 (입력 → 출력): <초안>
Q3 (전문성 축 후보): <자동 추출 목록>
Q4 (실패 비용): <(a)/(b)/(c) 추정 + 근거>
Q5 (규모 초안): <N 에이전트>

이대로 확인하시겠습니까? 틀린 부분만 알려주세요.
```

## Pre-scan 실패 케이스

- **CLAUDE.md 없음 + .claude/ 없음** → "프로젝트 컨텍스트 없음. Phase 1 정상 진행."
- **이미 10+ 에이전트 존재** → "에이전트가 많습니다. (a) 새 팀 추가 (b) 기존 재편 중 어느 쪽입니까?" — Phase 1 진입 전 결정.
- **혼재된 패턴 (에이전트가 분류 불명)** → Phase 1에서 Q1의 옵션 설명을 더 상세히.

## 하지 말 것

- 패턴을 Pre-scan에서 결정하지 말 것 — Phase 2의 몫.
- 긴 파일 전체 읽기 — 상위 50줄·frontmatter만.
- 추정을 확정으로 제시 — `(추정)` 명시.
