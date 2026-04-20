# Pattern: Producer-Reviewer

## 언제 쓰는가

- 생성 AI의 **자기확증 편향**을 구조적으로 차단해야 함
- 대표 사례: **TDD 오버핏** — 테스트 작성자와 구현자가 같으면 테스트를 통과시키는 hack이 들어감
- 비즈니스 크리티컬 (결제, 보안, 데이터 손실) 영역

## 핵심 원리

**인격 분리(Persona Separation)**: 같은 AI라도 **서로 다른 역할 컨텍스트**를 부여하고, Reviewer는 Producer의 *추론 과정*을 보지 않고 **산출물만** 본다.

## 전형적 구성

```
         Spec
           ↓
       Producer ──── (produces artifact only)
           ↓
    (artifact + spec, NOT producer's reasoning)
           ↓
       Reviewer ──── (audits against spec)
           ↓
      Findings / Pass
```

## 에이전트 수

정확히 2. 3 이상이면 Expert Pool이 맞는 선택.

## 통신

- Producer → Reviewer로 **산출물만** 전달.
- Reviewer가 spec과 산출물을 대조. Producer의 사고 과정은 숨김.
- Reviewer 판정이 Fail이면 Orchestrator가 Producer에게 findings만 전달하고 재생성 (이유 설명은 다음 라운드에서 금지).

## 장점

- 오버핏 방지. Reviewer가 "왜 이 테스트가 이 값을 기대하는가"를 spec에서만 찾음.
- 판정이 설명 가능 (Reviewer의 findings는 spec 인용).
- Producer의 과신을 Reviewer가 상쇄.

## 단점

- 2 라운드 필요 → 지연.
- Spec이 부실하면 둘 다 실패 (Spec의 품질이 상한).
- Reviewer가 Producer의 맥락을 모르므로 선의의 일탈도 fail 처리.

## 실패 모드와 대응

| 실패 | 대응 |
|---|---|
| Producer가 spec을 재해석 | Producer description에 "Spec 원문 준수, 재해석 금지" |
| Reviewer가 문체·스타일을 지적 | Reviewer description에 "Spec 준수 여부만, 취향 지적 금지" |
| Reviewer가 "OK"만 반복 | Reviewer에게 "최소 1개 엣지 케이스 탐색 강제" |
| 무한 루프 | Orchestrator가 최대 라운드 3 제한, 초과 시 사용자 개입 |

## TDD 적용 예시

- **Producer**: `test-writer` — Phase 1 Interview 답변만 보고 테스트 작성. 구현 파일 접근 금지.
- **Reviewer**: `implementation-writer` — 테스트를 GREEN으로 만드는 최소 구현. 테스트 수정 권한 없음.

Producer가 테스트를 쓰고, Reviewer(implementer)가 통과시키는 구조가 오버핏을 방지.

## 트리거 스킬 예시

```yaml
---
name: producer-reviewer-flow
description: |
  Use this skill when the user wants independent review of produced artifacts
  to avoid overfit or self-confirmation bias. Common in TDD for business-critical
  code (payments, security, data integrity). Invokes Producer agent then
  Reviewer agent without sharing the Producer's reasoning. Do NOT trigger
  for single-agent quick edits or non-critical code.
---
```

## 프리셋

`cfh generate producer-reviewer` — 2 에이전트 + 트리거 스킬.

## 참고 구현

tdd-first 스킬의 "Writer/Implementer 분리" 옵션. Anthropic "Building effective agents" 블로그의 "Evaluator-Optimizer" 패턴.
