# 평가 5축 정의

각 전문가 에이전트는 본 문서의 정의를 기준으로 판정한다. 종합자와 검수자도 동일 기준을 공유한다.

## 1. FE-fit (fe-fit-evaluator)

**무엇을 보나**: 자산이 React/Vue/Next/Svelte/Astro/SolidJS 등 FE 컨텍스트에서 *자연스럽게* 작동하는가.

**판별**:
- `usable` — FE 엔지니어가 그대로 적용 가능.
- `partial` — 작동은 하지만 어휘·예시·테스트 도구 일부 적응 필요.
- `unusable` — 핵심 가정이 FE 배제 (서버 프로세스, DB migration, native subprocess 등).

**관찰 신호**:
- "React"·"Vue"·"component"·"JSX" 명시 → usable
- "browser"·"DOM"·"viewport"·"Testing Library" → FE 친화
- "subprocess"·"server start"·"DB migration" 단독 → unusable

## 2. BE-fit (be-fit-evaluator)

**무엇을 보나**: Node API / Python / Go / Java/Kotlin / Rust / DB / 백엔드 CLI.

**판별 신호**:
- "API"·"endpoint"·"middleware"·"DB"·"migration"·"ORM" → BE 친화
- "Jest (Node)"·"pytest"·"Go test"·"JUnit" → BE 친화
- DOM·viewport·JSX 단독 가정 → BE unusable

## 3. Domain-leak (domain-leak-detector)

**무엇을 보나**: *암묵적* 단일 도메인 가정.

**leak kind**:
- `example` — 예제 코드/데이터가 한 도메인만 (JSX 스니펫이 generic skill에 박혀 있음)
- `terminology` — 어휘가 한쪽 (component, hook, route)
- `tool` — 특정 도구를 추상화 없이 명시 (Vite, esbuild, prisma)
- `framework` — 프레임워크 idioms (useEffect, getServerSideProps)
- `environment` — 환경 가정 (브라우저 / Node / CLI)

**중요**: leak ≠ scope. 명시적으로 "for React"라고 쓰여있으면 *scope*이지 *leak*이 아님.

## 4. Generalizability (generalizability-strategist)

**무엇을 보나**: FE/BE 너머 *제3 도메인* 적용 가능성 + 필요 변경.

**제3 도메인**: cli, data, devops, library, ml, mobile, embedded, game.

**fit 등급**:
- `out_of_box` — 즉시 사용 가능
- `with_changes` — 변경 1~3건으로 사용 가능 (`required_changes` 출력)
- `not_applicable` — 도메인 모순

**change_kind**:
- `abstract_example`, `add_alt_example`, `rename_term`, `remove_assumption`, `split_skill`

## 5. Cohesion (cohesion-auditor)

**무엇을 보나**: 자산 묶음 *내부* 일관성. **전역 1회**.

**클러스터 종류**:
- `overlap` — 두 자산이 같은 일
- `trigger_ambiguity` — 발화 시점 불명확
- `naming` — 형제 자산이 공유 규약을 깸
- `gap` — 자명한 워크플로 없음

## 축 간 관계

| 축 | 출력 | 자산 단위 | 전역 |
|---|---|---|---|
| FE-fit | verdict (usable/partial/unusable) | ✓ | |
| BE-fit | verdict | ✓ | |
| Domain-leak | leaks 리스트 | ✓ | |
| Generalizability | 도메인+변경 리스트 | ✓ | |
| Cohesion | clusters 리스트 | | ✓ |

종합자(synthesizer)가 자산 1개당 5축을 합쳐 `per-asset assessment` 1건을 만든다.
