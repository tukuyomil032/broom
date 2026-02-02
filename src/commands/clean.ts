/**
 * Clean command - Deep system cleanup
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { runAllScans, getScanner, getAllScanners } from '../scanners/index.js';
import { formatSize } from '../utils/fs.js';
import { loadConfig, isWhitelisted } from '../utils/config.js';
import { debug, debugSection, debugObj, debugFile, debugRisk } from '../utils/debug.js';
import { enhanceCommandHelp } from '../utils/help.js';
import { ReportGenerator } from '../utils/report.js';
import { join } from 'path';
import { homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import {
  printHeader,
  success,
  warning,
  info,
  separator,
  createSpinner,
  succeedSpinner,
  createProgress,
  printSummaryBlock,
  ICONS,
} from '../ui/output.js';
import { selectCategories, confirmRemoval } from '../ui/prompts.js';
import type { ScanResult, CleanableItem, CleanSummary, CategoryId } from '../types/index.js';

interface CleanOptions {
  dryRun?: boolean;
  all?: boolean;
  yes?: boolean;
  unsafe?: boolean;
  report?: boolean;
  open?: boolean;
}

/**
 * Filter whitelisted items
 */
function filterWhitelisted(items: CleanableItem[], whitelist: string[]): CleanableItem[] {
  return items.filter((item) => !isWhitelisted(item.path, whitelist));
}

/**
 * Print scan results
 */
function printScanResults(results: ScanResult[]): void {
  console.log();
  console.log(chalk.bold('Scan Results:'));
  separator('─', 60);

  for (const result of results) {
    const sizeStr = formatSize(result.totalSize);
    const countStr = `${result.items.length} items`;

    if (result.items.length > 0) {
      const safetyIcon =
        result.category.safetyLevel === 'safe'
          ? chalk.green('●')
          : result.category.safetyLevel === 'moderate'
            ? chalk.yellow('●')
            : chalk.red('●');

      console.log(
        `  ${safetyIcon} ${result.category.name.padEnd(30)} ${chalk.yellow(sizeStr.padStart(12))} ${chalk.dim(`(${countStr})`)}`
      );
    }
  }

  separator('─', 60);
}

/**
 * Execute clean command
 */
export async function cleanCommand(options: CleanOptions): Promise<void> {
  const config = await loadConfig();
  const isDryRun = options.dryRun || config.dryRun;

  debugSection('Clean Command');
  debugObj('Options', options);
  debugObj('Config', config);

  printHeader(isDryRun ? '🧹 Clean Your Mac (Dry Run)' : '🧹 Clean Your Mac');

  if (isDryRun) {
    console.log(chalk.yellow(`${ICONS.dryRun} Dry Run Mode - Preview only, no deletions`));
    console.log();
  }

  // Scan phase
  const scanners = getAllScanners();
  const progress = createProgress(scanners.length);

  console.log(chalk.cyan('Scanning for cleanable files...\n'));

  debug(`Starting scan with ${scanners.length} scanners`);
  const summary = await runAllScans({
    parallel: true,
    concurrency: 4,
    onProgress: (completed, total, scanner) => {
      debug(`Scan progress: ${completed}/${total} - ${scanner.category.name}`);
      progress.update(completed, `Scanning ${scanner.category.name}...`);
    },
  });

  progress.finish('Scan complete');

  // Filter out empty results and apply whitelist
  let resultsWithItems = summary.results
    .filter((r) => r.items.length > 0)
    .map((r) => ({
      ...r,
      items: filterWhitelisted(r.items, config.whitelist),
    }))
    .filter((r) => r.items.length > 0);

  // Recalculate totals after filtering
  resultsWithItems = resultsWithItems.map((r) => ({
    ...r,
    totalSize: r.items.reduce((sum, item) => sum + item.size, 0),
  }));

  if (resultsWithItems.length === 0) {
    console.log();
    success('Your Mac is already clean!');
    return;
  }

  // Filter risky categories unless --unsafe
  const riskyResults = resultsWithItems.filter((r) => r.category.safetyLevel === 'risky');
  const safeResults = resultsWithItems.filter((r) => r.category.safetyLevel !== 'risky');

  if (!options.unsafe && riskyResults.length > 0) {
    const riskySize = riskyResults.reduce((sum, r) => sum + r.totalSize, 0);
    console.log();
    console.log(
      chalk.yellow(`${ICONS.warning} Skipping risky categories (use --unsafe to include):`)
    );

    for (const result of riskyResults) {
      console.log(
        chalk.dim(`  ${chalk.red('●')} ${result.category.name}: ${formatSize(result.totalSize)}`)
      );
      if (result.category.safetyNote) {
        console.log(chalk.dim.italic(`     ${result.category.safetyNote}`));
      }
    }
    console.log(chalk.dim(`  Total skipped: ${formatSize(riskySize)}`));

    resultsWithItems = safeResults;
  }

  if (resultsWithItems.length === 0) {
    console.log();
    success('Nothing safe to clean!');
    return;
  }

  printScanResults(resultsWithItems);

  const totalSize = resultsWithItems.reduce((sum, r) => sum + r.totalSize, 0);
  const totalItems = resultsWithItems.reduce((sum, r) => sum + r.items.length, 0);

  info(`Found ${formatSize(totalSize)} in ${totalItems} items`);
  console.log();

  // Select categories
  let selectedResults: ScanResult[];

  if (options.all) {
    selectedResults = resultsWithItems;
  } else {
    selectedResults = await selectCategories(resultsWithItems);
  }

  if (selectedResults.length === 0) {
    warning('No categories selected');
    return;
  }

  const selectedSize = selectedResults.reduce((sum, r) => sum + r.totalSize, 0);
  const selectedItems = selectedResults.reduce((sum, r) => sum + r.items.length, 0);

  // Confirm removal
  if (!options.yes && !isDryRun) {
    const confirmed = await confirmRemoval(selectedItems, selectedSize);

    if (!confirmed) {
      warning('Cleanup cancelled');
      return;
    }
  }

  // Initialize report generator if requested
  let reportGen: ReportGenerator | null = null;
  let diskBefore: { total: number; used: number; free: number; percentage: number } | null = null;

  if (options.report) {
    reportGen = new ReportGenerator();

    // Get disk info before cleanup
    try {
      const { stdout } = await execAsync("df -k / | tail -1 | awk '{print $2,$3,$4}'");
      const [total, used, free] = stdout
        .trim()
        .split(' ')
        .map((n) => parseInt(n) * 1024);
      diskBefore = {
        total,
        used,
        free,
        percentage: (used / total) * 100,
      };
      reportGen.recordDiskBefore(diskBefore);
    } catch (e) {
      debug('Failed to get disk info:', e);
    }
  }

  // Clean phase
  console.log();
  const cleanSpinner = createSpinner(isDryRun ? 'Simulating cleanup...' : 'Cleaning...');

  const cleanResults: CleanSummary = {
    results: [],
    totalFreedSpace: 0,
    totalCleanedItems: 0,
    totalErrors: 0,
  };

  for (const result of selectedResults) {
    const scanner = getScanner(result.category.id);

    if (!scanner) {
      debug(`Scanner not found for ${result.category.id}`);
      continue;
    }

    debug(`Cleaning ${result.category.name}: ${result.items.length} items`);
    for (const item of result.items) {
      debugFile('delete', item.path, formatSize(item.size));
      debugRisk(item.path, result.category.safetyLevel as any);

      // Record in report
      if (reportGen) {
        reportGen.recordDeletion(item.path, item.size, result.category.name);
      }
    }

    const cleanResult = await scanner.clean(result.items, isDryRun);
    debug(`Cleaned ${cleanResult.cleanedItems} items, freed ${formatSize(cleanResult.freedSpace)}`);
    cleanResults.results.push(cleanResult);
    cleanResults.totalFreedSpace += cleanResult.freedSpace;
    cleanResults.totalCleanedItems += cleanResult.cleanedItems;
    cleanResults.totalErrors += cleanResult.errors.length;
  }

  succeedSpinner(cleanSpinner, isDryRun ? 'Simulation complete' : 'Cleanup complete');

  // Print summary
  const summaryHeading = isDryRun ? 'Dry Run Complete - No Changes Made' : 'Cleanup Complete';
  const summaryDetails = [
    `Space ${isDryRun ? 'would be ' : ''}freed: ${chalk.green(formatSize(cleanResults.totalFreedSpace))}`,
    `Items cleaned: ${cleanResults.totalCleanedItems}`,
    `Categories: ${cleanResults.results.length}`,
  ];

  if (cleanResults.totalErrors > 0) {
    summaryDetails.push(`${chalk.red(`Errors: ${cleanResults.totalErrors}`)}`);
  }

  printSummaryBlock(summaryHeading, summaryDetails);

  // Generate HTML report if requested
  if (reportGen) {
    try {
      const reportDir = join(homedir(), '.broom', 'reports');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const reportPath = join(reportDir, `cleanup-${timestamp}.html`);

      // Get disk info after cleanup
      const { stdout } = await execAsync("df -k / | tail -1 | awk '{print $2,$3,$4}'");
      const [total, used, free] = stdout
        .trim()
        .split(' ')
        .map((n) => parseInt(n) * 1024);
      const diskAfter = {
        total,
        used,
        free,
        percentage: (used / total) * 100,
      };

      await reportGen.generate(reportPath, diskAfter);

      console.log();
      success(`Report generated: ${chalk.cyan(reportPath)}`);

      // Open in browser if requested
      if (options.open) {
        await execAsync(`open "${reportPath}"`);
        info('Report opened in browser');
      }
    } catch (e) {
      warning(`Failed to generate report: ${e}`);
    }
  }
}

/**
 * Create clean command
 */
export function createCleanCommand(): Command {
  const cmd = new Command('clean')
    .description('Deep system cleanup')
    .option('-n, --dry-run', 'Preview only, no deletions')
    .option('-a, --all', 'Clean all categories without prompting')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--unsafe', 'Include risky categories in cleanup')
    .option('-r, --report', 'Generate HTML report after cleanup')
    .option('-o, --open', 'Open report in browser after generation')
    .action(async (options) => {
      await cleanCommand(options);
    });

  return enhanceCommandHelp(cmd);
}
