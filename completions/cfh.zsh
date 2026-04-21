#compdef cfh claude-skills
# cfh zsh completion
# Install:
#   fpath=(~/path/to/completions $fpath)
#   autoload -Uz compinit && compinit
# Or drop this file into a dir in $fpath named "_cfh".

_cfh() {
  local curcontext="$curcontext" state line
  typeset -A opt_args

  _arguments -C \
    '1: :_cfh_subcommands' \
    '*:: :->args'

  case $state in
    args)
      case $words[1] in
        install|update)
          _arguments \
            '--link[symbolic link install]' \
            '--only[only skills or commands]:kind:(skills commands)' \
            '--target[override target path]:dir:_files -/' \
            '--force[overwrite]' \
            '-f[overwrite]' \
            '--dry-run[preview]'
          ;;
        list|ls)
          _arguments \
            '--global[only ~/.claude]' \
            '--project[only ./.claude]' \
            '--target[custom path]:dir:_files -/'
          ;;
        remove|rm|adopt|diff|open)
          _arguments \
            '--target[custom path]:dir:_files -/' \
            '--force[bypass safety]' \
            '--dry-run[preview]' \
            '--yes[skip confirmation]' \
            '--full[unified diff (diff)]' \
            '--editor[editor override (open)]:editor:' \
            '*::name:_cfh_asset_names'
          ;;
        new)
          _arguments \
            '1:kind:(skill command agent)' \
            '2:name:' \
            '--project[./.claude]' \
            '--target[custom path]:dir:_files -/' \
            '--force[overwrite]' \
            '--dry-run[preview]'
          ;;
        generate)
          _arguments \
            '--list[list presets]' \
            '--target[custom path]:dir:_files -/' \
            '--force[overwrite]' \
            '--dry-run[preview]' \
            '*:preset:(producer-reviewer pipeline-3stage reviewer-team reviewer-team-backend)'
          ;;
        doctor)
          _arguments \
            '--warn-only[exit 0 on issues]' \
            '--usage[30-day usage summary]' \
            '--target[custom path]:dir:_files -/'
          ;;
        log)
          _arguments \
            '--enable[opt in]' \
            '--disable[opt out]' \
            '--status[show state]' \
            '--event[event type]:event:(trigger success miss)' \
            '--utterance[user utterance]:utterance:' \
            '--helpful[satisfaction]:h:(y n)' \
            '--note[free note]:note:'
          ;;
        evolve)
          _arguments '*::skill:_cfh_asset_names'
          ;;
        search)
          _arguments \
            '--kind[filter]:kind:(skill command)' \
            '--case-sensitive[case-sensitive match]' \
            '--target[custom path]:dir:_files -/'
          ;;
        export)
          _arguments \
            '--output[output file]:file:_files' \
            '--all[include managed]' \
            '--target[custom path]:dir:_files -/'
          ;;
        import)
          _arguments \
            '--force[overwrite]' \
            '--yes[skip confirm]' \
            '--dry-run[preview]' \
            '--target[custom path]:dir:_files -/' \
            '1:bundle:_files -g "*.json"'
          ;;
        trace)
          _arguments \
            '--top[N top matches]:n:' \
            '--target[custom path]:dir:_files -/'
          ;;
      esac
      ;;
  esac
}

_cfh_subcommands() {
  local -a cmds
  cmds=(
    'install:Install packaged skills + commands'
    'update:Update managed items'
    'list:List installed items'
    'ls:List installed items'
    'remove:Remove installed item'
    'rm:Remove installed item'
    'new:Scaffold a new skill/command/agent'
    'validate:Lint all skills/commands'
    'generate:Generate a team from a preset'
    'adopt:Convert managed to user-authored'
    'diff:Show changes since install'
    'doctor:Run health checks'
    'trace:Simulate skill trigger for an utterance'
    'log:Record a usage event'
    'evolve:Analyze and suggest skill improvements'
    'search:Search installed assets by keyword'
    'open:Open asset in $EDITOR'
    'export:Export user-authored assets to a bundle'
    'import:Import assets from a bundle'
    'version:Print version'
    'help:Show help'
  )
  _describe 'cfh subcommand' cmds
}

_cfh_asset_names() {
  local -a names
  if [[ -d "$HOME/.claude/skills" ]]; then
    names+=(${(f)"$(ls "$HOME/.claude/skills" 2>/dev/null)"})
  fi
  if [[ -d "$HOME/.claude/commands" ]]; then
    names+=(${(f)"$(ls "$HOME/.claude/commands" 2>/dev/null | sed 's/\.md$//')"})
  fi
  _describe 'asset name' names
}

_cfh "$@"
