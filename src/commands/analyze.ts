/**
 * Analyze command - Disk space analysis with drill-down
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { enhanceCommandHelp } from '../utils/help.js';
import { readdir, stat } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { exists, getSize, formatSize, expandPath } from '../utils/fs.js';
import {
  printHeader,
  success,
  warning,
  error,
  info,
  separator,
  createSpinner,
  succeedSpinner,
  failSpinner,
  printTable,
} from '../ui/output.js';
import { selectPath } from '../ui/prompts.js';

interface AnalyzeOptions {
  path?: string;
  depth?: number;
  limit?: number;
}

interface DirInfo {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
  children?: DirInfo[];
}

/**
 * Scan directory for sizes
 */
async function scanDirectory(
  dirPath: string,
  depth: number,
  currentDepth: number = 0
): Promise<DirInfo | null> {
  try {
    const stats = await stat(dirPath);
    const name = basename(dirPath) || dirPath;

    if (!stats.isDirectory()) {
      return {
        path: dirPath,
        name,
        size: stats.size,
        isDirectory: false,
      };
    }

    // Get total size
    const size = await getSize(dirPath);

    const info: DirInfo = {
      path: dirPath,
      name,
      size,
      isDirectory: true,
    };

    // Get children if within depth
    if (currentDepth < depth) {
      try {
        const entries = await readdir(dirPath);
        const children: DirInfo[] = [];

        for (const entry of entries) {
          // Skip hidden files at top level
          if (entry.startsWith('.') && currentDepth === 0) {
            continue;
          }

          const childPath = join(dirPath, entry);

          try {
            const childStats = await stat(childPath);
            const childSize = childStats.isDirectory() ? await getSize(childPath) : childStats.size;

            children.push({
              path: childPath,
              name: entry,
              size: childSize,
              isDirectory: childStats.isDirectory(),
            });
          } catch {
            // Skip if cannot access
          }
        }

        // Sort by size descending
        children.sort((a, b) => b.size - a.size);
        info.children = children;
      } catch {
        // Cannot read directory
      }
    }

    return info;
  } catch {
    return null;
  }
}

/**
 * Generate size bar for visualization
 */
function generateBar(size: number, maxSize: number, width: number = 30): string {
  const percentage = maxSize > 0 ? size / maxSize : 0;
  const filledWidth = Math.round(percentage * width);
  const emptyWidth = width - filledWidth;

  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(emptyWidth);

  // Color based on percentage
  let coloredFilled: string;
  if (percentage > 0.7) {
    coloredFilled = chalk.red(filled);
  } else if (percentage > 0.4) {
    coloredFilled = chalk.yellow(filled);
  } else {
    coloredFilled = chalk.green(filled);
  }

  return coloredFilled + chalk.dim(empty);
}

/**
 * Print directory tree
 */
function printTree(items: DirInfo[], maxSize: number, limit: number, indent: string = ''): void {
  const displayed = items.slice(0, limit);
  const remaining = items.length - limit;

  for (let i = 0; i < displayed.length; i++) {
    const item = displayed[i];
    const isLast = i === displayed.length - 1 && remaining <= 0;
    const prefix = isLast ? '└── ' : '├── ';
    const icon = item.isDirectory ? '📁' : '📄';

    const bar = generateBar(item.size, maxSize, 20);
    const sizeStr = formatSize(item.size).padStart(10);
    const percentage =
      maxSize > 0 ? ((item.size / maxSize) * 100).toFixed(1).padStart(5) + '%' : '  0.0%';

    console.log(
      `${indent}${prefix}${icon} ${chalk.bold(item.name)} ${bar} ${chalk.cyan(sizeStr)} ${chalk.dim(percentage)}`
    );
  }

  if (remaining > 0) {
    console.log(chalk.dim(`${indent}    ... and ${remaining} more items`));
  }
}

/**
 * Get disk usage info
 */
async function getDiskUsage(): Promise<{ total: number; used: number; free: number } | null> {
  try {
    const { execSync } = await import('child_process');
    const output = execSync("df -k / | tail -1 | awk '{print $2, $3, $4}'").toString().trim();
    const [total, used, free] = output.split(' ').map((n) => parseInt(n) * 1024);
    return { total, used, free };
  } catch {
    return null;
  }
}

/**
 * Execute analyze command
 */
export async function analyzeCommand(options: AnalyzeOptions): Promise<void> {
  const targetPath = options.path ? expandPath(options.path) : expandPath('~');
  const depth = options.depth ?? 1;
  const limit = options.limit ?? 15;

  printHeader(`📊 Disk Space Analysis`);

  // Show disk usage
  const diskUsage = await getDiskUsage();
  if (diskUsage) {
    console.log(chalk.bold('Disk Usage:'));
    const usedPercent = (diskUsage.used / diskUsage.total) * 100;
    const bar = generateBar(diskUsage.used, diskUsage.total, 40);
    console.log(`  ${bar}`);
    console.log(
      `  Used: ${chalk.yellow(formatSize(diskUsage.used))} / ${formatSize(diskUsage.total)} (${usedPercent.toFixed(1)}%)`
    );
    console.log(`  Free: ${chalk.green(formatSize(diskUsage.free))}`);
    console.log();
  }

  // Scan target directory
  console.log(chalk.bold(`Analyzing: ${chalk.cyan(targetPath)}`));
  console.log();

  const spinner = createSpinner('Scanning directory sizes...');
  const dirInfo = await scanDirectory(targetPath, depth);

  if (!dirInfo) {
    failSpinner(spinner, 'Failed to scan directory');
    return;
  }

  succeedSpinner(spinner, `Scanned ${dirInfo.children?.length ?? 0} items`);

  // Print results
  console.log();
  console.log(chalk.bold(`📁 ${dirInfo.name}`));
  console.log(`   Total size: ${chalk.yellow(formatSize(dirInfo.size))}`);
  console.log();

  if (dirInfo.children && dirInfo.children.length > 0) {
    const maxSize = dirInfo.children[0]?.size ?? 1;
    printTree(dirInfo.children, maxSize, limit);
  } else {
    warning('No items found in directory');
  }

  // Show common large directories
  console.log();
  separator();
  console.log();

  console.log(chalk.bold('💡 Quick Analysis:'));

  const quickPaths = [
    { path: '~/Library/Caches', label: 'User Caches' },
    { path: '~/Library/Application Support', label: 'App Support' },
    { path: '~/.Trash', label: 'Trash' },
    { path: '~/Downloads', label: 'Downloads' },
    { path: '~/Library/Developer', label: 'Developer Data' },
  ];

  const quickResults: { label: string; size: number }[] = [];

  for (const item of quickPaths) {
    const fullPath = expandPath(item.path);
    if (exists(fullPath)) {
      const size = await getSize(fullPath);
      quickResults.push({ label: item.label, size });
    }
  }

  // Sort by size
  quickResults.sort((a, b) => b.size - a.size);

  const maxQuickSize = quickResults[0]?.size ?? 1;

  for (const result of quickResults) {
    const bar = generateBar(result.size, maxQuickSize, 20);
    console.log(
      `  ${result.label.padEnd(20)} ${bar} ${chalk.cyan(formatSize(result.size).padStart(10))}`
    );
  }

  // Recommendations
  console.log();
  console.log(chalk.bold('📋 Recommendations:'));

  const totalQuickSize = quickResults.reduce((sum, r) => sum + r.size, 0);

  if (totalQuickSize > 5 * 1024 * 1024 * 1024) {
    // > 5GB
    console.log(
      chalk.yellow(`  ⚠️  You have ${formatSize(totalQuickSize)} in common cleanup locations`)
    );
    console.log(chalk.dim('     Run "broom clean" to free up space'));
  } else {
    console.log(chalk.green('  ✓ Your disk looks reasonably clean'));
  }

  console.log();
  console.log(
    chalk.dim('Tip: Use "broom analyze --path /path/to/dir" to analyze a specific directory')
  );
  console.log(chalk.dim('     Use "broom analyze --depth 2" to scan deeper'));
}

/**
 * Create analyze command
 */
export function createAnalyzeCommand(): Command {
  const cmd = new Command('analyze')
    .description('Analyze disk space usage')
    .option('-p, --path <path>', 'Path to analyze (default: home directory)')
    .option('-d, --depth <number>', 'Scan depth (default: 1)', parseInt)
    .option('-l, --limit <number>', 'Max items to show (default: 15)', parseInt)
    .action(async (options) => {
      await analyzeCommand(options);
    });

  return enhanceCommandHelp(cmd);
}
