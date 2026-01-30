/**
 * update command - Self-update broom to the latest version
 */
import { Command } from 'commander';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { confirm } from '@inquirer/prompts';
import { enhanceCommandHelp } from '../utils/help.js';

const PACKAGE_NAME = 'broom-cli';

interface UpdateOptions {
  check: boolean;
  yes: boolean;
}

/**
 * Get current installed version
 */
function getCurrentVersion(): string {
  try {
    const packageJson = require('../../package.json');
    return packageJson.version;
  } catch {
    return 'unknown';
  }
}

/**
 * Get latest version from npm
 */
function getLatestVersion(): string | null {
  try {
    // Try npm
    const result = execSync(`npm view ${PACKAGE_NAME} version 2>/dev/null`, {
      encoding: 'utf-8',
      timeout: 10000,
    });
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Compare semver versions
 */
function compareVersions(current: string, latest: string): number {
  const parseParts = (v: string) => v.split('.').map((n) => parseInt(n, 10) || 0);
  const currentParts = parseParts(current);
  const latestParts = parseParts(latest);

  for (let i = 0; i < 3; i++) {
    const c = currentParts[i] || 0;
    const l = latestParts[i] || 0;
    if (l > c) {
      return 1; // newer
    }
    if (l < c) {
      return -1; // older
    }
  }
  return 0; // same
}

/**
 * Check for updates
 */
async function checkForUpdates(): Promise<void> {
  const spinner = ora('Checking for updates...').start();

  const current = getCurrentVersion();
  const latest = getLatestVersion();

  if (!latest) {
    spinner.warn('Could not fetch latest version');
    console.log(chalk.dim('\nMake sure you have internet connection.'));
    return;
  }

  spinner.stop();

  console.log(chalk.bold('\n📦 broom Version Info\n'));
  console.log(`  Current version:  ${chalk.cyan(current)}`);
  console.log(`  Latest version:   ${chalk.green(latest)}`);

  const cmp = compareVersions(current, latest);

  if (cmp > 0) {
    console.log(chalk.yellow('\n  Update available!'));
    console.log(chalk.dim(`  Run 'broom update' to update.\n`));
  } else if (cmp < 0) {
    console.log(chalk.cyan('\n  You are running a newer version.\n'));
  } else {
    console.log(chalk.green('\n  You are up to date!\n'));
  }
}

/**
 * Detect package manager
 */
function detectPackageManager(): 'npm' | 'yarn' | 'pnpm' | 'bun' | null {
  const managers: Array<'npm' | 'yarn' | 'pnpm' | 'bun'> = ['bun', 'pnpm', 'yarn', 'npm'];

  for (const manager of managers) {
    try {
      execSync(`which ${manager}`, { stdio: 'pipe' });
      return manager;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Perform update
 */
async function performUpdate(skipConfirm: boolean): Promise<void> {
  const current = getCurrentVersion();
  const spinner = ora('Checking for updates...').start();
  const latest = getLatestVersion();

  if (!latest) {
    spinner.fail('Could not fetch latest version');
    return;
  }

  const cmp = compareVersions(current, latest);

  if (cmp <= 0) {
    spinner.succeed(`Already up to date (v${current})`);
    return;
  }

  spinner.info(`Update available: ${current} → ${latest}`);

  if (!skipConfirm) {
    const confirmed = await confirm({
      message: `Update broom to v${latest}?`,
      default: true,
    });

    if (!confirmed) {
      console.log(chalk.yellow('Update cancelled'));
      return;
    }
  }

  const pm = detectPackageManager();
  if (!pm) {
    console.error(chalk.red('No package manager found'));
    console.log(chalk.dim('Install npm, yarn, pnpm, or bun first.'));
    return;
  }

  const updateSpinner = ora(`Updating broom using ${pm}...`).start();

  try {
    let cmd: string;
    switch (pm) {
      case 'npm':
        cmd = `npm update -g ${PACKAGE_NAME}`;
        break;
      case 'yarn':
        cmd = `yarn global upgrade ${PACKAGE_NAME}`;
        break;
      case 'pnpm':
        cmd = `pnpm update -g ${PACKAGE_NAME}`;
        break;
      case 'bun':
        cmd = `bun update -g ${PACKAGE_NAME}`;
        break;
    }

    execSync(cmd, { stdio: 'pipe' });
    updateSpinner.succeed(`Successfully updated to v${latest}`);

    console.log(chalk.dim('\nChangelog: https://github.com/your-username/broom/releases'));
  } catch (error) {
    updateSpinner.fail('Update failed');
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    console.log(chalk.dim('\nTry running manually:'));
    console.log(chalk.dim(`  npm install -g ${PACKAGE_NAME}@latest`));
  }
}

/**
 * Create update command
 */
export function createUpdateCommand(): Command {
  const cmd = new Command('update')
    .description('Self-update broom to the latest version')
    .option('-c, --check', 'Check for updates only (no install)')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (opts: UpdateOptions) => {
      if (opts.check) {
        await checkForUpdates();
      } else {
        await performUpdate(opts.yes);
      }
    });

  return enhanceCommandHelp(cmd);
}
