# Pattern: Supervisor

## 언제 쓰는가

- 태스크가 **동적으로 여러 경로로 분기**할 수 있음
- 어느 worker에 배정할지 실행 시점에 결정해야 함
- 중간 결과를 보고 다음 단계를 선택 (반응형)

## Pipeline / Fan-out과의 차이

- Pipeline: 단계·순서가 **사전에 고정**.
- Fan-out: 분할도 **사전에 고정** (입력 크기만큼 분할).
- Supervisor: **런타임에** 경로 선택.

## 전형적 구성

```
             ┌─→ Worker A (리팩터링 전문)
Supervisor ──┼─→ Worker B (테스트 작성 전문)
             ├─→ Worker C (성능 최적화 전문)
             └─→ Worker D (문서 생성 전문)
```

Supervisor가 태스크 내용을 보고 적절한 worker로 위임. Worker 응답을 받아 다음 행동(추가 worker 호출, 사용자 질문, 종료)을 결정.

## 에이전트 수

Supervisor 1 + Worker 2~N. Worker가 많아지면 Supervisor의 라우팅 결정이 복잡 → Hierarchical로.

## 통신

- Supervisor ↔ Worker 양방향.
- Worker는 서로 통신 안 함 (Supervisor 경유).
- 상태는 Supervisor가 보관.

## 장점

- 동적 작업에 유연.
- Worker가 하나의 전문성만 가지면 됨 (단순).
- 관측·감사 쉬움 — 모든 흐름이 Supervisor를 지남.

## 단점

- Supervisor가 병목.
- Supervisor prompt가 커짐 (모든 worker 설명 + 라우팅 규칙).
- Supervisor 오판 시 연쇄 실패.

## 실패 모드와 대응

| 실패 | 대응 |
|---|---|
| Supervisor 라우팅 오류 | Worker description을 더 구체화, Supervisor에 "모호 시 사용자에 질문" 규칙 |
| Worker가 범위 밖 작업 | Worker에 Refusal 조건 명시, 넘치면 Supervisor에 escalate |
| Supervisor prompt 비대 | Worker 수 5 초과 시 Hierarchical로 재편 |
| 무한 루프 | 최대 단계 수 제한 (예: 15 스텝) |

## 트리거 스킬 예시

```yaml
---
name: project-supervisor
description: |
  Use this skill when the user gives a vague, multi-step engineering task
  and wants a single orchestrator to route sub-tasks to specialists
  (refactoring, testing, perf, docs). Supervisor decides which specialist
  to call at each step. Do NOT trigger for well-defined single-step tasks.
---
```

## 프리셋

현재 번들 프리셋 없음. Claude가 cfh-harness Phase 5의 Option B로 직접 생성.

## 참고 구현

LangGraph의 Supervisor 패턴. Anthropic "Building effective agents"의 Orchestrator-Workers.
