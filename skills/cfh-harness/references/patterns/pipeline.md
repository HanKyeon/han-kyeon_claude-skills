# Pattern: Pipeline

## 언제 쓰는가

- 태스크가 **순서가 있는 단계**로 자연스럽게 분해됨
- 각 단계의 출력이 다음 단계의 입력
- 되돌아가지 않음 (그러면 Supervisor 또는 Hierarchical이 맞음)

## 전형적 구성

```
Analyst → Builder → QA
```

- **Analyst**: 요구사항 해석, 스펙 산출
- **Builder**: 스펙을 구현
- **QA**: 구현을 스펙과 대조해 검증

## 에이전트 수

2~4. 5개 이상은 단계별 책임이 흐려지므로 Hierarchical로 재편.

## 통신

- 직렬. 이전 단계의 반환 메시지가 다음 단계의 입력.
- 상태 저장이 필요하면 프로젝트 파일로 영속화 (예: `.claude/work/stage-1-spec.md`).

## 장점

- 디버깅 쉬움. 어느 단계에서 실패했는지 명확.
- 각 에이전트가 하나의 관심사만.
- 리뷰·감사에 친화적.

## 단점

- 병렬화 불가.
- 스펙 오류가 파이프 하류로 전파됨 (QA가 최후 방어선).
- 단계 수만큼 지연.

## 실패 모드와 대응

| 실패 | 대응 |
|---|---|
| Analyst 스펙 모호 | 각 단계가 **Refusal 조건**을 명시. "스펙 불명확 시 중단" |
| Builder가 스펙을 재해석 | Builder prompt에 "스펙을 수정하지 말 것, 모호하면 escalate" |
| QA가 Builder를 변명 | QA는 스펙만 본다 — Builder 출력의 *이유*는 받지 않음 |

## 트리거 스킬 예시

```yaml
---
name: pipeline-flow
description: |
  Use this skill when the user has a multi-step feature request that benefits
  from Analyst → Builder → QA sequencing. Invokes agents in order, passing
  each stage's output to the next. Do NOT trigger for trivial single-file edits.
---
```

## 프리셋

`cfh generate pipeline-3stage` — Analyst/Builder/QA 3단 파이프라인 스캐폴드.

## 참고 구현

revfactory/harness의 Analyst/Builder/QA 기본 예시. GitHub spec-kit의 `/specify → /plan → /tasks` 체인.
