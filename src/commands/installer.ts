/**
 * Installer command - Find and remove installer files
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { readdir, stat, rm } from 'fs/promises';
import { join, basename, extname } from 'path';
import fg from 'fast-glob';
import { enhanceCommandHelp } from '../utils/help.js';
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
} from '../ui/output.js';
import { confirmAction, selectFiles } from '../ui/prompts.js';
import type { CleanableItem } from '../types/index.js';

interface InstallerOptions {
  dryRun?: boolean;
  yes?: boolean;
}

interface InstallerFile extends CleanableItem {
  source: string;
}

/**
 * Installer file extensions
 */
const INSTALLER_EXTENSIONS = ['.dmg', '.pkg', '.zip', '.app', '.tar.gz', '.tgz'];

/**
 * Directories to search for installers
 */
const SEARCH_DIRS = [
  '~/Downloads',
  '~/Desktop',
  '~/Library/Caches/Homebrew/downloads',
  '~/Library/Mobile Documents/com~apple~CloudDocs/Downloads',
  '~/Library/Application Support/Steam/steamapps',
];

/**
 * Get source label from path
 */
function getSourceLabel(filePath: string): string {
  const home = expandPath('~');
  const path = filePath.toLowerCase();

  if (path.includes('/downloads')) return 'Downloads';
  if (path.includes('/desktop')) return 'Desktop';
  if (path.includes('/homebrew')) return 'Homebrew';
  if (path.includes('/clouddocs') || path.includes('/icloud')) return 'iCloud';
  if (path.includes('/steam')) return 'Steam';
  if (path.includes('/mail')) return 'Mail';

  return 'Other';
}

/**
 * Check if file is an installer
 */
function isInstaller(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  const name = filename.toLowerCase();

  // Check extension
  if (INSTALLER_EXTENSIONS.includes(ext)) {
    return true;
  }

  // Check for .tar.gz
  if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) {
    return true;
  }

  return false;
}

/**
 * Scan for installer files
 */
async function scanInstallers(): Promise<InstallerFile[]> {
  const installers: InstallerFile[] = [];

  for (const searchDir of SEARCH_DIRS) {
    const dir = expandPath(searchDir);

    if (!exists(dir)) {
      continue;
    }

    try {
      const entries = await readdir(dir);

      for (const entry of entries) {
        if (!isInstaller(entry)) {
          continue;
        }

        const filePath = join(dir, entry);

        try {
          const stats = await stat(filePath);
          const size = stats.isDirectory() ? await getSize(filePath) : stats.size;

          // Only include files larger than 10MB
          if (size < 10 * 1024 * 1024) {
            continue;
          }

          installers.push({
            path: filePath,
            name: entry,
            size,
            isDirectory: stats.isDirectory(),
            modifiedAt: stats.mtime,
            source: getSourceLabel(filePath),
          });
        } catch {
          // Skip if cannot access
        }
      }
    } catch {
      // Skip if cannot access directory
    }
  }

  // Also search recursively in Downloads for nested installers
  const downloadsDir = expandPath('~/Downloads');
  if (exists(downloadsDir)) {
    try {
      const patterns = INSTALLER_EXTENSIONS.map((ext) => `**/*${ext}`);
      const matches = await fg(patterns, {
        cwd: downloadsDir,
        absolute: true,
        deep: 3, // Max depth
        ignore: ['**/node_modules/**'],
      });

      for (const match of matches) {
        // Skip if already added
        if (installers.some((i) => i.path === match)) {
          continue;
        }

        try {
          const stats = await stat(match);
          const size = stats.isDirectory() ? await getSize(match) : stats.size;

          if (size < 10 * 1024 * 1024) {
            continue;
          }

          installers.push({
            path: match,
            name: basename(match),
            size,
            isDirectory: stats.isDirectory(),
            modifiedAt: stats.mtime,
            source: 'Downloads',
          });
        } catch {
          // Skip
        }
      }
    } catch {
      // Skip
    }
  }

  // Sort by size descending
  installers.sort((a, b) => b.size - a.size);

  return installers;
}

/**
 * Execute installer command
 */
export async function installerCommand(options: InstallerOptions): Promise<void> {
  const isDryRun = options.dryRun || false;

  printHeader(isDryRun ? '💿 Installer Files (Dry Run)' : '💿 Installer Files');

  // Scan for installers
  const spinner = createSpinner('Scanning for installer files...');
  const installers = await scanInstallers();
  succeedSpinner(spinner, `Found ${installers.length} installer files`);

  if (installers.length === 0) {
    console.log();
    success('No installer files found!');
    return;
  }

  // Calculate total size
  const totalSize = installers.reduce((sum, i) => sum + i.size, 0);

  // Show found installers
  console.log();
  console.log(chalk.bold(`Found ${installers.length} installer files (${formatSize(totalSize)}):`));
  console.log();

  for (const installer of installers.slice(0, 15)) {
    const sizeStr = formatSize(installer.size).padStart(10);
    const sourceStr = chalk.dim(`| ${installer.source}`);
    console.log(
      `  ${chalk.cyan('●')} ${installer.name.slice(0, 30).padEnd(32)} ${chalk.yellow(sizeStr)} ${sourceStr}`
    );
  }

  if (installers.length > 15) {
    console.log(chalk.dim(`  ... and ${installers.length - 15} more`));
  }

  // Select files to remove
  console.log();
  let selectedInstallers: InstallerFile[];

  if (options.yes) {
    selectedInstallers = installers;
  } else {
    info('Select installers to remove:');
    selectedInstallers = (await selectFiles(installers)) as InstallerFile[];
  }

  if (selectedInstallers.length === 0) {
    warning('No installers selected');
    return;
  }

  const selectedSize = selectedInstallers.reduce((sum, i) => sum + i.size, 0);

  // Confirm
  if (!options.yes) {
    console.log();
    const confirmed = await confirmAction(
      `${isDryRun ? 'Simulate removing' : 'Remove'} ${selectedInstallers.length} installers (${formatSize(selectedSize)})?`,
      false
    );

    if (!confirmed) {
      warning('Operation cancelled');
      return;
    }
  }

  // Execute removal
  console.log();
  const removeSpinner = createSpinner(
    isDryRun ? 'Simulating removal...' : 'Removing installers...'
  );

  let removedCount = 0;
  let removedSize = 0;
  const errors: string[] = [];

  for (const installer of selectedInstallers) {
    if (!isDryRun) {
      try {
        await rm(installer.path, { recursive: true, force: true });
        removedCount++;
        removedSize += installer.size;
      } catch (err) {
        errors.push(`${installer.name}: ${(err as Error).message}`);
      }
    } else {
      removedCount++;
      removedSize += installer.size;
    }
  }

  if (errors.length === 0) {
    succeedSpinner(removeSpinner, isDryRun ? 'Simulation complete' : 'Removal complete');
  } else {
    failSpinner(removeSpinner, 'Completed with errors');
  }

  // Summary
  console.log();
  separator('═');
  console.log(chalk.bold(isDryRun ? 'Dry Run Complete' : 'Removal Complete'));
  separator('─');
  console.log(`  Installers ${isDryRun ? 'would be ' : ''}removed: ${chalk.green(removedCount)}`);
  console.log(
    `  Space ${isDryRun ? 'would be ' : ''}freed: ${chalk.green(formatSize(removedSize))}`
  );
  separator('═');

  if (errors.length > 0) {
    console.log();
    console.log(chalk.bold.red('Errors:'));
    errors.forEach((err) => error(err));
  }

  if (isDryRun) {
    console.log();
    info('This was a dry run. No files were deleted.');
  }
}

/**
 * Create installer command
 */
export function createInstallerCommand(): Command {
  const cmd = new Command('installer')
    .description('Find and remove installer files (dmg, pkg, zip)')
    .option('-n, --dry-run', 'Preview only, no deletions')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (options) => {
      await installerCommand(options);
    });

  return enhanceCommandHelp(cmd);
}
