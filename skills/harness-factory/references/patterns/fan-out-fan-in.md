# Pattern: Fan-out / Fan-in

## 언제 쓰는가

- 큰 입력을 **독립적 부분 문제**로 나눌 수 있음
- 부분별 처리가 서로 영향 없음
- 결과를 **병합(aggregate)** 하는 단계가 명확

## 전형적 구성

```
             ┌─ Worker A ─┐
Orchestrator ─┼─ Worker B ─┼─ Aggregator
             └─ Worker C ─┘
```

- **Orchestrator**: 입력을 분할, worker 호출, 결과 수거
- **Workers** (N개): 같은 유형 또는 다른 유형. 서로 통신 안 함
- **Aggregator** (별도 에이전트 또는 Orchestrator 내부): 결과를 하나의 산출물로 병합

## 에이전트 수

Orchestrator 1 + Worker 2~N + (optional Aggregator 1). Worker가 10을 넘으면 샘플링 또는 계층화.

## 통신

- **Fan-out**: Orchestrator가 각 Worker에 독립 태스크 발송. 병렬.
- **Fan-in**: 모든 Worker 응답 수신 후 Aggregator가 처리.

Agent Teams 활성(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) 필요.

## 장점

- 병렬 → 지연 감소.
- 독립성 → 한 Worker 실패가 다른 결과를 오염시키지 않음.
- 확장 쉬움 — Worker 추가만.

## 단점

- 분할·병합 비용이 부분 처리 비용보다 크면 손해.
- Worker 결과 포맷이 상충하면 Aggregator 복잡.
- 결과 순서가 비결정적 (Aggregator가 정렬 전략 가져야 함).

## 실패 모드와 대응

| 실패 | 대응 |
|---|---|
| 1개 Worker 타임아웃 | Orchestrator가 partial 결과 수용 전략: 재시도 / 스킵 / 실패 |
| Worker 결과 포맷 불일치 | Worker description에 출력 스키마 명시, Aggregator가 검증 |
| 분할이 불균등 | Orchestrator가 입력 분할 시 크기 휴리스틱 (파일 수, 줄 수) |

## 트리거 스킬 예시

```yaml
---
name: parallel-audit
description: |
  Use this skill when the user wants to audit multiple independent files,
  modules, or PRs at once. Splits input, runs N reviewers in parallel,
  and merges findings into a single report. Do NOT trigger when files
  are tightly coupled (use pipeline instead).
---
```

## 프리셋

현재 번들된 프리셋 없음 — `cfh new` + `cfh generate`의 파일 스펙을 조합하거나 Claude가 Write로 생성.

## 참고 구현

OpenAI Cookbook의 parallel analysis, LangGraph의 Map-Reduce.
