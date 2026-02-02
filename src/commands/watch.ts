/**
 * Watch command - Monitor directory sizes
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { enhanceCommandHelp } from '../utils/help.js';
import { expandPath, formatSize, exists } from '../utils/fs.js';
import { printHeader, separator, success, error, warning, info } from '../ui/output.js';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const WATCH_CONFIG_FILE = expandPath('~/.config/broom/watch.json');

interface WatchConfig {
  path: string;
  threshold: number; // in bytes
  notify: boolean;
  autoClean: boolean;
  lastNotified?: Date;
}

interface WatchOptions {
  add?: boolean;
  remove?: string;
  list?: boolean;
  check?: boolean;
  path?: string;
  threshold?: string;
  notify?: boolean;
  autoClean?: boolean;
}

/**
 * Parse size threshold
 */
function parseThreshold(thresholdStr: string): number {
  const match = thresholdStr.match(/^(\d+(?:\.\d+)?)(KB|MB|GB|TB)?$/i);

  if (!match) {
    throw new Error(`Invalid threshold format: ${thresholdStr}`);
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'MB').toUpperCase();

  switch (unit) {
    case 'KB':
      return value * 1024;
    case 'MB':
      return value * 1024 * 1024;
    case 'GB':
      return value * 1024 * 1024 * 1024;
    case 'TB':
      return value * 1024 * 1024 * 1024 * 1024;
    default:
      return value * 1024 * 1024; // Default to MB
  }
}

/**
 * Load watch configuration
 */
async function loadWatchConfig(): Promise<WatchConfig[]> {
  try {
    if (exists(WATCH_CONFIG_FILE)) {
      const content = await readFile(WATCH_CONFIG_FILE, 'utf-8');
      const data = JSON.parse(content) as WatchConfig[];

      // Parse dates
      return data.map((w) => ({
        ...w,
        lastNotified: w.lastNotified ? new Date(w.lastNotified) : undefined,
      }));
    }
  } catch {
    // Return empty array if cannot read
  }

  return [];
}

/**
 * Save watch configuration
 */
async function saveWatchConfig(watches: WatchConfig[]): Promise<void> {
  await mkdir(expandPath('~/.config/broom'), { recursive: true });
  await writeFile(WATCH_CONFIG_FILE, JSON.stringify(watches, null, 2), 'utf-8');
}

/**
 * Get directory size
 */
async function getDirectorySize(path: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`du -sk "${path}"`);
    const size = parseInt(stdout.split('\t')[0]) * 1024;
    return size;
  } catch {
    return 0;
  }
}

/**
 * Send macOS notification
 */
async function sendNotification(title: string, message: string): Promise<void> {
  try {
    const script = `display notification "${message}" with title "${title}" sound name "default"`;
    await execAsync(`osascript -e '${script}'`);
  } catch {
    // Notification failed
  }
}

/**
 * Add watch
 */
async function addWatch(options: WatchOptions): Promise<void> {
  if (!options.path) {
    error('--path is required');
    return;
  }

  if (!options.threshold) {
    error('--threshold is required (e.g., 5GB)');
    return;
  }

  const path = expandPath(options.path);

  if (!exists(path)) {
    error(`Path does not exist: ${path}`);
    return;
  }

  const threshold = parseThreshold(options.threshold);
  const watches = await loadWatchConfig();

  // Check if already watching
  if (watches.some((w) => w.path === path)) {
    warning(`Already watching: ${path}`);
    return;
  }

  watches.push({
    path,
    threshold,
    notify: options.notify ?? true,
    autoClean: options.autoClean ?? false,
  });

  await saveWatchConfig(watches);

  success(`Added watch: ${path}`);
  console.log(`  Threshold: ${formatSize(threshold)}`);
  console.log(`  Notify: ${options.notify ?? true}`);
  console.log(`  Auto-clean: ${options.autoClean ?? false}`);
}

/**
 * Remove watch
 */
async function removeWatch(pathToRemove: string): Promise<void> {
  const expandedPath = expandPath(pathToRemove);
  const watches = await loadWatchConfig();

  const index = watches.findIndex((w) => w.path === expandedPath);

  if (index === -1) {
    error(`Not watching: ${expandedPath}`);
    return;
  }

  watches.splice(index, 1);
  await saveWatchConfig(watches);

  success(`Removed watch: ${expandedPath}`);
}

/**
 * List watches
 */
async function listWatches(): Promise<void> {
  printHeader('👀 Directory Watches');

  const watches = await loadWatchConfig();

  if (watches.length === 0) {
    warning('No watches configured');
    console.log();
    console.log(chalk.dim('Use "broom watch --add --path <path> --threshold 5GB" to add a watch'));
    return;
  }

  console.log();

  for (const watch of watches) {
    console.log(chalk.bold(`📁 ${watch.path}`));
    console.log(`  Threshold: ${chalk.cyan(formatSize(watch.threshold))}`);
    console.log(`  Notify: ${watch.notify ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`  Auto-clean: ${watch.autoClean ? chalk.green('Yes') : chalk.red('No')}`);

    if (watch.lastNotified) {
      console.log(`  Last notified: ${chalk.dim(watch.lastNotified.toLocaleString())}`);
    }

    console.log();
  }

  separator();
  console.log();
  console.log(chalk.dim('Use "broom watch --check" to check all watches'));
  console.log(chalk.dim('Use "broom watch --remove <path>" to remove a watch'));
}

/**
 * Check watches
 */
async function checkWatches(): Promise<void> {
  printHeader('👀 Checking Watches');

  const watches = await loadWatchConfig();

  if (watches.length === 0) {
    warning('No watches configured');
    return;
  }

  console.log();

  let needsSave = false;

  for (const watch of watches) {
    const size = await getDirectorySize(watch.path);
    const percentage = (size / watch.threshold) * 100;
    const exceeded = size > watch.threshold;

    console.log(chalk.bold(`📁 ${watch.path}`));
    console.log(`  Current size: ${chalk.cyan(formatSize(size))}`);
    console.log(`  Threshold: ${formatSize(watch.threshold)}`);

    if (exceeded) {
      console.log(chalk.red(`  ⚠️  EXCEEDED (${percentage.toFixed(1)}%)`));

      // Send notification if enabled
      if (watch.notify) {
        const now = new Date();
        const hoursSinceLastNotif = watch.lastNotified
          ? (now.getTime() - watch.lastNotified.getTime()) / (1000 * 60 * 60)
          : 24;

        // Only notify once per 6 hours
        if (hoursSinceLastNotif >= 6) {
          await sendNotification(
            'Broom Alert',
            `${watch.path} exceeded ${formatSize(watch.threshold)}`
          );

          watch.lastNotified = now;
          needsSave = true;

          console.log(chalk.dim('  📬 Notification sent'));
        }
      }

      // Auto-clean if enabled
      if (watch.autoClean) {
        console.log(chalk.dim('  🧹 Auto-clean triggered'));
        // TODO: Trigger cleanup for this path
      }
    } else {
      console.log(chalk.green(`  ✓ OK (${percentage.toFixed(1)}%)`));
    }

    console.log();
  }

  if (needsSave) {
    await saveWatchConfig(watches);
  }

  separator();
}

/**
 * Execute watch command
 */
export async function watchCommand(options: WatchOptions): Promise<void> {
  if (options.add) {
    await addWatch(options);
    return;
  }

  if (options.remove) {
    await removeWatch(options.remove);
    return;
  }

  if (options.check) {
    await checkWatches();
    return;
  }

  if (options.list || Object.keys(options).length === 0) {
    await listWatches();
    return;
  }
}

/**
 * Create watch command
 */
export function createWatchCommand(): Command {
  const cmd = new Command('watch')
    .description('Monitor directory sizes')
    .option('-a, --add', 'Add a new watch')
    .option('-r, --remove <path>', 'Remove a watch')
    .option('-l, --list', 'List all watches')
    .option('-c, --check', 'Check all watches now')
    .option('-p, --path <path>', 'Path to watch')
    .option('-t, --threshold <size>', 'Size threshold (e.g., 5GB)')
    .option('-n, --notify', 'Enable notifications (default: true)')
    .option('--auto-clean', 'Automatically clean when threshold exceeded')
    .action(async (options) => {
      await watchCommand(options);
    });

  return enhanceCommandHelp(cmd);
}
