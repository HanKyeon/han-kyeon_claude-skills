<s>
**`-gen` suffix 컨벤션 (1.0)**: 이 커맨드(`/cfh-refactor`)는 **FE(React/Vue) 치중** 가이드 — queryKey·i18n·React Suspense·RTL·MSW 같은 FE-specific Blast Radius 축과 라이브러리 안티패턴을 우선 적용합니다. **BE·스택 중립** 리팩터링은 `/cfh-refactor-gen`로 가세요 (ORM·HTTP client·DI·migration·observability 축).

이 커맨드는 `refactoring-strategy` 스킬을 활성화하여 **안전한 리팩터링 워크플로**를 시작합니다.
스킬이 자동으로 트리거되지 않은 상태라면 지금 `~/.claude/skills/refactoring-strategy/SKILL.md`를 읽고 그 원칙에 따라 진행하세요.
</s>

<invocation>
리팩터링 작업을 시작합니다.

**대상**: `$ARGUMENTS`

- 파일/디렉토리 경로가 주어졌다면 해당 범위로 Scope를 설정
- 비어있다면 사용자에게 Scope를 질문

</invocation>

<workflow>

## Phase 0a — Stack misroute suggestion

입력 받은 직후 stack 신호 자가 평가. opposite(`/cfh-refactor-gen`) 신호가 강하면 (`[verified]`/`[inferred]` 2+) 다음 형식으로 제안 (강제 X):

```
   📌 이대로 진행: refactoring-strategy FE 가이드 (queryKey·tsc·RTL)
   💡 **더 적합해 보이는 대안 — /cfh-refactor-gen** — 신호: <인용>
   진행: yes / switch / explain
```

상세는 `commands/references/soft-routing.md`. 신호 약하면 출력 안 함.


## Step 1 — Scope Narrowing (사용자 질문, 추천+이유 패턴 적용)

`refactoring-strategy/references/scope-narrowing.md`의 8 질문을 **3~4개씩 묶지 말고 한 번에 한 질문**으로 순차 수행 (grilling 컨벤션):

- Q1 범위 축 (Breadth)
- Q2 깊이 축 (Depth)
- Q3 행동 변경 여부
- Q4 시간 박스
- Q5 리스크 허용
- Q6 테스트 포함 여부
- Q7 Scope 외 이슈 정책
- Q8 완료 기준

답을 받기 전에 코드 수정 금지. 레거시/마이그레이션/성능/접근성 리팩터링이면 follow-up 질문 추가.

**각 질문은 추천 + 이유 + 다른 옵션 형식**:

```
❓ Q1: 범위 축은? 단일 파일인가 디렉터리 전체인가?

📌 추천: <상황별>
   예 (대상이 단일 컴포넌트일 때):
     "단일 파일"
     이유:
       - [verified] 대상이 src/components/Foo.tsx 한 파일
       - [inferred] Blast Radius가 좁아 안전망 작게 가능
   예 (legacy 디렉터리 정리일 때):
     "디렉터리 전체"
     이유:
       - [verified] $ARGUMENTS가 디렉터리 경로
       - [inferred] 일관성 유지 위해 한 PR에 묶는 게 자연스러움

다른 옵션:
  - <대안> — <조건>일 때 적합

답변: 추천대로 / <대안> / 다른 답
```

상세 추천 패턴: `commands/references/recommendation-pattern.md`.

**(grill) 옵션**: Step 1 종료 후 사용자가 "더 깊이 봐야 할 결정이 많다"고 느끼면 `/cfh-grill`로 위임. Q1~Q8 답변 + Project Profile + Blast Radius 결과 컨텍스트로 자동 이관.

자주 grill 가치 있는 sub-branches (Step 1 종료 시 hint로 노출 권장):
- migration 전략 (big-bang vs strangler-fig vs adapter)
- 회귀 테스트 layer (unit / characterization / smoke / e2e)
- 라이브러리 안티패턴 우선순위 (어느 패턴부터 제거)
- PR 분할 경계 (vertical slice vs horizontal slice)

**질문과 결과 설명 구분**:
- **질문**: 개발 판단에 필요한 정보 획득용. 추천+이유 동반.
- **결과 설명**: Why/What/How/What if 4축 (`references/reasoning-format.md`) — 출력 전용.

## Step 2 — Project Profile 스캔

- `CLAUDE.md`, `.eslintrc*`, `tsconfig.json`, `package.json`
- 변경 대상 영역의 기존 파일 샘플 3~5개
- 테스트 프레임워크 존재 여부

결과를 사용자에게 한 줄로 브리핑.

## Step 3 — Blast Radius 분석

`refactoring-strategy/references/blast-radius-analysis.md` 절차 적용:

- 직접 import 스캔
- 타입 의존 스캔
- 간접 참조 (queryKey, i18n key, path 문자열, 동적 import)
- 테스트 의존
- 설정 파일 영향

**사용자에게 영향 범위 브리핑**한 뒤 진행 승인 받기.

## Step 4 — Safety Net 구축

테스트 부재 상황별 대응:

| 테스트 상태 | 대응 |
|---|---|
| 충분 | 기존 테스트 GREEN 확인 후 바로 Step 5 |
| 부분 존재 | 변경 영역에 해당하는 테스트 있는지 확인, 없으면 Characterization Test 제안 |
| 거의 없음 | **Step 5 진행 전 반드시 Characterization Test 작성** (`refactoring-strategy/references/characterization-test.md`) |
| 없음 + 도입 불가 | 사용자에게 Playwright smoke test 최소 세트 제안 |

## Step 5 — Small PR 계획 (추천+이유 패턴)

`refactoring-strategy/references/small-pr-guide.md` 기준:

- 목표 크기: Small 이하 (50~200줄, 5파일 이내)
- 쪼개는 전략: Vertical Slice / Horizontal Slice / Scaffolding / Adapter

**분할 전략 추천**:

```
📌 추천 분할 전략: <Vertical Slice | Horizontal Slice | Scaffolding | Adapter>
   이유:
     - [verified] Blast Radius 결과 — <영향 파일 수·도메인 경계>
     - [verified] Q3 행동 변경 여부 — 보존만이면 Scaffolding 적합 등
     - [inferred] PR 분할 시 의존성 순서 — 어느 PR이 먼저 가야 하는지

다른 옵션:
   - Vertical Slice — 사용자 동선 전체를 한 PR에 (test→impl→consumer) — 작은 기능에 적합
   - Horizontal Slice — 같은 layer를 가로지르는 변경 (모든 컴포넌트의 prop rename 등) — codemod류
   - Scaffolding — 새 구조 추가 → 기존 마이그레이션 → 기존 제거 (3+ PR) — 큰 변경 안전 분할
   - Adapter — 신/구 인터페이스 동시 지원 → 점진 전환 → 구 제거 — breaking change 회피

분할 결과 (PR별):
  PR 1: <subject>  (~N줄, M파일)
    커밋 메시지: refactor: <설명>
    의존: 없음 (먼저 가도 됨)
  PR 2: <subject>  (~N줄, M파일)
    의존: PR 1 머지 후

답변: 추천대로 / 다른 전략 / PR 분할 수정 / grill (전략 결정을 깊이 파기)
```

상세 추천 패턴: `commands/references/recommendation-pattern.md`.

사용자 승인 후 각 PR 단위로 실행.

## Step 6 — 실행 + 검증

각 PR마다:
1. 변경 적용
2. `npx tsc --noEmit` 등 타입체크
3. 관련 테스트 실행
4. Blast Radius 검증 (수동 smoke)
5. 커밋 (메시지: `refactor: <무엇을 어떻게>`, Why/What NOT changed/Risk 포함)

## Step 7 — Legacy 기록

`refactoring-strategy/references/legacy-tolerance.md` 기준:

작업 중 발견한 **Scope 외** 이슈는:
- Critical → 즉시 보고, 별도 hotfix
- High/Medium/Low → Issue 트래커로 분리, **TODO 주석 남기지 않음**

PR 설명에 "Found but not fixed" 섹션 자동 생성.

## Step 8 — 최종 보고

완료 시 다음 형식으로 리포트:

```markdown
## Refactoring Summary

- **Scope**: <...>
- **PR 수**: N개
- **행동 변경**: 없음 / 있음 (목록)
- **추가된 테스트**: Characterization N개 / Smoke N개
- **Found but not fixed**: <Issue 링크 목록>
- **검증**: tsc ✅ / tests ✅ / smoke ✅
- **다음 단계 후보**: ...
```

### 다음 단계 권장 (필수 출력)

```
✅ 리팩터링 완료

🔄 Retro
  효과 있었음: <bullet 1~3 — 분해 전략·Safety Net·Blast Radius 판단 등>
  실패·삽질: <bullet 1~3 또는 "해당 없음">
  다음엔 바꿀 것: <bullet 1~3 — Found but not fixed와 구분, 작업 방식 개선만>
  저장: /cfh-retro로 영구 기록 가능

📝 제안 커밋  (이미 PR 단위로 분할됐으므로 PR별 커밋 메시지 모음)
  PR 1: <subject + body>
    스테이지: <파일 목록>
  PR 2: <subject + body>
    스테이지: <파일 목록>
  ...
  근거: Step 5 Small PR 분해 + Step 8 보고
  진행: yes / edit-msg / merge-into-fewer / no-commit

다음 단계:
- 머지 전 자체 점검 → /cfh-review (각 PR 단위로)
- 이번 워크플로 피드백 → /cfh-feedback refactoring-strategy "<comment>"
- (조건부) 💡 Team 활용 가능 — 신호 강도 따라 1~2줄 hint
```

**Team Suggestion** (조건부 — `commands/references/team-suggestion.md` § A):

Expert Pool 패턴 추천 신호 (refactor 특화):
- **strong**: Blast Radius ≥ 5축 + 영향 파일 ≥ 10 + 대규모 legacy (저자 N+·컨벤션 혼재) → 2줄 hint (`💡 (옵션) Expert Pool 가치 큼: Blast Radius <N>축 — \`why teams\``)
- **medium**: Blast Radius 3~4축, 영향 5~10 파일 → 1줄 hint
- **weak**: 단일 파일·소규모 → 출력 X

사용자 `why teams` 입력 시 full 분석 lazy load.

**Retro·Commit 블록 형식**: `commands/references/retro-and-commit.md` 단일 출처. **리팩터 특성상 분할이 이미 Step 5에서 결정**돼있으므로 제안 커밋은 PR별로 메시지를 정렬하는 형태로 출력 (단일 통합 커밋 권장 신호 약함).

### 주요 결정 해설 (4축 포맷)

Scope 분해·PR 분리·라이브러리 안티패턴 지적·대안 비교 등 **중요한 결정**은 `references/reasoning-format.md`의 Why/What/How/What if 포맷으로 설명. 단순 사실 보고(파일 목록, 실행 결과)에는 불필요.

</workflow>

<constraints>
- `refactoring-strategy` 스킬 원칙을 **반드시** 따를 것. 특히:
  - 외부 베스트 프랙티스 강요 금지 — 프로젝트 고유 규칙과 라이브러리 공식 문서만 근거로
  - Small PR — 한 PR은 하나의 주제만
  - Scope 밖 수정은 **매번 사용자 승인** 필요
  - 라이브러리 안티패턴 지적 시 공식 문서 링크 필수 (`refactoring-strategy/references/library-anti-patterns.md` 참조)
- 행동 보존 안전망(테스트) 없이 대규모 변환 금지.
- 매 Step 진행 전 사용자 승인. 조용히 많은 일을 하지 말 것.
- 한국어로 설명, 코드와 커밋 메시지의 기술어는 영어.
- Step 8 보고에서 **Retro·제안 커밋 블록 생략 금지**. 형식은 `commands/references/retro-and-commit.md`.
- 자동 commit 금지. PR별 커밋 메시지를 제안만 하고 사용자 명시 yes 후 진행.
</constraints>
