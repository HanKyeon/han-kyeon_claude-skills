# Trigger Patterns — description 작성 가이드

SKILL.md frontmatter의 `description`은 Claude Code가 **이 스킬을 언제 로드할지 결정**하는 유일한 신호입니다. 본문은 트리거 이후에만 읽힙니다.

## 좋은 description의 3요소

1. **When** — 어떤 발화·의도·파일 패턴에서 떠야 하는가
2. **What** — 떴을 때 무엇을 하는가 (1 문장)
3. **Not when** — 비슷하지만 떠서는 안 되는 상황

## 좋은 예시 10개

### 1. 명확한 키워드 + 반-트리거

```yaml
description: |
  Use this skill when the user mentions refactoring (리팩터링, refactor,
  restructure, cleanup, migration), proposes structural changes to existing
  code without changing behavior, or is cleaning up legacy code. Provides
  strategy and safety guardrails. Do NOT trigger for bug fixes — those
  intentionally change behavior.
```

### 2. 파일 패턴 포함

```yaml
description: |
  Use this skill when the user is authoring or editing files under
  src/hooks/ or files matching *.hook.ts. Enforces the project's custom
  hook conventions (naming, cleanup, SSR guards). Do NOT trigger for
  React built-in hooks inside components.
```

### 3. 특정 라이브러리

```yaml
description: |
  Use this skill when working with React Query (TanStack Query): writing
  useQuery/useMutation, cache invalidation, optimistic updates, or
  troubleshooting stale data. Cites the official "Practical React Query"
  anti-patterns. Do NOT trigger for general data-fetching questions
  unrelated to React Query.
```

### 4. 역할/페르소나

```yaml
description: |
  Use this skill when the user asks for a code review, PR review, or
  uses words like "review this", "리뷰", "피드백". Runs a multi-axis
  review (security, perf, types, a11y). Do NOT trigger for casual
  "does this look OK?" questions — those want a quick take, not a full review.
```

### 5. 워크플로 시작 신호

```yaml
description: |
  Use this skill when the user wants to start TDD (testing 먼저, 테스트
  우선, test-driven), is beginning a new feature, or is adding a
  regression test for a bug. Runs a 5-phase workflow with overfit guards.
  Do NOT trigger when the user only wants to add tests to existing stable
  code (that is a test-fill task, not TDD).
```

### 6. 도메인 지식

```yaml
description: |
  Use this skill when working with medical/healthcare FE forms that handle
  HIPAA-sensitive fields (patient names, DOB, SSN). Enforces redaction in
  logs, localStorage avoidance, and consent UX patterns. Do NOT trigger
  for generic forms.
```

### 7. 도구/환경 특화

```yaml
description: |
  Use this skill when configuring Vite, writing vite.config.ts, diagnosing
  build/HMR issues, or migrating from Webpack. Do NOT trigger for generic
  JS module questions.
```

### 8. 협업 프로세스

```yaml
description: |
  Use this skill when creating a PR description, commit message, or
  release note. Enforces Conventional Commits + project template. Do NOT
  trigger for inline code comments.
```

### 9. 안티-패턴 감시

```yaml
description: |
  Use this skill when the user writes or edits useEffect. Flags known
  anti-patterns (effect-as-derivation, missing cleanup, eslint-disable
  on deps). Cites React docs. Do NOT trigger for useLayoutEffect or
  custom hooks that wrap useEffect internally.
```

### 10. 자동화 메타-스킬

```yaml
description: |
  Use this skill when the user asks to create, design, or modify a Claude
  Code skill itself (meta-authoring). Interviews the user and drafts
  SKILL.md. Do NOT trigger for using an existing skill.
```

## 나쁜 예시 5개

### ❌ 1. 너무 짧음

```yaml
description: Helps with tests.
```

Claude가 언제 떠야 할지 모름. 최소 20자 + 구체 키워드.

### ❌ 2. 반-트리거 없음 — 오발동

```yaml
description: Use this skill whenever code is discussed.
```

모든 대화에서 뜸 → 토큰 낭비 + 무의미.

### ❌ 3. 키워드 과다 나열 (연결고리 없음)

```yaml
description: |
  React, Vue, Svelte, Angular, Next, Nuxt, SvelteKit, Remix, Astro,
  SolidJS, Preact — any frontend framework code.
```

범위가 너무 넓음. 프레임워크별 스킬로 분리.

### ❌ 4. 모호한 트리거

```yaml
description: Use this skill when code quality matters.
```

"quality matters"는 항상 참. 사실상 무조건 발동.

### ❌ 5. 자기 참조

```yaml
description: Use this skill when you need this skill.
```

Claude가 "이 스킬이 필요한 상황"을 스스로 정의할 단서 없음.

## 체크리스트

description 작성 후 셀프체크:

- [ ] 키워드 3~7개 포함
- [ ] "Do NOT trigger for ..." 문장 1개 이상
- [ ] 50~500자 (너무 짧거나 길지 않게)
- [ ] 한국어 키워드 + 영어 키워드 병기 (다국어 프로젝트)
- [ ] `Use this skill when ...` 또는 명확한 트리거 동사로 시작
