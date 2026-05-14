# 자산 평가 마크다운 템플릿

`./audit/report-<run_id>.md` 작성 시 사용.

## 보고서 머리

```markdown
# Cross-Domain Audit Report — <run_id>

- 평가 대상: <N> 자산 (스킬 <s>개, 커맨드 <c>개)
- Passed: <P>
- Degraded: <D>
- Avg confidence: <avg>
- 실행 시각: <ISO timestamp>

## TL;DR

<3~5 줄 종합 요약 — synthesizer 메모 누적 + cohesion 결과 합성>

## 자산 평가 (asset_list 순서)
```

## 각 자산 섹션

```markdown
### <asset path>

| 축 | 결과 |
|---|---|
| FE-fit | `<usable/partial/unusable>` |
| BE-fit | `<usable/partial/unusable>` |
| Domain-leak | <count> leaks (kinds: <comma-joined>) |
| Generalizability | <out_of_box/with_changes/not_applicable> in <comma-joined third_domains> |
| Cohesion | <related cluster IDs, or "—"> |
| Status | passed / **degraded** |
| Confidence | <0.0~1.0> |

**Key findings**

- **<theme>** (from `<expert>`) — <1 sentence>
  - 인용: `"<verbatim>"` (`<path>:<n>`)

**Improvement summary**

<2~3 sentences, evidence-grounded.>

**Memo addition**

> <synthesizer.memo_addition — 1 sentence>
```

## Cohesion clusters 섹션 (보고서 끝)

```markdown
## Cohesion Clusters

| ID | kind | severity | assets | summary |
|---|---|---|---|---|
| C1 | overlap | high | skills/tdd-first, skills/tdd-general | <summary> |
| C2 | naming | low | commands/cfh-tdd.md, commands/cfh-tdd-gen.md | <summary> |

자세한 evidence는 backlog-<run_id>.md의 supporting_evidence 참조.
```

## Cross-asset memo (보고서 부록)

```markdown
## Cross-asset memo (누적)

<final cross_asset_memo text — 25 lines max>
```

## 형식 규칙

- 모든 인용은 verbatim. 변형 금지.
- 모든 file:line은 실제 파일 위치.
- degraded 자산은 섹션 헤더에 ⚠️ 또는 `[degraded]` 태그.
- 표 셀 내 백틱(`)으로 verdict 감싸기.
