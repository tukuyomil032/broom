/**
 * completion command - Generate shell completion scripts
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { enhanceCommandHelp } from '../utils/help.js';

const BASH_COMPLETION = `# broom bash completion
_broom_completions() {
    local cur prev opts commands
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    commands="clean uninstall optimize analyze status purge installer touchid completion config help"

    case "\${prev}" in
        broom)
            COMPREPLY=( $(compgen -W "\${commands}" -- \${cur}) )
            return 0
            ;;
        clean)
            COMPREPLY=( $(compgen -W "--dry-run --all --yes --help" -- \${cur}) )
            return 0
            ;;
        uninstall)
            COMPREPLY=( $(compgen -W "--dry-run --yes --help" -- \${cur}) )
            return 0
            ;;
        optimize)
            COMPREPLY=( $(compgen -W "--yes --help" -- \${cur}) )
            return 0
            ;;
        analyze)
            COMPREPLY=( $(compgen -W "--help" -- \${cur}) )
            return 0
            ;;
        status)
            COMPREPLY=( $(compgen -W "--watch --interval --help" -- \${cur}) )
            return 0
            ;;
        purge)
            COMPREPLY=( $(compgen -W "--dry-run --yes --help" -- \${cur}) )
            return 0
            ;;
        installer)
            COMPREPLY=( $(compgen -W "--dry-run --yes --help" -- \${cur}) )
            return 0
            ;;
        touchid)
            COMPREPLY=( $(compgen -W "enable disable status --yes --help" -- \${cur}) )
            return 0
            ;;
        config)
            COMPREPLY=( $(compgen -W "show set reset path --help" -- \${cur}) )
            return 0
            ;;
        *)
            ;;
    esac

    COMPREPLY=( $(compgen -W "\${commands}" -- \${cur}) )
    return 0
}
complete -F _broom_completions broom
`;

const ZSH_COMPLETION = `#compdef broom

_broom() {
    local -a commands
    local -a clean_opts uninstall_opts optimize_opts analyze_opts status_opts
    local -a purge_opts installer_opts touchid_opts config_opts config_cmds touchid_cmds

    commands=(
        'clean:Scan and clean up disk space'
        'uninstall:Remove apps and their leftovers'
        'optimize:System maintenance and optimization'
        'analyze:Analyze disk space usage'
        'status:Show system status and resource usage'
        'purge:Clean project-specific build artifacts'
        'installer:Find and remove installer files'
        'touchid:Configure Touch ID for sudo'
        'completion:Generate shell completion scripts'
        'config:Manage broom configuration'
        'help:Display help for command'
    )

    clean_opts=(
        '(-n --dry-run)'{-n,--dry-run}'[Preview only, no deletions]'
        '(-a --all)'{-a,--all}'[Clean all categories without prompting]'
        '(-y --yes)'{-y,--yes}'[Skip confirmation prompts]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    uninstall_opts=(
        '(-n --dry-run)'{-n,--dry-run}'[Preview only, no deletions]'
        '(-y --yes)'{-y,--yes}'[Skip confirmation prompts]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    optimize_opts=(
        '(-y --yes)'{-y,--yes}'[Skip confirmation prompts]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    analyze_opts=(
        '(-h --help)'{-h,--help}'[Display help]'
    )

    status_opts=(
        '(-w --watch)'{-w,--watch}'[Live monitoring mode]'
        '(-i --interval)'{-i,--interval}'[Update interval in seconds]:interval'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    purge_opts=(
        '(-n --dry-run)'{-n,--dry-run}'[Preview only, no deletions]'
        '(-y --yes)'{-y,--yes}'[Skip confirmation prompts]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    installer_opts=(
        '(-n --dry-run)'{-n,--dry-run}'[Preview only, no deletions]'
        '(-y --yes)'{-y,--yes}'[Skip confirmation prompts]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    touchid_cmds=(
        'enable:Enable Touch ID for sudo'
        'disable:Disable Touch ID for sudo'
        'status:Show Touch ID sudo status'
    )

    touchid_opts=(
        '(-y --yes)'{-y,--yes}'[Skip confirmation prompts]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    config_cmds=(
        'show:Show current configuration'
        'set:Set a configuration value'
        'reset:Reset configuration to defaults'
        'path:Show configuration file path'
    )

    config_opts=(
        '(-h --help)'{-h,--help}'[Display help]'
    )

    _arguments -C \\
        '(-v --version)'{-v,--version}'[Output the current version]' \\
        '(-h --help)'{-h,--help}'[Display help for command]' \\
        '1: :->command' \\
        '*:: :->args'

    case $state in
        command)
            _describe -t commands 'broom command' commands
            ;;
        args)
            case $words[1] in
                clean)
                    _arguments $clean_opts
                    ;;
                uninstall)
                    _arguments $uninstall_opts
                    ;;
                optimize)
                    _arguments $optimize_opts
                    ;;
                analyze)
                    _arguments $analyze_opts
                    ;;
                status)
                    _arguments $status_opts
                    ;;
                purge)
                    _arguments $purge_opts
                    ;;
                installer)
                    _arguments $installer_opts
                    ;;
                touchid)
                    _arguments -C $touchid_opts \\
                        '1: :->touchid_cmd' \\
                        '*:: :->touchid_args'
                    case $state in
                        touchid_cmd)
                            _describe -t touchid_cmds 'touchid command' touchid_cmds
                            ;;
                    esac
                    ;;
                config)
                    _arguments -C $config_opts \\
                        '1: :->config_cmd' \\
                        '*:: :->config_args'
                    case $state in
                        config_cmd)
                            _describe -t config_cmds 'config command' config_cmds
                            ;;
                    esac
                    ;;
            esac
            ;;
    esac
}

_broom "$@"
`;

const FISH_COMPLETION = `# broom fish completion

# Disable file completion for broom
complete -c broom -f

# Main commands
complete -c broom -n __fish_use_subcommand -a clean -d 'Scan and clean up disk space'
complete -c broom -n __fish_use_subcommand -a uninstall -d 'Remove apps and their leftovers'
complete -c broom -n __fish_use_subcommand -a optimize -d 'System maintenance and optimization'
complete -c broom -n __fish_use_subcommand -a analyze -d 'Analyze disk space usage'
complete -c broom -n __fish_use_subcommand -a status -d 'Show system status and resource usage'
complete -c broom -n __fish_use_subcommand -a purge -d 'Clean project-specific build artifacts'
complete -c broom -n __fish_use_subcommand -a installer -d 'Find and remove installer files'
complete -c broom -n __fish_use_subcommand -a touchid -d 'Configure Touch ID for sudo'
complete -c broom -n __fish_use_subcommand -a completion -d 'Generate shell completion scripts'
complete -c broom -n __fish_use_subcommand -a config -d 'Manage broom configuration'
complete -c broom -n __fish_use_subcommand -a help -d 'Display help for command'

# Global options
complete -c broom -s v -l version -d 'Output the current version'
complete -c broom -s h -l help -d 'Display help for command'

# clean options
complete -c broom -n '__fish_seen_subcommand_from clean' -s n -l dry-run -d 'Preview only'
complete -c broom -n '__fish_seen_subcommand_from clean' -s a -l all -d 'Clean all categories'
complete -c broom -n '__fish_seen_subcommand_from clean' -s y -l yes -d 'Skip confirmation'
complete -c broom -n '__fish_seen_subcommand_from clean' -s h -l help -d 'Display help'

# uninstall options
complete -c broom -n '__fish_seen_subcommand_from uninstall' -s n -l dry-run -d 'Preview only'
complete -c broom -n '__fish_seen_subcommand_from uninstall' -s y -l yes -d 'Skip confirmation'
complete -c broom -n '__fish_seen_subcommand_from uninstall' -s h -l help -d 'Display help'

# optimize options
complete -c broom -n '__fish_seen_subcommand_from optimize' -s y -l yes -d 'Skip confirmation'
complete -c broom -n '__fish_seen_subcommand_from optimize' -s h -l help -d 'Display help'

# status options
complete -c broom -n '__fish_seen_subcommand_from status' -s w -l watch -d 'Live monitoring mode'
complete -c broom -n '__fish_seen_subcommand_from status' -s i -l interval -d 'Update interval'
complete -c broom -n '__fish_seen_subcommand_from status' -s h -l help -d 'Display help'

# purge options
complete -c broom -n '__fish_seen_subcommand_from purge' -s n -l dry-run -d 'Preview only'
complete -c broom -n '__fish_seen_subcommand_from purge' -s y -l yes -d 'Skip confirmation'
complete -c broom -n '__fish_seen_subcommand_from purge' -s h -l help -d 'Display help'

# installer options
complete -c broom -n '__fish_seen_subcommand_from installer' -s n -l dry-run -d 'Preview only'
complete -c broom -n '__fish_seen_subcommand_from installer' -s y -l yes -d 'Skip confirmation'
complete -c broom -n '__fish_seen_subcommand_from installer' -s h -l help -d 'Display help'

# touchid subcommands
complete -c broom -n '__fish_seen_subcommand_from touchid' -a enable -d 'Enable Touch ID for sudo'
complete -c broom -n '__fish_seen_subcommand_from touchid' -a disable -d 'Disable Touch ID for sudo'
complete -c broom -n '__fish_seen_subcommand_from touchid' -a status -d 'Show Touch ID sudo status'
complete -c broom -n '__fish_seen_subcommand_from touchid' -s y -l yes -d 'Skip confirmation'
complete -c broom -n '__fish_seen_subcommand_from touchid' -s h -l help -d 'Display help'

# config subcommands
complete -c broom -n '__fish_seen_subcommand_from config' -a show -d 'Show current configuration'
complete -c broom -n '__fish_seen_subcommand_from config' -a set -d 'Set a configuration value'
complete -c broom -n '__fish_seen_subcommand_from config' -a reset -d 'Reset configuration'
complete -c broom -n '__fish_seen_subcommand_from config' -a path -d 'Show config file path'
complete -c broom -n '__fish_seen_subcommand_from config' -s h -l help -d 'Display help'

# completion subcommands
complete -c broom -n '__fish_seen_subcommand_from completion' -a bash -d 'Generate bash completion'
complete -c broom -n '__fish_seen_subcommand_from completion' -a zsh -d 'Generate zsh completion'
complete -c broom -n '__fish_seen_subcommand_from completion' -a fish -d 'Generate fish completion'
`;

/**
 * Print completion script for a shell
 */
function printCompletion(shell: string): void {
  switch (shell) {
    case 'bash':
      console.log(BASH_COMPLETION);
      console.log(chalk.dim('\n# Add this to your ~/.bashrc or ~/.bash_profile:'));
      console.log(chalk.dim('# eval "$(broom completion bash)"'));
      break;
    case 'zsh':
      console.log(ZSH_COMPLETION);
      console.log(chalk.dim('\n# Save to a file in your fpath, e.g.:'));
      console.log(chalk.dim('# broom completion zsh > ~/.zsh/completions/_broom'));
      console.log(chalk.dim('# Then add ~/.zsh/completions to your fpath in ~/.zshrc'));
      break;
    case 'fish':
      console.log(FISH_COMPLETION);
      console.log(chalk.dim('\n# Save to your fish completions directory:'));
      console.log(chalk.dim('# broom completion fish > ~/.config/fish/completions/broom.fish'));
      break;
    default:
      console.error(chalk.red(`Unknown shell: ${shell}`));
      console.log('Supported shells: bash, zsh, fish');
  }
}

/**
 * Show completion help
 */
function showCompletionHelp(): void {
  console.log(chalk.bold('\n📝 Shell Completion Setup\n'));
  console.log('Generate shell completion scripts for broom.\n');
  console.log(chalk.bold('Usage:'));
  console.log('  broom completion <shell>\n');
  console.log(chalk.bold('Supported shells:'));
  console.log('  bash    Bash completion');
  console.log('  zsh     Zsh completion');
  console.log('  fish    Fish completion\n');
  console.log(chalk.bold('Examples:'));
  console.log(chalk.dim('  # Bash - Add to ~/.bashrc'));
  console.log('  eval "$(broom completion bash)"\n');
  console.log(chalk.dim('  # Zsh - Save to completions directory'));
  console.log('  broom completion zsh > ~/.zsh/completions/_broom\n');
  console.log(chalk.dim('  # Fish - Save to fish completions'));
  console.log('  broom completion fish > ~/.config/fish/completions/broom.fish\n');
}

/**
 * Create completion command
 */
export function createCompletionCommand(): Command {
  const cmd = new Command('completion')
    .description('Generate shell completion scripts')
    .argument('[shell]', 'Shell type (bash, zsh, fish)')
    .action((shell?: string) => {
      if (!shell) {
        showCompletionHelp();
        return;
      }
      printCompletion(shell);
    });

  return enhanceCommandHelp(cmd);
}
