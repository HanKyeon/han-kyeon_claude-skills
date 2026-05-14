---
name: cross-domain-audit
description: Use this skill when the user wants to audit the project's skills and commands for cross-domain usability (FE/BE/common/CLI/data/devops applicability) — keywords "스킬 감사", "FE/BE 호환성", "공통화 검토", "다영역 적용성", "cross-domain audit", "portability review", "스킬 일반화 검토". Activates an 8-agent Expert Pool (cohesion-auditor + 4 per-asset experts + synthesizer + reviewer + backlog-prioritizer) that RE-SCANS the project at runtime, evaluates each asset, and produces report + backlog + log under ./audit/, plus a one-line append per asset to PROGRESS.md. Do NOT trigger for single-asset edits, authoring new skills (use skill-author), or testing flows (use tdd-first / tdd-general).
---

# cross-domain-audit

8-agent Expert Pool auditing this project's `skills/*` and `commands/*` for cross-domain usability. Produces a per-asset report and a prioritized improvement backlog.

## When to trigger

- "이 레포의 스킬을 FE/BE 양쪽에서 쓸 수 있는지 봐줘"
- "공통화 검토해줘"
- "다른 영역에서도 사용 가능하도록 일반화 검토"
- "skills와 commands portability audit"
- "스킬·커맨드 다영역 적용성 평가"

## When NOT to trigger

- Single-asset edit → use Edit tool directly.
- Authoring a new skill → `skill-author`.
- TDD / test flows → `tdd-first` or `tdd-general`.
- Investigating a bug → `debug-investigator`.
- Refactoring code → `refactoring-strategy`.

## Architecture (see references/architecture.md)

```
Phase A: cohesion-auditor      (global, 1×)
Phase B: per-asset loop        (×N)
   parallel: fe-fit  be-fit  domain-leak  generalizability
   → synthesizer (memo + cohesion signals)
   → asset-reviewer
   ↳ reject → 1 retry → still reject → degraded
   → PROGRESS.md append (orchestrator action)
Phase C: backlog-prioritizer   (global, 1×)
Phase D: artifact write        (orchestrator action)
```

## Workflow

### Step 0 — Runtime re-scan (MANDATORY)

Do NOT trust prior knowledge of the asset set. Re-discover with Glob:

```
skills/*/SKILL.md
commands/*.md
```

Build `asset_list` as a flat list of paths. If empty, stop and report "no assets to audit".

### Step 1 — Generate run id, ensure ./audit/ exists

`run_id` = current ISO timestamp condensed (`YYYYMMDD-HHMMSS`).

Create `./audit/` directory if absent.

### Step 2 — Phase A: Global cohesion

Call `cohesion-auditor` once. Input: `asset_list` + each asset's text (orchestrator Reads each first and passes them).

Store result as `cohesion_signals` (the `clusters` array).

### Step 3 — Phase B: Per-asset loop

Initialize `cross_asset_memo = ""` and `degraded_assets = []`.

For each `asset` in `asset_list`:

1. **Parallel dispatch** to the 4 experts (single message, 4 Agent tool uses):
   - `fe-fit-evaluator`
   - `be-fit-evaluator`
   - `domain-leak-detector`
   - `generalizability-strategist`

   Each receives `{ asset, cross_asset_memo }`.

2. Collect outputs. Compute `relevant_cohesion = cohesion_signals.filter(c => c.assets.includes(asset))`.

3. Call `synthesizer` with:
   ```
   {
     asset,
     fe_fit, be_fit, domain_leaks, generalizability,
     cohesion_signals_relevant: relevant_cohesion,
     cross_asset_memo,
     is_retry: false,
     reviewer_feedback: null
   }
   ```

4. Call `asset-reviewer` with the synthesizer's output.

5. If `pass: false` and not yet retried:
   - Call `synthesizer` ONCE more with `is_retry: true` and `reviewer_feedback: <issues>`.
   - Call `asset-reviewer` again on the new output.
   - If still `pass: false`: mark `degraded: true` for this asset and add to `degraded_assets`.

6. Append `synthesizer.memo_addition` (if non-empty) to `cross_asset_memo` (joined with `\n`).

7. **Orchestrator action — PROGRESS.md append.** Read the file, then Write/Edit to add one line at the end:

   ```
   <ISO 8601 timestamp> | <asset> | fe=<verdict_fe> / be=<verdict_be> / leaks=<count> / third=<comma-joined third_domains>[ / degraded]
   ```

### Step 4 — Phase C: Global backlog

Call `backlog-prioritizer` once with:

```
{
  asset_reports: [<all passed synthesizer outputs>],
  cohesion_clusters: cohesion_signals,
  degraded_assets: degraded_assets
}
```

### Step 5 — Phase D: Write artifacts

Write each file with the Write tool:

- `./audit/report-<run_id>.md` — full per-asset evaluations (see `references/synthesis-template.md`)
- `./audit/backlog-<run_id>.md` — prioritized backlog table (see `references/backlog-scoring.md`)
- `./audit/log-<run_id>.md` — degraded assets, retry counts, agent refusals, runtime notes

### Step 6 — Final message

Report to user:

- Assets evaluated: `<N>` (passed: `<P>`, degraded: `<D>`)
- Top 3 backlog items (rank, scope, change_summary)
- Artifact paths (3 files under `./audit/`)
- Suggested next step: "Read `./audit/report-<run_id>.md` first, then `./audit/backlog-<run_id>.md`."

## Failure handling

| Condition | Action |
|---|---|
| Expert call fails | 1 retry; still fails → that axis marked degraded inside synthesizer input as "missing" |
| Synthesizer fails | 1 retry (per D4); still fails → degraded for that asset |
| Reviewer rejects | 1 re-synthesis (per D4); still rejected → degraded |
| Agent refusal (permission/tool) | Stop the asset, mark degraded, log to `./audit/log-<run_id>.md` |
| All assets degraded | Continue to backlog step but warn user; backlog confidence is low |

## Permissions

All 8 agents are **read-only** (`Read`, `Grep`, `Glob` at most; `synthesizer` and `backlog-prioritizer` get `Read` only). The orchestrator (this skill) is the only writer — touching only:

- `PROGRESS.md` (append one line per asset)
- `./audit/report-<run_id>.md`, `./audit/backlog-<run_id>.md`, `./audit/log-<run_id>.md` (new files)

## Experimental flag

Inter-agent direct messaging is NOT used; the orchestrator mediates all data. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is **not required**.

## References

- `references/axes.md` — 5축 정의·판별 기준
- `references/synthesis-template.md` — per-asset report 마크다운 형식
- `references/backlog-scoring.md` — 우선순위 점수 산정
- `references/architecture.md` — Phase 다이어그램 + 데이터 흐름 + 권한 매트릭스
