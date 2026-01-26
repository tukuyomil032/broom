/**
 * Help command - Display help for any command
 */
import { Command } from 'commander';
import { formatCommandHelp } from '../utils/help.js';
import { info } from '../ui/output.js';

let allCommands: Command[] = [];

export function setCommandsList(commands: Command[]): void {
  allCommands = commands;
}

export function createHelpCommand(): Command {
  return new Command('help')
    .description('Display help for a command')
    .argument('[command]', 'The command to get help for')
    .action((commandName) => {
      if (!commandName) {
        info('Usage: broom help <command>');
        info('');
        info('Examples:');
        info('  broom help clean');
        info('  broom help analyze');
        info('  broom help uninstall');
        return;
      }

      // Find the specified command
      const command = allCommands.find((cmd) => cmd.name() === commandName);

      if (!command) {
        info(`Error: Unknown command "${commandName}"`);
        process.exit(1);
      }

      // Display the command help
      info(formatCommandHelp(command));
    });
}

