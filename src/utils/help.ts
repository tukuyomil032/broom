/**
 * Custom help utilities for enhanced command option display
 */
import chalk from 'chalk';
import { Command, Option } from 'commander';

interface OptionInfo {
  flags: string;
  description: string;
  type: 'boolean' | 'string' | 'number';
  required: boolean;
  defaultValue?: string;
}

/**
 * Analyze option to determine its type and properties
 */
function analyzeOption(option: Option): OptionInfo {
  const flags = option.flags;
  const description = option.description || '';
  let type: 'boolean' | 'string' | 'number' = 'boolean';
  let required = false;

  if (flags.includes('<') && flags.includes('>')) {
    required = true;
    const argMatch = flags.match(/<([^>]+)>/);
    const argName = argMatch ? argMatch[1] : '';

    if (
      argName.toLowerCase().includes('number') ||
      argName.toLowerCase().includes('count') ||
      argName.toLowerCase().includes('seconds') ||
      argName.toLowerCase().includes('interval') ||
      argName.toLowerCase().includes('depth') ||
      argName.toLowerCase().includes('limit')
    ) {
      type = 'number';
    } else {
      type = 'string';
    }
  } else if (flags.includes('[') && flags.includes(']')) {
    required = false;
    const argMatch = flags.match(/\[([^\]]+)\]/);
    const argName = argMatch ? argMatch[1] : '';

    if (
      argName.toLowerCase().includes('number') ||
      argName.toLowerCase().includes('count') ||
      argName.toLowerCase().includes('seconds') ||
      argName.toLowerCase().includes('interval') ||
      argName.toLowerCase().includes('depth') ||
      argName.toLowerCase().includes('limit')
    ) {
      type = 'number';
    } else {
      type = 'string';
    }
  }

  return {
    flags,
    description,
    type,
    required,
    defaultValue: option.defaultValue?.toString(),
  };
}

/**
 * Strip ANSI codes to get actual visual length
 */
function getVisualLength(str: string): number {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

/**
 * Generate formatted options table with perfect alignment
 */
export function generateOptionsTable(command: Command): string {
  const options = command.options;

  if (options.length === 0) {
    return chalk.dim('  No options available.');
  }

  const optionInfos = options.map(analyzeOption);

  const flagWidth = 24;
  const typeWidth = 10;
  const reqWidth = 10;
  const descWidth = 49;

  let output = '\n';

  // Calculate border length
  const borderLength = flagWidth + typeWidth + reqWidth + descWidth + 3;

  // Top border
  output += '  ' + '─'.repeat(borderLength) + '\n';

  // Header
  output +=
    '  ' +
    'FLAG'.padEnd(flagWidth) +
    'TYPE'.padEnd(typeWidth) +
    'REQUIRED'.padEnd(reqWidth) +
    'DESCRIPTION'.padEnd(descWidth) +
    '\n';

  // Header separator
  output += '  ' + '─'.repeat(borderLength) + '\n';

  // Data rows
  for (const info of optionInfos) {
    const desc = info.description + (info.defaultValue ? ` (default: ${info.defaultValue})` : '');
    const truncDesc = desc.length > descWidth - 2 ? desc.substring(0, descWidth - 5) + '...' : desc;

    const flagCell = chalk.cyan(info.flags);
    const typeCell = getTypeColor(info.type);
    const reqCell = info.required ? chalk.red('Yes') : chalk.green('No');
    const descCell = truncDesc;

    const flagPad = flagWidth - getVisualLength(flagCell);
    const typePad = typeWidth - getVisualLength(typeCell);
    const reqPad = reqWidth - getVisualLength(reqCell);
    const descPad = descWidth - getVisualLength(descCell);

    output +=
      '  ' +
      flagCell +
      ' '.repeat(Math.max(0, flagPad)) +
      typeCell +
      ' '.repeat(Math.max(0, typePad)) +
      reqCell +
      ' '.repeat(Math.max(0, reqPad)) +
      descCell +
      ' '.repeat(Math.max(0, descPad)) +
      '\n';
  }

  // Bottom border
  output += '  ' + '─'.repeat(borderLength) + '\n';

  return output;
}

/**
 * Get colored type string
 */
function getTypeColor(type: 'boolean' | 'string' | 'number'): string {
  switch (type) {
    case 'boolean':
      return chalk.green('boolean');
    case 'string':
      return chalk.blue('string');
    case 'number':
      return chalk.yellow('number');
    default:
      return chalk.white('unknown');
  }
}

/**
 * Enhanced help formatter that includes options table
 */
export function formatCommandHelp(command: Command): string {
  const name = command.name();
  const description = command.description();
  const usage = command.usage();
  const args = command.args;

  let help = '';

  help += chalk.bold('Usage: ') + `${name} ${usage || '[options]'}\n\n`;

  if (description) {
    help += description + '\n\n';
  }

  if (args.length > 0) {
    help += chalk.bold('Arguments:\n');
    for (const arg of args) {
      const argName = (arg as any).name || arg;
      const argDesc = (arg as any).description || '';
      const required = `[${argName}]`;
      help += `  ${required.padEnd(20)} ${argDesc}\n`;
    }
    help += '\n';
  }

  help += generateOptionsTable(command);

  const examples = getExamplesFromDescription(description);
  if (examples.length > 0) {
    help += '\n' + chalk.bold('Examples:\n');
    examples.forEach((example) => {
      help += `  ${chalk.dim('$')} ${chalk.cyan(example)}\n`;
    });
  }

  return help;
}

/**
 * Extract examples from command description
 */
function getExamplesFromDescription(description?: string): string[] {
  if (!description) return [];

  const examples = [];

  if (description.includes('cleanup') || description.includes('clean')) {
    examples.push('broom clean --dry-run', 'broom clean --all', 'broom clean --debug');
  }

  if (description.includes('uninstall') || description.includes('remove')) {
    examples.push('broom uninstall --dry-run', 'broom uninstall --debug');
  }

  if (description.includes('optimize') || description.includes('maintenance')) {
    examples.push('broom optimize --all', 'broom optimize --dry-run');
  }

  if (description.includes('analyze')) {
    examples.push('broom analyze ~/Downloads', 'broom analyze --depth 2');
  }

  if (description.includes('status') || description.includes('monitor')) {
    examples.push('broom status', 'broom status --interval 5');
  }

  return examples;
}

/**
 * Apply custom help formatting to a command
 */
export function enhanceCommandHelp(command: Command): Command {
  command.configureHelp({
    formatHelp: () => formatCommandHelp(command),
  });

  return command;
}

/**
 * Global options information for main help
 */
export function getGlobalOptionsTable(): string {
  const globalOptions: OptionInfo[] = [
    {
      flags: '-v, --version',
      description: 'Output the current version',
      type: 'boolean',
      required: false,
    },
    {
      flags: '--debug',
      description: 'Enable debug mode with detailed logs',
      type: 'boolean',
      required: false,
    },
    {
      flags: '-h, --help',
      description: 'Display help for command',
      type: 'boolean',
      required: false,
    },
  ];

  const flagWidth = 24;
  const typeWidth = 10;
  const reqWidth = 10;
  const descWidth = 49;

  let output = '\n';

  // Calculate border length
  const borderLength = flagWidth + typeWidth + reqWidth + descWidth + 3;

  // Top border
  output += '  ' + '─'.repeat(borderLength) + '\n';

  // Header
  output +=
    '  ' +
    'FLAG'.padEnd(flagWidth) +
    'TYPE'.padEnd(typeWidth) +
    'REQUIRED'.padEnd(reqWidth) +
    'DESCRIPTION'.padEnd(descWidth) +
    '\n';

  // Header separator
  output += '  ' + '─'.repeat(borderLength) + '\n';

  // Data rows
  for (const option of globalOptions) {
    const flagCell = chalk.cyan(option.flags);
    const typeCell = getTypeColor(option.type);
    const reqCell = option.required ? chalk.red('Yes') : chalk.green('No');
    const descCell = option.description;

    const flagPad = flagWidth - getVisualLength(flagCell);
    const typePad = typeWidth - getVisualLength(typeCell);
    const reqPad = reqWidth - getVisualLength(reqCell);
    const descPad = descWidth - getVisualLength(descCell);

    output +=
      '  ' +
      flagCell +
      ' '.repeat(Math.max(0, flagPad)) +
      typeCell +
      ' '.repeat(Math.max(0, typePad)) +
      reqCell +
      ' '.repeat(Math.max(0, reqPad)) +
      descCell +
      ' '.repeat(Math.max(0, descPad)) +
      '\n';
  }

  // Bottom border
  output += '  ' + '─'.repeat(borderLength) + '\n';

  return output;
}
