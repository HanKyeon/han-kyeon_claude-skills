# 우선순위 점수 산정 룰

backlog-prioritizer가 사용. `./audit/backlog-<run_id>.md` 출력 시 동일 룰 적용.

## 점수 항목

| 항목 | 범위 | 1 (낮음) | 5 (높음) |
|---|---|---|---|
| `impact` | 1~5 | 표면적 (주석, 이름 변경) | 새 도메인 unlock 또는 다수 자산 동시 혜택 |
| `effort` | 1~5 | 1줄 변경 | 며칠 작업 + 새 references 작성 |
| `blast_radius` | 1~5 | 내부 문서/예시만 | 트리거 키워드 변경, 공개 API, breaking |
| `confidence` | 0.0~1.0 | 증거 적음 | 증거 충분 |

## 우선순위 공식

```
priority = impact × (6 - effort) × (6 - blast_radius) × confidence
```

높을수록 먼저 처리.

**예시**:
- impact 5, effort 2, blast 1, conf 0.85
  → 5 × 4 × 5 × 0.85 = **85**
- impact 2, effort 4, blast 4, conf 0.7
  → 2 × 2 × 2 × 0.7 = **5.6**

## 클러스터 가중

`scope: cluster | cross_cutting`이면 `impact`에 가산:

| 영향 자산 수 | impact bonus |
|---|---|
| 1~2 | +0 |
| 3~4 | +1 |
| 5+ | +2 |

`impact` 최댓값 5에 cap.

## 백로그 마크다운 형식

```markdown
# Backlog — <run_id>

| rank | scope | assets | change | I | E | B | conf | priority |
|---|---|---|---|---|---|---|---|---|
| 1 | cluster | tdd-first, tdd-general | TDD 스킬 경계 재정의 (FE-only vs stack-neutral) | 5 | 2 | 1 | 0.85 | 85 |
| 2 | single_asset | skills/refactoring-strategy | JSX 예시 → 도메인 중립 예시 | 4 | 1 | 2 | 0.9 | 144 |

## 상세

### Rank 1 — TDD 스킬 경계 재정의

**Rationale**: <why this rank>

**Supporting evidence**:
- `"<verbatim>"` (`<path>:<n>`)
- ...
```

## Degraded 자산 처리

평가 degraded 자산은:
- 백로그에 포함 (배제 금지)
- `score.confidence ≤ 0.3` 강제
- `rationale`에 "degraded — partial evidence" 포함
- 별도 섹션 `## Degraded assets` 에 모아 명시

## 금지 사항

- 새로운 자산 *생성* 제안 금지. cohesion-auditor의 `gap` 클러스터 기반일 때만 예외.
- 추측성 변경 금지 — 모든 백로그 항목은 supporting_evidence(verbatim + file:line) 보유.
