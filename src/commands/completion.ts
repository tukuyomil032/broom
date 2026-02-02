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

    commands="clean analyze status optimize uninstall purge installer doctor backup restore duplicates schedule watch config touchid completion update remove help"

    case "\${prev}" in
        broom)
            COMPREPLY=( $(compgen -W "\${commands}" -- \${cur}) )
            return 0
            ;;
        clean)
            COMPREPLY=( $(compgen -W "-n --dry-run -a --all -y --yes --unsafe -r --report -o --open --help" -- \${cur}) )
            return 0
            ;;
        analyze)
            COMPREPLY=( $(compgen -W "-p --path -d --depth -l --limit --help" -- \${cur}) )
            return 0
            ;;
        status)
            COMPREPLY=( $(compgen -W "-w --watch -i --interval --no-broom --help" -- \${cur}) )
            return 0
            ;;
        optimize)
            COMPREPLY=( $(compgen -W "-n --dry-run -y --yes -a --all --help" -- \${cur}) )
            return 0
            ;;
        uninstall)
            COMPREPLY=( $(compgen -W "-n --dry-run -y --yes --help" -- \${cur}) )
            return 0
            ;;
        purge)
            COMPREPLY=( $(compgen -W "-n --dry-run -y --yes --help" -- \${cur}) )
            return 0
            ;;
        installer)
            COMPREPLY=( $(compgen -W "-n --dry-run -y --yes --help" -- \${cur}) )
            return 0
            ;;
        doctor)
            COMPREPLY=( $(compgen -W "-v --verbose --help" -- \${cur}) )
            return 0
            ;;
        backup)
            COMPREPLY=( $(compgen -W "-l --list -c --clean -r --retention --help" -- \${cur}) )
            return 0
            ;;
        restore)
            COMPREPLY=( $(compgen -W "-l --list --help" -- \${cur}) )
            return 0
            ;;
        duplicates)
            COMPREPLY=( $(compgen -W "-p --path --min-size --hash -i --interactive -d --delete --help" -- \${cur}) )
            return 0
            ;;
        schedule)
            COMPREPLY=( $(compgen -W "-l --list -r --remove --daily --weekly --monthly --day --time --scanners --help" -- \${cur}) )
            return 0
            ;;
        watch)
            COMPREPLY=( $(compgen -W "-a --add -r --remove -l --list -c --check -p --path -t --threshold -n --notify --auto-clean --help" -- \${cur}) )
            return 0
            ;;
        update)
            COMPREPLY=( $(compgen -W "-c --check --help" -- \${cur}) )
            return 0
            ;;
        remove)
            COMPREPLY=( $(compgen -W "-y --yes -k --keep-config --help" -- \${cur}) )
            return 0
            ;;
        touchid)
            COMPREPLY=( $(compgen -W "enable disable status -y --yes --help" -- \${cur}) )
            return 0
            ;;
        config)
            COMPREPLY=( $(compgen -W "show set reset path --help" -- \${cur}) )
            return 0
            ;;
        completion)
            COMPREPLY=( $(compgen -W "install uninstall status bash zsh fish" -- \${cur}) )
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
    local -a backup_opts restore_opts duplicates_opts schedule_opts watch_opts
    local -a doctor_opts update_opts remove_opts completion_cmds

    # Enable colored output
    zstyle ':completion:*:descriptions' format '%B%F{blue}%d%f%b'
    zstyle ':completion:*:messages' format '%F{yellow}%d%f'
    zstyle ':completion:*:warnings' format '%F{red}No matches found%f'
    zstyle ':completion:*' group-name ''
    zstyle ':completion:*:*:broom:*' list-colors '=(#b)(*)-- *=34=36'

    commands=(
        'clean:🧹 Deep system cleanup with category selection'
        'analyze:📊 Analyze disk space usage with visual graphs'
        'status:💻 Real-time system monitoring dashboard'
        'optimize:⚡ System maintenance and optimization'
        'uninstall:🗑️  Remove apps and their leftovers'
        'purge:🔥 Clean project-specific build artifacts'
        'installer:📦 Find and remove installer files'
        'doctor:🩺 Run system health diagnostics'
        'backup:💾 Manage file backups before cleanup'
        'restore:♻️  Restore files from backup'
        'duplicates:🔍 Find and remove duplicate files'
        'schedule:⏰ Schedule automated cleanups'
        'watch:👁️  Monitor directory sizes'
        'reports:📊 Manage cleanup reports'
        'config:⚙️  Manage broom configuration'
        'touchid:👆 Configure Touch ID for sudo'
        'completion:📝 Install shell completion'
        'update:⬆️  Update broom to latest version'
        'remove:❌ Uninstall broom from system'
        'help:❓ Display help for command'
    )

    clean_opts=(
        '(-n --dry-run)'{-n,--dry-run}'[Preview only, no deletions]'
        '(-a --all)'{-a,--all}'[Clean all categories without prompting]'
        '(-y --yes)'{-y,--yes}'[Skip confirmation prompts]'
        '--unsafe[Include risky categories in cleanup]'
        '(-r --report)'{-r,--report}'[Generate HTML report after cleanup]'
        '(-o --open)'{-o,--open}'[Open report in browser after generation]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    analyze_opts=(
        '(-p --path)'{-p,--path}'[Path to analyze]:path:_files -/'
        '(-d --depth)'{-d,--depth}'[Scan depth]:depth:(1 2 3 4 5)'
        '(-l --limit)'{-l,--limit}'[Max items to show]:limit:(10 15 20 30 50)'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    status_opts=(
        '(-w --watch)'{-w,--watch}'[Live monitoring mode]'
        '(-i --interval)'{-i,--interval}'[Update interval in seconds]:seconds:(1 2 5 10)'
        '--no-broom[Disable broom animation]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    uninstall_opts=(
        '(-n --dry-run)'{-n,--dry-run}'[Preview only, no deletions]'
        '(-y --yes)'{-y,--yes}'[Skip confirmation prompts]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    optimize_opts=(
        '(-n --dry-run)'{-n,--dry-run}'[Preview only, no changes]'
        '(-y --yes)'{-y,--yes}'[Skip confirmation prompts]'
        '(-a --all)'{-a,--all}'[Run all optimization tasks]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    doctor_opts=(
        '(-v --verbose)'{-v,--verbose}'[Show detailed information]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    backup_opts=(
        '(-l --list)'{-l,--list}'[List all backups]'
        '(-c --clean)'{-c,--clean}'[Remove expired backups]'
        '(-r --retention)'{-r,--retention}'[Set retention period in days]:days:(7 14 30 60 90)'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    restore_opts=(
        '(-l --list)'{-l,--list}'[List restorable backups]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    duplicates_opts=(
        '(-p --path)'{-p,--path}'[Path to scan]:path:_files -/'
        '--min-size[Minimum file size]:size:(1MB 5MB 10MB 50MB 100MB)'
        '--hash[Hash algorithm]:algorithm:(md5 sha256)'
        '(-i --interactive)'{-i,--interactive}'[Interactive mode]'
        '(-d --delete)'{-d,--delete}'[Automatically delete duplicates]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    schedule_opts=(
        '(-l --list)'{-l,--list}'[Show current schedule]'
        '(-r --remove)'{-r,--remove}'[Remove scheduled cleanup]'
        '--daily[Schedule daily cleanup]'
        '--weekly[Schedule weekly cleanup]'
        '--monthly[Schedule monthly cleanup]'
        '--day[Day of week for weekly]:day:(monday tuesday wednesday thursday friday saturday sunday)'
        '--time[Time to run]:time:'
        '--scanners[Comma-separated list of scanners]:scanners:'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    watch_opts=(
        '(-a --add)'{-a,--add}'[Add a new watch]'
        '(-r --remove)'{-r,--remove}'[Remove a watch]:path:_files -/'
        '(-l --list)'{-l,--list}'[List all watches]'
        '(-c --check)'{-c,--check}'[Check all watches now]'
        '(-p --path)'{-p,--path}'[Path to watch]:path:_files -/'
        '(-t --threshold)'{-t,--threshold}'[Size threshold]:size:(1GB 5GB 10GB 50GB 100GB)'
        '(-n --notify)'{-n,--notify}'[Enable notifications]'
        '--auto-clean[Automatically clean when threshold exceeded]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    update_opts=(
        '(-c --check)'{-c,--check}'[Check for updates only]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    remove_opts=(
        '(-y --yes)'{-y,--yes}'[Skip confirmation prompts]'
        '(-k --keep-config)'{-k,--keep-config}'[Keep configuration files]'
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

    completion_cmds=(
        'install:Install completion for your shell (automatic)'
        'uninstall:Remove completion'
        'status:Check if completion is installed'
        'bash:Print bash completion script'
        'zsh:Print zsh completion script'
        'fish:Print fish completion script'
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
                    _arguments -C $config_opts \
                        '1: :->config_cmd' \
                        '*:: :->config_args'
                    case $state in
                        config_cmd)
                            _describe -t config_cmds 'config command' config_cmds
                            ;;
                    esac
                    ;;
                completion)
                    _arguments -C \
                        '1: :->completion_cmd' \
                        '*:: :->completion_args'
                    case $state in
                        completion_cmd)
                            _describe -t completion_cmds 'completion command' completion_cmds
                            ;;
                    esac
                    ;;
                doctor)
                    _arguments $doctor_opts
                    ;;
                backup)
                    _arguments $backup_opts
                    ;;
                restore)
                    _arguments $restore_opts '*:backup-id:'
                    ;;
                duplicates)
                    _arguments $duplicates_opts
                    ;;
                schedule)
                    _arguments $schedule_opts
                    ;;
                watch)
                    _arguments $watch_opts
                    ;;
                update)
                    _arguments $update_opts
                    ;;
                remove)
                    _arguments $remove_opts
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
complete -c broom -n __fish_use_subcommand -a clean -d '🧹 Scan and clean up disk space'
complete -c broom -n __fish_use_subcommand -a analyze -d '📊 Analyze disk space usage'
complete -c broom -n __fish_use_subcommand -a status -d '💻 Show system status and resource usage'
complete -c broom -n __fish_use_subcommand -a optimize -d '⚡ System maintenance and optimization'
complete -c broom -n __fish_use_subcommand -a uninstall -d '🗑️  Remove apps and their leftovers'
complete -c broom -n __fish_use_subcommand -a purge -d '🔥 Clean project-specific build artifacts'
complete -c broom -n __fish_use_subcommand -a installer -d '📦 Find and remove installer files'
complete -c broom -n __fish_use_subcommand -a doctor -d '🩺 Run system health diagnostics'
complete -c broom -n __fish_use_subcommand -a backup -d '💾 Manage file backups'
complete -c broom -n __fish_use_subcommand -a restore -d '♻️  Restore files from backup'
complete -c broom -n __fish_use_subcommand -a duplicates -d '🔍 Find and remove duplicate files'
complete -c broom -n __fish_use_subcommand -a schedule -d '⏰ Schedule automated cleanups'
complete -c broom -n __fish_use_subcommand -a watch -d '👁️  Monitor directory sizes'
complete -c broom -n __fish_use_subcommand -a reports -d '📊 Manage cleanup reports'
complete -c broom -n __fish_use_subcommand -a touchid -d '👆 Configure Touch ID for sudo'
complete -c broom -n __fish_use_subcommand -a completion -d '📝 Install shell completion'
complete -c broom -n __fish_use_subcommand -a config -d '⚙️  Manage broom configuration'
complete -c broom -n __fish_use_subcommand -a update -d '⬆️  Update broom'
complete -c broom -n __fish_use_subcommand -a remove -d '❌ Uninstall broom'
complete -c broom -n __fish_use_subcommand -a help -d '❓ Display help for command'

# Global options
complete -c broom -s v -l version -d 'Output the current version'
complete -c broom -s h -l help -d 'Display help for command'

# clean options
complete -c broom -n '__fish_seen_subcommand_from clean' -s n -l dry-run -d '🔍 Preview only'
complete -c broom -n '__fish_seen_subcommand_from clean' -s a -l all -d '🌟 Clean all categories'
complete -c broom -n '__fish_seen_subcommand_from clean' -s y -l yes -d '✓ Skip confirmation'
complete -c broom -n '__fish_seen_subcommand_from clean' -l unsafe -d '⚠️  Include risky categories'
complete -c broom -n '__fish_seen_subcommand_from clean' -s r -l report -d '📊 Generate HTML report'
complete -c broom -n '__fish_seen_subcommand_from clean' -s o -l open -d '🌐 Open report in browser'
complete -c broom -n '__fish_seen_subcommand_from clean' -s h -l help -d '❓ Display help'

# uninstall options
complete -c broom -n '__fish_seen_subcommand_from uninstall' -s n -l dry-run -d '🔍 Preview only'
complete -c broom -n '__fish_seen_subcommand_from uninstall' -s y -l yes -d '✓ Skip confirmation'
complete -c broom -n '__fish_seen_subcommand_from uninstall' -s h -l help -d '❓ Display help'

# optimize options
complete -c broom -n '__fish_seen_subcommand_from optimize' -s n -l dry-run -d '🔍 Preview only'
complete -c broom -n '__fish_seen_subcommand_from optimize' -s y -l yes -d '✓ Skip confirmation'
complete -c broom -n '__fish_seen_subcommand_from optimize' -s a -l all -d '🌟 Run all tasks'
complete -c broom -n '__fish_seen_subcommand_from optimize' -s h -l help -d '❓ Display help'

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

# reports subcommands
complete -c broom -n '__fish_seen_subcommand_from reports' -a list -d 'List all reports'
complete -c broom -n '__fish_seen_subcommand_from reports' -a clean -d 'Delete all reports'
complete -c broom -n '__fish_seen_subcommand_from reports' -a open -d 'Open latest report'
complete -c broom -n '__fish_seen_subcommand_from reports' -s y -l yes -d 'Skip confirmation'
complete -c broom -n '__fish_seen_subcommand_from reports' -s h -l help -d 'Display help'
`;

/**
 * Print completion script for a shell
 */
function printCompletion(shell: string): void {
  switch (shell) {
    case 'bash':
      console.log(BASH_COMPLETION);
      console.error(chalk.dim('\n# Add this to your ~/.bashrc or ~/.bash_profile:'));
      console.error(chalk.dim('# eval "$(broom completion bash)"'));
      break;
    case 'zsh':
      console.log(ZSH_COMPLETION);
      console.error(chalk.dim('\n# Save to a file in your fpath, e.g.:'));
      console.error(chalk.dim('# broom completion zsh > ~/.zsh/completions/_broom'));
      console.error(chalk.dim('# Then add ~/.zsh/completions to your fpath in ~/.zshrc'));
      break;
    case 'fish':
      console.log(FISH_COMPLETION);
      console.error(chalk.dim('\n# Save to your fish completions directory:'));
      console.error(chalk.dim('# broom completion fish > ~/.config/fish/completions/broom.fish'));
      break;
    default:
      console.error(chalk.red(`Unknown shell: ${shell}`));
      console.log('Supported shells: bash, zsh, fish');
  }
}

/**
 * Detect current shell
 */
function detectShell(): string {
  return process.env.SHELL?.split('/').pop() || 'zsh';
}

/**
 * Install completion automatically
 */
async function installCompletion(): Promise<void> {
  const { writeFile, mkdir, access, readFile, appendFile } = await import('fs/promises');
  const { homedir } = await import('os');
  const shell = detectShell();

  console.log(chalk.cyan(`\n🔧 Installing ${shell} completion...\n`));

  try {
    if (shell === 'zsh') {
      const completionDir = `${homedir()}/.zsh/completions`;
      const completionFile = `${completionDir}/_broom`;
      const zshrc = `${homedir()}/.zshrc`;

      // Create completion directory
      await mkdir(completionDir, { recursive: true });

      // Write completion file
      await writeFile(completionFile, ZSH_COMPLETION, 'utf-8');
      console.log(chalk.green('✓ Completion file created'));

      // Check if fpath is already configured
      let zshrcContent = '';
      try {
        zshrcContent = await readFile(zshrc, 'utf-8');
      } catch {
        // .zshrc doesn't exist yet
      }

      if (!zshrcContent.includes('~/.zsh/completions')) {
        await appendFile(
          zshrc,
          '\n# Broom completion\nfpath=(~/.zsh/completions $fpath)\nautoload -Uz compinit && compinit\n',
          'utf-8'
        );
        console.log(chalk.green('✓ Added to ~/.zshrc'));
      }

      console.log(chalk.green('\n✅ Installation complete!'));
      console.log(chalk.dim('\nRun the following to activate:'));
      console.log(chalk.yellow('  source ~/.zshrc\n'));
      console.log(chalk.dim('Or restart your terminal.\n'));
    } else if (shell === 'bash') {
      const completionDir = `${homedir()}/.bash_completion.d`;
      const completionFile = `${completionDir}/broom`;
      const bashrc = `${homedir()}/.bashrc`;

      await mkdir(completionDir, { recursive: true });
      await writeFile(completionFile, BASH_COMPLETION, 'utf-8');
      console.log(chalk.green('✓ Completion file created'));

      let bashrcContent = '';
      try {
        bashrcContent = await readFile(bashrc, 'utf-8');
      } catch {
        // .bashrc doesn't exist
      }

      if (!bashrcContent.includes('.bash_completion.d/broom')) {
        await appendFile(
          bashrc,
          '\n# Broom completion\nsource ~/.bash_completion.d/broom\n',
          'utf-8'
        );
        console.log(chalk.green('✓ Added to ~/.bashrc'));
      }

      console.log(chalk.green('\n✅ Installation complete!'));
      console.log(chalk.dim('\nRun the following to activate:'));
      console.log(chalk.yellow('  source ~/.bashrc\n'));
    } else if (shell === 'fish') {
      const completionDir = `${homedir()}/.config/fish/completions`;
      const completionFile = `${completionDir}/broom.fish`;

      await mkdir(completionDir, { recursive: true });
      await writeFile(completionFile, FISH_COMPLETION, 'utf-8');

      console.log(chalk.green('\n✅ Installation complete!'));
      console.log(chalk.dim('\nFish automatically loads completions.\n'));
      console.log(chalk.dim('Restart your terminal or run: exec fish\n'));
    } else {
      console.log(chalk.red(`\n❌ Unsupported shell: ${shell}`));
      console.log(chalk.dim('Supported: bash, zsh, fish\n'));
    }
  } catch (error) {
    console.log(chalk.red(`\n❌ Installation failed: ${error}\n`));
  }
}

/**
 * Uninstall completion
 */
async function uninstallCompletion(): Promise<void> {
  const { unlink } = await import('fs/promises');
  const { homedir } = await import('os');
  const shell = detectShell();

  console.log(chalk.cyan(`\n🗑️  Uninstalling ${shell} completion...\n`));

  try {
    if (shell === 'zsh') {
      const completionFile = `${homedir()}/.zsh/completions/_broom`;
      await unlink(completionFile);
      console.log(chalk.green('✅ Completion removed'));
      console.log(
        chalk.dim('\nNote: You may want to manually remove the fpath config from ~/.zshrc\n')
      );
    } else if (shell === 'bash') {
      const completionFile = `${homedir()}/.bash_completion.d/broom`;
      await unlink(completionFile);
      console.log(chalk.green('✅ Completion removed'));
      console.log(
        chalk.dim('\nNote: You may want to manually remove the source line from ~/.bashrc\n')
      );
    } else if (shell === 'fish') {
      const completionFile = `${homedir()}/.config/fish/completions/broom.fish`;
      await unlink(completionFile);
      console.log(chalk.green('✅ Completion removed\n'));
    }
  } catch {
    console.log(chalk.yellow('⚠️  Completion file not found or already removed\n'));
  }
}

/**
 * Check completion status
 */
async function checkStatus(): Promise<void> {
  const { access } = await import('fs/promises');
  const { homedir } = await import('os');
  const shell = detectShell();

  console.log(chalk.cyan('\n📊 Completion Status\n'));
  console.log(`Current shell: ${chalk.yellow(shell)}`);

  let installed = false;
  let location = '';

  try {
    if (shell === 'zsh') {
      location = `${homedir()}/.zsh/completions/_broom`;
      await access(location);
      installed = true;
    } else if (shell === 'bash') {
      location = `${homedir()}/.bash_completion.d/broom`;
      await access(location);
      installed = true;
    } else if (shell === 'fish') {
      location = `${homedir()}/.config/fish/completions/broom.fish`;
      await access(location);
      installed = true;
    }

    if (installed) {
      console.log(chalk.green('✓ Completion is installed'));
      console.log(chalk.dim(`  ${location}\n`));
    }
  } catch {
    console.log(chalk.yellow('✗ Completion is not installed'));
    console.log(chalk.dim('\nRun to install:'));
    console.log(chalk.yellow('  broom completion install\n'));
  }
}

/**
 * Show completion help
 */
function showCompletionHelp(): void {
  console.log(chalk.bold('\n📝 Shell Completion\n'));
  console.log('Enable tab completion for broom commands and options.\n');
  console.log(chalk.bold('Usage:'));
  console.log('  broom completion [command]\n');
  console.log(chalk.bold('Commands:'));
  console.log('  install     Install completion for your shell (automatic)');
  console.log('  uninstall   Remove completion');
  console.log('  status      Check if completion is installed');
  console.log('  bash/zsh/fish  Print completion script for manual setup\n');
  console.log(chalk.bold('Examples:'));
  console.log(chalk.dim('  # Automatic installation (recommended)'));
  console.log(chalk.yellow('  broom completion install\n'));
  console.log(chalk.dim('  # Check status'));
  console.log(chalk.yellow('  broom completion status\n'));
  console.log(chalk.dim('  # Manual installation (advanced)'));
  console.log(chalk.dim('  broom completion zsh > ~/.zsh/completions/_broom\n'));
}

/**
 * Create completion command
 */
export function createCompletionCommand(): Command {
  const cmd = new Command('completion')
    .description('Install shell completion for tab completion')
    .argument('[action]', 'Action: install, uninstall, status, or shell type (bash/zsh/fish)')
    .action(async (action?: string) => {
      if (!action) {
        showCompletionHelp();
        return;
      }

      switch (action) {
        case 'install':
          await installCompletion();
          break;
        case 'uninstall':
          await uninstallCompletion();
          break;
        case 'status':
          await checkStatus();
          break;
        case 'bash':
        case 'zsh':
        case 'fish':
          printCompletion(action);
          break;
        default:
          console.log(chalk.red(`\n❌ Unknown action: ${action}\n`));
          showCompletionHelp();
      }
    });

  return enhanceCommandHelp(cmd);
}
