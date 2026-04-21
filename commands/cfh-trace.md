<s>
이 커맨드는 **어떤 발화가 어느 스킬을 트리거할지 시뮬레이션**합니다.
`~/.claude/skills/`와 `./.claude/skills/`에 설치된 스킬들의 frontmatter description을 스캔해서,
입력된 발화와 가장 매칭도가 높은 스킬 상위 5개를 점수 순으로 보고합니다.
</s>

<invocation>
발화 시뮬레이션을 시작합니다.

**인자**: `$ARGUMENTS` — 시뮬레이션할 발화(선택).

- 비어있으면 사용자에게 "어떤 발화의 트리거를 확인하시겠습니까? 예: '리팩터링 해줘', '새 스킬 만들어 주세요'"로 질문한 뒤, 답변 받은 발화로 진행.
- 값이 있으면 그대로 시뮬레이션 대상.
</invocation>

<workflow>

## Step 1 — 발화 수집

사용자 입력(`$ARGUMENTS` 또는 재질문 답변)을 그대로 사용. 따옴표는 벗겨서 원문만 전달.

## Step 2 — CLI 우선 실행

CLI가 설치되어 있으면 `cfh trace`로 실행하고 **출력을 그대로 사용자에게 보여주세요**:

```bash
cfh trace "<사용자 발화>" --top 5
```

실행 후:
- 상위 5개 스킬의 점수와 매칭 키워드를 확인
- 경합 상황(여러 후보가 점수 비슷)이면 반-트리거 조정을 제안

## Step 3 — CLI 없을 때 Fallback (직접 스캔)

`cfh`가 없으면 Claude가 직접 스캔:

1. **스킬 위치 확인**: `Glob`으로 `~/.claude/skills/**/SKILL.md`, `./.claude/skills/**/SKILL.md`
2. **frontmatter 파싱**: 각 `SKILL.md`의 `description` 필드 추출
3. **키워드 매칭**:
   - 발화를 2글자+ 토큰으로 분리 (한글/영문/숫자)
   - description을 "positive" (Do NOT trigger 앞) vs "negative" (뒤)로 분리
   - positive 히트: +2점 / negative 히트: -3점 / 부분 일치: +0.5점
4. **상위 5개 보고**:
   ```
   ✓ global/refactoring-strategy   score=4.0   hits: refactor, cleanup
   ✓ global/skill-author           score=2.5   hits: 스킬
   · global/tdd-first               score=0.0
   ```

## Step 4 — 결론 해석

사용자에게 한 줄 요약:
- 점수 1개만 양수 → "이 발화는 `<name>` 스킬을 트리거할 가능성이 높습니다."
- 여러 개 경합 → "`A`와 `B`가 경합합니다. 원하는 스킬이 아니라면 description의 반-트리거 절에 상대 키워드를 추가하세요."
- 전부 0 이하 → "트리거될 스킬이 없습니다. 의도한 스킬의 description에 핵심 키워드를 추가하는 것을 고려하세요."

## Step 5 — 개선 제안 (선택)

점수가 기대와 다르면 사용자에게 제안:
- **오발동**: "A 스킬의 description 'Do NOT trigger for ...' 절에 'B 관련 키워드' 추가를 제안합니다."
- **미발동**: "A 스킬의 description에 사용자 발화의 핵심 토큰(`<token>`)을 추가하는 것이 좋겠습니다."

제안 적용은 사용자 승인 후 `Edit` 도구로만 수행하세요.

</workflow>

<output_format>

```
🔎 Trigger Trace

발화:  "<원문>"
토큰:  [token1, token2, ...]
스캔:  <N>개 스킬

| 순위 | 스코프 | 스킬 | 점수 | 매칭 키워드 |
|---|---|---|---|---|
| ✓ | global | refactoring-strategy | 4.0 | refactor, cleanup |
| ✓ | global | skill-author | 2.5 | 스킬 |
| · | project | my-custom | 0.0 | — |

결론: <한 줄 해석>

(선택) 개선 제안:
- <제안 1>
- <제안 2>
```

</output_format>

<constraints>
- 사용자 발화 원문은 수정하지 말고 **그대로 넘기세요**.
- 개선 제안을 실제 파일에 반영할 때는 반드시 사용자 승인 후 `Edit`.
- 점수는 참고용이며, Claude Code의 실제 트리거 결정은 컨텍스트 전체를 고려합니다. 이 점을 사용자에게 명시하세요.
- 한국어 설명, 스킬 이름과 키워드는 원문 그대로.
</constraints>
