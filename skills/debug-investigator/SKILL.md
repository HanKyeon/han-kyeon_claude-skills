---
name: debug-investigator
description: |
  Use this skill when the user describes a symptom or error but does NOT yet
  know the root cause — keywords: "원인 모르겠다", "뭐가 잘못됐는지", "이상한데",
  "stack trace", "exception", "production error", "500 에러", "배포 후 깨짐",
  "버전 올린 뒤 안 됨", "regression after deploy", "p95 spike", "메모리 누수",
  "CPU 치솟아", "장애 났다", "인시던트", "incident", "디버깅 도와줘",
  "같이 조사하자", "원인 찾아보자". Activates the `/cfh-debug` 5-phase
  evidence-driven investigation (Evidence → Context → Hypotheses → Verification →
  Fix Plan). Supports bug / incident / performance / regression types. Do NOT
  trigger when the user already knows the root cause and just wants to write
  a fix (use `/cfh-tdd` or `/cfh-plan`), for routine refactoring
  (use `/cfh-refactor`), for writing new features (use `/cfh-tdd` or
  `/cfh-tdd-gen`), or for simple one-shot questions without investigation need.
commands: [/cfh-debug]
---

# Debug Investigator


## 트리거 조건 (1.0 컨벤션 — 본문 참고용, frontmatter description이 권위)

```
TRIGGER:  증상은 알지만 원인을 *모르는* 상황 — '원인 모르겠다', 'stack trace',
          '500 에러', '배포 후 깨짐', 'p95 spike', '인시던트'.
SKIP:     원인 *알고* 있고 수정만 — tdd-* 또는 cfh-plan. 루틴 리팩터 → refactoring-strategy.
EXAMPLES:
  - '배포 후 500 에러 — 원인 모름' → 5 Phase Evidence-driven investigation
  - 'p95 spike' → Performance 가설 prioritization
```
**원인이 불분명한 증상·에러**에서 출발해 체계적으로 근본 원인을 찾는 조사 스킬입니다. 이 스킬은 `commands/cfh-debug.md`의 5 Phase 워크플로를 활성화하는 **자동 트리거 진입점**입니다.

## 활성화 시 반드시

1. **증거부터, 가설은 그 뒤.** 확증 편향 방지 — 사용자의 가설을 먼저 검증하려 들지 말 것.
2. **최소 3개 가설 강제.** 1개로 수렴하면 "확증 편향 위험" 경고 후 추가 가설 요청.
3. **근본 원인 입증 없이 수정 계획 금지.** 재현 로그·git bisect·측정값 등 증거 체인 필수.
4. **/cfh-debug 커맨드 파일을 따른다.** 활성화 즉시 `~/.claude/commands/cfh-debug.md`의 Phase 0~4 워크플로를 수행.
5. **수정은 위임.** Phase 4 결과를 `/cfh-plan`·`/cfh-tdd`·`/cfh-refactor`로 넘김.
6. **(z) 모르겠음 fallback.** 각 질문에 `(z) 모르겠음` 기본 탑재 — `~/.claude/skills/asset-factory/references/unknown-answer-playbook.md`.

## 활성화 시 첫 응답

자동 트리거됐다는 사실을 사용자에게 짧게 알림:

```
🔎 debug-investigator 스킬이 활성화됐습니다. 증상 주도 조사로 진행합니다.
(원인을 이미 아시거나 단순 수정만 원하신다면 "조사 건너뛰기"라고 말씀해 주세요 — /cfh-plan 또는 /cfh-tdd로 안내드립니다.)
```

그 후 `/cfh-debug` 커맨드의 Phase 0 (Evidence Gathering)부터 수행.

## /cfh-debug 커맨드와의 관계

- **자동 트리거** → 이 스킬 활성화 → Phase 0부터 시작
- **`/cfh-debug` 명시 호출** → 커맨드 파일의 `<invocation>`으로 진입 → 동일한 Phase 0부터 시작
- 둘은 **같은 워크플로**를 공유합니다. 단지 진입 경로가 다를 뿐.

## 타 스킬과의 경계

- **`tdd-first` / `tdd-general`**: 사용자가 **수정할 코드를 이미 안다**면 tdd 계열. 이 스킬은 **조사 단계**만 담당.
- **`refactoring-strategy`**: 행동 보존 구조 개선. 이 스킬은 **원인 규명 + 수정 계획**까지.
- **`/cfh-plan`**: 목표 주도 작업 dispatcher. 이 스킬은 **증거 주도**.

경합하면 아래 규칙으로 구분:
- 사용자가 **증상·에러·stack trace**를 붙이며 "왜 이런지 모르겠다" → debug-investigator
- 사용자가 **고칠 대상과 방법**을 말하며 "이렇게 고치자" → tdd-first/plan/refactor

## 조사 완료 후 다음 단계

Phase 4 수정 계획 카드 출력 후 반드시 위임 안내:

```
다음 단계:
- 정식 수정 → /cfh-plan "<근본 원인 수정 목표>"
- 회귀 테스트 우선 → /cfh-tdd 또는 /cfh-tc-gen <파일>
- (장애 경우) Post-mortem → POSTMORTEM.md 초안
- 조사 과정 기록 → DEBUG-LOG.md 또는 Issue 업데이트
- 이번 조사 피드백 → /cfh-feedback debug-investigator "<comment>"
```

## 자주 하는 실수

| 실수 | 대응 |
|---|---|
| 증거 수집 생략하고 바로 가설 | Phase 0 강제 준수 — 증거 카드 없이 Phase 1 진입 금지 |
| 가설 1개로 수렴 | 최소 3개 강제. 추가 가설 못 내면 사용자에게 요청 |
| 수정까지 이 스킬에서 직접 | 금지. Phase 4는 **계획만** — 실제 수정은 위임 |
| 장애에서 조사 먼저 | rollback 가능 + 고심각도면 **rollback 먼저** 권고 |
| 조사 기록 없음 | `DEBUG-LOG.md` 또는 Issue에 Phase별 카드 보존 권장 |
