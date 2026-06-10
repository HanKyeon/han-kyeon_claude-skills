<s>
이 커맨드는 **현재 세션의 꼬리를 CFH-aware 절단점부터 새 세션으로 복제**합니다. 절단점은 "최신 `/cfh-*` 명령 호출"과 "최신 Final Intent Confirm 카드(sentinel)" 중 **더 이른 쪽** — 확정된 의도는 어떤 경우에도 살아남습니다 (→ `commands/references/final-confirm.md` § 절단점 sentinel).

**명시 호출 전용.** 자동 트리거 없음. 컨텍스트가 가득 찼을 때 사용자가 직접 부릅니다.

**내장 compaction과의 차이**: Claude Code의 자동 요약(compaction)은 *무엇이 손실되는지 통제할 수 없는* 요약 압축. cfh-clone은 반대 트레이드오프 — **최근 대화를 verbatim 보존**하고 오래된 쪽을 통째로 드랍. 진행 중 워크플로의 정확한 맥락(확정 의도·Phase 상태)을 요약 손실 없이 이어가고 싶을 때 이쪽.

**핵심 원칙**:
- 인계 카드를 **스크립트 실행 전에** 일반 메시지로 출력 — 카드가 대화의 마지막 메시지가 되어 꼬리 보존 컷에 자연히 포함된다. jsonl에 엔트리를 합성 삽입하지 않는다.
- 파일 상태 머신 없음 — 상태는 대화(인계 카드)에만 있다.
- 앵커가 없으면 절반(halfway) 컷으로 폴백하고 그 사실을 사용자에게 알린다.
</s>

<invocation>
CFH-aware 세션 클론을 시작합니다. 인자 없음 — 현재 세션이 대상.

요구 사항: `cfh` CLI 설치(이 패키지) + `bash` (Windows는 Git Bash).
</invocation>

<workflow>

## Step 1 — 인계 카드 출력 (스크립트 실행 전, 같은 turn)

새 세션의 agent가 이어받을 수 있게 **일반 메시지로** 출력:

```
📦 인계 카드 (cfh-clone)

워크플로 위치:  <진행 중인 cfh 명령·Phase — 예: /cfh-tdd Phase 3 (실패 테스트 작성 중) / 없으면 "idle">
영속화된 의도:  <의도 헤더가 있는 테스트 파일 경로 목록 — 없으면 "없음">
미기록 결정:    <이 대화에서 합의됐지만 아직 파일에 안 적힌 결정 — 없으면 "없음">
미해결 항목:    <대기 중인 질문·블로커 — 없으면 "없음">
```

각 항목은 *짧게* — 새 agent가 파일에서 확인 가능한 것은 경로만, 대화에만 있는 것은 내용을 적는다.

## Step 2 — 클론 실행 (같은 turn에서 이어서)

```bash
cfh clone ${CLAUDE_SESSION_ID}
```

스크립트가 절단점 탐지(`cfh clone-cut`) → 꼬리 복제 → `[CFH-CLONE <timestamp>]` 태그 세션 생성까지 수행.

## Step 3 — 완료 보고

- 성공 + **절단 기준**(sentinel / command / halfway 폴백)과 trim% 보고
- 절단점이 너무 최근이라 trim%가 낮으면 그 수치를 그대로 보고 (차단하지 않음 — 판단은 사용자)
- 앵커가 없어 절반(halfway) 컷으로 폴백했다면 1줄로 알림
- `/resume`에서 `[CFH-CLONE ...]` 태그가 붙은 세션을 선택해 이어서 작업하라고 안내

</workflow>

<constraints>
- **명시 호출 전용** — 자동 트리거·model invocation 금지.
- 인계 카드 출력 **전에** 스크립트를 실행하지 말 것 (카드가 컷에 포함되지 못함).
- 인계 카드에 sentinel 마커 문자열을 쓰지 말 것 (Final Intent Confirm 카드 전용 — prose 유입 시 오탐).
- jsonl을 직접 수정·합성하지 말 것 — 복제는 전적으로 `cfh clone` 스크립트가 수행.
</constraints>
