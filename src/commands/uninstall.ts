/**
 * Uninstall command - Remove applications and their leftovers
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { readdir, stat, readFile, rm } from 'fs/promises';
import { join, basename } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { enhanceCommandHelp } from '../utils/help.js';
import { paths } from '../utils/paths.js';
import { exists, getSize, formatSize, isProtectedPath, expandPath } from '../utils/fs.js';
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
  printSummaryBlock,
} from '../ui/output.js';
import { selectApp, selectFiles, confirmAction, confirmRemoval } from '../ui/prompts.js';
import type { AppInfo, CleanableItem } from '../types/index.js';

const execAsync = promisify(exec);

interface UninstallOptions {
  dryRun?: boolean;
  yes?: boolean;
}

/**
 * Get bundle ID from app's Info.plist
 */
async function getBundleId(appPath: string): Promise<string | null> {
  try {
    const plistPath = join(appPath, 'Contents', 'Info.plist');

    if (!exists(plistPath)) {
      return null;
    }

    // Use plutil to convert plist to JSON
    const { stdout } = await execAsync(`plutil -convert json -o - "${plistPath}"`);
    const plist = JSON.parse(stdout);

    return plist.CFBundleIdentifier || null;
  } catch {
    return null;
  }
}

/**
 * Scan for installed applications
 */
async function scanApplications(): Promise<AppInfo[]> {
  const apps: AppInfo[] = [];
  const appDirs = [paths.applications, paths.userApplications];

  for (const appDir of appDirs) {
    try {
      if (!exists(appDir)) {
        continue;
      }

      const entries = await readdir(appDir);

      for (const entry of entries) {
        if (!entry.endsWith('.app')) {
          continue;
        }

        const appPath = join(appDir, entry);

        try {
          const stats = await stat(appPath);

          if (!stats.isDirectory()) {
            continue;
          }

          const size = await getSize(appPath);
          const bundleId = await getBundleId(appPath);
          const name = entry.replace('.app', '');

          apps.push({
            name,
            path: appPath,
            bundleId: bundleId || undefined,
            size,
          });
        } catch {
          // Skip if cannot access
        }
      }
    } catch {
      // Skip if cannot access directory
    }
  }

  // Sort by name
  apps.sort((a, b) => a.name.localeCompare(b.name));

  return apps;
}

/**
 * Find app-related files
 */
async function findAppFiles(app: AppInfo): Promise<CleanableItem[]> {
  const items: CleanableItem[] = [];
  const searchTerms: string[] = [];

  // Build search terms from app name and bundle ID
  if (app.bundleId) {
    searchTerms.push(app.bundleId);

    // Also search for variations (e.g., com.company.app -> company.app)
    const parts = app.bundleId.split('.');
    if (parts.length >= 2) {
      searchTerms.push(parts.slice(-2).join('.'));
    }
  }

  // Add app name variations
  searchTerms.push(app.name);
  searchTerms.push(app.name.toLowerCase());
  searchTerms.push(app.name.replace(/\s+/g, ''));

  // Directories to search
  const searchDirs = [
    paths.userCache,
    paths.applicationSupport,
    paths.preferences,
    paths.savedState,
    paths.userLogs,
    join(paths.applicationSupport, '..', 'Containers'),
    join(paths.applicationSupport, '..', 'Group Containers'),
  ];

  for (const searchDir of searchDirs) {
    try {
      if (!exists(searchDir)) {
        continue;
      }

      const entries = await readdir(searchDir);

      for (const entry of entries) {
        const entryLower = entry.toLowerCase();

        // Check if entry matches any search term
        const matches = searchTerms.some((term) => entryLower.includes(term.toLowerCase()));

        if (!matches) {
          continue;
        }

        const entryPath = join(searchDir, entry);

        try {
          const stats = await stat(entryPath);
          const size = await getSize(entryPath);

          items.push({
            path: entryPath,
            size,
            name: entry,
            isDirectory: stats.isDirectory(),
            modifiedAt: stats.mtime,
          });
        } catch {
          // Skip if cannot access
        }
      }
    } catch {
      // Skip if cannot access directory
    }
  }

  // Also check for launch agents/daemons
  const launchDirs = [
    join(expandPath('~'), 'Library', 'LaunchAgents'),
    '/Library/LaunchAgents',
    '/Library/LaunchDaemons',
  ];

  for (const launchDir of launchDirs) {
    try {
      if (!exists(launchDir)) {
        continue;
      }

      const entries = await readdir(launchDir);

      for (const entry of entries) {
        if (!entry.endsWith('.plist')) {
          continue;
        }

        const entryLower = entry.toLowerCase();
        const matches = searchTerms.some((term) => entryLower.includes(term.toLowerCase()));

        if (!matches) {
          continue;
        }

        const entryPath = join(launchDir, entry);

        try {
          const stats = await stat(entryPath);

          items.push({
            path: entryPath,
            size: stats.size,
            name: entry,
            isDirectory: false,
            modifiedAt: stats.mtime,
          });
        } catch {
          // Skip if cannot access
        }
      }
    } catch {
      // Skip if cannot access directory
    }
  }

  // Sort by size descending
  items.sort((a, b) => b.size - a.size);

  return items;
}

/**
 * Remove app using Finder (moves to trash)
 */
async function removeAppToTrash(appPath: string): Promise<boolean> {
  try {
    const script = `tell application "Finder" to delete POSIX file "${appPath}"`;
    await execAsync(`osascript -e '${script}'`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute uninstall command
 */
export async function uninstallCommand(options: UninstallOptions): Promise<void> {
  const isDryRun = options.dryRun || false;

  printHeader(isDryRun ? '🗑️ Uninstall Apps (Dry Run)' : '🗑️ Uninstall Apps');

  // Scan for apps
  const spinner = createSpinner('Scanning applications...');
  const apps = await scanApplications();
  succeedSpinner(spinner, `Found ${apps.length} applications`);

  if (apps.length === 0) {
    warning('No applications found');
    return;
  }

  // Select app
  console.log();
  const selectedApp = await selectApp(apps);

  if (!selectedApp) {
    warning('No application selected');
    return;
  }

  // Find related files
  console.log();
  const searchSpinner = createSpinner(`Searching for ${selectedApp.name} related files...`);
  const relatedFiles = await findAppFiles(selectedApp);
  succeedSpinner(searchSpinner, `Found ${relatedFiles.length} related files`);

  // Show app info
  console.log();
  console.log(chalk.bold(`Application: ${selectedApp.name}`));
  console.log(`  Path: ${chalk.dim(selectedApp.path)}`);
  console.log(`  Size: ${chalk.yellow(formatSize(selectedApp.size))}`);
  if (selectedApp.bundleId) {
    console.log(`  Bundle ID: ${chalk.dim(selectedApp.bundleId)}`);
  }

  // Show related files
  if (relatedFiles.length > 0) {
    const totalRelatedSize = relatedFiles.reduce((sum, f) => sum + f.size, 0);
    console.log();
    console.log(chalk.bold(`Related Files (${formatSize(totalRelatedSize)}):`));

    for (const file of relatedFiles.slice(0, 10)) {
      console.log(
        `  ${file.isDirectory ? '📁' : '📄'} ${chalk.dim(file.path)} ${chalk.yellow(formatSize(file.size))}`
      );
    }

    if (relatedFiles.length > 10) {
      console.log(chalk.dim(`  ... and ${relatedFiles.length - 10} more`));
    }
  }

  // Confirm uninstall
  console.log();
  if (!options.yes) {
    const confirmed = await confirmAction(
      `Uninstall ${selectedApp.name} and remove related files?`,
      false
    );

    if (!confirmed) {
      warning('Uninstall cancelled');
      return;
    }
  }

  // Select files to remove
  let filesToRemove = relatedFiles;

  if (!options.yes && relatedFiles.length > 0) {
    console.log();
    info('Select which related files to remove:');
    filesToRemove = await selectFiles(relatedFiles);
  }

  // Execute uninstall
  console.log();
  const uninstallSpinner = createSpinner(isDryRun ? 'Simulating uninstall...' : 'Uninstalling...');

  let appRemoved = false;
  let filesRemoved = 0;
  let freedSpace = 0;
  const errors: string[] = [];

  if (!isDryRun) {
    // Remove app
    appRemoved = await removeAppToTrash(selectedApp.path);

    if (appRemoved) {
      freedSpace += selectedApp.size;
    } else {
      errors.push(`Failed to remove ${selectedApp.name}`);
    }

    // Remove related files
    for (const file of filesToRemove) {
      if (isProtectedPath(file.path)) {
        errors.push(`Skipped protected path: ${file.path}`);
        continue;
      }

      try {
        await rm(file.path, { recursive: true, force: true });
        filesRemoved++;
        freedSpace += file.size;
      } catch (err) {
        errors.push(`Failed to remove ${file.path}: ${(err as Error).message}`);
      }
    }
  } else {
    // Dry run - just count
    appRemoved = true;
    freedSpace = selectedApp.size;
    filesRemoved = filesToRemove.length;
    freedSpace += filesToRemove.reduce((sum, f) => sum + f.size, 0);
  }

  if (errors.length === 0) {
    succeedSpinner(uninstallSpinner, isDryRun ? 'Simulation complete' : 'Uninstall complete');
  } else {
    failSpinner(uninstallSpinner, 'Uninstall completed with errors');
  }

  // Print summary
  const summaryHeading = isDryRun ? 'Dry Run Complete' : 'Uninstall Complete';
  const summaryDetails = [
    `Application: ${appRemoved ? chalk.green('Removed') : chalk.red('Failed')}`,
    `Related files removed: ${filesRemoved}`,
    `Space freed: ${chalk.green(formatSize(freedSpace))}`,
  ];

  if (errors.length > 0) {
    summaryDetails.push(`${chalk.red(`Errors: ${errors.length}`)}`);
  }

  printSummaryBlock(summaryHeading, summaryDetails);

  if (errors.length > 0) {
    console.log();
    console.log(chalk.bold.red('Errors:'));
    errors.forEach((err) => error(err));
  }
}

/**
 * Create uninstall command
 */
export function createUninstallCommand(): Command {
  const cmd = new Command('uninstall')
    .description('Remove apps and their leftovers')
    .option('-n, --dry-run', 'Preview only, no deletions')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (options) => {
      await uninstallCommand(options);
    });

  return enhanceCommandHelp(cmd);
}
