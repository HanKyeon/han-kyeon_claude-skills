<s>
**🔀 잘못 진입하셨다면**:
- 스킬 자체에 대한 의견(잘못 떴음·놓침)을 남기고 싶으신가요? → `/cfh-feedback <skill> "<comment>"`로.
- 작업 회고가 아니라 새 작업을 시작하고 싶으신가요? → `/cfh-plan`으로.

이 커맨드는 **방금 완료된 작업의 회고를 영구 기록**합니다.
`효과 있었음 / 실패·삽질 / 다음엔 바꿀 것`의 3섹션 형식이며, `~/.claude/.cfh-logs/retros/`에 저장되어 추후 사람·`cfh evolve`가 참조합니다.

**핵심 원칙**:
- 옵트인. `cfh log --enable` 미실행이면 안내만 하고 영구 기록 안 함 — 세션 내 참고용으로만 노출.
- 직전 작업 컨텍스트 자동 추출 우선. 사용자에게 다시 묻지 않음.
- 형식은 `commands/references/retro-and-commit.md`의 Retro 블록을 따름.
- `/cfh-feedback`과 분리: feedback=스킬에 대한 의견, retro=작업 한 건의 회고.
</s>

<invocation>
작업 회고를 기록합니다.

**인자**: `$ARGUMENTS` — 회고 본문(선택). 비어있으면 직전 컨텍스트에서 자동 추출.

호출 경로:
1. **사용자 명시 호출** — `/cfh-retro` 또는 `/cfh-retro "이번 작업은…"`
2. **Stop 훅 자동 호출** — 직전 턴이 `/cfh-*` 종료였을 때 settings.json 훅이 발동 (자가 판정 후 skip 가능)

</invocation>

<workflow>

## Phase 0 — 발동 자가 판정 (훅 경로일 때만)

Stop 훅에서 호출된 경우, **이번 세션에서 다음 신호가 있어야** 회고 작성 진행:
- `/cfh-plan`·`/cfh-tdd`·`/cfh-refactor`·`/cfh-debug`·`/cfh-review` 중 **하나의 완료 보고**가 직전 turn에 출력됨
- 그 보고에 "Retro" 블록이 이미 채워져 있음 (이걸 영구화하는 것이 이 훅의 목적)

신호 없으면 조용히 종료 (출력 없음).

사용자가 직접 호출(`/cfh-retro`)한 경우 Phase 0 skip — 항상 진행.

## Phase 1 — 컨텍스트 수집

다음 순서로 시도, 첫 성공 시 채택:

1. **`$ARGUMENTS`에 본문이 있으면** 그대로 사용 — 추가 추출 생략.
2. **직전 턴에 Retro 블록이 있으면** 그 블록을 그대로 본문으로 사용.
3. **둘 다 없으면** 사용자에게 한 번 질문:
   > *"방금 작업의 회고를 한 줄씩 알려주세요 — (a) 효과 있었던 것 (b) 실패·삽질 (c) 다음엔."*

작업 메타데이터(아래)는 직전 턴들에서 자동 추출:
- 목표 (Q1)
- 사용 커맨드 (`/cfh-plan` 등)
- 생성·수정 파일 목록
- 일자·시각

## Phase 2 — 옵트인 확인

```bash
cfh log --status
```

### Telemetry: enabled

Phase 3로 진행.

### Telemetry: disabled — 인라인 y/n

```
⚠️ 텔레메트리가 비활성화 상태입니다. 회고 영구 기록을 위해 활성화가 필요합니다.

활성화하면 ~/.claude/.cfh-logs/retros/ 에만 로컬 저장됩니다 — 외부 전송 없음.

지금 활성화하시겠습니까? [y/n]
```

**(y)**: `cfh log --enable` 실행 → Phase 3.
**(n)**: 회고를 세션 컨텍스트에만 유지 + "영구 기록 안 됨" 안내 → 종료.
**무응답**: 다음 기회로 미룸 + 종료.

## Phase 3 — 저장

파일 경로:
```
~/.claude/.cfh-logs/retros/<YYYYMMDD-HHMM>-<slug>.md
```

`<slug>`: Q1 목표를 kebab-case로 변환, 30자 이내 (한국어는 음역 또는 영문 키워드만 추출).
중복 시 뒤에 `-2`·`-3` 추가.

파일 본문 형식:
```markdown
---
date: 2026-04-24T15:38
command: /cfh-plan
goal: <Q1 목표>
files:
  - <경로 목록>
---

## 효과 있었음
- ...

## 실패·삽질
- ...

## 다음엔 바꿀 것
- ...
```

저장 명령:
```bash
mkdir -p ~/.claude/.cfh-logs/retros/
cat > ~/.claude/.cfh-logs/retros/<filename>.md <<'EOF'
<본문>
EOF
```

## Phase 4 — 보고

```
✅ 회고 기록 완료
  파일: ~/.claude/.cfh-logs/retros/<filename>.md
  목표: <Q1>
  섹션: 효과 N · 실패 N · 다음 N

다음 활용:
  - 후속 세션에서 "이전 작업 회고 보여줘" → 이 파일 참조
  - cfh evolve 시 retro 디렉터리 분석 (향후)
```

옵트인 거부 경로면:
```
ℹ 세션 내 참고로만 남김 (영구 기록 안 됨)
  내용은 이 대화 컨텍스트에 유지됩니다.
```

</workflow>

<output_format>

각 Phase 종료 시 짧게 보고:
- Phase 0: 자가 판정 결과 (skip한 경우 출력 없음)
- Phase 1: 추출한 컨텍스트 요약 1~2줄
- Phase 2: 옵트인 상태
- Phase 3: 저장 경로
- Phase 4: 다음 단계 제안

훅 자동 호출이면 출력은 최소화 — 조용히 저장하고 1줄 알림만:
```
✅ retro 저장: ~/.claude/.cfh-logs/retros/<filename>.md
```

</output_format>

<constraints>

- 옵트인 안 된 상태면 절대 영구 기록하지 말 것. 안내만.
- 직전 턴의 Retro 블록 형식·내용을 임의 변경하지 말 것 — 그대로 영구화.
- `$ARGUMENTS`·직전 컨텍스트가 모두 비고 사용자가 무응답이면 기록하지 말고 종료.
- `<slug>` 생성 시 사용자 식별정보·파일 경로 노출 금지 (목표 키워드만).
- 같은 작업에 대해 한 세션 내 2번 이상 호출되면 중복 파일 생성 대신 기존 파일에 append 또는 사용자 확인.
- `/cfh-feedback`과 책임 혼동 금지: 스킬 의견은 feedback, 작업 회고는 retro.

</constraints>
