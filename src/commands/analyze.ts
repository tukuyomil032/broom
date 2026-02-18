/**
 * Analyze command - Disk space analysis with drill-down
 */
import chalk from 'chalk';
import { Command } from 'commander';
import blessed from 'blessed';
import { enhanceCommandHelp } from '../utils/help.js';
import { readdir, stat } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { exists, getSize, formatSize, expandPath } from '../utils/fs.js';
import { exec } from 'child_process';
import { promisify } from 'util';
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

const execAsync = promisify(exec);

// Fixed column widths for aligned display
const NAME_WIDTH = 25;
const BAR_WIDTH = 30;

interface AnalyzeOptions {
  path?: string;
  positionalPath?: string;
}

interface DirInfo {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
  mtime?: Date;
  children?: DirInfo[];
}

/**
 * Scan directory for sizes - recursive with optional depth limit
 */
async function scanDirectory(
  dirPath: string,
  currentDepth: number = 0,
  maxDepth?: number
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
        mtime: stats.mtime,
      };
    }

    // Get total size
    const size = await getSize(dirPath);

    const info: DirInfo = {
      path: dirPath,
      name,
      size,
      isDirectory: true,
      mtime: stats.mtime,
    };

    // Check depth limit
    if (maxDepth !== undefined && currentDepth >= maxDepth) {
      info.children = [];
      return info;
    }

    // Recursively scan subdirectories
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

          if (childStats.isDirectory()) {
            // Recursively scan subdirectories
            const childInfo = await scanDirectory(childPath, currentDepth + 1, maxDepth);
            if (childInfo) {
              children.push(childInfo);
            }
          } else {
            const childSize = childStats.size;
            children.push({
              path: childPath,
              name: entry,
              size: childSize,
              isDirectory: false,
            });
          }
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

    return info;
  } catch {
    return null;
  }
}

/**
 * Generate disk usage bar graph with chalk colors.
 * Safe to use in listBox with tags:false (ANSI codes rendered by terminal directly).
 */
function generateUsageBar(size: number, parentSize: number, width: number = 20): string {
  const percentage = parentSize > 0 ? size / parentSize : 0;
  const clamped = Math.min(percentage, 1);
  const filledWidth = Math.round(clamped * width);

  let bar = '';
  for (let i = 0; i < width; i++) {
    if (i < filledWidth) {
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

  const pct = (clamped * 100).toFixed(1);
  return `${bar} ${pct}%`;
}

/**
 * Generate disk usage bar using blessed tags (for info box display)
 */
function generateUsageBarBlessed(size: number, parentSize: number, width: number = 28): string {
  const percentage = parentSize > 0 ? size / parentSize : 0;
  const clamped = Math.min(percentage, 1);
  const filledWidth = Math.round(clamped * width);

  let bar = '';
  for (let i = 0; i < width; i++) {
    if (i < filledWidth) {
      const ratio = i / width;
      if (ratio < 0.5) {
        bar += '{green-fg}█{/green-fg}';
      } else if (ratio < 0.75) {
        bar += '{yellow-fg}█{/yellow-fg}';
      } else {
        bar += '{red-fg}█{/red-fg}';
      }
    } else {
      bar += '{white-fg}░{/white-fg}';
    }
  }

  const pct = (clamped * 100).toFixed(1);
  // NOTE: percentage is plain text, NOT wrapped in blessed tags
  return `${bar} ${pct}%`;
}

/**
 * Normalize path for comparison
 */
function normalizePath(p: string): string {
  return p.replace(/\/+$/, '') || '/'; // Remove trailing slashes
}

/**
 * Get folder at path from DirInfo tree
 */
function getFolderAtPath(root: DirInfo, targetPath: string): DirInfo | null {
  const normalizedTarget = normalizePath(targetPath);
  const normalizedRoot = normalizePath(root.path);

  if (normalizedRoot === normalizedTarget) {
    return root;
  }

  if (!root.children) {
    return null;
  }

  for (const child of root.children) {
    const result = getFolderAtPath(child, targetPath);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Get immediate children of a folder
 */
function getChildrenAtPath(root: DirInfo, targetPath: string): DirInfo[] {
  const folder = getFolderAtPath(root, targetPath);
  return folder?.children || [];
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
function printTree(items: DirInfo[], parentSize: number, limit: number, indent: string = ''): void {
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

  // Find max size for bar visualization (visual reference only)
  const maxSizeForBar = Math.max(...displayed.map((item) => item.size), 1);

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

    // Use parent size as reference for bar visualization
    const bar = generateTreeBar(item.size, parentSize);
    const sizeStr = formatSize(item.size).padStart(10);
    // Calculate percentage relative to parent directory total size
    const percentage =
      parentSize > 0 ? ((item.size / parentSize) * 100).toFixed(1).padStart(5) + '%' : '  0.0%';

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
 * Execute analyze command with interactive UI and optimized loading
 */
export async function analyzeCommand(options: AnalyzeOptions): Promise<void> {
  const rawPath = options.positionalPath || options.path;
  const targetPath = rawPath ? expandPath(rawPath) : expandPath('~');

  // First, show initial message in console
  console.clear();
  console.log(chalk.bold.cyan('\n🧹 Broom - Disk Space Analyzer\n'));

  const spinner = createSpinner('Scanning directory structure (initial scan)...');

  // First pass: shallow scan for quick display
  let rootInfo = await scanDirectory(targetPath, 0, 2);

  if (!rootInfo) {
    failSpinner(spinner, 'Failed to scan directory');
    return;
  }

  succeedSpinner(spinner, 'Initial scan complete');

  if (!rootInfo.children || rootInfo.children.length === 0) {
    console.log(chalk.yellow('No items found in directory'));
    return;
  }

  // Start UI display
  let currentPath = targetPath;

  function displayDirectory() {
    // Normalize current path for consistency
    const normalizedPath = normalizePath(currentPath);

    // Get current folder and its direct children
    const currentFolder = getFolderAtPath(rootInfo!, normalizedPath);
    if (!currentFolder) {
      console.log(
        chalk.red(
          `Error: Could not find folder at ${normalizedPath}. Current root: ${normalizePath(rootInfo!.path)}`
        )
      );
      return;
    }

    const items = currentFolder.children || [];

    // Create blessed screen for interactive UI
    const screen = blessed.screen({
      smartCSR: true,
      title: 'Broom - Disk Space Analyzer',
      fullUnicode: true,
    });

    // Header box
    const headerBox = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      border: { type: 'line' },
      style: { border: { fg: 'cyan' } },
      content: ` {bold}📊 ${normalizedPath}{/bold}\n {dim}Total: ${formatSize(currentFolder.size)} | Items: ${items.length}{/dim}`,
    });

    // Main list box - folders/files in current directory
    // tags: false to prevent ANSI codes in item text from being misinterpreted
    const listBox = blessed.list({
      parent: screen,
      top: 3,
      left: 0,
      width: '60%',
      height: '100%-6',
      label: ' Contents ',
      tags: false,
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'white', bold: true },
      },
      mouse: true,
      keys: true,
    });

    // Info box - details of selected item
    const infoBox = blessed.box({
      parent: screen,
      top: 3,
      left: '60%',
      width: '40%',
      height: '100%-6',
      label: ' {cyan-fg}↕{/cyan-fg} Details ',
      tags: true,
      border: { type: 'line' },
      style: { border: { fg: 'cyan' } },
      scrollable: true,
      mouse: true,
    });

    // Footer box
    blessed.box({
      parent: screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      border: { type: 'line' },
      style: { border: { fg: 'cyan' } },
      content:
        '{cyan-fg}↑↓{/cyan-fg} Navigate | {green-fg}Enter{/green-fg} Open folder | {red-fg}o{/red-fg} Open in Finder | {yellow-fg}b{/yellow-fg} Back | {red-fg}q/Esc{/red-fg} Quit',
    });

    // Populate list with items (plain text only - no ANSI/tags to avoid index corruption)
    let selectedIndex = 0;

    items.forEach((item) => {
      const icon = item.isDirectory ? '>' : ' ';
      const name = item.name.substring(0, 24).padEnd(24);
      const bar = generateUsageBar(item.size, currentFolder.size, 18);
      listBox.addItem(`${icon} ${name} ${bar}`);
    });

    // Update info box when selection changes
    const updateInfoBox = (index: number) => {
      if (index >= items.length || index < 0) return;
      selectedIndex = index;

      const selectedItem = items[index];
      if (!selectedItem) return;

      const usageBar = generateUsageBarBlessed(selectedItem.size, currentFolder.size, 24);
      const pct =
        currentFolder.size > 0
          ? ((selectedItem.size / currentFolder.size) * 100).toFixed(1)
          : '0.0';

      // Rank in parent by size
      const rank = items.indexOf(selectedItem) + 1;

      // Children breakdown
      const childDirs = selectedItem.children?.filter((c) => c.isDirectory).length ?? 0;
      const childFiles = selectedItem.children?.filter((c) => !c.isDirectory).length ?? 0;
      const hasChildren = childDirs + childFiles > 0;

      // Last modified
      const mtimeStr = selectedItem.mtime
        ? selectedItem.mtime.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Unknown';

      // Size comparison label
      let sizeLabel = '';
      if (pct !== '0.0') {
        const p = parseFloat(pct);
        if (p >= 30) sizeLabel = ' {red-fg}(Very large){/red-fg}';
        else if (p >= 10) sizeLabel = ' {yellow-fg}(Large){/yellow-fg}';
        else if (p >= 1) sizeLabel = ' {green-fg}(Medium){/green-fg}';
        else sizeLabel = ' {cyan-fg}(Small){/cyan-fg}';
      }

      // Icon
      const icon = selectedItem.isDirectory ? '📁' : '📄';
      const typeLabel = selectedItem.isDirectory ? 'Directory' : 'File';

      // Path - wrap at 30 chars
      const pathParts: string[] = [];
      let remaining = selectedItem.path;
      while (remaining.length > 30) {
        pathParts.push(remaining.slice(0, 30));
        remaining = remaining.slice(30);
      }
      pathParts.push(remaining);
      const wrappedPath = pathParts.join('\n  ');

      const divider = '{cyan-fg}' + '─'.repeat(28) + '{/cyan-fg}';

      const infoText =
        // Title
        `${icon} {bold}{underline}${selectedItem.name}{/underline}{/bold}\n` +
        `${divider}\n\n` +
        // Usage
        `{yellow-fg}📊 Usage{/yellow-fg}\n` +
        `  ${usageBar}\n` +
        `  {bold}${pct}%{/bold} of parent${sizeLabel}\n\n` +
        // Rank
        `{yellow-fg}🏆 Rank{/yellow-fg}\n` +
        `  {bold}#${rank}{/bold} of ${items.length} items\n\n` +
        // Size
        `{yellow-fg}💾 Size{/yellow-fg}\n` +
        `  {bold}${formatSize(selectedItem.size)}{/bold}\n\n` +
        // Type
        `{yellow-fg}📂 Type{/yellow-fg}\n` +
        `  ${typeLabel}\n\n` +
        // Contents (directories only)
        (selectedItem.isDirectory
          ? `{yellow-fg}📋 Contents{/yellow-fg}\n` +
            (hasChildren
              ? `  {green-fg}${childDirs} folders{/green-fg}, {cyan-fg}${childFiles} files{/cyan-fg}\n\n`
              : `  {gray-fg}(Enter to scan){/gray-fg}\n\n`)
          : '') +
        // Last modified
        `{yellow-fg}🕐 Modified{/yellow-fg}\n` +
        `  ${mtimeStr}\n\n` +
        // Path
        `{yellow-fg}📍 Path{/yellow-fg}\n` +
        `  {gray-fg}${wrappedPath}{/gray-fg}\n\n` +
        `${divider}\n` +
        // Actions
        `{yellow-fg}⌨️  Actions{/yellow-fg}\n` +
        (selectedItem.isDirectory ? `  {green-fg}[Enter]{/green-fg} Open folder\n` : '') +
        `  {magenta-fg}[o]{/magenta-fg} Open in Finder\n` +
        (normalizedPath !== normalizePath(targetPath) ? `  {cyan-fg}[b]{/cyan-fg} Go back\n` : '') +
        `  {red-fg}[q]{/red-fg} Quit`;

      infoBox.setContent(infoText);
      screen.render();
    };

    // 'select item' fires on arrow key navigation in blessed List
    // 'select' fires only on Enter - so use 'select item' for live updates
    listBox.on('select item', (_item: any, index: number) => {
      updateInfoBox(index);
    });

    // Open folder (navigate into it)
    const openFolder = async () => {
      const selectedItem = items[selectedIndex];

      if (selectedItem && selectedItem.isDirectory) {
        currentPath = selectedItem.path;
        screen.destroy();

        // If folder children are empty (not yet scanned due to shallow initial scan),
        // scan this specific folder on-demand
        if (!selectedItem.children || selectedItem.children.length === 0) {
          const subSpinner = createSpinner(`Scanning ${selectedItem.name}...`);
          const scanned = await scanDirectory(selectedItem.path, 0, 2);
          if (scanned?.children && scanned.children.length > 0) {
            selectedItem.children = scanned.children;
            selectedItem.size = scanned.size;
          }
          succeedSpinner(subSpinner, `Scanned ${selectedItem.name}`);
        }

        displayDirectory();
      }
    };

    // Open in Finder - keep screen, show result in info box
    const openInFinder = async () => {
      const selectedItem = items[selectedIndex];

      if (selectedItem) {
        try {
          await execAsync(`open "${selectedItem.path}"`);
          infoBox.setContent(infoBox.content + '\n\n{green-fg}✓ Opened in Finder{/green-fg}');
        } catch (err) {
          infoBox.setContent(infoBox.content + '\n\n{red-fg}✗ Failed to open{/red-fg}');
        }
        screen.render();
      }
    };

    // Go back to parent directory (never navigate above scan root)
    const goBack = () => {
      const normalizedPath = normalizePath(currentPath);
      const normalizedTarget = normalizePath(targetPath);
      // Already at scan root - do nothing
      if (normalizedPath === normalizedTarget) {
        return;
      }
      const parent = dirname(normalizedPath);
      if (parent !== normalizedPath) {
        currentPath = parent;
        screen.destroy();
        displayDirectory();
      }
    };

    // Keyboard handlers
    listBox.key(['enter'], () => {
      void openFolder();
    });

    listBox.key(['o'], () => {
      void openInFinder();
    });

    listBox.key(['b'], () => {
      goBack();
    });

    listBox.key(['q', 'escape', 'C-c'], () => {
      screen.destroy();
      process.exit(0);
    });

    // Mouse double-click to open folder
    let lastClickTime = 0;
    listBox.on('click', () => {
      const selectedItem = items[selectedIndex];
      if (selectedItem?.isDirectory) {
        const now = Date.now();
        if (now - lastClickTime < 300) {
          void openFolder();
        }
        lastClickTime = now;
      }
    });

    // Focus on list initially
    listBox.focus();

    // Set initial selection
    if (items.length > 0) {
      listBox.select(0);
      updateInfoBox(0);
    }

    // Render the screen
    screen.render();
  }

  displayDirectory();

  // Background: Continue deeper scan to fill in missing data
  setImmediate(async () => {
    try {
      const fullInfo = await scanDirectory(targetPath);
      if (fullInfo) {
        rootInfo = fullInfo;
      }
    } catch {
      // Silently fail - user can still use shallow scan
    }
  });
}

/**
 * Create analyze command
 */
export function createAnalyzeCommand(): Command {
  const cmd = new Command('analyze')
    .description('Analyze disk space usage')
    .argument('[path]', 'Path to analyze (default: home directory)')
    .option('-p, --path <path>', 'Path to analyze (default: home directory)')
    .action(async (positionalPath, options) => {
      await analyzeCommand({ ...options, positionalPath });
    });

  return enhanceCommandHelp(cmd);
}
