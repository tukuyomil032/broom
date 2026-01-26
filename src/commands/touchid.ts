/**
 * touchid command - Configure Touch ID for sudo authentication
 */
import { Command } from 'commander';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { confirm } from '@inquirer/prompts';
import { enhanceCommandHelp } from '../utils/help.js';

const PAM_SUDO_PATH = '/etc/pam.d/sudo';
const PAM_SUDO_LOCAL_PATH = '/etc/pam.d/sudo_local';
const PAM_SUDO_TEMPLATE_PATH = '/etc/pam.d/sudo_local.template';
const TOUCHID_LINE = 'auth       sufficient     pam_tid.so';

interface TouchIdStatus {
  enabled: boolean;
  method: 'sudo_local' | 'sudo' | 'none';
  hasTemplate: boolean;
}

/**
 * Check current Touch ID sudo status
 */
function checkTouchIdStatus(): TouchIdStatus {
  // Check sudo_local first (preferred method for macOS Sonoma+)
  if (existsSync(PAM_SUDO_LOCAL_PATH)) {
    try {
      const content = readFileSync(PAM_SUDO_LOCAL_PATH, 'utf-8');
      if (content.includes('pam_tid.so') && !content.includes('#auth')) {
        return {
          enabled: true,
          method: 'sudo_local',
          hasTemplate: existsSync(PAM_SUDO_TEMPLATE_PATH),
        };
      }
    } catch {
      // Permission denied, need sudo
    }
  }

  // Check sudo file (legacy method)
  if (existsSync(PAM_SUDO_PATH)) {
    try {
      const content = readFileSync(PAM_SUDO_PATH, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('pam_tid.so') && !line.trim().startsWith('#')) {
          return { enabled: true, method: 'sudo', hasTemplate: existsSync(PAM_SUDO_TEMPLATE_PATH) };
        }
      }
    } catch {
      // Permission denied, need sudo
    }
  }

  return { enabled: false, method: 'none', hasTemplate: existsSync(PAM_SUDO_TEMPLATE_PATH) };
}

/**
 * Enable Touch ID for sudo
 */
async function enableTouchId(skipConfirm: boolean): Promise<void> {
  const status = checkTouchIdStatus();

  if (status.enabled) {
    console.log(chalk.green('✓ Touch ID for sudo is already enabled'));
    return;
  }

  console.log(chalk.bold('\n🔐 Touch ID for sudo Configuration\n'));
  console.log('This will configure Touch ID authentication for sudo commands.');
  console.log('You can use your fingerprint instead of typing your password.\n');

  if (!skipConfirm) {
    const confirmed = await confirm({
      message: 'Enable Touch ID for sudo?',
      default: true,
    });

    if (!confirmed) {
      console.log(chalk.yellow('Cancelled'));
      return;
    }
  }

  const spinner = ora('Enabling Touch ID for sudo...').start();

  try {
    // Use sudo_local method for macOS Sonoma+ (preferred)
    if (status.hasTemplate) {
      // Copy template to sudo_local
      const command = `sudo cp "${PAM_SUDO_TEMPLATE_PATH}" "${PAM_SUDO_LOCAL_PATH}" && sudo sed -i '' 's/#auth/auth/' "${PAM_SUDO_LOCAL_PATH}"`;
      execSync(command, { stdio: 'pipe' });
      spinner.succeed('Touch ID for sudo enabled via sudo_local');
    } else {
      // Legacy method: modify /etc/pam.d/sudo directly
      // First backup
      const backupPath = `${PAM_SUDO_PATH}.bak`;
      if (!existsSync(backupPath)) {
        execSync(`sudo cp "${PAM_SUDO_PATH}" "${backupPath}"`, { stdio: 'pipe' });
      }

      // Read current content
      const content = execSync(`sudo cat "${PAM_SUDO_PATH}"`, { encoding: 'utf-8' });
      const lines = content.split('\n');

      // Check if pam_tid.so is already there but commented
      let modified = false;
      const newLines = lines.map((line) => {
        if (line.includes('pam_tid.so')) {
          modified = true;
          return TOUCHID_LINE;
        }
        return line;
      });

      // If not found, add after the first auth line
      if (!modified) {
        for (let i = 0; i < newLines.length; i++) {
          if (newLines[i].trim().startsWith('auth')) {
            newLines.splice(i, 0, TOUCHID_LINE);
            break;
          }
        }
      }

      // Write back
      const tempFile = '/tmp/broom_pam_sudo';
      writeFileSync(tempFile, newLines.join('\n'));
      execSync(`sudo cp "${tempFile}" "${PAM_SUDO_PATH}"`, { stdio: 'pipe' });

      spinner.succeed('Touch ID for sudo enabled via /etc/pam.d/sudo');
    }

    console.log(chalk.dim('\nNote: Touch ID for sudo may not work in some Terminal apps.'));
    console.log(chalk.dim('Works best in Terminal.app and iTerm2.'));
  } catch (error) {
    spinner.fail('Failed to enable Touch ID for sudo');
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    console.log(chalk.dim('\nTip: Make sure you have admin privileges.'));
  }
}

/**
 * Disable Touch ID for sudo
 */
async function disableTouchId(skipConfirm: boolean): Promise<void> {
  const status = checkTouchIdStatus();

  if (!status.enabled) {
    console.log(chalk.yellow('Touch ID for sudo is not enabled'));
    return;
  }

  if (!skipConfirm) {
    const confirmed = await confirm({
      message: 'Disable Touch ID for sudo?',
      default: false,
    });

    if (!confirmed) {
      console.log(chalk.yellow('Cancelled'));
      return;
    }
  }

  const spinner = ora('Disabling Touch ID for sudo...').start();

  try {
    if (status.method === 'sudo_local') {
      // Remove sudo_local file
      execSync(`sudo rm -f "${PAM_SUDO_LOCAL_PATH}"`, { stdio: 'pipe' });
      spinner.succeed('Touch ID for sudo disabled (removed sudo_local)');
    } else {
      // Comment out pam_tid.so in /etc/pam.d/sudo
      const content = execSync(`sudo cat "${PAM_SUDO_PATH}"`, { encoding: 'utf-8' });
      const lines = content.split('\n');
      const newLines = lines.map((line) => {
        if (line.includes('pam_tid.so') && !line.trim().startsWith('#')) {
          return '#' + line;
        }
        return line;
      });

      const tempFile = '/tmp/broom_pam_sudo';
      writeFileSync(tempFile, newLines.join('\n'));
      execSync(`sudo cp "${tempFile}" "${PAM_SUDO_PATH}"`, { stdio: 'pipe' });

      spinner.succeed('Touch ID for sudo disabled');
    }
  } catch (error) {
    spinner.fail('Failed to disable Touch ID for sudo');
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
  }
}

/**
 * Show Touch ID sudo status
 */
function showStatus(): void {
  const status = checkTouchIdStatus();

  console.log(chalk.bold('\n🔐 Touch ID for sudo Status\n'));

  if (status.enabled) {
    console.log(chalk.green('  Status:  ') + chalk.bold.green('Enabled'));
    console.log(chalk.dim('  Method:  ') + status.method);
  } else {
    console.log(chalk.yellow('  Status:  ') + chalk.bold.yellow('Disabled'));
  }

  console.log(chalk.dim('  Template: ') + (status.hasTemplate ? 'Available' : 'Not found'));
  console.log();

  if (!status.enabled) {
    console.log(chalk.dim('Run `broom touchid enable` to enable Touch ID for sudo.\n'));
  }
}

/**
 * Create touchid command
 */
export function createTouchIdCommand(): Command {
  const cmd = new Command('touchid')
    .description('Configure Touch ID for sudo authentication')
    .option('-y, --yes', 'Skip confirmation prompts');

  cmd
    .command('enable')
    .description('Enable Touch ID for sudo')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (opts) => {
      const parentOpts = cmd.opts();
      await enableTouchId(opts.yes || parentOpts.yes);
    });

  cmd
    .command('disable')
    .description('Disable Touch ID for sudo')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (opts) => {
      const parentOpts = cmd.opts();
      await disableTouchId(opts.yes || parentOpts.yes);
    });

  cmd
    .command('status')
    .description('Show Touch ID sudo status')
    .action(() => {
      showStatus();
    });

  // Default action - show status
  cmd.action(() => {
    showStatus();
  });

  return enhanceCommandHelp(cmd);
}
