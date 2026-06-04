# 정형 데이터 크로스체크 — Structured Data Cross-check (단일 출처)

> LLM이 *추론한* 영향 범위를, 코드에서 *기계적으로 추출한 사실*과 대조해 **누락을 자동으로 잡는** 패턴. 추측(`[guessed]`)을 사실(`[verified]`)로 승격. sdk-ai-workflow의 dep-map/TIA 크로스체크를 cfh의 stack-neutral 환경에 맞게 *Grep 기반*으로 어댑테이션한 것.

## 핵심 원리

```
LLM 추론 영향범위   vs   코드에서 기계 추출한 실제 참조
   (맹점 있음)              (사실)
        └──────── 대조 ────────┘
                   ↓
        추론이 놓친 참조 → flag → [verified] 승격
```

LLM은 "그럴듯한" 영향 범위를 말하지만 *놓치는 곳*이 생긴다. 정형 데이터가 그 맹점을 메운다. **"네가 A만 영향이라 했는데 grep엔 B도 있다"**를 기계가 잡는다.

## 3단계 흐름

### ① LLM 추론 (기존)
영향 범위를 평소대로 추론. 예: `"validateCoupon 변경 → checkout 영향"` `[guessed]`

### ② 기계 추출 (신규)
변경 대상 심볼·모듈을 **Grep으로 실제 참조 검색**:
```
grep -rn "validateCoupon\|from.*coupon" --include=*.{ts,tsx,js,py,go,java,kt,rs}
→ checkout/ · cart/ · admin/ 3곳에서 참조
```

**정형 데이터가 프로젝트에 *있으면* 추가 활용** (강제 아님 — 있으면 보강):
- import graph: `dependency-cruiser`·`madge` JSON · `go list -deps` · `tsc --listFiles`
- `tsconfig.json` references · workspace 그래프 (pnpm/turbo/gradle)
- coverage map (이미 있으면)

→ Grep이 **본체**(stack-neutral), 정형 데이터는 **보강**(있으면).

### ③ 크로스체크 (신규)
추론(①) vs 추출(②) 대조 → 누락 발견 → **severity 분기**.

## Severity 분기 (false positive 회피 — sdk §3-B 차용)

| 누락 종류 | severity | 처리 |
|---|---|---|
| **직접 import/참조** 누락 | **high** | `[verified]` 승격 — 명확한 영향처 |
| **간접·전이(transitive) 참조** 누락 | **medium** | 참조 chain 깊이 1~2면 표기, 그 이상은 약하게 |
| **문자열·동적 참조** 의심 (grep 패턴 불확실) | **low** | "grep 불완전 — 사용자 확인 권장" 표기 |
| 사용자가 **"영향 없음" 근거 명시** | **low** | 사용자 판단 존중. "근거 1줄" 확인만 (예: "read-only, 시그니처 무변경") |
| 정형 데이터 vs grep **불일치** | **info** | "정적 grep엔 있으나 import graph엔 없음 — 동적/dead code 가능" |

→ 무작정 flag 금지. 신뢰도 따라 차등. **slot ≠ purpose** — 누락 없으면 침묵.

## 출력 형식

```
🔍 영향범위 크로스체크
   추론: <LLM이 말한 영향처>  [guessed/inferred]
   추출: grep "<symbol>" → <실제 참조 위치 목록>
   ⚠ 누락: <추론에 없던 참조> [verified] (high)
           예: admin/couponPanel.tsx:42 — validateCoupon import, 추론에서 누락
   ✅ 일치: <추론과 추출이 맞은 부분>
   ℹ 한계: grep은 정적 — 동적 import·리플렉션·문자열 참조는 못 잡음 (참고용)
```

누락이 없으면:
```
🔍 크로스체크: 추론한 영향처가 grep 결과와 일치 — 누락 없음 [verified]
```

## 한계 (과대평가 방지 — 반드시 명시)

- **Grep은 정적**: 동적 import(`import()`)·리플렉션·문자열 기반 참조·런타임 DI·DI 컨테이너는 못 잡음
- `[verified]`는 **"grep으로 확인된 것"**이지 **"전부"가 아님**
- **"grep 통과 = 안전"으로 오해 금지** — 완결성 보장이 아니라 *추론 보강*
- 정형 데이터(import graph 등)도 정적 분석 한계 동일

## 적용 자산

| 자산 | 적용 지점 | 무엇을 크로스체크 |
|---|---|---|
| `cfh-plan` | Phase 2.5 Side-Effect 자가확인 | plan이 추론한 영향 범위 vs Grep 실제 참조 |
| `cfh-refactor(-gen)` | Blast Radius 분석 | 변경 대상 심볼의 추론 영향 vs Grep 참조 그래프 |
| `cfh-grill` | 영향·의존성 결정 가지 walk 중 | "이 변경 영향이 X뿐?" 주장 vs Grep 반증 (grill의 반증 정신과 정합) |

**cfh-grill 특화**: grill은 *"진짜 이거 맞아?"* 반증이 본질. 영향 가지를 팔 때 Grep으로 "네 주장과 달리 Y·Z도 참조"를 들이미는 것이 grill 정신과 정확히 일치 — plan/refactor보다 더 자연스러운 결합.

## 언제 쓰나 / 안 쓰나

- **쓴다**: 변경 대상이 *다른 곳에서 참조되는 심볼·모듈·인터페이스*일 때 (함수·타입·API·export)
- **안 쓴다** (slot ≠ purpose): 순수 신규 파일·로컬 변수·참조 없는 격리 변경 — grep 할 대상이 없으면 침묵

## 관련

- `commands/references/confidence-tagging.md` — `[verified]/[inferred]/[guessed]` 마커 (크로스체크가 승격시키는 대상)
- `commands/references/progress-audit.md` — § 6번째 축 side-effect (cfh-plan에서 함께 사용)
- `commands/references/recommendation-pattern.md` — 추론 근거로 코드 인용하는 정신
- `report.md` — 본 패턴 도입 배경 (sdk-ai-workflow 분석)
