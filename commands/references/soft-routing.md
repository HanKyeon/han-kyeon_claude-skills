# Soft routing suggestion — reference (0.18.0 Track 9)

> **정책 § 0 정합**: 강제 라우팅 거부. 사용자가 호출한 명령 *그대로 default 진행*. 다른 stack 신호가 강할 때만 **bold + 💡로 대안 명령 제안** (사용자 명시 `switch` 후만 분기). silent 자동 위임 금지.

이 reference는 stack-paired commands가 Phase 0(입력 받은 직후, 워크플로 진입 전)에 적용하는 misroute suggestion 패턴 단일 출처입니다.

## 대상 페어

| 현재 호출 | 페어 대안 | 본 reference 적용 위치 |
|---|---|---|
| `/cfh-tdd` | `/cfh-tdd-gen` | cfh-tdd.md Phase 0 |
| `/cfh-tdd-gen` | `/cfh-tdd` | cfh-tdd-gen.md Phase 0 |
| `/cfh-tc` | `/cfh-tc-gen` | cfh-tc.md Phase 0 |
| `/cfh-tc-gen` | `/cfh-tc` | cfh-tc-gen.md Phase 0 |
| `/cfh-refactor` | `/cfh-refactor-gen` | cfh-refactor.md Phase 0 |
| `/cfh-refactor-gen` | `/cfh-refactor` | cfh-refactor-gen.md Phase 0 |
| `/cfh-plan` | (위임 추천에 stack signal 포함) | cfh-plan.md Phase 2 approach card |

## Stack 신호 휴리스틱

`cfh trace` 점수만으로는 stack 구분이 약합니다(PLAN § 9.6 cfh trace 정확도 미달 확인). 따라서 발화·환경 키워드 휴리스틱과 결합:

### FE 신호 (cfh-tdd / cfh-tc / cfh-refactor 쪽)

- **확장자**: `.tsx` · `.jsx` · `.vue` · `.svelte` (입력 인자에 등장)
- **라이브러리**: `React` · `Vue` · `Svelte` · `Next.js` · `Nuxt` · `Remix` · `Astro`
- **개념**: `컴포넌트` · `component` · `훅` · `hook` · `props` · `JSX` · `useState` · `useEffect`
- **테스트 idiom**: `RTL` · `Testing Library` · `MSW` · `userEvent` · `getByRole`
- **레이아웃·접근성**: `ARIA` · `tabindex` · `CSS-in-JS` · `Tailwind` · `style props`
- **Web Vitals**: `INP` · `CLS` · `LCP` · `hydration` · `Core Web Vitals`

### non-FE 신호 (cfh-tdd-gen / cfh-tc-gen / cfh-refactor-gen 쪽)

- **확장자**: `.go` · `.py` · `.rs` · `.java` · `.kt` · `.swift` · `.cs` · `.cpp` · `.c` · `.rb` · `.php`
- **언어·런타임**: `Node.js (server)` · `FastAPI` · `Django` · `Express (route)` · `Spring` · `Rails` · `Laravel`
- **개념 (server)**: `handler` · `endpoint` · `controller` · `repository` · `migration` · `schema` · `transaction` · `queue` · `idempotency`
- **개념 (CLI / library)**: `CLI` · `flag parser` · `subcommand` · `pure function` · `library API`
- **개념 (mobile)**: `iOS` · `Android` · `XCTest` · `Robolectric` · `instrumented test` · `permission` · `deep link`
- **개념 (embedded)**: `MCU` · `GPIO` · `센서` · `타이머 인터럽트` · `firmware`
- **개념 (ML)**: `model` · `training` · `epoch` · `GPU` · `rng seed` · `fairness` · `robustness`
- **테스트 idiom**: `pytest` · `JUnit` · `Mockito` · `MockMvc` · `supertest` · `testify`
- **관찰성**: `p50` · `p95` · `p99` · `latency` · `trace span` · `metric label`

### 결정 룰

1. 발화 + 파일 인자에 위 키워드 카운트
2. **opposite stack score ≥ current stack score + 2** → suggestion 출력
3. **opposite ≥ current + 5** → confidence marker `[verified]` 추가 (강한 신호)
4. **둘 다 0** → suggestion 출력 안 함 (정책 § 0.15.2 자가검증 — `[guessed]`만이면 질문 스킵)

`cfh trace` 점수는 *보조*로만 사용 — 위 휴리스틱 결정 후 trace top-1이 일치하면 confidence ↑, 어긋나면 *낮은 신뢰도*로 표시.

## 출력 형식 (블록 템플릿)

각 페어 command body의 Phase 0에서 입력 받은 직후 출력:

```
입력: <command> "<utterance>"

   📌 이대로 진행: <current command's skill>
        이유: <command> 명시 호출 — 사용자가 <stack> 컨텍스트 의도

   💡 **더 적합해 보이는 대안 — <opposite command>**
        신호:
          - [<confidence>] <signal 1 — quoted from utterance/args>
          - [<confidence>] <signal 2>
          - [verified|inferred] cfh trace top-1 = <skill name>  (or "trace neutral")
        대안 사용 시: <opposite command> "<same utterance>"

   진행: yes (현재 그대로) / switch (대안으로) / explain (왜?)
```

### explain 모드

사용자가 `explain` 답변 시 추가 출력:

```
[trace] 점수 (utterance에 대해):
  <skill>:           score=X.X  hits=[a, b]  penalties=[]
  <opposite skill>:  score=Y.Y  hits=[c, d]  penalties=[]

[heuristic] 키워드 카운트:
  <current stack>:   N개 (키워드: ...)
  <opposite stack>:  M개 (키워드: ...)

[decision] opposite score (M) - current score (N) = M-N → suggestion 출력 (threshold +2 이상)
```

## confidence marker 룰

각 신호에 `[verified]` / `[inferred]` / `[guessed]` 부착:

- `[verified]` — 발화·인자에 *명시 등장* (예: 파일 확장자 `.tsx`, 라이브러리 이름 `React`)
- `[inferred]` — 강한 도메인 키워드 (예: `handler`·`endpoint` → BE 추론)
- `[guessed]` — 약한 신호 (예: `테스트` 같은 일반 키워드만)

**자가검증 (slot ≠ purpose)**: 모든 신호가 `[guessed]`만이면 suggestion 출력 안 함. 정책 § 0.15.2와 일관.

## 사용자 답변 처리

| 답변 | 동작 |
|---|---|
| `yes` / 진행 / 그대로 / 아무 답변 X (default) | 현재 command 그대로 진행 |
| `switch` / 대안 / 다른 거로 | opposite command로 재진입 안내 (사용자가 실제 명령 다시 입력) |
| `explain` / 왜 | trace 점수 + heuristic 상세 출력 (위 explain 모드 참조) |
| 그 외 | 사용자 의도 모호 — "yes / switch / explain 중 선택" 한 번 더 안내 |

**강제 라우팅 금지** — `switch` 답이라도 *자동으로 opposite command 실행하지 말 것*. 사용자가 실제 새 명령을 입력해야 진행. 명시성 유지.

## cfh-plan 적용 (Phase 2 approach card)

`/cfh-plan` Phase 2 approach card 출력 시 stack signal을 추론 섹션에 포함:

```
📦 Stack signal
  - [inferred] 발화에 'API handler' + 'idempotency' → BE 컨텍스트
  - [verified] 인자에 .go 확장자 → Go backend
  - 결론: BE 작업으로 가정. /cfh-tdd-gen·/cfh-refactor-gen·/cfh-tc-gen 권장.
  - 다른 stack이면 사용자가 명시 정정.
```

위임 추천 시 sub-command 권장에 stack signal 결과 반영.

## 검증 (contract test)

`tests/contract/soft-routing.test.js`에서 다음 시나리오:

1. **anti-trigger**: 명시 FE 발화(`React 컴포넌트`)에 `/cfh-tdd` 호출 → opposite suggestion 안 함
2. **happy-path**: BE 키워드 강한 발화(`API handler idempotency`)에 `/cfh-tdd` 호출 → `/cfh-tdd-gen` suggestion 출력
3. **자가검증**: 약한 신호(`테스트` 단독)만 → suggestion 출력 안 함

테스트는 *문서 패턴 검사* (각 command body가 본 reference 참조 포함 여부). 실제 LLM 행동 검증은 `cfh dev eval --executor claude --baseline`로 외부에서.

## 관련 문서

- `commands/references/recommendation-pattern.md` — 추천+이유 패턴 (Track 9 신호 형식의 기반)
- `commands/references/confidence-tagging.md` — `[verified]`/`[inferred]`/`[guessed]` 마커 컨벤션
- `PLAN.md` Track 9 — 상세 게이트·기대 효과
