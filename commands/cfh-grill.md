<s>
**전제**: 이 커맨드는 Claude Code 환경에서 동작. 코드는 결정에 *사용하지 않고* 추천의 이유 컨텍스트로만 (선택적으로) 참조합니다 — 결정은 항상 사용자에게 묻기.

**구조**: `/cfh-grill` 커맨드는 `grilling` 스킬의 명시 호출 입구입니다. 자동 트리거(발화 기반 활성화)는 스킬의 description이 처리, 이 커맨드 파일은 호출·인자 라우팅에 집중. 본체 워크플로 정의는 `~/.claude/skills/grilling/SKILL.md`.

**🔀 잘못 진입하셨다면**:
- 새 plan을 처음부터 짜고 싶다 → `/cfh-plan`
- 자산(skill/command/team)을 만들고 싶다 → `/cfh-make`
- 버그·장애 원인 조사 → `/cfh-debug`
- 작업 회고 → `/cfh-retro`

이 커맨드는 **기존 plan·design·결정을 깊이 파는 인터뷰**입니다. mattpocock의 grilling를 cfh 프로젝트 가치에 맞게 어댑테이션 — 한 번에 한 질문 + 추천+이유 + 사용자 의도 우선 + 결정 트리 walk.

**핵심 원칙**:
- **한 번에 한 질문.** 일괄 폼 금지.
- **항상 추천 + 이유.** "어떻게 생각하세요?"는 빈 질문 — 사용해선 안 됨.
- **사용자 의도 우선.** 결정은 항상 사용자에게 묻기. 코드는 *현재 상태*이지 *미래 의도*가 아님 — 사용자 답이 코드와 다를 수 있음. 코드는 추천 이유의 컨텍스트로만 (선택적으로) 인용.
- **결정 트리부터 보여주기.** 사용자가 가지치기할 기회 제공 후 grill 시작.
- **종료 조건 명시.** 트리 소진·"enough"·추측 영역 진입 시 종료.

상세 형식: `commands/references/recommendation-pattern.md`.
</s>

<invocation>
plan·design 깊이 파기를 시작합니다.

**인자**: `$ARGUMENTS` — grill 대상 (선택). plan / 설계 / 목표 / topic 어떤 형태든 가능.

**처리 규칙 (명시적 위임 원칙)**:
- 인자 있음 → 그 인자를 topic으로 Phase 0 진입
- 인자 없음 → **항상** 한 질문: *"이 grill의 plan·목표는? 한 문장으로."* 사용자 답을 받은 다음 turn에 그 답을 topic으로 진입
- **자동 컨텍스트 흡수 안 함** — 직전 turn에 무엇이 있든 사용자가 명시 인자/답변을 줘야 진행 (0.14.6 ambiguous 응답 원칙과 일관)

**예시 인자**:
- `/cfh-grill 쿠폰 검증 plan` — 구현 예정 기능 (greenfield 가능)
- `/cfh-grill auth flow 재설계` — 추상 목표 (greenfield)
- `/cfh-grill src/legacy/payment 리팩터` — 기존 코드 대상

호출 경로:
1. **명시 호출 (인자 직접)** — `/cfh-grill <topic>` 또는 `/cfh-grill`
2. **`/cfh-plan`의 (grill) 옵션 위임** — `/cfh-plan`이 컨텍스트를 인자로 직렬화해 명시 호출 명령을 출력 → 사용자가 그 명령을 그대로 실행. 인자 + 직전 turn의 handoff 블록을 컨텍스트로 사용. **/cfh-grill이 자동으로 직전 turn을 흡수하지 않음** — `/cfh-plan` 측이 명시 핸드오프.

(주: 슬래시 커맨드 정의는 자동 발동되지 않음. "grill me"·"stress-test"·"진짜 이거 맞아?" 발화는 `/cfh-plan` 등 다른 커맨드의 **라우팅 힌트** — 그쪽이 `/cfh-grill 호출 권장`을 출력함. skill 자체의 자동 트리거는 grilling SKILL.md의 description으로 처리.)

</invocation>

<workflow>

## Phase 0 — Input capture (명시 인자만)

**핵심 원칙**: 자동 컨텍스트 흡수 안 함. 인자 또는 사용자 답변만이 grill 대상 결정.

| 입력 | 처리 |
|---|---|
| `$ARGUMENTS` 인자 있음 + 기존 코드 대상 (예: `src/legacy/foo 리팩터`) | mini Pre-scan (아래 규칙) — 코드 도메인 파악 후 Phase 1 |
| `$ARGUMENTS` 인자 있음 + 신규 기능·추상 목표 (예: `쿠폰 검증 추가`, `auth 재설계`) | **Pre-scan skip** — decision-tree.md template 기반 enumerate, Phase 1 |
| `/cfh-plan` (grill) 위임으로 호출 (인자 + 직전 turn에 명시 handoff 블록) | 인자 = 핵심 topic, handoff 블록 = 추가 컨텍스트. Phase 1 진입 |
| 인자 없음 | **한 질문**: "이 grill의 plan·목표는? 한 문장으로." 사용자 답 받기 전엔 Phase 1 진입 금지 |
| 인자·답이 광범위 ("결제 쪽", "auth 관련", "프론트 좀") | **카테고리 트리 enumerate 금지.** 한 번 더 좁히는 질문: "구체적으로 어떤 결정·plan을 grill할까요? (예: 결제 실패 시 retry 정책 / 카드 토큰 저장 전략 / 멱등성)". 사용자가 좁힌 후에만 Phase 1 진입. |

**mini Pre-scan 규칙** (기존 코드 대상일 때만, E. review 반영):
- **목적**: 결정 지점을 *enumerate*하기 위한 도메인 파악만. **답을 찾는 것 아님.**
- **상한**: CLAUDE.md (관련 섹션만) + package.json (deps만) + topic-related **최대 3 파일** (각 100줄까지).
- **사용 방식**: 트리 노드 추출용 컨텍스트로만. 추천 이유에 [verified]로 인용 가능하되, **결정은 여전히 사용자에게**.
- **금지**: 광범위한 Glob·전체 디렉터리 Read. 토큰 낭비 + "사용자 의도 우선" 원칙과 충돌.

**Greenfield (신규 기능·추상 목표)**:
- Pre-scan skip
- decision-tree.md의 FE/BE/refactor 템플릿에서 topic 키워드 매칭으로 후보 enumerate
- 추천 이유는 [inferred]·[guessed] 위주 (코드 [verified] 없음)
- 사용자 답이 거의 모든 결정의 신호 → grill이 더 강하게 작동

Phase 0가 끝나면 가능한 한 많은 결정 지점을 enumerate. **최소·최대 없음** — plan 크기에 따라 자연스럽게.

- 작은 plan (예: 함수 한 개 rename) → 2~3 노드도 정상. "얕은 plan" 신호.
- 중간 plan → 5~10 노드 흔함.
- 큰 architecture 결정 → 15+ 노드 가능. 그 경우 Phase 1에서 **카테고리별 묶음**으로 사용자에게 보여주기 (state·UX·테스트·migration 등).

노드 수가 2 이하면 Phase 1에서 "얕은 plan — grill 가치 낮음, /cfh-plan 또는 직접 실행 권장" 옵션 제시.

## Phase 1 — Decision tree 보여주기

`skills/grilling/references/decision-tree.md`의 전형 트리에서 컨텍스트에 맞는 후보 추출. **카테고리별 템플릿**:
- **FE 기능**: state·data flow·error UX·validation·caching·a11y·testing
- **백엔드 기능**: API contract·auth·data layer·caching·idempotency·observability·rate limit
- **Refactor**: scope·behavior preservation·safety net·migration strategy·blast radius

대상이 백엔드·refactor·인프라면 decision-tree.md의 해당 섹션 참조. 아래 예시는 FE 기능 plan용:

```
🌳 Decision tree (grill 후보 — FE 기능 예시)

1. State 위치                  ← unresolved   사유: 새 컴포넌트가 사용자 입력 보관
2. Data flow                   ← blocked by #1  사유: 부모-자식 props 흐름 결정 필요
3. Error UX                    ← blocked by #2  사유: 검증 실패 시 사용자 피드백
4. Loading UX                  ← blocked by #2  사유: 비동기 검증 fetch 진행 상태
5. Validation 위치              ← unresolved   사유: client·server 어디서 검증할지
6. 회귀 테스트 전략              ← blocked by #1·#5  사유: unit·integration 결정

제외된 후보 (자가검증):
  - Caching TTL — Q3 out-of-scope에 "성능 최적화 제외" 명시됨
  - Accessibility (ARIA) — 사용자 Q3에 "이번 PR은 a11y 별도" 명시
  - 코드 splitting — 단일 컴포넌트 추가, 영향 없음

📌 추천 walk 순서: 1 → 5 → 2 → 3·4 → 6
   이유: #1·#5가 독립 root. 나머지는 의존 chain.

**Default = 전체 walk** — 단, default는 *사용자가 명시 확인*해야 발효. LLM이 자체적으로 default 적용 금지.

가지치기·진행은 **사용자의 명확한 답변이 있을 때만**:
  - "전체 walk" / "다 가자" / "yes 진행" → 전체 walk 시작
  - "#7 a11y는 별 PR로 분리" / "#3·#4 제외" → 명시된 가지 제외 후 진행
  - "OK" / Enter / "응" / 짧은 동의 / 침묵 → **대기**. ambiguous response이지 명확한 동의 아님. 사용자가 트리 보고 생각 중일 수도 있음.
  - 사용자가 다시 말할 때까지 **자동 진행 금지**.
```

**TURN BOUNDARY**: 트리 카드 출력 후 응답 종료. 사용자의 명확한 답변(전체 walk / 가지치기 / 다른 plan)을 받은 다음 turn에서만 Phase 2 진입. 짧은 응답이나 침묵은 동의로 해석하지 말 것 — 명확한 의사 표현이 들어와야 진행.

## Phase 2 — Sequential interrogation (multi-turn 루프)

Phase 2는 **사실상 multi-turn 루프**. Step이 순차로 보이지만 실제 흐름:

```
[turn N]    Step 1 (질문 출력) → STOP
[turn N+1]  Step 2 (사용자 답 반영) → Step 3 (다음 노드 결정) → Step 1 (새 질문) → STOP
[turn N+2]  ...
```

각 turn은 **반드시 Step 1의 질문 출력으로 끝나고 사용자 답을 기다림**. resolved 안 된 노드를 순서대로:

### Step 1 — 사용자에게 묻기 (추천+이유 포함)

**핵심 원칙**: grill은 **사용자 의도**를 명확히 하는 작업. 코드 현황은 *현재 상태*일 뿐 *미래 의도*가 아님 — 같은 결정이라도 사용자 답이 코드와 다를 수 있음. 따라서 **결정은 항상 사용자에게 묻기**.

**코드는 추천 이유의 컨텍스트로만** 활용:
- ❌ "코드에 zustand 있으니까 결정 #1: zustand로 자동 resolve" — *금지*
- ✅ "코드에 zustand 있음 [verified] → 일관성 측면에서 zustand 추천. 다만 새 기능엔 다른 선택지도 가능, 사용자 의도 확인" — *권장*

차이: 코드는 **추천의 이유 근거**, 사용자 답이 **결정**.

```
❓ Q<n>: <한 문장 질문>

📌 추천: <답>
   이유:
     - [verified] <Q3 또는 코드 인용>
     - [inferred] <합리적 추론>
     - [guessed] <약한 신호 — 사용자 확인 권장>

다른 옵션:
   - <B> — <조건>일 때 적합
   - <C> — <조건>일 때 적합

답변: yes / B / C / 다른 의견 / pass (보류) / explain <옵션> (해당 옵션 confidence·신호 자세히)
```

**옵션 자세히 — lazy load**: 다른 옵션의 `[verified]/[inferred]/[guessed]` 신호는 *매 turn 출력 안 함* (사용자 인지 부담↓). 사용자가 *"왜 B 옵션이 추천 안 됐는지"* 압박 받을 때만 `explain B` / `explain C`로 요청. 그 turn에서 해당 옵션의 신호 단락을 추천과 같은 형식으로 출력.

**용어 구분** (Phase 1 가지치기 skip과 다름):
- Phase 1 **skip** = 가지 자체 제외 (트리에서 빠짐)
- Phase 2 **pass** = 이번 turn 답 보류 (노드는 unresolved 유지, 나중에 다시 시도 가능)

### 🛑 TURN BOUNDARY (필수)

**Step 1의 질문 출력 후 즉시 응답 종료.** 다음 모두 금지:

- 같은 응답 안에서 Step 2·3 진행 금지
- 같은 응답 안에서 다음 노드 미리 보기 금지
- 같은 응답 안에서 다른 질문 묶어 보내기 금지
- "혹시 이것도 답해주실래요?" 같은 추가 질문 금지

**사용자 답변을 받기 전까지 Phase 2의 다음 step은 다음 turn에서**. 라운드 카운터를 증가시킨다 (Phase 3에서 진행 정보 표시용).

### Step 2 — 답변 반영 (사용자 답변을 받은 다음 turn에서)

- 답이 추천과 같음 → "✓ #N: <답>" 트리 갱신
- 답이 다름 → "✓ #N: <사용자 답> (추천: <추천> 대신 사용자 결정 — <간단 이유 메모>)"
- 답에서 새 sub-decision 발생 → 트리에 추가
- "pass" / "보류" → 노드는 unresolved 유지, 다음 노드로 이동 (나중에 다시 grill 가능)
- **"explain <옵션>"** → 해당 옵션의 confidence 신호를 추천과 같은 형식(`[verified]/[inferred]/[guessed]`)으로 출력 + 같은 질문을 *재출력* (트리 unresolved 유지, 사용자가 정보 보고 다시 답변). 노드 진행 안 함.
  ```
  💡 <옵션 B> 자세히:
     이유:
       - [verified] <근거 1>
       - [inferred] <근거 2>
       - [guessed] <근거 3>

  ❓ Q<n>: <같은 질문 재출력>
  답변: yes / B / C / pass / explain <다른 옵션>
  ```

### Step 3 — 다음 노드

unresolved 노드 남아있으면 Step 1로 회귀 (다음 turn에서).

## Phase 3 — Convergence

**핵심 원칙**: grill 깊이는 **무제한**. 자동 종료는 *사용자 의지가 명시될 때*만. mattpocock 원본의 *"relentlessly"* 정신.

종료 조건 (LLM 자동 판단 가능):

| 조건 | 종료 신호 |
|---|---|
| 모든 노드 resolved 또는 skipped | "✅ Grill 종료 — 트리 소진" |
| 남은 노드 모두 [guessed]만 가능 | "✅ Grill 종료 — 추측 영역 진입 (정보 부족)" |
| plan 자체에 균열 발견 | "⚠ Plan 재검토 필요 — /cfh-plan으로 복귀 권장" |

종료 조건 (사용자 명시 — 자동 종료 안 함):

| 트리거 | 종료 신호 |
|---|---|
| "enough" / "그만" / "충분" | "✅ Grill 종료 — 사용자 명시" |
| "시간 없어" / "급함" / "여기서 끊자" | "✅ Grill 종료 — 사용자 시간 제약" |

**라운드 카운터 = 정보 표시만**: 매 질문 시작 시 `라운드 N (누적)` 표시. 깊이를 인지하게 하되 **자동 종료 트리거 아님**. 사용자가 "12라운드 됐는데 계속 갈까?" 같은 판단을 할 수 있도록 정보 노출.

```
❓ Q<n> [라운드 12]: <질문>

📌 추천: ...
```

자동 cap이 없으니 **사용자 토큰 예산 책임은 사용자에게**. 비용 사후 확인은 `cfh cost --days 1`.

종료 보고 직전에 **Final Intent Confirm** 수행 (→ `commands/references/final-confirm.md`):

```
📋 최종 의도 해석 (Final Intent Confirm — Grill 종료 직전)

트리 결정 모음 (각 답변 짧게 인용):
  - #1 <decision>: "<사용자 답 인용>" → <Claude 해석>
  - #2 <decision>: "<인용>" → <해석>
  - ...

모호 발화 해석:
  - "<원 발화>" → <채택 의미>. <다른 가능 의미>면 정정.
  - (감지 없으면 "감지된 모호 발화 없음")

답변 간 충돌·gap:
  - <발견 시 표기 — 예: "#3 답이 #1 답과 충돌">
  - (또는 "충돌 없음")

미해결 노드: <개수> — Grill 종료 보고에서 명시.

✅ 검증 게이트:
  - 결정 chain 정합 (앞 결정이 뒤 결정의 전제로 사용됨)
  - 미해결 노드 *이유* 명시 (skip / 정보 부족 / [guessed]만)

진행: yes (종료 보고) / 정정 <#N> / 처음부터 / pass (추가 정보 모이면 재개)
```

짧은 동의(`OK`·`응`)는 ambiguous로 *대기*, 명시 `yes` 받기 전엔 종료 보고 출력 금지.

확정 후 종료 보고:

```
✅ Grill 종료

해결된 결정 (<N>개):
  ✓ #1: <decision> → <answer>  [verified/inferred/guessed]
  ✓ #2: <decision> → <answer>
  ...

미해결 — 사용자 판단 보류 (<M>개):
  ⚠ #N: <decision>
    이유: <skip 사유 또는 정보 부족>

📌 다음 단계 추천: <concrete next action>
   이유: <왜 이게 다음 step인가>

다른 옵션:
  - <alt 1> — <조건>
  - <alt 2> — <조건>

🔄 Retro (mini — 이 grill 세션만)
  효과 있었음: <어떤 가지를 파는 게 가치 있었는지>
  실패·삽질: <헛수고 가지가 있었으면>
  다음엔 바꿀 것: <walk 순서·가지치기 개선 아이디어>

  💡 본격 회고를 영구 기록하려면 /cfh-retro
     (grill 세션의 mini retro != 작업 한 건의 영구 회고)
```

**책임 분리**:
- 여기 mini retro는 **이 grill 세션 자체에 대한 즉석 메모** — 어떤 가지가 가치 있었나, 어떤 가지가 헛수고였나
- 영구 기록·향후 trend 분석은 `/cfh-retro` — `~/.claude/.cfh-logs/retros/`에 저장
- 단일 회고만 필요하면 mini retro로 충분, 누적 가시화 원하면 `/cfh-retro` 호출

미해결 항목은 PROGRESS.md에 옮기는 게 자연스러움 — `/cfh-progress`로.

</workflow>

<output_format>

각 Phase 종료 시 짧게 보고:
- Phase 0: 흡수한 컨텍스트 한 줄 + enumerate한 결정 수
- Phase 1: 트리 카드 + 가지치기 답 대기
- Phase 2: 매 질문마다 추천+이유 + 답 대기
- Phase 3: 종료 보고 + 미해결 → PROGRESS.md 권장

훅·외부 시스템 호출 없음 — 순수 대화 인터뷰.

</output_format>

<constraints>

- **One question per turn.** 절대 동시 질문 안 함.
- **추천+이유 필수.** 빈 질문 ("어떻게 생각하세요?") 금지.
- **사용자 의도 우선.** 결정은 항상 사용자에게 묻기. 코드는 추천 이유의 컨텍스트로만 (선택적).
- **명확한 답변 필수.** "OK"/Enter/짧은 응답/침묵은 *ambiguous* — default 동의로 해석 금지. 사용자가 의도를 명시 표현할 때까지 대기. 어디든 적용 (Phase 0·1·2·3 모두).
- **자가검증 원칙 (slot ≠ purpose).** 모든 결정 노드·"다른 옵션 B/C"·sub-decision은 *형식 슬롯이 있어서*가 아니라 **사용자 plan에 실제 영향을 주기 때문에** 등장해야 함. 슬롯 채우기 = 빈 질문 = 금지. 구체 적용:
  - **Phase 1 enumerate**: 각 노드 옆에 *"이 plan에서 이 결정이 왜 필요한가"* 한 줄 사유 표기 (트리 카드 출력 시). 사유가 *"이 카테고리 표준이라서"·"템플릿에 있어서"*밖에 안 나오면 **제외**. 의심스러우면 default 제외.
  - **Phase 1 트리 카드에 "제외된 후보 (자가검증)" 섹션 표기**: 어떤 카테고리 후보를 어떤 사유로 제외했는지 사용자에게 가시화. 자가검증을 블랙박스로 두지 않음. 사용자가 "어, X도 봐야 하지 않나?" 하면 가지 추가 가능 (결정 번복 보장).
  - **Phase 2 Step 1 질문 전**: [verified]·[inferred] 근거 없이 [guessed]만으로 추천을 만들어야 한다면, 질문하지 말고 Phase 3 종료 보고의 "미해결 — 정보 부족"으로 옮김. 무리해서 [guessed] 질문 강행 금지.
  - **"다른 옵션 B/C"**: 실제 trade-off 있을 때만 제시. 추천이 압도적이면 "다른 옵션: 없음 — 단일 선택지 명확" 명시. 가짜 대안 강제 채우기 금지.
  - **Sub-decision 추가**: 사용자 답이 *새 결정 분기를 명시적으로 열었을 때* 또는 blocking 결정일 때만 트리에 추가. "A로 갈게" 답에서 "그럼 A의 세부 X·Y·Z도…" 자동 파생 금지.
- **Tree 먼저.** Phase 1 enumerate + 사용자 가지치기 기회 → 그 다음 Phase 2.
- **Confidence markers.** [verified]·[inferred]·[guessed] 사용 — 사용자가 어디를 압박할지 알 수 있게.
- **종료 조건 명시.** Phase 3에서 어느 조건으로 종료했는지 보고.
- **자동 commit·자동 PROGRESS 갱신 안 함.** 다음 단계 권장만.
- **Out of scope.** 새 plan 만들기는 안 함 — `/cfh-plan`. grill은 기존 plan 깊이 파는 도구.
- 형식 단일 출처: `commands/references/recommendation-pattern.md`, `skills/grilling/references/decision-tree.md`.

</constraints>
