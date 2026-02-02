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
  printProgressBar,
} from '../ui/output.js';
import { selectPath } from '../ui/prompts.js';

// Fixed column widths for aligned display
const NAME_WIDTH = 25;
const BAR_WIDTH = 30;

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

          // Skip excluded paths (iCloud Drive, etc.)
          const { isExcludedPath } = await import('../utils/fs.js');
          if (isExcludedPath(childPath)) {
            continue;
          }

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
 * Generate size bar for Quick Analysis - with borders and gridlines
 */
function generateQuickAnalysisBar(size: number, maxSize: number, width: number = 20): string {
  const percentage = maxSize > 0 ? size / maxSize : 0;
  const filledWidth = Math.round(percentage * width);

  let bar = '';

  // Color based on relative size
  let color: (str: string) => string;
  if (percentage > 0.7) {
    color = chalk.red;
  } else if (percentage > 0.3) {
    color = chalk.hex('#FFA500'); // Orange
  } else {
    color = chalk.gray;
  }

  // Build bar with gridlines every 20%
  for (let i = 0; i < width; i++) {
    const isGridline = i > 0 && i % (width / 5) === 0;

    if (i < filledWidth) {
      bar += isGridline ? chalk.white('│') : color('█');
    } else {
      bar += isGridline ? chalk.gray('│') : chalk.gray('░');
    }
  }

  // Add horizontal borders
  return chalk.gray('│') + bar + chalk.gray('│');
}

/**
 * Generate size bar for tree display with gridlines
 */
function generateTreeBar(size: number, maxSize: number, width: number = BAR_WIDTH): string {
  const percentage = maxSize > 0 ? size / maxSize : 0;
  const filledWidth = Math.round(percentage * width);

  // Build bar with gridlines every 20%
  let bar = '';
  for (let i = 0; i < width; i++) {
    const isGridline = i > 0 && i % (width / 5) === 0;

    if (i < filledWidth) {
      // Filled portion with color gradient
      const ratio = i / width;
      let fillChar: string;
      if (ratio < 0.4) {
        fillChar = chalk.bgGreen.green('█');
      } else if (ratio < 0.7) {
        fillChar = chalk.bgYellow.yellow('█');
      } else {
        fillChar = chalk.bgRed.red('█');
      }

      if (isGridline) {
        bar += chalk.white('│');
      } else {
        bar += fillChar;
      }
    } else {
      // Empty portion
      if (isGridline) {
        bar += chalk.gray('│');
      } else {
        bar += chalk.gray('░');
      }
    }
  }

  // Add border
  return chalk.gray('│') + bar + chalk.gray('│');
}

/**
 * Generate disk usage bar with scale markers and gradient colors
 */
function generateDiskBar(used: number, total: number, width: number = 40): string {
  const percentage = total > 0 ? used / total : 0;
  const filledWidth = Math.round(percentage * width);

  // Scale header
  const scale = chalk.gray('0%       20%       40%       60%       80%      100%');

  // Build top border with horizontal gridlines
  let topBorder = chalk.gray('╔');
  for (let i = 0; i < width; i++) {
    const isGridline = i > 0 && i % (width / 5) === 0;
    topBorder += isGridline ? chalk.white('┬') : chalk.gray('═');
  }
  topBorder += chalk.gray('╗') + '\n';

  // Build main bar with gradient
  let bar = chalk.gray('║');

  for (let i = 0; i < width; i++) {
    const isVerticalGridline = i > 0 && i % (width / 5) === 0;

    if (i < filledWidth) {
      // Gradient color calculation (green → yellow → red)
      const ratio = i / width;
      let color: (str: string) => string;

      if (ratio < 0.5) {
        // Green to Yellow gradient (0-50%)
        const localRatio = ratio / 0.5;
        const r = Math.round(16 + (245 - 16) * localRatio);
        const g = Math.round(185 + (158 - 185) * localRatio);
        const b = Math.round(129 + (11 - 129) * localRatio);
        color = chalk.rgb(r, g, b);
      } else {
        // Yellow to Red gradient (50-100%)
        const localRatio = (ratio - 0.5) / 0.5;
        const r = 239;
        const g = Math.round(158 - (158 - 68) * localRatio);
        const b = Math.round(11 - 11 * localRatio);
        color = chalk.rgb(r, g, b);
      }

      bar += isVerticalGridline ? chalk.white('│') : color('█');
    } else {
      bar += isVerticalGridline ? chalk.gray('│') : chalk.gray('░');
    }
  }

  bar += chalk.gray('║') + '\n';

  // Build bottom border with horizontal gridlines
  let bottomBorder = chalk.gray('╚');
  for (let i = 0; i < width; i++) {
    const isGridline = i > 0 && i % (width / 5) === 0;
    bottomBorder += isGridline ? chalk.white('┴') : chalk.gray('═');
  }
  bottomBorder += chalk.gray('╝');

  return scale + '\n' + topBorder + bar + bottomBorder;
}

/**
 * Print directory tree with aligned columns
 */
function printTree(items: DirInfo[], maxSize: number, limit: number, indent: string = ''): void {
  const displayed = items.slice(0, limit);
  const remaining = items.length - limit;

  // Calculate maximum name width from displayed items (with reasonable limit)
  const MAX_NAME_WIDTH = 40; // Maximum width to prevent excessive spacing
  const maxNameLength = Math.min(
    Math.max(
      ...displayed.map((item) => item.name.length),
      NAME_WIDTH // Minimum width
    ),
    MAX_NAME_WIDTH // Maximum width
  );

  for (let i = 0; i < displayed.length; i++) {
    const item = displayed[i];
    const isLast = i === displayed.length - 1 && remaining <= 0;
    const prefix = isLast ? '└── ' : '├── ';
    const icon = item.isDirectory ? '📁' : '📄';

    // Truncate or pad name to max width (show start and end)
    let displayName = item.name;
    if (displayName.length > maxNameLength) {
      const keepLength = Math.floor((maxNameLength - 3) / 2);
      displayName =
        displayName.substring(0, keepLength) +
        '...' +
        displayName.substring(displayName.length - keepLength);
    }
    displayName = displayName.padEnd(maxNameLength);

    const bar = generateTreeBar(item.size, maxSize);
    const sizeStr = formatSize(item.size).padStart(10);
    const percentage =
      maxSize > 0 ? ((item.size / maxSize) * 100).toFixed(1).padStart(5) + '%' : '  0.0%';

    console.log(
      `${indent}${prefix}${icon} ${chalk.bold(displayName)} ${bar} ${chalk.cyan(sizeStr)} ${chalk.dim(percentage)}`
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

  // Show disk usage with improved bar
  const diskUsage = await getDiskUsage();
  if (diskUsage) {
    console.log(chalk.bold('💾 Disk Usage:'));
    const usedPercent = (diskUsage.used / diskUsage.total) * 100;
    console.log(generateDiskBar(diskUsage.used, diskUsage.total));
    console.log();
    console.log(
      `  Used: ${chalk.yellow(formatSize(diskUsage.used))} / ${formatSize(diskUsage.total)} (${usedPercent.toFixed(1)}%)`
    );
    console.log(`  Free: ${chalk.green(formatSize(diskUsage.free))}`);
    console.log();
  }

  // Scan target directory
  info(`Analyzing system disk...`);
  console.log(chalk.bold(`Target: ${chalk.cyan(targetPath)}`));
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

  // Calculate maximum name width for header alignment (with reasonable limit)
  const MAX_NAME_WIDTH = 40;
  const maxNameLength =
    dirInfo.children && dirInfo.children.length > 0
      ? Math.min(
          Math.max(...dirInfo.children.slice(0, limit).map((item) => item.name.length), NAME_WIDTH),
          MAX_NAME_WIDTH
        )
      : NAME_WIDTH;

  // Print header for aligned columns
  const headerName = 'Name'.padEnd(maxNameLength);
  console.log(
    chalk.dim(
      `     ${headerName}  ${'0%   20%   40%   60%   80%  100%'.padStart(BAR_WIDTH + 2)}       Size   Ratio`
    )
  );
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
  console.log();

  // Header for Quick Analysis with scale
  console.log(chalk.dim('  Location         0%   20%   40%   60%   80%  100%      Size'));
  console.log();

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
    const bar = generateQuickAnalysisBar(result.size, maxQuickSize, 30);
    const sizeStr = formatSize(result.size).padStart(10);
    console.log(`  ${result.label.padEnd(15)} ${bar} ${chalk.cyan(sizeStr)}`);
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
