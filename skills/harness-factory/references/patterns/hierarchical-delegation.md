# Pattern: Hierarchical Delegation

## 언제 쓰는가

- 큰 문제를 **재귀적으로 분해** 가능
- 깊이 2 이상의 트리 구조가 자연스러움
- 동시에 **다른 팀**이 독립적으로 진행 가능

## Supervisor와의 차이

- Supervisor: depth 1 (1 supervisor + N workers).
- Hierarchical: depth 2+. Worker가 자신의 sub-supervisor가 됨.

## 전형적 구성

```
                Root Coordinator
                 /       |       \
          Frontend    Backend    DevOps
           Team        Team       Team
           / \          / \         |
       UI   UX     API  DB      CI/CD
      Lead Lead   Lead Lead      Lead
```

## 에이전트 수

대형. 깊이 2에서 7~15, 깊이 3 이상은 관리 비용 폭발.

## 통신

- 각 계층은 자기 부모에게만 보고.
- 수평 통신 금지 (같은 레벨 간 직접 통신 없음).
- Root가 최종 결과 조합.

## 장점

- 매우 큰 도메인 대응.
- 각 팀이 자기 하위에 집중.
- 병렬성 + 전문성 조합.

## 단점

- 감사·디버깅 어려움 (깊이가 늘수록 흐름 추적 힘듦).
- 컨텍스트 전파 지연 (Root의 결정이 leaf까지 도달).
- 오케스트레이션 비용이 작업 비용을 넘을 수 있음.

## 실패 모드와 대응

| 실패 | 대응 |
|---|---|
| 같은 정보가 여러 팀에 복제 | 공통 컨텍스트를 파일로 (`.claude/context/*.md`), Root만 갱신 |
| Leaf가 상위 의도를 놓침 | 상위 계층의 요약을 하위에 반드시 포함 |
| 계층별 프롬프트 드리프트 | 각 계층이 자기 역할 기술을 주기적으로 참조 |
| 과도한 계층 | 실제 도메인이 평평하면 depth 1(Supervisor)로 단순화 |

## 언제 **쓰지 말 것**

- 에이전트 총합 < 5개 → Supervisor가 더 단순.
- 팀 간 의존이 강함 → Pipeline이 더 맞음.
- 결과 병합 단계가 복잡 → Expert Pool + 전담 Merger.

## 트리거 스킬 예시

```yaml
---
name: hierarchical-workstream
description: |
  Use this skill when the user has a large cross-functional initiative that
  cleanly decomposes into 2+ teams with their own sub-specialists (e.g.,
  "redesign checkout: FE team + BE team + infra team"). Creates a root
  coordinator with team-level supervisors. Do NOT trigger for single-team
  tasks — use Supervisor or Pipeline instead.
---
```

## 프리셋

현재 번들 프리셋 없음. Claude가 harness-factory Phase 5의 Option B로 사용자와 함께 트리 구조를 직접 설계.

## 참고 구현

AutoGen의 GroupChat + nested teams. revfactory/harness L3 meta-factory의 가장 깊은 구성.
