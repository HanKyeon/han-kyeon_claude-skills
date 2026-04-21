# Claude Code Hook Recipes for `cfh log`

Claude Code의 `settings.json` 훅 시스템으로 `cfh log` 호출을 자동화하여 스킬 사용 패턴을 수동 입력 없이 수집하는 레시피 모음입니다.

> **전제**:
> - `cfh log --enable` 으로 텔레메트리 옵트인 되어 있어야 함
> - Claude Code 0.x+ 에서 `hooks` 기능 지원 (플랫폼 문서 확인)
> - 로그는 로컬 파일(`~/.claude/.cfh-logs/<skill>.jsonl`)에만 기록됨, 외부 전송 없음

---

## 개요

`cfh log`는 기본적으로 **수동 실행**이 필요한 CLI입니다:
```bash
cfh log tdd-first --event trigger --utterance "TDD로 시작" --helpful y
```

이를 매번 치는 대신 Claude Code의 훅에 연결하면, **실제 도구 호출이나 세션 종료 시점에 자동으로 기록**됩니다. 수집된 데이터는 `cfh evolve`가 스킬 개선 제안을 만드는 근거가 됩니다.

---

## 레시피 1 — 세션 종료 시 피드백 요청

가장 단순한 시작점. Claude Code가 대화 세션을 종료할 때 한 번 묻습니다.

**`~/.claude/settings.json`** (또는 프로젝트 `./.claude/settings.json`):
```json
{
  "hooks": {
    "Stop": [
      {
        "command": "echo '이번 세션이 도움이 됐나요? cfh log <skill> --helpful y|n 실행하세요.' >&2"
      }
    ]
  }
}
```

단점: 사용자가 명령을 직접 쳐야 함. **가벼운 알림** 수준.

---

## 레시피 2 — PostToolUse 훅으로 특정 스킬 사용 감지

Claude Code가 특정 스킬·커맨드를 사용한 직후 자동 기록.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Skill",
        "command": "cfh log \"$CLAUDE_SKILL_NAME\" --event trigger --utterance \"$CLAUDE_USER_INPUT\""
      }
    ]
  }
}
```

> ⚠️ 환경변수 `CLAUDE_SKILL_NAME`·`CLAUDE_USER_INPUT`는 Claude Code 훅 스펙에 따라 다를 수 있습니다. 실제 지원 변수는 `/help hooks` 또는 Claude Code 공식 문서를 확인하세요.

**주의**: `$CLAUDE_USER_INPUT`에 민감 정보가 들어가지 않도록 해야 함. 따옴표 이스케이프 필요.

---

## 레시피 3 — Stop 훅으로 마지막 스킬 기록

세션 종료 시 마지막으로 활성화된 스킬을 기록:

```json
{
  "hooks": {
    "Stop": [
      {
        "command": "if [ -n \"$CLAUDE_LAST_SKILL\" ]; then cfh log \"$CLAUDE_LAST_SKILL\" --event success; fi"
      }
    ]
  }
}
```

---

## 레시피 4 — 실패 패턴 감지 (반복 질문·되돌리기)

사용자가 같은 에러를 여러 번 겪거나 "다시 해줘" 같은 재시도 발화를 하면 `miss` 이벤트로 기록:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "(다시|돌아가자|틀렸|undo|retry)",
        "command": "cfh log \"${CLAUDE_LAST_SKILL:-unknown}\" --event miss --utterance \"$CLAUDE_USER_INPUT\" --note \"auto: retry/undo pattern\""
      }
    ]
  }
}
```

---

## 레시피 5 — CI에서 `cfh doctor` 실행

PR 체크에 추가. GitHub Actions 예:

```yaml
# .github/workflows/cfh-check.yml
name: cfh check
on: [pull_request]

jobs:
  doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g @han-kyeon/claude-skills
      - run: cfh install
      - run: cfh validate
      - run: cfh doctor --warn-only    # 경고만, 실패하지 않음
```

`--warn-only` 빼면 경고로도 PR 실패 처리.

---

## 레시피 6 — `cfh evolve` 주간 리포트

cron으로 주 1회 자동 분석 + 슬랙·이메일 전송 (GitHub Actions schedule 예):

```yaml
name: Weekly skill health
on:
  schedule:
    - cron: '0 9 * * MON'    # 매주 월요일 9시

jobs:
  evolve:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
      - run: npm install -g @han-kyeon/claude-skills
      - run: cfh install
      - name: Run evolve
        id: evolve
        run: |
          cfh evolve > evolve-report.txt || true
          echo "report<<EOF" >> $GITHUB_OUTPUT
          cat evolve-report.txt >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
      - name: Send to Slack
        env:
          WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
        run: |
          curl -X POST "$WEBHOOK" -H 'Content-Type: application/json' \
            -d "{\"text\":\"Weekly cfh evolve report:\n\`\`\`${{ steps.evolve.outputs.report }}\`\`\`\"}"
```

---

## 레시피 7 — 프로젝트별 훅 분리

팀 프로젝트에서 공통 훅을 제공하려면 **프로젝트 로컬** `./.claude/settings.json`에 넣고 git commit. 팀원이 clone하면 자동 적용됩니다:

```
my-project/
├── .claude/
│   └── settings.json    # 공통 훅 (모든 팀원에게 적용)
└── ...
```

개인 환경변수(슬랙 webhook 등)는 `.claude/settings.local.json`에 두고 `.gitignore`에 추가.

---

## 설정 검증

```bash
# 훅이 제대로 파싱되는지
cfh doctor

# 텔레메트리 상태 확인
cfh log --status

# 실제 기록이 쌓이는지 (하루 뒤)
cfh doctor --usage
```

---

## 주의사항

1. **환경변수 이름**은 Claude Code 버전에 따라 다릅니다. 공식 문서 또는 `/help hooks`로 확인.
2. **JSON 따옴표 이스케이프**에 주의. 복잡한 shell 명령은 별도 스크립트 파일로 빼는 것을 권장.
3. **프라이버시**: `--utterance`에 사용자 발화 원문이 담기므로, 민감 프로젝트에서는 `--utterance` 제외하고 토큰만 수집하는 별도 래퍼 스크립트를 작성하세요.
4. **훅 실패**가 Claude Code 작업을 방해하지 않도록 `|| true` 또는 에러 핸들링 추가.

---

## 트러블슈팅

- **훅이 실행 안 됨**: `settings.json` JSON 문법 오류 가능. `jq` 또는 `cfh doctor`로 검증.
- **cfh log이 disabled 상태**: `cfh log --enable` 실행 필요.
- **환경변수 비어있음**: Claude Code 버전에서 해당 훅 이벤트·변수를 지원하는지 확인.
- **로그 파일 위치**: `~/.claude/.cfh-logs/<skill>.jsonl`. 없으면 훅이 실행되지 않았거나 비활성화 상태.
