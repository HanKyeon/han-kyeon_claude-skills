<s>
이 커맨드는 **스킬 사용 중·후 자발적 피드백을 기록**하는 가벼운 인터페이스입니다.
`cfh log`의 확장으로, 피드백 내용이 `~/.claude/.cfh-logs/<skill>.jsonl`에 저장되어 추후 `cfh evolve`의 분석에 반영됩니다.

**사용 시점**:
- 어떤 스킬이 떠야 할 때 안 떴음 — miss 기록
- 스킬이 잘못 떴음 — false trigger 기록
- 스킬 동작 중 불편 — friction 기록
- 스킬이 잘 작동해서 칭찬 — positive 기록

**핵심 원칙**:
- 옵트인 — `cfh log --enable` 미실행 시 안내만 출력하고 기록 안 함
- 로컬 전용 — `~/.claude/.cfh-logs/`에만 저장, 외부 전송 없음
- `cfh evolve`가 이 기록을 보고 description·반-트리거 개선 제안 생성
</s>

<invocation>
스킬 피드백을 기록합니다.

**인자**: `$ARGUMENTS` — `<skill-name> "<comment>"` 형식

예시:
- `/cfh-feedback tdd-first "테스트 보강만 원했는데 TDD 모드로 들어갔음"`
- `/cfh-feedback refactoring-strategy "Scope Q3에서 옵션 (a)(b)(c)가 모호했음"`
- `/cfh-feedback skill-author "잘 작동했음. Phase 1 인터뷰가 꽉 짜여 있음"`

파싱 규칙:
1. 첫 토큰을 `<skill-name>`으로 인식
2. 나머지를 따옴표째로 `<comment>`로 사용 (따옴표 없어도 OK)
3. `<skill-name>` 누락 시 사용자에게 "어느 스킬에 대한 피드백인가요?" 질문
4. `<comment>` 누락 시 사용자에게 "구체적으로 무엇이 어떠셨나요?" 질문

</invocation>

<workflow>

## Step 1 — 옵트인 확인

```bash
cfh log --status
```

`Telemetry: disabled`이면:
```
⚠️ 텔레메트리가 비활성화 상태입니다. 피드백을 기록하려면:

  cfh log --enable

활성화 후 다시 /cfh-feedback을 실행하시면 됩니다.
```

활성화 상태이면 Step 2로.

## Step 2 — 분류 (선택)

피드백을 자동 분류합니다 (Claude 추론):
- `comment`에 "안 떴음"·"못 잡음"·"miss" → `--event miss`
- `comment`에 "잘못 떴음"·"오발동" → `--event miss`(반대 방향)
- `comment`에 "잘 작동"·"좋음"·"good" → `--event success` + `--helpful y`
- `comment`에 "불편"·"막힘"·"이상" → `--event trigger` + `--helpful n`
- 그 외 → `--event trigger` (중립)

분류 결과를 사용자에게 한 줄 보고하고 진행:
```
🔎 분류: miss / 만족도: not-helpful — 이대로 기록합니다.
```

## Step 3 — 기록

```bash
cfh log <skill-name> --event <classified-event> --note "<comment>" [--helpful y|n] [--utterance "<발화>"]
```

가능하면 `--utterance` 파라미터도 채움 (사용자가 어떤 상황·발화에서 이 피드백을 남기는지). 사용자 직전 발화에서 추출하거나 명시 질문.

## Step 4 — 반영 안내

```
✅ 피드백 기록 완료
  스킬: <skill-name>
  분류: <event> / 만족도: <helpful>
  파일: ~/.claude/.cfh-logs/<skill-name>.jsonl

다음에 `cfh evolve <skill-name>` 실행 시 이 피드백이 분석 결과에 반영됩니다.
```

</workflow>

<output_format>

각 Step 종료 시 짧게 보고:
- Step 1: 옵트인 상태 (활성/비활성)
- Step 2: 분류 결과 + 사용자 확인
- Step 3: 기록 명령 실행 결과
- Step 4: 반영 안내 + 다음 단계 제안

</output_format>

<constraints>
- 옵트인 안 된 상태면 절대 기록하지 말 것. 안내만.
- comment를 사용자 동의 없이 변형하지 말 것 (분류는 메타데이터로만 추가, 본문은 원문 유지).
- 분류가 모호하면 사용자에게 (a)/(b)/(c) 옵션으로 재질문.
- 한 번에 한 스킬 한 피드백. 여러 스킬·여러 피드백은 분리 호출.
</constraints>
