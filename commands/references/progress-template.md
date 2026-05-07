# PROGRESS.md (단일 출처)

`/cfh-progress`가 생성·갱신하는 **세션 연속성 아티팩트**의 표준 형식.
프로젝트 루트에 `./PROGRESS.md`로 두고 git에 커밋하면 다음 세션·다른 사람·다른 기계에서 이어받을 수 있습니다.

## 원칙

1. **자동 생성 금지.** `/cfh-progress init`로 사용자가 명시적으로 시작.
2. **append-only가 기본.** 이전 항목은 수정·삭제하지 않음 (정정은 새 항목으로).
3. **요약은 사람이 읽도록.** Claude의 출력 그대로 dump 금지 — 결정·미해결·다음 단계 3가지로 압축.
4. **민감 정보 금지.** 키·토큰·내부 URL은 본문에 쓰지 말 것 (코드 변경 사항도 commit hash로만 참조).

## 파일 형식

```markdown
---
project: <name from package.json or directory>
created: 2026-04-20T10:00:00.000Z
last_updated: 2026-04-25T14:32:00.000Z
sessions: 7
---

# PROGRESS — <project name>

> Claude Code 세션 간 연속성 노트. `/cfh-progress` 또는 Stop 훅이 갱신.
> 이전 항목 수정 금지 — 정정은 새 entry로.

## 다음 단계 (Next Up)

이 섹션은 **항상 최상단**, **다음 세션 시작 시 가장 먼저 읽힐** 것을 가정.

- [ ] <할 일 한 줄>
- [ ] <…>

## 미해결 질문 (Open Questions)

- ❓ <답을 기다리는 질문 — 누구에게/언제>

## 결정 로그 (Decision Log)

### 2026-04-25 14:32 — <session id slice or topic>

**결정**: <한 줄 결론>
**이유**: <2~3 문장 — 무엇을 trade-off했는지>
**대안**: <기각된 옵션과 기각 이유 1줄>
**참조**: <commit hash | PR | 파일경로:라인>

### 2026-04-23 09:14 — Retro 블록 도입

**결정**: 5개 작업 커맨드의 종료 보고에 🔄 Retro + 📝 제안 커밋 블록 통합.
**이유**: "효과 있었음 / 실패함" 데이터를 매 작업마다 자동 캡처해야 cfh evolve가 진짜 진화로 이어짐.
**대안**: 별도 /cfh-retro 단독 호출 — 사용자가 매번 기억해야 해서 누락 위험 큼.
**참조**: commit cc1350d, retro-and-commit.md

## 세션 로그 (Session Log)

가장 최근 세션부터. 한 세션 = 1~3줄. **자세한 회고는 `~/.claude/.cfh-logs/retros/`에 별도 저장**.

### 2026-04-25 14:32 (session 26246d5f...)

`/cfh-plan` → cost telemetry 구현. 8개 task 중 4개 완료. 다음 세션은 A.2 Session Memory부터.

### 2026-04-23 09:14 (session f662432e...)

0.9.0 retro+commit 블록 5개 커맨드에 추가. Stop 훅 + retro hook 스크립트.
```

## /cfh-progress 동작 모드별 형식

### init

새 PROGRESS.md 생성. frontmatter + 빈 4 섹션.

### append (기본)

- "다음 단계"는 사용자 입력 또는 직전 turn에서 추출 → **상단 섹션 유지** (최상단에 미완료 체크박스)
- 새 결정 항목을 "결정 로그" 최상단에 prepend
- 새 세션 항목을 "세션 로그" 최상단에 prepend
- frontmatter `last_updated`·`sessions++` 갱신

### show

stdout으로 PROGRESS.md 본문 그대로 출력 + 다음 단계 체크박스 진척률 한 줄 ("다음 단계 7개 중 3개 미완료").

## Stop 훅 자동 append 조건

`cfh-progress-hook.sh`는 다음 **모두** 충족할 때만 발동:

1. `./PROGRESS.md`가 이미 존재 (자동 생성 안 함)
2. 직전 assistant 메시지에 다음 중 하나
   - `🔄 Retro` 블록
   - `## 결정` 또는 `## Decision`
   - 명시적 `/cfh-progress` 호출
3. 옵트인 (`cfh log --status`가 enabled)

조건 미충족이면 silent 종료. 자동 commit 금지.

## 사용 예

```bash
# 첫 세션 — 명시 init
/cfh-progress init

# 작업 중·후 — 직전 retro 블록 + 새 결정 추가
/cfh-progress

# 다음 세션 시작 — 인계 받기
/cfh-progress show
```

## 데이터 위치

- **본문 파일**: `./PROGRESS.md` (project-local, git-tracked)
- **상세 회고 (옵션)**: `~/.claude/.cfh-logs/retros/<date>-<slug>.md` (`/cfh-retro`가 따로 저장)

PROGRESS.md는 **요약**, retros/는 **상세**. 한 프로젝트의 진행 상황을 빠르게 훑을 땐 PROGRESS.md, 특정 작업의 회고를 다시 보고 싶을 땐 retros/.

## /cfh-retro·/cfh-feedback과의 책임 분리

| 도구 | 대상 | 영속성 | 위치 |
|---|---|---|---|
| `/cfh-feedback` | **스킬 자체**에 대한 의견 | 영구 (jsonl) | `~/.claude/.cfh-logs/<skill>.jsonl` |
| `/cfh-retro` | **작업 한 건**의 효과/실패 회고 | 영구 (md) | `~/.claude/.cfh-logs/retros/` |
| `/cfh-progress` | **프로젝트 한 개**의 결정·다음 단계 | 영구 (md, git) | `./PROGRESS.md` |

세 도구가 cascade 관계: feedback < retro < progress (스킬 < 작업 < 프로젝트).
