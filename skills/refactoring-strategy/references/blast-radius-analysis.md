# Blast Radius Analysis

변경이 **어디까지 영향을 미치는가**를 수정 전에 파악하는 절차.

## 왜 중요한가

리팩터링 실패의 90%는 "생각 못 한 곳에 영향이 감"에서 온다.
- Import chain
- 동적 import / lazy load
- Type 상속
- 테스트 간접 의존
- 런타임 string key 참조 (queryKey 팩토리, i18n 키 등)

## 분석 단계

### 1. 직접 import 스캔

```bash
# 함수/컴포넌트 이름으로 역참조
grep -rn "import.*Foo" src/
grep -rn "from.*path/to/foo" src/
```

TypeScript 프로젝트는 IDE의 "Find All References" 기능이 가장 정확하다.

### 2. 타입 의존 스캔

변경 대상이 export하는 **타입**을 import하는 곳:

```bash
grep -rn "import.*type.*Foo" src/
grep -rn "Foo\['" src/          # Foo['field'] 형태
grep -rn "typeof.*foo" src/
```

### 3. 간접 참조 스캔

**문자열 키**, **동적 import**, **조건부 mount** 등:

```bash
# React Router path 참조
grep -rn "'/foo'" src/
grep -rn '"/foo"' src/

# React Query key 참조
grep -rn "queryKeys\.foo" src/
grep -rn "queryKey: \['foo'" src/

# i18n/translation key
grep -rn "t\('foo\." src/
```

### 4. 테스트 의존

테스트 파일이 대상을 import하는지 + mock하고 있는지:

```bash
grep -rn "vi\.mock.*foo" src/
grep -rn "jest\.mock.*foo" src/
```

### 5. 빌드 산출물/설정

```bash
# Vite/Webpack config
grep -n "foo" vite.config.* webpack.config.*

# 환경변수
grep -rn "VITE_FOO\|REACT_APP_FOO" src/

# 타입 체크 (전체 영향 확인)
npx tsc --noEmit
```

## 영향도 분류

| 영향 레벨 | 의미 | 대응 |
|---|---|---|
| **Internal** | 함수 내부만 변경 | 검증: 단위 테스트만 |
| **File-local** | 한 파일 내 | 검증: 파일 테스트 + 이 파일 import하는 곳 smoke |
| **Module** | 한 디렉터리 내 여러 파일 | 검증: 관련 페이지 smoke test |
| **Cross-module** | 공용 유틸/타입 | 검증: 전체 타입체크 + 주요 화면 전수 smoke |
| **Public API** | 외부에 노출된 시그니처 | 검증: 모든 consumer 수동 확인 + major 버전 고려 |

## 리포트 포맷

변경 전 사용자에게 브리핑할 표준 포맷:

```markdown
## Blast Radius — <변경 대상>

**직접 참조 (N개 파일)**:
- src/a.tsx:12 — import
- src/b.ts:45 — type import
- ...

**간접 참조 (M개)**:
- src/c.tsx:88 — queryKey 문자열
- src/d.ts:3 — dynamic import()

**테스트 (K개)**:
- src/a.test.tsx — 전체 테스트 영향
- src/foo.integration.test.tsx — mock 대상

**영향 레벨**: Cross-module
**검증 계획**: 타입체크 + Playwright smoke (/foo, /bar 페이지) + 기존 테스트
```

## 자동화 힌트

### ts-morph로 프로그램적 분석

```ts
import { Project } from 'ts-morph';

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });
const sourceFile = project.getSourceFile('src/foo.ts');
const refs = sourceFile?.getExportedDeclarations();
// 각 export가 참조되는 파일 목록 추출
```

### Madge로 의존성 그래프

```bash
npx madge --image graph.svg src/foo.ts
```

## 주의 사항

- **grep은 false positive가 많다**. 동명이인 함수, 주석, 문자열 리터럴에 걸림. 수동 검토 필수.
- **암시적 의존**(전역 CSS, side effect import)은 grep으로 안 잡힘. 수동으로 검토.
- **런타임 분기**(feature flag, 환경변수)는 **모든 분기를 검증**해야 한다.

## AI 에이전트 규칙

Blast Radius 분석을 수행할 때 AI는:

1. **변경 전 반드시 스캔 수행**. 결과를 사용자에게 브리핑.
2. **불확실한 참조는 사용자에게 확인**. "이 queryKey 문자열이 여기서도 쓰이는데, 이것도 영향 범위인가요?"
3. **타입체크를 항상 실행**. `tsc --noEmit`로 전체 영향 확인.
4. **검증 계획을 명시**. "어떻게 회귀를 확인할지"를 사용자와 합의.
