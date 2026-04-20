# SKILL.md 구조 가이드

## 권장 섹션 순서

```markdown
---
name: <kebab-case>
description: |
  <2~4줄 트리거 설명>
---

# <Human Title>

<1 문단 요약>

## 활성화 시 반드시 (Always Apply)

<3~5개 짧은 규칙. 각 규칙은 한 줄~두 줄.>

## 워크플로 / 단계

<순서 있는 단계. references/ 링크 포함.>

## 자주 하는 실수

<실수 ↔ 대응 표.>

## references/

<참조 파일 목록 + 한 줄 설명.>
```

## Progressive Disclosure 원칙

**SKILL.md 본문에 들어갈 것**:
- 트리거 확인용 요약 (Claude가 "정말 이 스킬이 맞는가" 판단)
- 필수 규칙 (활성화 시 바로 적용되어야 하는 것)
- 워크플로 스켈레톤 (단계 이름만)

**references/로 빠질 것**:
- 긴 예시 코드 (20줄 넘음)
- 체크리스트 (10 항목 넘음)
- 라이브러리별 안티패턴 카탈로그
- 질문 템플릿 전문
- 히스토리컬 사례

## 길이 기준

| SKILL.md 길이 | 조치 |
|---|---|
| ~50줄 | OK, 단순 스킬 |
| 50~150줄 | 표준. references 1~3개 |
| 150~250줄 | 경계. 일부 섹션 references 이전 검토 |
| 250줄 초과 | **반드시 분리.** 토큰 낭비 |

## references/ 파일 명명

- kebab-case
- 내용 중심 (예: `blast-radius-analysis.md`, NOT `doc-1.md`)
- 숫자 prefix 금지 (정렬 필요시 파일명 자체에 의미 담기)

## 참조 방식

SKILL.md에서 references 파일을 언급할 때:

```markdown
Step 2: Blast Radius 분석 (→ `references/blast-radius-analysis.md`)
```

- 경로는 SKILL.md 디렉터리 기준 상대 경로
- 파일명만 써도 Claude가 이해하지만, `references/...` 형태가 명시적
- 한 파일을 여러 곳에서 참조해도 됨 (중복 로드는 Claude가 처리)

## "반드시" 목록 작성법

좋은 규칙:
1. **주체와 동작이 명확** — "사용자에게 Scope를 먼저 질문한다"
2. **측정 가능** — "라이브러리 공식 문서 링크 없는 조언은 제시하지 않는다"
3. **예외 조건 명시** — "테스트가 있는 영역은 건너뛸 수 있다"

나쁜 규칙:
1. "좋은 코드를 쓴다" (측정 불가)
2. "항상 TDD" (예외 없음 — 실제론 예외 있음)
3. "사용자를 도와준다" (무의미)

## 언어 선택

- SKILL.md description은 **영어 키워드 우선** (Claude Code의 매칭이 더 안정적).
- 본문은 한국어/영어 자유. 팀 기본 언어에 맞춤.
- references는 긴 서술 → 한국어, 코드 예시 → 영어 주석이 일반적.

## 예시 스켈레톤

```markdown
---
name: my-flow
description: |
  Use this skill when <trigger>. Does <action>. Do NOT trigger for <anti-trigger>.
---

# My Flow

1 문단 요약.

## 활성화 시 반드시

1. 규칙 1
2. 규칙 2
3. 규칙 3

## 워크플로

Step 1: X (→ references/step-1.md)
Step 2: Y
Step 3: Z (→ references/step-3.md)

## 자주 하는 실수

| 실수 | 대응 |
|---|---|
| A | B |

## references/

- `step-1.md` — ...
- `step-3.md` — ...
```
