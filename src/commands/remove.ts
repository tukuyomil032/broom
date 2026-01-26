/**
 * remove command - Uninstall broom from the system
 */
import { Command } from 'commander';
import { execSync } from 'child_process';
import { existsSync, unlinkSync, rmSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { confirm } from '@inquirer/prompts';
import { enhanceCommandHelp } from '../utils/help.js';

const CONFIG_DIR = join(homedir(), '.config', 'broom');
const CACHE_DIR = join(homedir(), '.cache', 'broom');
const DATA_DIR = join(homedir(), '.local', 'share', 'broom');

interface RemoveOptions {
  yes: boolean;
  keepConfig: boolean;
}

/**
 * Detect how broom was installed
 */
function detectInstallMethod(): 'npm' | 'yarn' | 'pnpm' | 'bun' | 'local' | 'unknown' {
  try {
    // Check if installed globally via npm/yarn/pnpm
    const npmList = execSync('npm list -g --depth=0 2>/dev/null', { encoding: 'utf-8' });
    if (npmList.includes('broom')) {
      return 'npm';
    }
  } catch {}

  try {
    const yarnList = execSync('yarn global list 2>/dev/null', { encoding: 'utf-8' });
    if (yarnList.includes('broom')) {
      return 'yarn';
    }
  } catch {}

  try {
    const pnpmList = execSync('pnpm list -g 2>/dev/null', { encoding: 'utf-8' });
    if (pnpmList.includes('broom')) {
      return 'pnpm';
    }
  } catch {}

  try {
    const bunList = execSync('bun pm ls -g 2>/dev/null', { encoding: 'utf-8' });
    if (bunList.includes('broom')) {
      return 'bun';
    }
  } catch {}

  // Check if running from local development
  const scriptPath = process.argv[1];
  if (scriptPath && scriptPath.includes('/dist/index.js')) {
    return 'local';
  }

  return 'unknown';
}

/**
 * Get files/directories that would be removed
 */
function getRemovableItems(
  keepConfig: boolean
): { path: string; exists: boolean; description: string }[] {
  const items = [
    { path: CACHE_DIR, exists: existsSync(CACHE_DIR), description: 'Cache directory' },
    { path: DATA_DIR, exists: existsSync(DATA_DIR), description: 'Data directory' },
  ];

  if (!keepConfig) {
    items.push({
      path: CONFIG_DIR,
      exists: existsSync(CONFIG_DIR),
      description: 'Config directory',
    });
  }

  return items;
}

/**
 * Remove user data directories
 */
function removeUserData(keepConfig: boolean): number {
  let removed = 0;

  if (existsSync(CACHE_DIR)) {
    rmSync(CACHE_DIR, { recursive: true, force: true });
    removed++;
  }

  if (existsSync(DATA_DIR)) {
    rmSync(DATA_DIR, { recursive: true, force: true });
    removed++;
  }

  if (!keepConfig && existsSync(CONFIG_DIR)) {
    rmSync(CONFIG_DIR, { recursive: true, force: true });
    removed++;
  }

  return removed;
}

/**
 * Uninstall broom
 */
async function uninstallBroom(opts: RemoveOptions): Promise<void> {
  console.log(chalk.bold('\n🗑️  Uninstall broom\n'));

  const installMethod = detectInstallMethod();
  const items = getRemovableItems(opts.keepConfig);
  const existingItems = items.filter((i) => i.exists);

  console.log(chalk.dim('Installation method: ') + installMethod);
  console.log();

  if (installMethod === 'local') {
    console.log(chalk.yellow('broom appears to be running from a local development directory.'));
    console.log(chalk.dim('To remove, simply delete the project directory.\n'));
  }

  if (existingItems.length > 0) {
    console.log(chalk.bold('User data to be removed:'));
    for (const item of existingItems) {
      console.log(`  ${chalk.red('•')} ${item.description}: ${chalk.dim(item.path)}`);
    }
    console.log();
  }

  if (opts.keepConfig) {
    console.log(chalk.dim('Configuration will be preserved.\n'));
  }

  if (!opts.yes) {
    const confirmed = await confirm({
      message: 'Are you sure you want to uninstall broom?',
      default: false,
    });

    if (!confirmed) {
      console.log(chalk.yellow('Uninstall cancelled'));
      return;
    }
  }

  // Remove user data first
  if (existingItems.length > 0) {
    const dataSpinner = ora('Removing user data...').start();
    const removed = removeUserData(opts.keepConfig);
    dataSpinner.succeed(`Removed ${removed} data ${removed === 1 ? 'directory' : 'directories'}`);
  }

  // Uninstall package
  if (installMethod !== 'local' && installMethod !== 'unknown') {
    const uninstallSpinner = ora(`Uninstalling broom via ${installMethod}...`).start();

    try {
      let cmd: string;
      switch (installMethod) {
        case 'npm':
          cmd = 'npm uninstall -g broom';
          break;
        case 'yarn':
          cmd = 'yarn global remove broom';
          break;
        case 'pnpm':
          cmd = 'pnpm remove -g broom';
          break;
        case 'bun':
          cmd = 'bun remove -g broom';
          break;
        default:
          cmd = 'npm uninstall -g broom';
      }

      execSync(cmd, { stdio: 'pipe' });
      uninstallSpinner.succeed('broom uninstalled successfully');
    } catch (error) {
      uninstallSpinner.fail('Failed to uninstall broom package');
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      console.log(chalk.dim('\nTry running manually:'));
      console.log(chalk.dim('  npm uninstall -g broom'));
    }
  }

  console.log(chalk.green('\n👋 broom has been removed. Thanks for using broom!\n'));

  // Remove shell completion
  console.log(chalk.dim('Remember to remove any shell completion scripts you may have added:'));
  console.log(chalk.dim('  - ~/.bashrc or ~/.bash_profile'));
  console.log(chalk.dim('  - ~/.zshrc or ~/.zsh/completions/_broom'));
  console.log(chalk.dim('  - ~/.config/fish/completions/broom.fish\n'));
}

/**
 * Create remove command
 */
export function createRemoveCommand(): Command {
  const cmd = new Command('remove')
    .description('Uninstall broom from the system')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('-k, --keep-config', 'Keep configuration files')
    .action(async (opts: RemoveOptions) => {
      await uninstallBroom(opts);
    });

  return enhanceCommandHelp(cmd);
}
