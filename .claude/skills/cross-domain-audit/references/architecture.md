# Architecture — cross-domain-audit

## 다이어그램

```
            ┌──────────────────────────────────────┐
            │  SKILL.md (cross-domain-audit)       │
            │  - reads skills/* + commands/*       │
            │  - appends PROGRESS.md               │
            │  - writes ./audit/*-<run_id>.md      │
            └─────┬──────────────────────────┬─────┘
                  │                          │
            [Phase A 1×]                [Phase C 1×]
                  │                          │
          cohesion-auditor          backlog-prioritizer
                  │                          ▲
                  ▼                          │
          cohesion_signals          all_passed_reports
                  │                          ▲
                  └─────── [Phase B ×N] ─────┘
                              │
            ┌─────────────────┼────────────────────────┐
            │  for each asset in asset_list (loop)     │
            │                                          │
            │  parallel:                               │
            │    ┌──────────┐ ┌──────────┐             │
            │    │ fe-fit   │ │ be-fit   │             │
            │    └────┬─────┘ └────┬─────┘             │
            │    ┌────┴─────┐ ┌────┴─────┐             │
            │    │ leak     │ │ general  │             │
            │    └────┬─────┘ └────┬─────┘             │
            │         └──────┬─────┘                   │
            │                ▼                         │
            │          synthesizer                     │
            │     (memo + relevant cohesion)           │
            │                │                         │
            │                ▼                         │
            │         asset-reviewer                   │
            │       (reject → 1 retry)                 │
            │                │                         │
            │                ▼                         │
            │  memo_addition appended /                │
            │  PROGRESS.md append (orchestrator)       │
            └──────────────────────────────────────────┘
```

## 데이터 흐름

| Phase | Producer | Consumer | Payload |
|---|---|---|---|
| A | cohesion-auditor | orchestrator (stored as `cohesion_signals`) | clusters[] |
| B-fan-out | orchestrator | 4 experts (parallel) | `{asset, cross_asset_memo}` |
| B-fan-in | 4 experts | synthesizer | per-axis JSONs + relevant cohesion + memo |
| B-review | synthesizer | asset-reviewer | per-asset assessment |
| B-loop | asset-reviewer | synthesizer (retry) | feedback issues |
| B-out | orchestrator | PROGRESS.md | 1-line append |
| C | orchestrator | backlog-prioritizer | all reports + clusters + degraded list |
| D | orchestrator | filesystem | 3 markdown files |

## 권한 매트릭스

| Actor | Tools | Write target |
|---|---|---|
| cohesion-auditor | Read, Grep, Glob | — |
| fe-fit-evaluator | Read, Grep, Glob | — |
| be-fit-evaluator | Read, Grep, Glob | — |
| domain-leak-detector | Read, Grep, Glob | — |
| generalizability-strategist | Read, Grep, Glob | — |
| synthesizer | Read | — |
| asset-reviewer | Read, Grep, Glob | — |
| backlog-prioritizer | Read | — |
| **orchestrator (SKILL.md)** | Read, Glob, Write, Edit | `PROGRESS.md`, `./audit/*` |

전 에이전트 read-only. PROGRESS.md append와 ./audit/* 쓰기는 *오직* 오케스트레이터가 담당.

## Cross-asset memo 크기 제어

- 자산당 최대 1 문장 추가 (`synthesizer.memo_addition`).
- 25 자산 기준 ≤ 25 문장.
- 다음 자산 평가 시 memo 전체가 4 expert + synthesizer에 전달.
- memo가 100문장 초과로 커질 가능성 발견 시: orchestrator가 압축 또는 잘라내기 (오래된 항목 우선 제거).

## Failure mode summary

| 조건 | 처리 |
|---|---|
| Expert 호출 실패 | 1 retry → degraded for that axis |
| Synthesizer 실패 | 1 retry → degraded for that asset |
| Reviewer reject | 1 재합성 → 통과 못하면 degraded |
| Agent refusal (권한·도구 부족) | 자산 즉시 중단, audit/log-<run_id>.md에 명시, *사용자에게 권한 요청 안내* |
| 모든 자산 degraded | 사용자 경고 + 백로그는 낮은 confidence로 진행 |

## 실험 플래그

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` **필요 없음**. 모든 에이전트 간 데이터는 오케스트레이터를 거쳐 전달된다. 직접 에이전트-에이전트 통신 없음.
