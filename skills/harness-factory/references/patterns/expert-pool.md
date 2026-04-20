# Pattern: Expert Pool

## 언제 쓰는가

- **같은 입력**을 **서로 다른 축**으로 평가해야 함
- 각 전문가의 시각이 독립적이어야 함 (교차 오염 없이)
- 결과를 병합해 다차원 리포트 산출

## Fan-out/Fan-in과의 차이

- Fan-out/Fan-in: 입력을 **분할**. Worker가 각각 다른 부분을 봄.
- Expert Pool: 입력을 **공유**. Expert가 각자 다른 **축**을 봄.

## 전형적 구성 (FE PR 리뷰)

```
             ┌─ Security Reviewer   ─┐
             ├─ Performance Reviewer ─┤
   Diff  ────┼─ A11y Reviewer        ─┼─ Report Merger
             ├─ Types Reviewer       ─┤
             └─ Naming Reviewer      ─┘
```

## 에이전트 수

2~6. 축이 6개 넘으면 피로도 증가 — 축을 합치거나 계층화.

## 통신

- 모든 expert에 **동일 입력** 병렬 발송.
- 각자 독립 응답 (서로의 결론 알지 못함).
- Merger가 통합 리포트 작성 (중복 제거, 우선순위 부여).

## 장점

- 관점 누락 적음. 축이 명시적.
- Expert 교체·추가 용이.
- 각 축의 근거가 명확해 리뷰 검증 가능.

## 단점

- 중복 피드백 많음 (Merger가 dedup 필요).
- Expert 간 상충 의견 조정 비용 (예: 성능 vs 가독성).
- 전체 비용 = N × 각 expert 비용.

## 실패 모드와 대응

| 실패 | 대응 |
|---|---|
| Expert가 자기 축 외 의견 주장 | Expert description에 "Out of scope" 명시 |
| 중복 지적 | Merger가 파일:라인 기반 dedup |
| 우선순위 충돌 | Merger가 축별 가중치 (예: 보안 > 성능 > 스타일) |

## 트리거 스킬 예시

```yaml
---
name: expert-review-pool
description: |
  Use this skill when the user asks for a code review, PR review, or deep
  multi-axis audit (keywords: "review", "리뷰", "감수"). Runs independent
  expert reviewers (security, perf, a11y, types) in parallel and merges
  findings. Do NOT trigger for single-line fixes or docs-only diffs.
---
```

## 프리셋

`cfh generate reviewer-team` — security/perf/a11y/types 4-expert 풀.

## 참고 구현

revfactory/harness의 "Expert Pool" 패턴. CrewAI의 `Crew` 병렬 모드.
