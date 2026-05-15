# Agent Contract

각 에이전트 정의 파일(`.claude/agents/<name>.md`)은 아래 계약을 준수해야 Claude Code가 올바르게 등록·호출합니다.

## Frontmatter

```yaml
---
name: <kebab-case>
description: |
  <한 문장 역할>. <언제 오케스트레이터가 이 에이전트를 호출하는가>.
tools: Read, Grep, Glob           # 최소 권한
---
```

### 필드

- **name**: 파일명과 정확히 일치해야 함 (`security-reviewer.md` → `name: security-reviewer`).
- **description**: Claude Code가 **언제 이 에이전트를 부를지** 판단하는 단서. 스킬 description과 유사 원칙.
- **tools**: `Read, Grep, Glob` 같이 쉼표로. 필요한 것만. `Bash`나 `Write`는 신중히 (부작용 있음).

## 본문 구조

```markdown
# <Human Title>

<2 문장 charter — 이 에이전트가 무엇에 책임을 지고, 무엇이 out of scope인가>

## Input contract

오케스트레이터가 넘기는 입력:
- <필드>: <설명>

## Process

1. <단계>
2. <단계>
3. <단계>

## Output contract

반환 메시지 구조:
- **Findings**: <항목 리스트>
- **Recommendations**: <액션 아이템>
- **Confidence**: high/medium/low + 이유

## Refusal conditions

아래 조건에서 거부하고 오케스트레이터에 escalate:
- <조건 1>
- <조건 2>
```

## 최소 권한 원칙

| 역할 | 권장 tools |
|---|---|
| Reviewer (읽기 전용) | `Read, Grep, Glob` |
| Analyst (구조 탐색) | `Read, Grep, Glob, WebFetch` |
| Builder | `Read, Edit, Write, Bash` |
| QA | `Read, Grep, Bash` (테스트 실행) |
| Supervisor | `Task` (하위 에이전트 호출) |

## 입력 계약 규약

- **구조화 입력**: 파일 경로, diff 범위, 사양 파일을 명시.
- **자연어 태스크**: 오케스트레이터가 1 문단 요약을 첫 메시지로.
- **상태**: 세션 간 상태가 필요하면 파일 경로 지정 (`.claude/work/state.json`).

## 출력 계약 규약

모든 에이전트는 **단일 메시지**로 응답. 구조:

```
Findings:
- <파일:라인> <이슈 한 줄>
- ...

Recommendations:
- <액션>
- ...

Confidence: <high|medium|low> — <이유>
```

오케스트레이터가 이 포맷을 파싱해 다음 단계 결정.

## 거부 조건 (Refusal)

에이전트는 아래와 같을 때 작업 대신 escalate:
- 입력이 자신의 책임 범위 밖 (예: 보안 리뷰어에게 성능 질문)
- 필요한 도구가 없음 (예: `Bash` 없이 테스트 실행 요구)
- 입력이 파싱 불가 (스펙 누락)

거부 메시지 예:
```
REFUSAL: Out of scope. This agent handles security issues only.
The request mentions "bundle size" which belongs to perf-reviewer.
Escalating to orchestrator.
```

## 이름 충돌 방지

- 같은 프로젝트의 `.claude/agents/` 안에서 이름 유일성 필수.
- 패키지 제공 스킬 이름과 동일한 에이전트 이름 사용 금지 (혼동 방지).
- 서브도메인 접두사 권장 (예: `fe-security-reviewer`, `be-security-reviewer`).
