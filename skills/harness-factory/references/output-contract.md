# Output Contract

harness-factory가 Phase 5에서 생성하는 파일 구조와 Claude Code 등록 규칙.

## 디렉터리 레이아웃

```
<project-root>/.claude/
├── agents/
│   ├── <agent-1>.md
│   ├── <agent-2>.md
│   └── ...
├── skills/
│   └── <team-skill>/
│       ├── SKILL.md
│       └── references/
│           └── <아키텍처 다이어그램·워크플로 문서>
└── commands/              (선택)
    └── <orchestrator>.md
```

## 프로젝트 로컬 vs 전역

- **프로젝트 로컬** (`.claude/`): 이 팀이 **이 프로젝트에만** 속할 때. 기본값.
- **전역** (`~/.claude/`): 팀을 여러 프로젝트에서 재사용할 때. 드물다 — 대부분 프로젝트별 컨텍스트가 있어 전역은 부적합.

## Claude Code 등록

Claude Code는 세션 시작 시 아래 경로를 자동 스캔:
- `<cwd>/.claude/agents/*.md` — 프로젝트 에이전트
- `<cwd>/.claude/skills/*/SKILL.md` — 프로젝트 스킬
- `<cwd>/.claude/commands/*.md` — 프로젝트 슬래시 커맨드
- `~/.claude/agents/*.md` — 사용자 전역 에이전트
- `~/.claude/skills/*/SKILL.md` — 사용자 전역 스킬
- `~/.claude/commands/*.md` — 사용자 전역 슬래시 커맨드

## Agent Teams 실험 플래그

에이전트 간 직접 메시지 교환 (예: Fan-out/Fan-in의 Aggregator가 Workers 호출)이 필요하면:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

이 플래그 없이는 `Task` 도구를 통한 1회 delegation만 가능. Pipeline·Expert Pool은 `Task`로 충분.

## 파일 생성 순서 (권장)

1. `.claude/agents/` — 에이전트부터 (의존성 없음)
2. `.claude/skills/<team-skill>/references/` — 참조 자료
3. `.claude/skills/<team-skill>/SKILL.md` — 팀을 묶는 스킬
4. `.claude/commands/<orchestrator>.md` — 슬래시 커맨드 (선택)

## 검증 체크리스트

생성 직후 다음을 확인:

- [ ] 모든 `.md` 파일이 유효 YAML frontmatter로 시작
- [ ] `name` 필드가 파일명과 일치
- [ ] `tools` 필드가 존재하는 도구만 참조
- [ ] `description`이 50자 이상, 구체 키워드 포함
- [ ] 에이전트 간 이름 충돌 없음
- [ ] `cfh validate`로 검증 통과

## 시운전 (Phase 6)

생성 후 세션 재시작 또는 `/agents` 명령으로 Claude Code가 새 에이전트를 인식하는지 확인. 이후 샘플 태스크 1개로 흐름 테스트.

## 삭제·수정

- 팀을 해체하려면 `.claude/agents/<name>.md` 및 `.claude/skills/<team-skill>/` 제거.
- Git tracked이면 `git rm`.
- 에이전트 이름 변경 시 참조하는 스킬·커맨드·문서 모두 갱신.
