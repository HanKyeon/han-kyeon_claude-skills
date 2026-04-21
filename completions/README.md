# Shell Completion for `cfh`

`cfh` / `claude-skills` 바이너리의 Tab 자동완성을 제공합니다.

## bash

**옵션 A — 개인 계정에만**:
```bash
echo 'source /path/to/@han-kyeon/claude-skills/completions/cfh.bash' >> ~/.bashrc
# 새 터미널 시작
```

**옵션 B — 시스템 전역**:
```bash
sudo cp /path/to/@han-kyeon/claude-skills/completions/cfh.bash /etc/bash_completion.d/cfh
```

npm 글로벌 설치 경로를 찾으려면:
```bash
npm root -g
# 예: /usr/local/lib/node_modules
# → /usr/local/lib/node_modules/@han-kyeon/claude-skills/completions/cfh.bash
```

## zsh

```zsh
# ~/.zshrc에 추가
fpath=(/path/to/@han-kyeon/claude-skills/completions $fpath)
autoload -Uz compinit && compinit
# 새 터미널 시작
```

또는 시스템 컴플리션 디렉터리에 복사:
```zsh
mkdir -p ~/.zsh/completions
cp /path/to/@han-kyeon/claude-skills/completions/cfh.zsh ~/.zsh/completions/_cfh
# ~/.zshrc:
fpath=(~/.zsh/completions $fpath)
autoload -Uz compinit && compinit
```

## 동작

Tab을 눌렀을 때 자동완성되는 항목:

- **서브커맨드**: `install`, `update`, `list`, `new`, `generate`, ...
- **플래그**: 각 서브커맨드에 유효한 플래그만 노출
- **프리셋 이름** (`generate <TAB>`): `producer-reviewer`, `pipeline-3stage`, ...
- **설치된 자산 이름** (`remove <TAB>`, `adopt <TAB>`, `diff <TAB>`, `open <TAB>`, `evolve <TAB>`): `~/.claude/skills/` + `~/.claude/commands/`에서 읽음
- **`new` 종류** (`new <TAB>`): `skill`, `command`, `agent`
- **`log --event` 값**: `trigger`, `success`, `miss`
- **번들 파일** (`import <TAB>`): `*.json`

## 검증

설치 후:
```bash
cfh <TAB><TAB>
# → install update list ls remove rm new validate generate ... 표시
```

## fish

현재 미지원. PR 환영합니다.

## 주의

- **버전 업그레이드 시**: 자동완성 스크립트도 함께 갱신됨 (npm 재설치 후 새 터미널에서 반영).
- **--link로 설치**한 경우 심볼릭 링크라 npm update 시 자동 반영.
- zsh completion 경로에 이미 다른 `_cfh` 파일이 있으면 충돌 — 먼저 제거.
