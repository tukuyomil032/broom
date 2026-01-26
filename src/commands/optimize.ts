/**
 * Optimize command - System maintenance and optimization
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { exec } from 'child_process';
import { promisify } from 'util';
import { enhanceCommandHelp } from '../utils/help.js';
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
  updateSpinner,
} from '../ui/output.js';
import { confirmAction, selectItems } from '../ui/prompts.js';
import { debug, debugSection, debugObj } from '../utils/debug.js';

const execAsync = promisify(exec);

interface OptimizeOptions {
  dryRun?: boolean;
  yes?: boolean;
  all?: boolean;
}

interface OptimizeTask {
  id: string;
  name: string;
  description: string;
  requiresSudo: boolean;
  action: () => Promise<string>;
}

/**
 * Available optimization tasks
 */
const tasks: OptimizeTask[] = [
  {
    id: 'flush-dns',
    name: 'Flush DNS Cache',
    description: 'Clear DNS resolver cache',
    requiresSudo: true,
    action: async () => {
      await execAsync('sudo dscacheutil -flushcache');
      await execAsync('sudo killall -HUP mDNSResponder');
      return 'DNS cache flushed';
    },
  },
  {
    id: 'rebuild-spotlight',
    name: 'Rebuild Spotlight Index',
    description: 'Rebuild the Spotlight search index (may take a while)',
    requiresSudo: true,
    action: async () => {
      await execAsync('sudo mdutil -E /');
      return 'Spotlight reindexing started';
    },
  },
  {
    id: 'rebuild-launch-services',
    name: 'Rebuild Launch Services',
    description: 'Rebuild the Launch Services database',
    requiresSudo: false,
    action: async () => {
      await execAsync(
        '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user'
      );
      return 'Launch Services database rebuilt';
    },
  },
  {
    id: 'purge-memory',
    name: 'Purge Memory',
    description: 'Release inactive memory',
    requiresSudo: true,
    action: async () => {
      await execAsync('sudo purge');
      return 'Memory purged';
    },
  },
  {
    id: 'verify-disk',
    name: 'Verify Disk',
    description: 'Verify the boot disk',
    requiresSudo: false,
    action: async () => {
      const { stdout } = await execAsync('diskutil verifyVolume /');
      return stdout.trim() || 'Disk verification completed';
    },
  },
  {
    id: 'clear-font-cache',
    name: 'Clear Font Cache',
    description: 'Clear system font caches',
    requiresSudo: true,
    action: async () => {
      await execAsync('sudo atsutil databases -remove');
      return 'Font caches cleared (restart may be required)';
    },
  },
  {
    id: 'rebuild-mail-index',
    name: 'Rebuild Mail Index',
    description: 'Rebuild Mail.app envelope index',
    requiresSudo: false,
    action: async () => {
      const mailEnvelope = '~/Library/Mail/V*/MailData/Envelope Index';
      await execAsync(`rm -rf ${mailEnvelope} 2>/dev/null || true`);
      return 'Mail index will be rebuilt on next launch';
    },
  },
  {
    id: 'clear-quicklook',
    name: 'Clear QuickLook Cache',
    description: 'Reset QuickLook server',
    requiresSudo: false,
    action: async () => {
      await execAsync('qlmanage -r cache');
      await execAsync('qlmanage -r');
      return 'QuickLook cache cleared';
    },
  },
  {
    id: 'reset-bluetooth',
    name: 'Reset Bluetooth Module',
    description: 'Reset the Bluetooth controller',
    requiresSudo: true,
    action: async () => {
      await execAsync('sudo pkill -9 bluetoothd || true');
      return 'Bluetooth module reset';
    },
  },
  {
    id: 'flush-network',
    name: 'Flush Network Settings',
    description: 'Reset network interfaces',
    requiresSudo: true,
    action: async () => {
      await execAsync('sudo ifconfig en0 down && sudo ifconfig en0 up');
      return 'Network interface reset';
    },
  },
  {
    id: 'clear-asl-logs',
    name: 'Clear ASL Logs',
    description: 'Clear Apple System Logs',
    requiresSudo: true,
    action: async () => {
      await execAsync('sudo rm -rf /private/var/log/asl/*.asl');
      return 'ASL logs cleared';
    },
  },
  {
    id: 'enable-trim',
    name: 'Enable TRIM (SSD)',
    description: 'Enable TRIM for non-Apple SSDs',
    requiresSudo: true,
    action: async () => {
      await execAsync('sudo trimforce enable');
      return 'TRIM enabled';
    },
  },
];

/**
 * Execute optimize command
 */
export async function optimizeCommand(options: OptimizeOptions): Promise<void> {
  const isDryRun = options.dryRun || false;

  debugSection('Optimize Command');
  debugObj('Options', options);
  debug(`Available tasks: ${tasks.length}`);

  printHeader(isDryRun ? '⚡ System Optimization (Dry Run)' : '⚡ System Optimization');

  // Show available tasks
  console.log(chalk.bold('Available optimization tasks:'));
  console.log();

  tasks.forEach((task, index) => {
    const sudo = task.requiresSudo ? chalk.yellow('[sudo]') : '';
    console.log(`  ${chalk.cyan(`${index + 1}.`)} ${chalk.bold(task.name)} ${sudo}`);
    console.log(`     ${chalk.dim(task.description)}`);
  });

  console.log();

  // Select tasks
  let selectedTasks: OptimizeTask[];

  if (options.all) {
    selectedTasks = tasks;
    info(`Running all ${tasks.length} optimization tasks`);
  } else {
    const taskChoices = tasks.map((task) => ({
      name: `${task.name}${task.requiresSudo ? ' [sudo]' : ''}`,
      value: task.id,
      description: task.description,
    }));

    const selectedIds = await selectItems('Select optimization tasks to run:', taskChoices);

    if (selectedIds.length === 0) {
      warning('No tasks selected');
      return;
    }

    selectedTasks = tasks.filter((t) => selectedIds.includes(t.id));
  }

  // Check for sudo tasks
  const sudoTasks = selectedTasks.filter((t) => t.requiresSudo);
  if (sudoTasks.length > 0 && !isDryRun) {
    console.log();
    warning(`${sudoTasks.length} task(s) require administrator privileges`);

    if (!options.yes) {
      const confirmed = await confirmAction('Continue with sudo tasks?', true);
      if (!confirmed) {
        // Filter out sudo tasks
        selectedTasks = selectedTasks.filter((t) => !t.requiresSudo);
        if (selectedTasks.length === 0) {
          warning('No tasks remaining');
          return;
        }
      }
    }
  }

  // Confirm execution
  if (!options.yes && !isDryRun) {
    console.log();
    const confirmed = await confirmAction(
      `Run ${selectedTasks.length} optimization task(s)?`,
      true
    );

    if (!confirmed) {
      warning('Optimization cancelled');
      return;
    }
  }

  // Execute tasks
  console.log();
  separator();

  let successCount = 0;
  let failCount = 0;
  const results: { task: OptimizeTask; success: boolean; message: string }[] = [];

  for (const task of selectedTasks) {
    debug(`Executing task: ${task.id} - ${task.name}`);
    debug(`Requires sudo: ${task.requiresSudo}`);

    const spinner = createSpinner(`${task.name}...`);

    if (isDryRun) {
      debug(`Task ${task.id} skipped (dry run)`);
      succeedSpinner(spinner, `${task.name} ${chalk.dim('(dry run)')}`);
      results.push({ task, success: true, message: 'Dry run - skipped' });
      successCount++;
      continue;
    }

    try {
      const message = await task.action();
      debug(`Task ${task.id} completed: ${message}`);
      succeedSpinner(spinner, `${task.name}: ${chalk.green(message)}`);
      results.push({ task, success: true, message });
      successCount++;
    } catch (err) {
      const errorMsg = (err as Error).message || 'Unknown error';
      debug(`Task ${task.id} failed: ${errorMsg}`);
      failSpinner(spinner, `${task.name}: ${chalk.red(errorMsg)}`);
      results.push({ task, success: false, message: errorMsg });
      failCount++;
    }
  }

  // Print summary
  console.log();
  separator();
  console.log();

  console.log(chalk.bold('Optimization Summary'));
  console.log();
  console.log(`  ${chalk.green('✓')} Successful: ${chalk.green(successCount)}`);

  if (failCount > 0) {
    console.log(`  ${chalk.red('✗')} Failed: ${chalk.red(failCount)}`);
  }

  if (isDryRun) {
    console.log();
    info('This was a dry run. No changes were made.');
  }

  // Show recommendations
  console.log();
  console.log(chalk.bold('💡 Recommendations:'));
  console.log(chalk.dim('  - Run optimization monthly for best performance'));
  console.log(chalk.dim('  - Some changes may require a restart to take effect'));
  console.log(chalk.dim('  - Use "broom clean" to free up disk space'));
}

/**
 * Create optimize command
 */
export function createOptimizeCommand(): Command {
  const cmd = new Command('optimize')
    .description('System maintenance and optimization')
    .option('-n, --dry-run', 'Preview only, no changes')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('-a, --all', 'Run all optimization tasks')
    .action(async (options) => {
      await optimizeCommand(options);
    });

  return enhanceCommandHelp(cmd);
}
