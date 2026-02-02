/**
 * Reports command - Manage cleanup reports
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { enhanceCommandHelp } from '../utils/help.js';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { exists, formatSize } from '../utils/fs.js';
import {
  printHeader,
  success,
  warning,
  info,
  separator,
  createSpinner,
  succeedSpinner,
} from '../ui/output.js';
import { confirm } from '../ui/prompts.js';

interface ReportsOptions {
  yes?: boolean;
}

interface ReportFile {
  path: string;
  name: string;
  size: number;
  date: Date;
}

/**
 * Get all report files
 */
async function getReportFiles(): Promise<ReportFile[]> {
  const reportsDir = join(homedir(), '.broom', 'reports');

  if (!exists(reportsDir)) {
    return [];
  }

  const files: ReportFile[] = [];

  try {
    const entries = await readdir(reportsDir);

    for (const entry of entries) {
      if (!entry.endsWith('.html')) continue;

      const filePath = join(reportsDir, entry);
      const stats = await stat(filePath);

      files.push({
        path: filePath,
        name: entry,
        size: stats.size,
        date: stats.mtime,
      });
    }

    // Sort by date descending (newest first)
    files.sort((a, b) => b.date.getTime() - a.date.getTime());

    return files;
  } catch {
    return [];
  }
}

/**
 * List all reports
 */
async function listReports(): Promise<void> {
  printHeader('📊 Cleanup Reports');

  const files = await getReportFiles();

  if (files.length === 0) {
    info('No reports found');
    console.log();
    console.log(chalk.dim('Reports are created with: broom clean --report'));
    return;
  }

  console.log(chalk.bold(`Found ${files.length} report(s):`));
  console.log();

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const dateStr = file.date.toLocaleString('ja-JP');
    const sizeStr = formatSize(file.size);

    console.log(`  ${i + 1}. ${chalk.cyan(file.name)}`);
    console.log(`     ${chalk.dim(`Date: ${dateStr} | Size: ${sizeStr}`)}`);
  }

  console.log();
  separator();
  console.log();
  console.log(`Total size: ${chalk.yellow(formatSize(totalSize))}`);
  console.log();
  console.log(chalk.dim('To delete reports: broom reports clean'));
}

/**
 * Clean all reports
 */
async function cleanReports(options: ReportsOptions): Promise<void> {
  printHeader('🗑️  Clean Reports');

  const files = await getReportFiles();

  if (files.length === 0) {
    info('No reports to delete');
    return;
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  console.log(chalk.bold(`Found ${files.length} report(s) to delete`));
  console.log(`Total size: ${chalk.yellow(formatSize(totalSize))}`);
  console.log();

  // Confirm deletion
  if (!options.yes) {
    const shouldDelete = await confirm({
      message: `Delete all ${files.length} report file(s)?`,
      default: false,
    });

    if (!shouldDelete) {
      info('Cancelled');
      return;
    }
  }

  // Delete files
  const spinner = createSpinner('Deleting reports...');
  let deleted = 0;
  let failed = 0;

  for (const file of files) {
    try {
      await unlink(file.path);
      deleted++;
    } catch {
      failed++;
    }
  }

  succeedSpinner(spinner, 'Deletion complete');

  console.log();
  success(`Deleted ${deleted} report(s)`);
  console.log(`Freed space: ${chalk.green(formatSize(totalSize))}`);

  if (failed > 0) {
    warning(`Failed to delete ${failed} file(s)`);
  }
}

/**
 * Open latest report
 */
async function openLatestReport(): Promise<void> {
  const files = await getReportFiles();

  if (files.length === 0) {
    warning('No reports found');
    return;
  }

  const latest = files[0];
  console.log(chalk.dim(`Opening: ${latest.name}`));

  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    await execAsync(`open "${latest.path}"`);
    success('Report opened in browser');
  } catch (error) {
    warning('Failed to open report');
    console.log(chalk.dim(`Path: ${latest.path}`));
  }
}

/**
 * Execute reports command
 */
async function reportsCommand(subcommand: string, options: ReportsOptions): Promise<void> {
  switch (subcommand) {
    case 'list':
      await listReports();
      break;
    case 'clean':
      await cleanReports(options);
      break;
    case 'open':
      await openLatestReport();
      break;
    default:
      await listReports();
      break;
  }
}

/**
 * Create reports command
 */
export function createReportsCommand(): Command {
  const cmd = new Command('reports')
    .description('Manage cleanup reports')
    .argument('[subcommand]', 'Subcommand: list, clean, open', 'list')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (subcommand, options) => {
      await reportsCommand(subcommand, options);
    });

  return enhanceCommandHelp(cmd);
}
