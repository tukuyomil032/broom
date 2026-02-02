/**
 * Purge command - Clean project-specific artifacts
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { readdir, stat, rm } from 'fs/promises';
import { join, basename } from 'path';
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
  printProgressBar,
} from '../ui/output.js';
import { confirmAction, selectItems } from '../ui/prompts.js';
import { debug, debugSection, debugObj, debugFile } from '../utils/debug.js';
import type { CleanableItem } from '../types/index.js';

interface PurgeOptions {
  dryRun?: boolean;
  yes?: boolean;
  path?: string;
  recursive?: boolean;
}

interface PurgeTarget {
  id: string;
  name: string;
  patterns: string[];
  description: string;
}

/**
 * Project artifact targets
 */
const purgeTargets: PurgeTarget[] = [
  {
    id: 'node_modules',
    name: 'Node.js (node_modules)',
    patterns: ['**/node_modules'],
    description: 'npm/yarn/pnpm packages',
  },
  {
    id: 'build',
    name: 'Build outputs (dist, build)',
    patterns: ['**/dist', '**/build', '**/out', '**/.next', '**/.nuxt'],
    description: 'Compiled/bundled files',
  },
  {
    id: 'cache',
    name: 'Project caches',
    patterns: ['**/.cache', '**/.parcel-cache', '**/.turbo', '**/.eslintcache'],
    description: 'Build and tool caches',
  },
  {
    id: 'coverage',
    name: 'Test coverage',
    patterns: ['**/coverage', '**/.nyc_output'],
    description: 'Code coverage reports',
  },
  {
    id: 'python',
    name: 'Python artifacts',
    patterns: [
      '**/__pycache__',
      '**/*.pyc',
      '**/.pytest_cache',
      '**/.mypy_cache',
      '**/venv',
      '**/.venv',
    ],
    description: 'Python caches and venvs',
  },
  {
    id: 'rust',
    name: 'Rust (target)',
    patterns: ['**/target'],
    description: 'Cargo build artifacts',
  },
  {
    id: 'java',
    name: 'Java/Gradle/Maven',
    patterns: ['**/.gradle', '**/build', '**/target'],
    description: 'Java build artifacts',
  },
  {
    id: 'ios',
    name: 'iOS/Xcode',
    patterns: ['**/DerivedData', '**/Pods', '**/.build'],
    description: 'Xcode build data and CocoaPods',
  },
  {
    id: 'logs',
    name: 'Log files',
    patterns: ['**/*.log', '**/logs', '**/.logs'],
    description: 'Application logs',
  },
  {
    id: 'temp',
    name: 'Temporary files',
    patterns: ['**/.tmp', '**/tmp', '**/*.tmp', '**/*.temp'],
    description: 'Temporary files',
  },
];

/**
 * Find matching items for a target
 */
async function findTargetItems(
  basePath: string,
  target: PurgeTarget,
  recursive: boolean
): Promise<CleanableItem[]> {
  const items: CleanableItem[] = [];

  for (const pattern of target.patterns) {
    const searchPattern = recursive ? pattern : pattern.replace('**/', '');

    try {
      const matches = await fg(searchPattern, {
        cwd: basePath,
        absolute: true,
        onlyDirectories: !pattern.includes('*.*'),
        dot: true,
        ignore: ['**/node_modules/**/node_modules'], // Avoid nested node_modules
      });

      for (const match of matches) {
        try {
          const stats = await stat(match);
          const size = await getSize(match);

          items.push({
            path: match,
            name: basename(match),
            size,
            isDirectory: stats.isDirectory(),
            modifiedAt: stats.mtime,
          });
        } catch {
          // Skip if cannot access
        }
      }
    } catch {
      // Pattern match error
    }
  }

  // Deduplicate by path
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.path)) {
      return false;
    }
    seen.add(item.path);
    return true;
  });
}

/**
 * Execute purge command
 */
export async function purgeCommand(options: PurgeOptions): Promise<void> {
  const isDryRun = options.dryRun || false;
  const basePath = options.path ? expandPath(options.path) : process.cwd();
  const recursive = options.recursive ?? true;

  debugSection('Purge Command');
  debugObj('Options', options);
  debug(`Base path: ${basePath}`);
  debug(`Recursive: ${recursive}`);

  printHeader(isDryRun ? '🧹 Purge Project Artifacts (Dry Run)' : '🧹 Purge Project Artifacts');

  console.log(`Scanning: ${chalk.cyan(basePath)}`);
  console.log(`Mode: ${recursive ? 'Recursive' : 'Current directory only'}`);
  console.log();

  // Select targets
  const targetChoices = purgeTargets.map((t) => ({
    name: t.name,
    value: t.id,
    description: t.description,
  }));

  const selectedIds = await selectItems('Select artifact types to purge:', targetChoices);

  if (selectedIds.length === 0) {
    warning('No targets selected');
    return;
  }

  const selectedTargets = purgeTargets.filter((t) => selectedIds.includes(t.id));

  // Scan for items
  console.log();
  const spinner = createSpinner('Scanning for artifacts...');

  const allItems: Map<string, CleanableItem[]> = new Map();
  let totalSize = 0;
  let totalCount = 0;

  for (const target of selectedTargets) {
    const items = await findTargetItems(basePath, target, recursive);
    if (items.length > 0) {
      allItems.set(target.id, items);
      totalCount += items.length;
      totalSize += items.reduce((sum, i) => sum + i.size, 0);
    }
  }

  succeedSpinner(spinner, `Found ${totalCount} items (${formatSize(totalSize)})`);

  if (totalCount === 0) {
    console.log();
    success('No artifacts found to purge!');
    return;
  }

  // Show found items
  console.log();
  console.log(chalk.bold('Found artifacts:'));
  console.log();

  for (const [targetId, items] of allItems) {
    const target = purgeTargets.find((t) => t.id === targetId)!;
    const targetSize = items.reduce((sum, i) => sum + i.size, 0);

    console.log(chalk.bold(`  ${target.name}`));
    console.log(`    Items: ${items.length}  Size: ${chalk.yellow(formatSize(targetSize))}`);

    // Show first few items
    for (const item of items.slice(0, 3)) {
      const relativePath = item.path.replace(basePath, '.');
      console.log(`      ${chalk.dim(relativePath)} ${chalk.dim(`(${formatSize(item.size)})`)}`);
    }

    if (items.length > 3) {
      console.log(chalk.dim(`      ... and ${items.length - 3} more`));
    }
    console.log();
  }

  // Confirm
  if (!options.yes) {
    console.log();
    const confirmed = await confirmAction(
      `${isDryRun ? 'Simulate' : 'Purge'} ${totalCount} items (${formatSize(totalSize)})?`,
      false
    );

    if (!confirmed) {
      warning('Purge cancelled');
      return;
    }
  }

  // Execute purge
  console.log();
  separator();

  let removedCount = 0;
  let removedSize = 0;
  const errors: string[] = [];

  const allItemsFlat = Array.from(allItems.values()).flat();

  for (let i = 0; i < allItemsFlat.length; i++) {
    const item = allItemsFlat[i];
    const progress = ((i + 1) / allItemsFlat.length) * 100;

    printProgressBar(progress, 30, `Purging: ${basename(item.path)}`);

    if (!isDryRun) {
      try {
        await rm(item.path, { recursive: true, force: true });
        removedCount++;
        removedSize += item.size;
      } catch (err) {
        errors.push(`${item.path}: ${(err as Error).message}`);
      }
    } else {
      removedCount++;
      removedSize += item.size;
    }
  }

  // Clear progress line
  process.stdout.write('\r' + ' '.repeat(80) + '\r');

  // Summary
  console.log();
  separator();
  console.log();

  console.log(chalk.bold(isDryRun ? '🧪 Dry Run Complete' : '✨ Purge Complete'));
  console.log();
  console.log(`  Items ${isDryRun ? 'would be ' : ''}removed: ${chalk.green(removedCount)}`);
  console.log(
    `  Space ${isDryRun ? 'would be ' : ''}freed: ${chalk.green(formatSize(removedSize))}`
  );

  if (errors.length > 0) {
    console.log(`  ${chalk.red(`Errors: ${errors.length}`)}`);
    console.log();
    errors.slice(0, 5).forEach((err) => error(err));
    if (errors.length > 5) {
      console.log(chalk.dim(`  ... and ${errors.length - 5} more errors`));
    }
  }

  if (isDryRun) {
    console.log();
    info('This was a dry run. No files were deleted.');
    info('Run without --dry-run to actually purge artifacts.');
  }
}

/**
 * Create purge command
 */
export function createPurgeCommand(): Command {
  const cmd = new Command('purge')
    .description('Clean project-specific build artifacts')
    .option('-n, --dry-run', 'Preview only, no deletions')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('-p, --path <path>', 'Path to scan (default: current directory)')
    .option('--no-recursive', 'Only scan current directory')
    .action(async (options) => {
      await purgeCommand(options);
    });

  return enhanceCommandHelp(cmd);
}
