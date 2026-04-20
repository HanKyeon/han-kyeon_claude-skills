# Test Writer & Implementer — Producer-Reviewer Split

오버핏의 근본 원인은 **같은 AI가 테스트와 구현을 모두 작성**한다는 구조. 분리하면 구조적으로 편향이 사라진다.

## 구조

```
사용자 + Intent Interview 답변
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
    Test Writer    Implementer    Intent Reviewer
         │              │              │
  테스트 파일    구현 파일         최종 검증
  (구현 X)       (테스트 수정 X)   (의도 일치?)
```

## 에이전트 정의

### 1. Test Writer Agent

**역할**: Phase 1~2 결과를 바탕으로 테스트 파일을 작성한다.

**허용**:
- Phase 1 Intent Interview 답변 읽기
- Phase 2 Test Outline 읽기
- 대상 함수/컴포넌트의 **시그니처** (파일 상단 export 부분)만 읽기
- 프로젝트의 테스트 컨벤션 참조 (다른 테스트 파일)
- 라이브러리 문서 (Testing Library, Vitest 등)

**금지**:
- 구현 파일 본문 읽기
- 구현 파일 작성/수정
- "나중에 구현하기 좋게" 테스트 단순화

**프롬프트 예시**:
```
당신은 Test Writer입니다. 아래 Intent Interview 답변과 Test Outline을 바탕으로
<subject>의 테스트 파일을 작성하세요.

**중요 규칙**:
- 구현 파일을 열거나 읽지 마세요. 시그니처만 보고 작성합니다.
- 테스트는 사용자 관점(행동)을 검증합니다. 내부 state/class name 금지.
- Phase 2 Outline의 모든 it 항목을 구현해야 합니다.
- 추가 테스트가 필요하다고 판단되면 제안하되, 사용자 승인 전에는 작성 금지.

**Intent 답변**: <붙여넣기>
**Test Outline**: <붙여넣기>
**시그니처**: <export 선언만>
```

### 2. Implementer Agent

**역할**: Test Writer가 작성한 테스트를 통과시키는 **최소 구현**을 작성한다.

**허용**:
- 테스트 파일 읽기
- 대상 함수/컴포넌트의 시그니처 읽기
- 구현 파일 작성/수정
- 필요 시 import할 라이브러리/유틸 참조

**금지**:
- 테스트 파일 수정
- Phase 1 Intent 답변 직접 조회 (테스트가 의도의 **유일한 대변자**)
- Hard-coding으로 테스트 통과
- 예외적으로 테스트가 틀렸다고 판단 시, **명시적 TEST CHANGE REQUEST** 제출 후 대기

**프롬프트 예시**:
```
당신은 Implementer입니다. 아래 테스트를 GREEN으로 만드는 최소 구현을 작성하세요.

**중요 규칙**:
- 테스트 파일을 수정하지 마세요. 구현만 변경합니다.
- 테스트 입력값에 대한 hard-coded 분기로 통과시키지 마세요.
- 테스트가 포착하지 못한 엣지 케이스는 남겨두고, 나중에 Intent Reviewer가 확인합니다.
- 테스트가 틀렸다고 판단되면 아래 형식으로 선언하고 멈추세요:

🚨 TEST CHANGE REQUEST
- 테스트 이름: <it 이름>
- 문제: <왜 틀렸는지>
- 제안: <변경 내용>
(사용자 승인 전에는 진행 불가)

**테스트 파일**: <붙여넣기>
**시그니처**: <export 선언만>
```

### 3. Intent Reviewer Agent

**역할**: Phase 1 답변과 최종 구현이 **테스트 없이도** 의도를 충족하는지 검증한다.

**허용**:
- Phase 1 Intent Interview 답변 읽기
- 테스트 파일 읽기 (참고만)
- 구현 파일 전체 읽기
- 기존 코드베이스 컨벤션 참조

**금지**:
- 구현 변경 (제안만)
- 테스트 변경

**체크 항목**:
1. Q1 "한 문장 목표"와 구현 요약이 일치하는가?
2. Q3 edge case 중 테스트에 빠진 게 있는가? 구현에서 처리됐는가?
3. Q4 error case의 **에러 형식**이 Q1 의도와 일치하는가?
4. Q5 out of scope가 구현에 슬쩍 들어가진 않았는가?
5. 프로젝트 컨벤션을 위반하지 않는가?

**출력 포맷**:
```markdown
## Intent Preservation Check

### Pass
- ✅ Q1 목표 일치
- ✅ Q3-A (null 처리) 구현 확인

### Concern (사용자 판단 필요)
- ⚠️ Q3-B (매우 큰 수)는 테스트에 없지만 구현이 어떻게 처리하는지 불분명

### Fail (반드시 수정 필요)
- ❌ Q4 error case가 throw가 아닌 return null로 구현됨 — Q4 답변과 불일치
- ❌ Q5 "로깅 안 함"으로 합의했으나 console.log 6개 추가됨
```

## Claude Code에서의 실제 구현

### 방식 A — Agent 정의 파일

`.claude/agents/`에 3개 에이전트 정의:

```
.claude/agents/
├── test-writer.md
├── implementer.md
└── intent-reviewer.md
```

각 파일에 위 프롬프트를 frontmatter + body로 작성.

### 방식 B — Slash Command로 워크플로 자동화

`.claude/commands/tdd.md`:

```markdown
---
description: Full TDD workflow with Writer/Implementer/Reviewer split
---

Phase 1 Intent Interview를 시작합니다...
[Phase 진행 후]
Phase 3: Test Writer Agent를 호출합니다.
[Agent tool 호출]
Phase 4: Implementer Agent를 호출합니다.
[Agent tool 호출]
Phase 5: Intent Reviewer Agent를 호출합니다.
[Agent tool 호출]
```

### 방식 C — 수동 프롬프트 교체

단일 AI 세션 내에서:
1. *"이제 너는 Test Writer다. [규칙]"*
2. 테스트 작성 후 새 세션 시작
3. *"이제 너는 Implementer다. 테스트 파일만 보고 [규칙]"*
4. 구현 완료 후 다시 새 세션
5. *"이제 너는 Intent Reviewer다. [체크 항목]"*

가장 간단하지만 컨텍스트 단절이 생길 수 있음.

## 가벼운 버전 (비용/시간 절감)

3개 에이전트가 부담스러우면:

- **Writer와 Implementer만 분리** (가장 큰 효과)
- Intent Reviewer는 **최종 단계에서 수동 체크**로 대체

## 효과

- **Hard-coding 근절**: Implementer가 Phase 1 답변을 모르므로 "입력 `'foo'` → 출력 `'bar'`" 식 분기 유인이 없음.
- **테스트 수정 차단**: 명시적 TEST CHANGE REQUEST 없이는 테스트 파일 접근 불가.
- **의도 추적**: Intent Reviewer가 "테스트는 통과하는데 의도에서 벗어난" 경우를 잡아냄.

## 한계

- **시간**: 3 에이전트 시퀀스가 단일 AI보다 느림.
- **비용**: 토큰 사용량 증가.
- **조율 부담**: 에이전트 간 컨텍스트 전달을 사용자가 관리해야 할 수 있음.

**권장 적용 범위**: 비즈니스 크리티컬 로직, 복잡한 유틸, 보안/결제 관련. 단순 CRUD는 과잉.
