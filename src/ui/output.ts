/**
 * Terminal output helpers for Broom CLI
 */
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import { formatSize } from '../utils/fs.js';
import type { CleanableItem, RemovalSummary, ScanResult } from '../types/index.js';

// Icons
export const ICONS = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  arrow: '→',
  folder: '📁',
  file: '📄',
  trash: '🗑',
  clean: '🧹',
  disk: '💾',
  cpu: '🖥',
  memory: '🧠',
  network: '🌐',
  dryRun: '👁',
  admin: '🔐',
};

/**
 * Print success message
 */
export function success(message: string): void {
  console.log(chalk.green(ICONS.success), message);
}

/**
 * Print error message
 */
export function error(message: string): void {
  console.log(chalk.red(ICONS.error), message);
}

/**
 * Print warning message
 */
export function warning(message: string): void {
  console.log(chalk.yellow(ICONS.warning), message);
}

/**
 * Print info message
 */
export function info(message: string): void {
  console.log(chalk.blue(ICONS.info), message);
}

/**
 * Print separator line
 */
export function separator(char = '─', length = 60): void {
  console.log(chalk.gray(char.repeat(length)));
}

/**
 * Print header
 */
export function printHeader(title: string): void {
  console.log();
  console.log(chalk.bold.magenta(title));
  separator();
}

/**
 * Print welcome message
 */
export function printWelcome(): void {
  console.log();
  console.log(chalk.bold.cyan('🧹 Broom'));
  console.log(chalk.dim('macOS Disk Cleanup Tool'));
  separator();
}

/**
 * Print file with details
 */
export function printFile(item: CleanableItem, index?: number): void {
  const prefix = index !== undefined ? `${String(index + 1).padStart(2, ' ')}.` : '  ';
  const icon = item.isDirectory ? ICONS.folder : ICONS.file;
  const size = chalk.yellow(formatSize(item.size).padStart(10));
  const path = chalk.dim(item.path);

  console.log(`${prefix} ${icon} ${size}  ${path}`);
}

/**
 * Print file list
 */
export function printFiles(items: CleanableItem[]): void {
  items.forEach((item, index) => printFile(item, index));
}

/**
 * Print scan result
 */
export function printScanResult(result: ScanResult): void {
  const { category, items, totalSize } = result;
  const sizeStr = formatSize(totalSize);
  const countStr = `${items.length} items`;

  if (items.length > 0) {
    console.log(
      `  ${chalk.green(ICONS.success)} ${category.name.padEnd(35)} ${chalk.yellow(sizeStr.padStart(12))} ${chalk.dim(`(${countStr})`)}`
    );
  } else {
    console.log(`  ${chalk.gray(ICONS.info)} ${category.name.padEnd(35)} ${chalk.gray('Empty')}`);
  }
}

/**
 * Print removal summary
 */
export function printRemovalSummary(summary: RemovalSummary): void {
  separator();
  console.log(chalk.bold('Removal Summary:'));
  console.log(`Total files: ${chalk.cyan(summary.totalFiles)}`);
  console.log(`Successfully removed: ${chalk.green(summary.successCount)}`);

  if (summary.failureCount > 0) {
    console.log(`Failed: ${chalk.red(summary.failureCount)}`);
  }

  console.log(`Space freed: ${chalk.yellow(formatSize(summary.totalSizeFreed))}`);
  separator();

  if (summary.failureCount > 0) {
    console.log(chalk.bold('\nFailed removals:'));
    summary.results
      .filter((r) => !r.success)
      .forEach((r) => {
        error(`${r.path}: ${r.error || 'Unknown error'}`);
      });
  }
}

/**
 * Print summary block
 */
export function printSummaryBlock(heading: string, details: string[]): void {
  console.log();
  separator('═');
  console.log(chalk.bold(heading));
  separator('─');
  details.forEach((detail) => console.log(`  ${detail}`));
  separator('═');
}

/**
 * Create spinner
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    spinner: 'dots',
  }).start();
}

/**
 * Start spinner
 */
export function startSpinner(text: string): Ora {
  return ora(text).start();
}

/**
 * Succeed spinner
 */
export function succeedSpinner(spinner: Ora, text?: string): void {
  if (text) {
    spinner.succeed(text);
  } else {
    spinner.succeed();
  }
}

/**
 * Fail spinner
 */
export function failSpinner(spinner: Ora, text?: string): void {
  if (text) {
    spinner.fail(text);
  } else {
    spinner.fail();
  }
}

/**
 * Update spinner text
 */
export function updateSpinner(spinner: Ora, text: string): void {
  spinner.text = text;
}

/**
 * Print progress bar inline with improved design
 */
export function printProgressBar(percent: number, width = 30, label = ''): void {
  const filled = Math.round((percent / 100) * width);

  // Build bar without gridlines for progress bars
  let bar = '';
  for (let i = 0; i < width; i++) {
    if (i < filled) {
      const ratio = i / width;
      if (ratio < 0.5) {
        bar += chalk.green('█');
      } else if (ratio < 0.75) {
        bar += chalk.yellow('█');
      } else {
        bar += chalk.red('█');
      }
    } else {
      bar += chalk.gray('░');
    }
  }

  const percentStr = `${percent.toFixed(0)}%`.padStart(4);
  const line = `\r${chalk.gray('│')}${bar}${chalk.gray('│')} ${percentStr}${label ? ` ${chalk.dim(label)}` : ''}`;
  process.stdout.write(line);
}

/**
 * Print styled progress bar with message
 */
export function printStyledProgressBar(
  percent: number,
  width = 35,
  message = '',
  showPercent = true
): string {
  const filled = Math.round((percent / 100) * width);

  // Build bar without gridlines for styled progress bars
  let bar = chalk.gray('╔');
  for (let i = 0; i < width; i++) {
    if (i < filled) {
      const ratio = i / width;
      if (ratio < 0.5) {
        bar += chalk.green('█');
      } else if (ratio < 0.75) {
        bar += chalk.yellow('█');
      } else {
        bar += chalk.red('█');
      }
    } else {
      bar += chalk.gray('░');
    }
  }
  bar += chalk.gray('╗');

  const percentStr = showPercent ? ` ${percent.toFixed(0).padStart(3)}%` : '';
  return `${bar}${percentStr}${message ? ` ${chalk.dim(message)}` : ''}`;
}

/**
 * Create progress tracker
 */
export function createProgress(
  total: number,
  taskMessage = 'Processing...'
): {
  update: (current: number, message?: string) => void;
  finish: (message?: string) => void;
} {
  const spinner = ora(taskMessage).start();

  return {
    update: (current: number, message?: string) => {
      const percent = Math.round((current / total) * 100);
      const progressBar = createProgressBar(percent);
      spinner.text = `${progressBar} ${percent}%${message ? ` - ${message}` : ''}`;
    },
    finish: (message?: string) => {
      spinner.succeed(message || 'Complete');
    },
  };
}

/**
 * Create ASCII progress bar
 */
function createProgressBar(percent: number, width = 20): string {
  const filled = Math.round((percent / 100) * width);

  let bar = '';
  for (let i = 0; i < width; i++) {
    const isGridline = i > 0 && i % (width / 5) === 0;
    if (i < filled) {
      bar += isGridline ? '│' : '█';
    } else {
      bar += isGridline ? '┊' : ' ';
    }
  }

  return `[${bar}]`;
}

/**
 * Clear terminal
 */
export function clearTerminal(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1B[2J\x1B[H');
  }
}

/**
 * Print table
 */
export function printTable(headers: string[], rows: string[][], columnWidths?: number[]): void {
  const widths =
    columnWidths ||
    headers.map((h, i) => {
      const maxRow = Math.max(...rows.map((r) => (r[i] || '').length));
      return Math.max(h.length, maxRow);
    });

  // Header
  const headerRow = headers.map((h, i) => h.padEnd(widths[i])).join(' │ ');
  console.log(chalk.bold(headerRow));

  // Separator
  const sep = widths.map((w) => '─'.repeat(w)).join('─┼─');
  console.log(chalk.gray(sep));

  // Rows
  rows.forEach((row) => {
    const line = row.map((cell, i) => cell.padEnd(widths[i])).join(' │ ');
    console.log(line);
  });
}

/**
 * Show hide cursor
 */
export function hideCursor(): void {
  process.stdout.write('\x1B[?25l');
}

export function showCursor(): void {
  process.stdout.write('\x1B[?25h');
}
