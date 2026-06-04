<s>
**`-gen` suffix 컨벤션 (1.0)**: suffix 없는 `/cfh-refactor`는 FE(React/Vue) 치중 시그널·예시·라이브러리 안티패턴이 풍부, `-gen` suffix는 **BE·스택 중립** 의미 — Node·Python·Go·Rust·Java·CLI·라이브러리·데이터 파이프라인 등. 이 컨벤션은 `cfh-tdd` ↔ `cfh-tdd-gen`, `cfh-tc` ↔ `cfh-tc-gen`과 동일.

이 커맨드는 `refactoring-strategy` 스킬을 활성화하되 **BE / 스택 중립 컨텍스트**로 진행합니다. Scope Narrowing 8 질문·Blast Radius 분석·Small PR 계획 같은 메타 단계는 동일하지만, 다음을 **FE-specific 가이드 대신** 적용:

- **Blast Radius**: `queryKey`·i18n 키·React `Suspense` 경계 대신 → DB schema migration·API contract·trace span·idempotency key·DI 컨테이너·HTTP client 인터페이스
- **Library 안티패턴**: React/Vue 라이브러리 대신 → ORM(Prisma·TypeORM·SQLAlchemy)·HTTP client·DI 프레임워크·Job queue·Logger·Metrics 라이브러리의 official anti-patterns
- **Characterization Tests**: RTL·MSW 대신 → pytest/Vitest table-driven·supertest·integration test 격리 패턴
- **Small PR 분할**: vertical slice 정의가 BE에선 endpoint + handler + repository 트리오로 매핑

**🔀 잘못 진입하셨다면**:
- React/Vue 컴포넌트 리팩터링이면 → `/cfh-refactor` (FE 가이드)
- 새 기능 추가면 → `/cfh-tdd-gen`(BE TDD) 또는 `/cfh-plan`
- 원인 모르는 버그 조사면 → `/cfh-debug`
- 의존성 변경 위주면 PLAN 후 → `/cfh-refactor-gen --strategy migration`(예정)
</s>

<invocation>
BE / 스택 중립 리팩터링 워크플로를 시작합니다.

**대상**: `$ARGUMENTS`

- 파일/디렉토리 경로가 주어졌다면 해당 범위로 Scope를 설정
- 비어있다면 사용자에게 Scope를 질문

**기본 동작**: `refactoring-strategy` 스킬의 5 Step 워크플로 + 추천+이유 패턴 (1.0 컨벤션). FE 키워드(queryKey·RTL·Suspense)는 등장하지 않으며, 위 BE 가이드로 swap.

</invocation>

<workflow>

## Phase 0a — Stack misroute suggestion

입력 받은 직후 stack 신호 자가 평가. opposite(`/cfh-refactor`) 신호가 강하면 (`[verified]`/`[inferred]` 2+) 다음 형식으로 제안 (강제 X):

```
   📌 이대로 진행: refactoring-strategy non-FE 가이드 (DB schema·migration·observability)
   💡 **더 적합해 보이는 대안 — /cfh-refactor** — 신호: <인용>
   진행: yes / switch / explain
```

상세는 `commands/references/soft-routing.md`. 신호 약하면 출력 안 함.


## Step 1 — Scope Narrowing (사용자 질문, 추천+이유 패턴)

`refactoring-strategy/references/scope-narrowing.md`의 8 질문을 **한 번에 한 질문**으로 순차 수행:

- Q1 범위 축 (Breadth) — 파일·모듈·서비스·시스템 경계
- Q2 깊이 축 (Depth) — 시그니처만 vs 내부 구현 vs 데이터 모델
- Q3 행동 변경 여부 (BE 강조: API contract·DB schema 호환성)
- Q4 시간 박스
- Q5 리스크 허용 (BE 강조: prod 트래픽 영향·rollback 비용)
- Q6 테스트 포함 여부 (BE: unit·integration·contract·load)
- Q7 Scope 외 이슈 정책
- Q8 완료 기준

답을 받기 전에 코드 수정 금지. 마이그레이션·성능·관찰성 리팩터면 follow-up 질문 추가.

**각 질문은 추천 + 이유 + 다른 옵션 형식**:

```
❓ Q1: 범위 축은?

📌 추천: <상황별 — BE 컨텍스트>
   예 (단일 endpoint 리팩터):
     "단일 파일 (handler)"
     이유:
       - [verified] $ARGUMENTS가 src/api/foo.controller.ts 한 파일
       - [inferred] Blast Radius가 좁아 contract 테스트로 안전망 충분
   예 (DB 모델 변경 동반):
     "모듈 (handler + repository + migration)"
     이유:
       - [verified] DB schema 영향
       - [inferred] migration·repository·handler가 한 묶음으로 가야 일관성

다른 옵션:
  - <대안> — <조건>일 때 적합

답변: 추천대로 / <대안> / 다른 답
```

상세 추천 패턴: `commands/references/recommendation-pattern.md`.

## Step 2 — Project Profile 스캔 (BE 컨텍스트)

- `CLAUDE.md`, `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml`
- 마이그레이션 도구 (`alembic`/`prisma migrate`/`sqlx migrate`)
- 테스트 프레임워크: `pytest` / `vitest` + `supertest` / `go test` / `cargo test` / JUnit
- 로깅·메트릭·트레이싱 라이브러리 (OpenTelemetry·Sentry·DataDog)
- 변경 대상 디렉터리 샘플 3~5개

결과를 사용자에게 한 줄 브리핑.

## Step 3 — Blast Radius 분석 (BE 컨텍스트)

`refactoring-strategy/references/blast-radius-analysis.md` 절차 적용 — 다만 다음 축으로 확장:

- **직접 import 스캔** (모든 언어)
- **타입·시그니처 의존** (TypeScript interface, Python type hints, Go interface)
- **API 호출 사이트** (HTTP client·gRPC client·내부 RPC)
- **DB schema 의존** (마이그레이션, ORM models, raw SQL)
- **메시지 큐·이벤트** (Kafka topic·SQS queue·Pub/Sub subject)
- **설정 파일·env vars**
- **테스트 의존** (unit + integration + contract + load)
- **관찰성 의존** (trace span name·metric label·log field — string 참조)

**정형 데이터 크로스체크** (→ `commands/references/structured-crosscheck.md`):
위 축들을 *추론으로만* 끝내지 말고, 변경 대상 심볼을 **Grep으로 실제 참조와 대조**해 누락을 잡는다. 추론 영향처 vs `grep -rn "<symbol>"` → 누락 시 severity 분기(직접 import=high→`[verified]`). 정형 데이터(`go list -deps`·import graph·OpenAPI spec·migration 이력)가 *있으면* 활용. **한계**: grep 정적 — 동적 호출·DI 컨테이너·런타임 라우팅 못 잡음, "참고용".

**사용자에게 영향 범위 브리핑**한 뒤 진행 승인 받기.

## Step 4 — Safety Net 구축 (BE 컨텍스트)

| 테스트 상태 | 대응 |
|---|---|
| 충분 | unit + integration GREEN 확인 후 Step 5 |
| 부분 존재 | 변경 영역 contract test or characterization test 작성 |
| 거의 없음 | **Step 5 진행 전 Characterization Test 작성** (`references/characterization-test.md`) — table-driven·snapshot·golden file 패턴 |
| 없음 + 도입 불가 | 사용자에게 smoke test 또는 contract test 최소 세트 제안 |

## Step 5 — Small PR 계획 (추천+이유 패턴)

`refactoring-strategy/references/small-pr-guide.md` 기준 + BE 컨텍스트:

- 목표 크기: Small 이하 (50~200줄, 5파일 이내)
- 분할 전략: Vertical Slice / Horizontal Slice / Scaffolding / Adapter / **Strangler Fig (BE 강조)**

**분할 전략 추천** (BE 컨텍스트):

```
📌 추천 분할 전략: <Vertical Slice | Horizontal Slice | Scaffolding | Adapter | Strangler Fig>
   이유:
     - [verified] Blast Radius 결과 — 영향 endpoint·repository·migration 수
     - [verified] Q3 행동 변경 여부 — API contract 보존이면 Adapter / Strangler Fig 적합
     - [inferred] migration 의존성 — DB 변경이 먼저 deploy되어야 backward-compat 유지

다른 옵션:
   - Vertical Slice — endpoint + handler + repository + migration 한 PR (작은 새 기능에 적합)
   - Horizontal Slice — 모든 handler의 logging 패턴 일괄 변경 같은 codemod류
   - Scaffolding — 새 모듈 추가 → 기존 마이그레이션 → 기존 제거 (큰 변경 안전 분할)
   - Adapter — 신/구 API 동시 지원 → 점진 전환 → 구 제거 (breaking change 회피)
   - Strangler Fig — 새 시스템에 트래픽 점진 라우팅 (서비스 전체 교체)

분할 결과 (PR별):
  PR 1: <subject>  (~N줄, M파일)
    커밋 메시지: refactor: <설명>
    deploy 의존: 없음
  PR 2: <subject>  (~N줄, M파일)
    deploy 의존: PR 1 prod deploy 후

답변: 추천대로 / 다른 전략 / PR 분할 수정 / grill (전략 결정을 깊이 파기)
```

사용자 승인 후 각 PR 단위로 실행.

## Step 6~8 — 실행·검증·보고

`refactoring-strategy` 본문 Step 6~8과 동일 — 다만 검증 단계에서 BE 특화 신호 추가:

- migration 적용 후 rollback dry-run
- contract test (Pact·OpenAPI diff)
- load test 비교 (p50·p95·throughput)
- trace span·metric label 회귀 검증 (관찰성 회귀 위험)
- **언어별 정적 검증 도구를 회귀 게이트로 활용** — Python: `mypy --strict`·`ruff`·`bandit` / Go: `go vet`·`staticcheck`·`go build ./...` / Rust: `cargo clippy`·`cargo check`·`cargo semver-checks` / JVM: SpotBugs·ErrorProne·`detekt`(Kotlin) / Node: `tsc --noEmit`·`eslint`. interface·trait 추출 시 *암묵 구현 컴파일 안전망*으로 필수.

### Team Suggestion (조건부)

Step 8 최종 보고의 "다음 단계 권장" 단락에 *조건부 hint* (정책: `commands/references/team-suggestion.md` § A).

Expert Pool 패턴 추천 신호 (cfh-refactor 동일 + BE 특화):
- **strong**: Blast Radius ≥ 5축 (string 참조·DB schema·event topic·observability·type 등) + 영향 파일 ≥ 10 + 대규모 legacy → 2줄 hint
- **medium**: Blast Radius 3~4축 + migration·observability 결정 다수 → 1줄 hint
- **weak**: 단일 모듈·소규모 → 출력 X

medium 예: `💡 (옵션) team 활용 가능 — \`why teams\``
strong 예: `💡 (옵션) Expert Pool 가치 큼: Blast Radius <N>축 (FE/BE 경계 + observability) — \`why teams\``

사용자 `why teams` 입력 시 full 분석 lazy load.

## (grill) 옵션

Step 1 종료 후 사용자가 "결정 트리 sub-branch가 많다"고 느끼면 `/cfh-grill`로 위임. Q1~Q8 답변 + Project Profile + Blast Radius 결과를 컨텍스트로 자동 이관.

BE 컨텍스트에서 자주 grill 가치 있는 sub-branches:
- migration 전략 (big-bang vs strangler-fig vs adapter)
- API versioning 정책 (URL path vs header vs accept-version)
- DB 마이그레이션 backward-compat 윈도우
- 메시지 큐 schema 변경 호환성
- observability 회귀 vs 정리 trade-off

</workflow>

<output_format>

각 Step 결과는 Why/What/How/What if 4축 형식 (`refactoring-strategy/references/reasoning-format.md`) 권장.

**Retro·Commit 블록** (5개 작업 커맨드 공통):
- 작업 완료 시 🔄 Retro 블록 + 📝 제안 커밋 블록 자동 포함
- 자동 commit 금지 — 사용자 명시 yes 후만 진행
- 형식: `commands/references/retro-and-commit.md`

</output_format>

<constraints>

- **추천 + 이유 패턴 의무화** (Step 1·5 결정 지점) — `commands/references/recommendation-pattern.md`
- **One question per turn** (Step 1 Scope Narrowing 8 질문)
- **사용자 의도 우선** — Q3 행동 보존 여부는 *현재 코드 상태*가 아닌 *사용자 의도*로만 결정
- **BE 컨텍스트 명시** — FE 키워드(RTL·queryKey·Suspense) 등장 시 사용자에게 잘못된 컨텍스트 신호. `/cfh-refactor`로 재라우팅 추천.
- **migration·observability 변경 시 deploy 의존성 명시** — Step 5 분할 결과에 deploy 순서 표시
- **자동 commit·자동 PROGRESS 갱신 안 함**

</constraints>
