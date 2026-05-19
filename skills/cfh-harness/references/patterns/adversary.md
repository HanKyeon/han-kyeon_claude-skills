# Pattern: Adversary (0.22.0+)

## 언제 쓰는가

- **확증 편향**을 구조적으로 차단해야 함
- 대표 사례:
  - **Debug**: AI가 첫 가설에 매달려 반증 신호 무시 → 잘못된 fix
  - **Security audit**: 코드 작성자가 자기 코드의 취약점 못 봄
  - **Legal/contract review**: 작성자가 자기 조항의 loophole 못 봄
  - **Research claim**: 가설 옹호와 검증이 같은 인격이면 P-hacking 위험
- 비즈니스 크리티컬 (인시던트·취약점·결제 오류) 영역

## 핵심 원리

**반론-옹호 인격 분리(Adversary-Defender Separation)**: 같은 AI라도 **서로 다른 인격 컨텍스트** 부여:

- **Adversary**: *반증 신호 적극 탐색*. claim/hypothesis를 *기각하려* 함.
- **Defender**: 반론 받고 claim 유지·수정·폐기 결정. 사용자 의도 대변.
- **Synthesizer** (선택): 최종 통합 — 살아남은 claim만 다음 단계로.

`Producer-Reviewer`와 다른 점: Producer-Reviewer는 *spec 대조*. Adversary는 *반증 시도* — *동등한 권한*으로 challenge.

## 전형적 구성

```
         Hypothesis / Claim
                ↓
        Adversary ──── 반증 신호 탐색 → 반론 출력
                ↓
                (challenge memo)
                ↓
        Defender ──── 반론 검토 → 유지·수정·폐기 결정
                ↓
       Synthesizer ──── (선택) 살아남은 claim 통합
                ↓
            Verified Result
```

## 에이전트 수

- **2** (Adversary + Defender) — 단일 claim 검증
- **3** (+ Synthesizer) — 복수 claim 통합

복수 claim 병렬 검증 시: N × (Adversary + Defender) + 1 Synthesizer. 그러나 N ≥ 4면 Expert Pool 변형 검토.

## 통신

- **broadcast**: Hypothesis Generator가 모든 Adversary에 같은 claim 전달
- **targeted (Adversary → Defender)**: 반론 메모 1 round
- **request-response (Defender → Adversary)**: (선택) "이 반론은 spec 가정 위반" 식 명확화 요청
- max-round: **2** 권장 (반론 → 옹호 → 결론). exceed 시 *Defender가 강제 결정*.

## 장점

- **확증 편향 차단** — 단일 agent가 자기 반론 못 하는 본질적 한계 해결
- **반증 신호 적극 탐색** — Adversary 인격이 *기각 시도* 자체를 보상받는 구조 (sycophancy 차단)
- **debug confirmation bias 차단** — 첫 가설에 매달리지 않음

## 단점·위험

- **bounded round 어기면 무한 ping** — Adversary·Defender 끝없는 challenge 위험. max-round 강제 필수
- **token 폭증 위험** — Adversary가 *모든 가능 반증* 나열하면 분량 큼. *3 강한 반론* 같은 cap 권장
- **결정 편향 잔존** — Defender가 *결국 같은 AI* — Adversary 반론을 *적당히 받아 폐기* 가능. *체크리스트로 강제* (반론마다 *명시 처리*)

## 적합 사용 사례

| 영역 | 적합 강도 | 이유 |
|---|---|---|
| **Debug hypothesis verification** | 🟢 | 첫 가설 매달림 차단 |
| **Security audit** | 🟢 | 취약점 탐색 본질 = adversarial |
| **Legal review** | 🟢 | loophole 찾기 = adversarial |
| **Research claim validation** | 🟡 | P-hacking 차단 |
| TDD intent preservation | 🔴 | Producer-Reviewer가 더 적합 (spec 대조) |
| Code review | 🔴 | Expert Pool이 더 적합 (다축 평가) |

## 통신 mode 정책

- **default**: `subagent` mode (각 Adversary·Defender 1회 호출 후 통합)
- **iterative bounded**: `teams` mode (max 2 round, flag 필요) — *반론에 대한 응답이 필요할 때*

→ `references/agent-team-modes.md` 정책 일관.

## 토큰 budget 예상

| Mode | budget |
|---|---|
| subagent (1 round) | (Adversary + Defender) × claim 수 — 단순 |
| teams (bounded 2 round) | 위 × 2 + cross-reference round (~+30%) |

## 적합 신호 (cfh-harness 추천 룰)

`cfh-harness` Phase 2 Pattern Selection에서 다음 신호 강하면 추천:

- **확증 편향 위험**: Q1·Q3에 "가설 검증·취약점 탐색·반증 시도" 발화
- **debug confirmation bias**: Q4 실패 비용이 *production 사고* 수준 + 가설 ≥ 3
- **security/legal context**: Q3 도메인이 *취약점·취약 분석·legal review*

## 관련

- `commands/references/team-suggestion.md` — Adversary 안내 시점·신호 정책
- `producer-reviewer.md` — *생성-검증* 분리 (다른 핵심 인격 패턴)
- `expert-pool.md` — *다축 평가* (Adversary와 결합 시 N × Adversary)
- `commands/cfh-debug.md` — Adversary 안내 가장 적합
