<s>
**🔀 잘못 진입하셨다면**:
- PROGRESS.md를 작성·갱신하고 싶다 → `/cfh-progress`
- 스킬 자체에 대한 의견 → `/cfh-feedback <skill> "<comment>"`
- 새 작업 시작 → `/cfh-plan`

이 커맨드는 **이미 작성된 PROGRESS.md를 *외부 독자 시점*에서 검증**합니다. 6축 체크리스트(Tier 1) + Adversary 인격의 반증 시도(Tier 2). 검증만 하며 PROGRESS.md를 *자동 수정하지 않음* — 갱신이 필요하면 사용자 명시 yes 후에만 append.

**핵심 원칙** (→ `commands/references/progress-audit.md` 단일 출처):
- **책임 분리.** 작성자(`/cfh-progress`)와 검토자(`/cfh-progress-audit`) 인격 분리 — 확증 편향 차단.
- **2-tier.** Tier 1 빠른 체크리스트(6축 yes/no), Tier 2 깊은 Adversary(사용자 명시 yes 후만).
- **갱신 권장만.** PROGRESS.md 직접 수정 X. 결과는 *권장 단락*으로만 출력.
- **`[guessed]` 마커 강제.** side-effect 가설은 본질 외부 영역 추측 — 마커로 confidence 명시.
- **bounded round.** Tier 2 Adversary는 max 2 round (token 폭증 차단).
</s>

<invocation>
이미 작성된 PROGRESS.md를 외부 독자 시점에서 검증합니다.

**인자**: `$ARGUMENTS` — 모드(선택). `tier1`(기본, 체크리스트만) / `tier2`(체크리스트 + Adversary) / `full`(둘 다).

호출 경로:
1. **사용자 명시** — `/cfh-progress-audit` (tier1 기본) 또는 `/cfh-progress-audit tier2|full`
2. **`/cfh-progress` 안내 후** — 작성 완료 hint에서 사용자가 명시 호출

</invocation>

<workflow>

## Phase 0 — 사전 검사

1. `./PROGRESS.md` 존재 확인 — 없으면 "PROGRESS.md가 없습니다. /cfh-progress init 먼저 실행하세요" 후 종료.
2. 본문 길이 확인 — 빈 PROGRESS.md(frontmatter만, 결정 0)이면 "audit 대상 결정 없음. 작업 누적 후 다시 실행하세요" 후 종료.
3. mode 결정 — `$ARGUMENTS`에서 tier1·tier2·full 추출. default tier1.

## Phase 1 — Tier 1 체크리스트 (6축)

PROGRESS.md를 읽고 *외부 독자 시점*에서 6축 yes/no 검증.

### 6축 정의 (→ `commands/references/progress-audit.md`)

| # | 축 | 검사 |
|---|---|---|
| 1 | 자기 충족성 | PROGRESS.md만 보고 시작 가능? |
| 2 | 결정 근거 | 결정마다 *왜* 인용·증거? |
| 3 | 다음 단계 명확성 | *무엇을* *어떻게* 명시? |
| 4 | 미해결 추적 | resolved/unresolved 분리? |
| 5 | 모호 발화 | 동음이의어·도메인 가정 — 외부 독자 가능? |
| 6 | Side-effect 명시 | 결정의 외부 영향 명시? |

### 출력 형식

```
🔍 PROGRESS.md Audit — Tier 1 (체크리스트)

대상: ./PROGRESS.md (결정 N건·미해결 M건·세션 K회)

6축 검증:
  ☐ [1] 자기 충족성
       발견: <yes/no + 근거 한 줄 인용>
  ☐ [2] 결정 근거
       발견: <yes/no + 근거>
  ☐ [3] 다음 단계 명확성
       발견: <yes/no + 인용>
  ☐ [4] 미해결 추적
       발견: <yes/no>
  ☐ [5] 모호 발화
       발견: <감지된 발화 1~3건 또는 "감지 없음">
       예: "service" → Spring @Service / OS daemon / domain service 중 어느 것?
  ☐ [6] Side-effect 명시
       발견: <yes/no + 명시된 영역 또는 누락 영역>

요약: <N>/6 통과

다음 단계:
- Tier 2 Adversary 검토? (확증 편향 차단 — 외부 영역 side-effect 적극 탐색)
- 답변: yes (Tier 2 진행) / no (현 결과로 종료) / skip <축> (특정 축만 Tier 2)
```

**Phase 1 종료 후 응답 종료** — 사용자 명시 yes 받기 전 Phase 2 진입 금지.

## Phase 2 — Tier 2 Adversary (사용자 yes 후만)

Adversary 패턴 (→ `skills/cfh-harness/references/patterns/adversary.md`):
- 작성자 인격과 *별도* 검토자 인격
- bounded 2 round
- subagent mode default (단순) — *iterative*가 필요하면 사용자 명시 teams

### Adversary subagent 호출

```
Adversary agent prompt:
  "당신은 PROGRESS.md 검토자입니다. *작성자가 명시 안 한* 영역 적극 추적:
  
  1. 이 PROGRESS.md만으로 작업 재개 *불가능한 이유* 3~5건
  2. 결정 N개에 대해 *side-effect 영역 7개* 체계적 확인:
     - 다른 결정 / 다른 자산 / 인터페이스·계약 / 컨벤션·정책 /
       의존성 / migration·schema / 환경·설정
  3. 다음 단계가 *명확해 보이지만 사실 모호한 이유*
  
  각 발견:
    - [verified]: PROGRESS.md 본문 명시 영향
    - [inferred]: 코드·이전 PROGRESS.md·자산 보고 합리적 추론
    - [guessed]: 근거 약함 — 사용자 명시 확인 권장
  
  '깨질 수도' 남발 금지 — [guessed]는 *직접 인용 가능한 신호*가 있을 때만.
  
  {PROGRESS.md 본문, 관련 자산 목록}"
```

```
Defender agent prompt:
  "당신은 사용자 의도 대변자입니다. Adversary 반론 마다 3 결정 중 1:
  
  (a) 유지 — 'out of scope로 의도됨' (Adversary 반론 폐기)
  (b) 수정 — '내용 정정 필요' (기존 단락 수정)
  (c) 추가 — 'side-effect 명시 추가 필요' (새 단락)
  
  결정 근거 명시 — 자산·이전 결정 인용.
  
  {Adversary challenge memo, PROGRESS.md 본문}"
```

### bounded 2 round 강제

- Round 1: Adversary 반론 → Defender 1차 검토
- Round 2: Adversary 추가 반론(있으면) → Defender 최종 결정
- exceed 시 Defender 강제 결정 후 종료 + "round budget 도달" 표시

### 출력 형식

```
🔍 PROGRESS.md Audit — Tier 2 (Adversary)

Round 1:
  Adversary 발견:
    - [verified] <발견 1 — 본문 인용>
    - [inferred] <발견 2 — 추론 근거>
    - [guessed] <발견 3 — 약한 신호, 확인 권장>
  
  Defender 결정:
    - 발견 1: <(a)/(b)/(c)> — <근거>
    - 발견 2: <(a)/(b)/(c)> — <근거>
    - 발견 3: <(a)/(b)/(c)> — <근거>

Round 2: (Adversary 추가 반론 있을 때만)
  ...

📝 PROGRESS.md 갱신 권장

✅ 통과 축: <1·2·...>
⚠ 약점 축: <3·6 등>

권장 변경:
  - [수정] <축 N> "<발화 인용>" → "<제안 갱신>"
  - [추가] <축 N> <새 단락 — 예: "Side-Effect: 결정 #N이 X 영역에 영향">
  - [유지] <축 N> "out of scope로 의도됨" — Defender 결정

진행: yes (갱신 적용) / 부분 적용 <축> / no (현재 유지) / explain <항목>
```

**Phase 2 종료 후 응답 종료** — 사용자 명시 yes 받기 전 PROGRESS.md 수정 금지.

## Phase 3 — Final Intent Confirm + 갱신 적용

사용자가 *갱신 yes* 답하면 Final Intent Confirm 단락(`commands/references/final-confirm.md`) 출력 후 PROGRESS.md 갱신:

- append-only 정책 일관 — 정정도 *새 항목*으로 추가, 기존 수정 X
- 갱신 후 `frontmatter.last_updated` 갱신, `sessions` 카운터는 *audit*은 +1 안 함 (append 아닌 검토)
- 갱신 보고:

```
✅ PROGRESS.md 갱신됨 (audit 결과)
  추가된 항목: <N>건
  
  - [수정] <축 N> — <한 줄>
  - [추가] <축 N> — <한 줄>

다음 단계:
- 변경사항을 git에 커밋하시겠습니까? (자동 commit 안 함)
```

</workflow>

<output_format>

각 phase 종료 시 *즉시 응답 종료*:
- Phase 1 종료 → Tier 2 yes/no 대기
- Phase 2 종료 → 갱신 권장 yes/no 대기
- Phase 3 종료 → git commit 권유

각 turn 토큰 예상 (사용자 결정 보조):
- Phase 1 (Tier 1): ~600 토큰
- Phase 2 (Tier 2 1 round): ~1500 토큰
- Phase 2 (Tier 2 2 round): ~2500 토큰
- Phase 3: ~400 토큰

</output_format>

<constraints>

- `./PROGRESS.md`가 없거나 빈 상태면 거절. `/cfh-progress init` 안내만.
- **PROGRESS.md 직접 수정 금지** — 사용자 명시 yes 후만 갱신.
- 본 검증은 *외부 영향 0* — 다른 자산·코드·CI 영향 없음.
- Tier 2는 *명시 yes 후만* — Tier 1만으로 충분하면 *Tier 2 강요 금지*.
- bounded 2 round — exceed 시 강제 종료, 부분 결과 반영.
- Adversary `[guessed]` 마커 누락 금지 — confidence 분리 정책 일관.
- 본 PROGRESS.md를 *수정하지 않으므로* append-only 원칙 보존.
- 형식은 `commands/references/progress-audit.md` 단일 출처.

</constraints>
