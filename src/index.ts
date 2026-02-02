#!/usr/bin/env node
/**
 * broom - macOS Disk Cleanup CLI
 *
 * A TypeScript rewrite of mole (https://github.com/tw93/Mole)
 * with modern features and interactive interface.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import {
  createCleanCommand,
  createUninstallCommand,
  createOptimizeCommand,
  createAnalyzeCommand,
  createStatusCommand,
  createPurgeCommand,
  createInstallerCommand,
  createTouchIdCommand,
  createCompletionCommand,
  createUpdateCommand,
  createRemoveCommand,
  createConfigCommand,
  createDoctorCommand,
  createBackupCommand,
  createRestoreCommand,
  createDuplicatesCommand,
  createScheduleCommand,
  createWatchCommand,
  createReportsCommand,
  createHelpCommand,
  setCommandsList,
} from './commands/index.js';
import { enableDebug, debug } from './utils/debug.js';
import { getGlobalOptionsTable } from './utils/help.js';

const VERSION = '1.0.0';

// ASCII art logo
const logo = chalk.cyan(`
  ██████╗ ██████╗  ██████╗  ██████╗ ███╗   ███╗
  ██╔══██╗██╔══██╗██╔═══██╗██╔═══██╗████╗ ████║
  ██████╔╝██████╔╝██║   ██║██║   ██║██╔████╔██║
  ██╔══██╗██╔══██╗██║   ██║██║   ██║██║╚██╔╝██║
  ██████╔╝██║  ██║╚██████╔╝╚██████╔╝██║ ╚═╝ ██║
  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝     ╚═╝
`);

const description = `
${logo}
${chalk.bold('🧹 macOS Disk Cleanup CLI')}

Clean up your Mac with ease. Remove caches, logs, trash,
browser data, dev artifacts, and more.

${chalk.bold('Commands:')}
  clean       Scan and clean up disk space
  uninstall   Remove apps and their leftovers
  optimize    System maintenance and optimization
  analyze     Analyze disk space usage
  status      Show system status and resource usage
  purge       Clean project-specific build artifacts
  installer   Find and remove installer files
  touchid     Configure Touch ID for sudo
  completion  Generate shell completion scripts
  update      Self-update broom to the latest version
  remove      Uninstall broom from the system
  config      Manage broom configuration
  doctor      Run system health diagnostics
  backup      Manage file backups
  restore     Restore files from backup
  duplicates  Find and remove duplicate files
  schedule    Schedule automated cleanups
  watch       Monitor directory sizes
  reports     Manage cleanup reports

${chalk.bold('Examples:')}
  ${chalk.dim('$')} broom clean              Interactive cleanup
  ${chalk.dim('$')} broom clean --dry-run    Preview what would be cleaned
  ${chalk.dim('$')} broom clean --all        Clean all categories
  ${chalk.dim('$')} broom uninstall          Remove an app completely
  ${chalk.dim('$')} broom optimize           Run system optimization tasks
  ${chalk.dim('$')} broom analyze            See what's using disk space
  ${chalk.dim('$')} broom status --watch     Live system monitoring
  ${chalk.dim('$')} broom purge              Clean project artifacts

${getGlobalOptionsTable()}
`;

// Create program
const program = new Command();

program
  .name('broom')
  .version(VERSION, '-v, --version', 'Output the current version')
  .description(description)
  .option('--debug', 'Enable debug mode with detailed logs')
  .helpOption('-h, --help', 'Display help for command')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.debug) {
      enableDebug();
      debug('Debug mode enabled');
      debug(`Version: ${VERSION}`);
      debug(`Node: ${process.version}`);
      debug(`Platform: ${process.platform} ${process.arch}`);
      debug(`Args: ${process.argv.slice(2).join(' ')}`);
    }
  });

// Register commands
const helpCommand = createHelpCommand();
program.addCommand(helpCommand);
program.addCommand(createCleanCommand());
program.addCommand(createUninstallCommand());
program.addCommand(createOptimizeCommand());
program.addCommand(createAnalyzeCommand());
program.addCommand(createStatusCommand());
program.addCommand(createPurgeCommand());
program.addCommand(createInstallerCommand());
program.addCommand(createTouchIdCommand());
program.addCommand(createCompletionCommand());
program.addCommand(createUpdateCommand());
program.addCommand(createRemoveCommand());
program.addCommand(createConfigCommand());
program.addCommand(createDoctorCommand());
program.addCommand(createBackupCommand());
program.addCommand(createRestoreCommand());
program.addCommand(createDuplicatesCommand());
program.addCommand(createScheduleCommand());
program.addCommand(createWatchCommand());
program.addCommand(createReportsCommand());

// Set the commands list for the help command
setCommandsList([
  createCleanCommand(),
  createUninstallCommand(),
  createOptimizeCommand(),
  createAnalyzeCommand(),
  createStatusCommand(),
  createPurgeCommand(),
  createInstallerCommand(),
  createTouchIdCommand(),
  createCompletionCommand(),
  createUpdateCommand(),
  createRemoveCommand(),
  createConfigCommand(),
  createDoctorCommand(),
  createBackupCommand(),
  createRestoreCommand(),
  createDuplicatesCommand(),
  createScheduleCommand(),
  createWatchCommand(),
  createReportsCommand(),
]);

// Parse arguments
program.parse(process.argv);

// Show help if no command provided (only if no subcommand was executed)
if (process.argv.length === 2) {
  console.log(description);
}
