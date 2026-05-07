<s>
**🔀 잘못 진입하셨다면**:
- 스킬 자체에 대한 의견을 남기고 싶다 → `/cfh-feedback <skill> "<comment>"`
- 작업 한 건의 회고를 영구 기록하고 싶다 → `/cfh-retro`
- 새 작업을 시작하고 싶다 → `/cfh-plan`

이 커맨드는 **프로젝트 한 개의 진행 상황(결정 로그·미해결 질문·다음 단계)을 PROGRESS.md에 누적**합니다. 다음 세션·다른 사람·다른 기계에서 이어받기 위한 인계 노트.

**핵심 원칙**:
- **자동 생성 금지.** `/cfh-progress init`로 사용자가 명시적으로 시작.
- **append-only.** 이전 항목 수정·삭제 안 함. 정정은 새 항목으로.
- **요약 모드.** Claude 출력 전부 dump 금지 — 결정·미해결·다음의 3가지로 압축.
- **자동 git commit 금지.** PROGRESS.md 갱신만, commit은 사용자 판단.
- 형식은 `commands/references/progress-template.md` 단일 출처.
</s>

<invocation>
프로젝트 진행 상황을 PROGRESS.md에 기록합니다.

**인자**: `$ARGUMENTS` — 모드(선택). `init` / `append`(기본) / `show`.

호출 경로:
1. **사용자 명시** — `/cfh-progress` (append 기본) 또는 `/cfh-progress init|show`
2. **Stop 훅 자동** — `./PROGRESS.md`가 존재하고 직전 turn에 Retro·결정 신호가 있을 때만

</invocation>

<workflow>

## 모드: init

새 PROGRESS.md 생성. **이미 존재하면 거절**(덮어쓰기 위험).

### 단계

1. `./PROGRESS.md` 존재 검사 — 있으면 "이미 존재합니다. append 모드를 사용하거나 직접 편집하세요" 후 종료.
2. 프로젝트 이름 추출:
   - `package.json`의 `name` (있으면)
   - 없으면 현재 디렉터리 basename
3. 템플릿 채우기 (`commands/references/progress-template.md` 형식):
   - frontmatter: `project`, `created` (now ISO), `last_updated` (now ISO), `sessions: 0`
   - 빈 4 섹션 (다음 단계 / 미해결 / 결정 로그 / 세션 로그)
4. `./PROGRESS.md` 작성.
5. 사용자에게 완료 보고:

```
✅ PROGRESS.md 생성됨
  경로: ./PROGRESS.md
  프로젝트: <name>
  
다음 단계:
- 첫 결정·미해결 질문이 있다면 /cfh-progress 로 추가
- git에 커밋해 팀원과 공유 가능
```

## 모드: append (기본)

직전 turn의 Retro·결정·다음 단계를 PROGRESS.md에 prepend.

### 단계

1. `./PROGRESS.md` 존재 확인 — 없으면 "PROGRESS.md가 없습니다. /cfh-progress init 먼저 실행하세요" 후 종료.
2. 추출 대상 (직전 assistant turn에서):
   - **결정**: "📝 제안 커밋", "결정", "Decision", "이대로 진행" 답변, 새 PR/커밋
   - **다음 단계**: "다음 단계:", "Next:", 미완료 task list, "남은 작업"
   - **미해결 질문**: "❓ Questions to Resolve", "확인 필요", "사용자 답변 대기"
   - **세션 ID**: transcript 파일명 첫 8자
3. 사용자에게 추출 결과 1차 확인:

```
🔎 PROGRESS.md에 추가할 항목을 추출했습니다 — 맞으면 yes, 수정하면 항목 지적해 주세요.

새 결정:
  - 2026-04-25 14:32 — <topic>
    결정: <한 줄>
    이유: <…>

새 다음 단계:
  - [ ] <…>

새 미해결:
  - ❓ <…>  (없으면 생략)

세션 로그 추가:
  - 2026-04-25 14:32 (session XXXXXXXX) — <한 줄 요약>
```

4. 사용자 승인 후 PROGRESS.md 갱신:
   - "결정 로그" 최상단에 새 결정 prepend
   - "다음 단계" 섹션 끝에 새 체크박스 append (이전 미완료는 유지)
   - "미해결 질문" 섹션 끝에 append
   - "세션 로그" 최상단에 새 세션 항목 prepend
   - frontmatter `last_updated` 갱신, `sessions` +1
5. 보고:

```
✅ PROGRESS.md 갱신됨
  결정 추가: N개
  다음 단계 추가: N개  (전체 미완료: M개)
  미해결 추가: N개
  세션 로그 추가: 1개

다음 단계:
- 변경사항을 git에 커밋하시겠습니까? (사용자 명시 yes 필요 — 자동 commit 안 함)
```

## 모드: show

PROGRESS.md를 stdout으로 출력 + 진척률 요약.

### 단계

1. `./PROGRESS.md` 존재 확인 — 없으면 init 안내.
2. 본문 그대로 출력.
3. 마지막에 한 줄 요약:

```
📊 진척률: 다음 단계 7개 중 3개 미완료. 결정 12건. 미해결 2건. 누적 7 sessions.
```

## Phase 0 — Stop 훅 자가 판정 (훅 경로일 때만)

훅에서 호출됐다면, 다음 **모두** 충족해야 append 모드로 진입:

1. `./PROGRESS.md`가 이미 존재 (자동 생성 안 함)
2. 직전 assistant 메시지에 다음 중 하나
   - `🔄 Retro` 블록
   - `결정`·`Decision` 섹션
   - 명시적 `/cfh-progress` 호출 흔적
3. 텔레메트리 옵트인 활성 (`cfh log --status`가 enabled)

조건 미충족이면 silent 종료. 사용자 호출(`/cfh-progress`)이면 Phase 0 skip.

</workflow>

<output_format>

각 모드 종료 시 보고:
- **init**: PROGRESS.md 생성 경로 + 다음 단계 안내
- **append**: 추가 항목 수 요약 + git commit 권유 (자동 안 함)
- **show**: 본문 + 진척률 한 줄

훅 자동 호출이면 출력 최소화 — 1줄 알림만:
```
✅ PROGRESS.md 갱신: 결정 N · 다음단계 N · 세션 1
```

</output_format>

<constraints>

- `./PROGRESS.md`가 없을 때 append·show 거절. init 안내만.
- init은 기존 PROGRESS.md를 **절대 덮어쓰지 않음**. `--force` 같은 옵션도 제공 안 함 (영구 데이터 손실 위험).
- append는 **사용자 1차 확인** 필수. 추출 결과를 먼저 보여주고 yes/adjust.
- 자동 commit 금지. 갱신 후 commit 권유는 하되 사용자가 명시 yes 후 진행.
- frontmatter는 항상 `last_updated` 갱신. `sessions` 카운터는 append마다 +1.
- 민감 정보(키·토큰·내부 URL) 포함 시 사용자에게 "민감 정보 같음. 마스킹할까요?" 한 번 물음.
- Retro·feedback과 책임 분리: feedback=스킬, retro=작업, progress=프로젝트.
- 형식은 `commands/references/progress-template.md` 단일 출처.

</constraints>
