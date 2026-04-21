<s>
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

## Step 1 — Scope Narrowing (사용자 질문)

`refactoring-strategy/references/scope-narrowing.md`의 8 질문을 3~4개씩 묶어 순차 수행:

- Q1 범위 축 (Breadth)
- Q2 깊이 축 (Depth)
- Q3 행동 변경 여부
- Q4 시간 박스
- Q5 리스크 허용
- Q6 테스트 포함 여부
- Q7 Scope 외 이슈 정책
- Q8 완료 기준

답을 받기 전에 코드 수정 금지. 레거시/마이그레이션/성능/접근성 리팩터링이면 follow-up 질문 추가.

**질문과 결과 설명 구분**:
- **질문**: 개발 판단에 필요한 정보 획득용. 자연스러운 형태로.
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

## Step 5 — Small PR 계획

`refactoring-strategy/references/small-pr-guide.md` 기준:

- 목표 크기: Small 이하 (50~200줄, 5파일 이내)
- 쪼개는 전략 제안: Vertical Slice / Horizontal Slice / Scaffolding / Adapter
- 각 PR의 **커밋 메시지 초안** 제시

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

다음 단계:
- 머지 전 자체 점검 → /cfh-review (각 PR 단위로)
- 이번 워크플로 피드백 → /cfh-feedback refactoring-strategy "<comment>"
```

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
</constraints>
