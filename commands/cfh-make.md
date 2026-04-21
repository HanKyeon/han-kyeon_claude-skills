<s>
이 커맨드는 `asset-factory` 메타-스킬을 활성화하여 **무엇을 만들지(skill/command/team/agent) 분류한 뒤 올바른 생성 경로로 위임**합니다.
사용자가 Claude Code 자산 종류를 구분하지 못해도 요구사항에서 시작해 적합한 메타-스킬로 연결됩니다.
스킬이 자동 트리거되지 않은 상태라면 지금 `~/.claude/skills/asset-factory/SKILL.md`를 읽고 3 Phase에 따라 진행하세요.
</s>

<invocation>
자산 분류·생성 워크플로를 시작합니다.

**인자**: `$ARGUMENTS` — 한 문장 요구사항(선택). 예: "팀 API 응답 처리 규칙을 claude가 자동 적용하게", "PR 리뷰를 보안·성능·a11y로 다축 평가".

- 비어있으면 사용자에게 "무엇을 Claude가 하도록 만들고 싶으신가요? 한 문장으로 설명해 주세요"를 질문.
- 값이 있으면 그 한 문장을 Phase 1의 요구사항으로 채택.

</invocation>

<workflow>

## Phase 1 — Intent Capture (요구사항 먼저, 스캔은 그 뒤)

**원칙**: 한 문장 요구사항을 먼저 받고, 그 요구사항 토큰을 기준으로 **매칭 가능성 있는 기존 자산만** 스캔합니다.

### Step 1a — 한 문장 요구사항

- `$ARGUMENTS`에 요구사항이 있으면 그대로 사용 ("이대로 이해했는데 맞으십니까?"로 확인만).
- 비어있으면 질문: *"무엇을 Claude가 하도록 만들고 싶으신가요? 한 문장으로 설명해 주세요."*

### Step 1b — Scoped Pre-scan (요구사항 기반 중복 검사)

요구사항의 핵심 토큰(명사·동사)을 추출하여 **매칭될 가능성이 있는 자산만** 스캔합니다 (→ `asset-factory/references/classification-tree.md`의 Pre-scan 프로토콜):

1. `~/.claude/skills/*/SKILL.md`와 `./.claude/skills/*/SKILL.md`의 **frontmatter description만** 추출 (경량)
2. 요구사항 토큰과 각 description 토큰 매칭
3. **30% 이상 겹침**이 있는 자산만 사용자에게 노출
4. `~/.claude/commands/*.md`·`./.claude/commands/*.md`·`./.claude/agents/*.md`도 동일 기준

**스캔 비용**: frontmatter description만 읽으므로 자산 수십 개여도 수백 줄 수준. broad scan이라도 부담 작음.

**중복 없음 시**:
```
✅ 유사 자산 없음. Step 1c(3 분류 질문)로 진행합니다.
```

**중복 발견 시**:
```
🔎 유사 자산 발견
- `<name>` (<kind>): <description 1줄>

(a) 이 자산을 확장·편집 → 새 생성 대신 편집 경로 제안
(b) 별도로 새 자산 생성 → Step 1c 진행
(c) 이 자산을 먼저 확인 → 대화 종료, 사용자 검토 후 재개
```

### Step 1c — 3 분류 질문

`asset-factory/references/classification-tree.md`의 Q1~Q3:

#### Q1. 반복 가능한 워크플로인가?
- (a) 반복함 → Q2
- (b) 한 번만 → **생성 중단**, "그냥 요청하세요" 안내
- (c) 모르겠음 → 힌트 제시 후 재질문

#### Q2. 여러 전문가가 협업해야 하는가?
- (a) 예 → **team 확정**, Q3 skip
- (b) 아니오 → Q3
- (c) 모르겠음 → "생성과 검증 분리 필요한가?" 힌트

#### Q3. 트리거 방식 (Q2가 b일 때만)
- (a) 자동 트리거 → **skill 확정**
- (b) 명시 호출만 → **command 확정**
- (c) 둘 다 → **skill 권장 + 짝 커맨드 생성** 옵션

#### 분류 결과 공개

```
🎯 분류 결과

요구사항: <한 문장>
Q1 반복: <답변>
Q2 협업: <답변>
Q3 트리거: <답변 or N/A>

→ **<skill | command | team | agent>** 로 생성을 권장합니다.
근거: <한 줄>

이대로 진행할까요?
```

사용자 승인 후에만 Phase 2.

## Phase 2 — Delegation

`asset-factory/references/delegation-map.md` 참조:

### skill → skill-author 위임
- Q1~Q3 답변을 skill-author의 Phase 0 결과로 전달
- Q1 목적 초안까지 만들어서 넘김
- skill-author는 중복 Pre-scan 생략하고 Q2~Q6 + Sanity check부터

### team → harness-factory 위임
- Q1~Q3 답변으로 harness-factory Phase 0 + Q1(태스크 성격) 힌트 생성
- 기존 `./.claude/agents/` 스캔 결과 이관
- harness-factory는 기본 5 질문 + Deep-dive 옵트인 수행

### command → 인라인 인터뷰 (3 질문)
- C1 목적·입력 / C2 출력 / C3 워크플로 단계
- 답변 후 `cfh new command <name>` + Write로 TODO 채움
- `cfh validate` 안내

### agent (단독) → 스캐폴드 + 간단 인터뷰
- 대부분 team 권장 (harness-factory로 재분류 제안)
- 명확히 기존 skill 내부용이면 `cfh new agent <name> --project` 스캐폴드

## 종료 보고

```
✅ asset-factory 위임 완료

분류 결과: <kind>
생성된 자산: <path 목록>

확인 명령:
  cfh list
  cfh validate
  cfh trace "..."   (skill인 경우)

다음 제안: <references 채우기 / 커밋 / 시운전>
```

</workflow>

<output_format>

각 Step·Phase 완료 시 사용자에게 보고:

- **Step 1a 완료**: 요구사항 확인 (한 줄 반복)
- **Step 1b 완료**: 중복 카드 (유사 자산 있으면 선택지, 없으면 "진행")
- **Step 1c 완료**: 분류 결과 카드 (Q1~Q3 답변 + 결론 + 근거) — 사용자 승인 대기
- **Phase 2 시작**: "이제 `<대상 스킬>`로 넘어갑니다. 남은 질문 <N>개" 안내
- **전체 종료**: 생성된 자산 경로 + 검증 명령 + 다음 단계 제안

</output_format>

<constraints>
- 분류 전 파일 생성·편집 금지.
- Phase 1 Q1=(b)일 때 억지로 자산 생성하지 말 것 — "그냥 요청하세요" 안내가 더 효율.
- 위임 시 asset-factory가 확보한 답변을 전달하여 **중복 질문 방지**.
- 분류 결과는 반드시 사용자에게 공개하고 승인 후 Phase 2 진입.
- 분류가 애매하면 `classification-tree.md`의 "경계 케이스"를 참조해 유사 사례 제시.
</constraints>
