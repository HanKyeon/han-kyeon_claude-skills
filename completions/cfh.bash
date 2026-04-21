# cfh bash completion
# Install: source this file, or place in /etc/bash_completion.d/ or ~/.bash_completion.d/
#   echo 'source ~/path/to/cfh.bash' >> ~/.bashrc
#
# Tab-completes subcommands and common flags.

_cfh_completions() {
  local cur prev words cword
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  local subcommands="install update list ls remove rm new validate generate \
    adopt diff doctor trace log evolve search open export import \
    version help --version -v --help -h"

  local global_flags="--target --dry-run --force -f --help -h --version -v"

  # First positional: subcommand
  if [[ $COMP_CWORD -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "$subcommands" -- "$cur") )
    return 0
  fi

  local subcmd="${COMP_WORDS[1]}"

  # Flag value completion for --target (directories)
  if [[ "$prev" == "--target" ]]; then
    COMPREPLY=( $(compgen -d -- "$cur") )
    return 0
  fi

  case "$subcmd" in
    install|update)
      if [[ "$cur" == -* ]]; then
        COMPREPLY=( $(compgen -W "--link --only --target --force --dry-run" -- "$cur") )
      fi
      ;;
    list|ls)
      COMPREPLY=( $(compgen -W "--global --project --target" -- "$cur") )
      ;;
    remove|rm|adopt|diff|open)
      if [[ "$cur" == -* ]]; then
        COMPREPLY=( $(compgen -W "--target --force --dry-run --yes --full --editor" -- "$cur") )
      else
        # Complete installed asset names (from global skills/commands dirs)
        local names=""
        if [[ -d "$HOME/.claude/skills" ]]; then
          names="$names $(ls "$HOME/.claude/skills" 2>/dev/null)"
        fi
        if [[ -d "$HOME/.claude/commands" ]]; then
          names="$names $(ls "$HOME/.claude/commands" 2>/dev/null | sed 's/\.md$//')"
        fi
        COMPREPLY=( $(compgen -W "$names" -- "$cur") )
      fi
      ;;
    new)
      if [[ $COMP_CWORD -eq 2 ]]; then
        COMPREPLY=( $(compgen -W "skill command agent" -- "$cur") )
      else
        COMPREPLY=( $(compgen -W "--project --target --force --dry-run" -- "$cur") )
      fi
      ;;
    generate)
      if [[ "$cur" == -* ]]; then
        COMPREPLY=( $(compgen -W "--list --target --force --dry-run" -- "$cur") )
      else
        COMPREPLY=( $(compgen -W "producer-reviewer pipeline-3stage reviewer-team reviewer-team-backend" -- "$cur") )
      fi
      ;;
    doctor)
      COMPREPLY=( $(compgen -W "--warn-only --usage --target" -- "$cur") )
      ;;
    log)
      COMPREPLY=( $(compgen -W "--enable --disable --status --event --utterance --helpful --note" -- "$cur") )
      ;;
    evolve)
      if [[ -d "$HOME/.claude/skills" ]]; then
        local names=$(ls "$HOME/.claude/skills" 2>/dev/null)
        COMPREPLY=( $(compgen -W "$names" -- "$cur") )
      fi
      ;;
    search)
      COMPREPLY=( $(compgen -W "--kind --case-sensitive --target" -- "$cur") )
      ;;
    export)
      COMPREPLY=( $(compgen -W "--output --all --target" -- "$cur") )
      ;;
    import)
      if [[ "$cur" == -* ]]; then
        COMPREPLY=( $(compgen -W "--force --yes --dry-run --target" -- "$cur") )
      else
        COMPREPLY=( $(compgen -f -X '!*.json' -- "$cur") )
      fi
      ;;
    trace)
      COMPREPLY=( $(compgen -W "--top --target" -- "$cur") )
      ;;
    *)
      COMPREPLY=( $(compgen -W "$global_flags" -- "$cur") )
      ;;
  esac
}

complete -F _cfh_completions cfh
complete -F _cfh_completions claude-skills
