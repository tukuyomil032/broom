/**
 * Config command - Manage broom configuration
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { enhanceCommandHelp } from '../utils/help.js';
import { loadConfig, saveConfig, getConfigPath } from '../utils/config.js';
import { DEFAULT_CONFIG } from '../types/index.js';
import { printHeader, success, warning, error, info, separator } from '../ui/output.js';
import { confirmAction, inputPrompt } from '../ui/prompts.js';

interface ConfigOptions {
  list?: boolean;
  reset?: boolean;
}

/**
 * List current configuration
 */
async function listConfig(): Promise<void> {
  const config = await loadConfig();

  console.log(chalk.bold('📝 Current Configuration'));
  console.log();
  console.log(`Config file: ${chalk.dim(getConfigPath())}`);
  console.log();

  // Whitelist
  console.log(chalk.bold('Whitelist (protected paths):'));
  if (config.whitelist.length === 0) {
    console.log(chalk.dim('  No paths in whitelist'));
  } else {
    config.whitelist.forEach((path: string, i: number) => {
      console.log(`  ${chalk.cyan(`${i + 1}.`)} ${path}`);
    });
  }
  console.log();

  // Blacklist
  console.log(chalk.bold('Blacklist (always include):'));
  if (config.blacklist.length === 0) {
    console.log(chalk.dim('  No paths in blacklist'));
  } else {
    config.blacklist.forEach((path: string, i: number) => {
      console.log(`  ${chalk.cyan(`${i + 1}.`)} ${path}`);
    });
  }
  console.log();

  // Settings
  console.log(chalk.bold('Settings:'));
  console.log(`  Auto confirm: ${config.autoConfirm ? chalk.green('Yes') : chalk.yellow('No')}`);
  console.log(`  Safety level: ${chalk.cyan(config.safetyLevel)}`);
}

/**
 * Add path to whitelist
 */
async function addToWhitelist(path: string): Promise<void> {
  const config = await loadConfig();

  if (config.whitelist.includes(path)) {
    warning(`Path already in whitelist: ${path}`);
    return;
  }

  config.whitelist.push(path);
  await saveConfig(config);
  success(`Added to whitelist: ${path}`);
}

/**
 * Remove path from whitelist
 */
async function removeFromWhitelist(index: number): Promise<void> {
  const config = await loadConfig();

  if (index < 1 || index > config.whitelist.length) {
    error(`Invalid index: ${index}`);
    return;
  }

  const removed = config.whitelist.splice(index - 1, 1)[0];
  await saveConfig(config);
  success(`Removed from whitelist: ${removed}`);
}

/**
 * Add path to blacklist
 */
async function addToBlacklist(path: string): Promise<void> {
  const config = await loadConfig();

  if (config.blacklist.includes(path)) {
    warning(`Path already in blacklist: ${path}`);
    return;
  }

  config.blacklist.push(path);
  await saveConfig(config);
  success(`Added to blacklist: ${path}`);
}

/**
 * Remove path from blacklist
 */
async function removeFromBlacklist(index: number): Promise<void> {
  const config = await loadConfig();

  if (index < 1 || index > config.blacklist.length) {
    error(`Invalid index: ${index}`);
    return;
  }

  const removed = config.blacklist.splice(index - 1, 1)[0];
  await saveConfig(config);
  success(`Removed from blacklist: ${removed}`);
}

/**
 * Set safety level
 */
async function setSafetyLevel(level: string): Promise<void> {
  const validLevels = ['safe', 'moderate', 'risky'];

  if (!validLevels.includes(level)) {
    error(`Invalid safety level: ${level}`);
    info(`Valid levels: ${validLevels.join(', ')}`);
    return;
  }

  const config = await loadConfig();
  config.safetyLevel = level as 'safe' | 'moderate' | 'risky';
  await saveConfig(config);
  success(`Safety level set to: ${level}`);
}

/**
 * Reset configuration
 */
async function resetConfig(): Promise<void> {
  const confirmed = await confirmAction('Reset configuration to defaults?', false);

  if (!confirmed) {
    warning('Reset cancelled');
    return;
  }

  await saveConfig({ ...DEFAULT_CONFIG });
  success('Configuration reset to defaults');
}

/**
 * Execute config command
 */
export async function configCommand(
  action?: string,
  value?: string,
  options?: ConfigOptions
): Promise<void> {
  printHeader('⚙️  Configuration');

  // Handle --list flag
  if (options?.list) {
    await listConfig();
    return;
  }

  // Handle --reset flag
  if (options?.reset) {
    await resetConfig();
    return;
  }

  // Interactive mode - default if no action specified
  if (!action || action === 'interactive' || action === 'edit') {
    await interactiveConfigEdit();
    return;
  }

  // Handle actions
  switch (action) {
    case 'whitelist-add':
      if (!value) {
        const path = await inputPrompt('Enter path to add to whitelist:');
        if (path) await addToWhitelist(path);
      } else {
        await addToWhitelist(value);
      }
      break;

    case 'whitelist-remove':
      if (!value) {
        await listConfig();
        const index = await inputPrompt('Enter index to remove:');
        if (index) await removeFromWhitelist(parseInt(index));
      } else {
        await removeFromWhitelist(parseInt(value));
      }
      break;

    case 'blacklist-add':
      if (!value) {
        const path = await inputPrompt('Enter path to add to blacklist:');
        if (path) await addToBlacklist(path);
      } else {
        await addToBlacklist(value);
      }
      break;

    case 'blacklist-remove':
      if (!value) {
        await listConfig();
        const index = await inputPrompt('Enter index to remove:');
        if (index) await removeFromBlacklist(parseInt(index));
      } else {
        await removeFromBlacklist(parseInt(value));
      }
      break;

    case 'safety':
      if (!value) {
        info('Valid safety levels: safe, moderate, risky');
        const level = await inputPrompt('Enter safety level:');
        if (level) await setSafetyLevel(level);
      } else {
        await setSafetyLevel(value);
      }
      break;

    case 'reset':
      await resetConfig();
      break;

    default:
      error(`Unknown action: ${action}`);
      console.log();
      console.log(chalk.bold('Available actions:'));
      console.log('  interactive              Interactive configuration editor');
      console.log('  whitelist-add [path]     Add path to whitelist');
      console.log('  whitelist-remove [index] Remove path from whitelist');
      console.log('  blacklist-add [path]     Add path to blacklist');
      console.log('  blacklist-remove [index] Remove path from blacklist');
      console.log('  safety [level]           Set safety level (safe, moderate, risky)');
      console.log('  reset                    Reset configuration to defaults');
  }
}

/**
 * Interactive configuration editor
 */
async function interactiveConfigEdit(): Promise<void> {
  const config = await loadConfig();
  let shouldExit = false;

  while (!shouldExit) {
    console.log();
    console.log(chalk.bold('⚙️  Configuration Editor'));
    console.log(chalk.dim('Select an option to configure:'));
    console.log();
    console.log(`  ${chalk.cyan('1')} Monitor Preset (Current: ${config.monitorPreset})`);
    console.log(`  ${chalk.cyan('2')} Safety Level (Current: ${config.safetyLevel})`);
    console.log(
      `  ${chalk.cyan('3')} Auto Confirm (Current: ${config.autoConfirm ? 'Yes' : 'No'})`
    );
    console.log(`  ${chalk.cyan('4')} Dry Run (Current: ${config.dryRun ? 'Yes' : 'No'})`);
    console.log(`  ${chalk.cyan('5')} Verbose (Current: ${config.verbose ? 'Yes' : 'No'})`);
    console.log(`  ${chalk.cyan('6')} Manage Whitelist (${config.whitelist.length} items)`);
    console.log(`  ${chalk.cyan('7')} Manage Blacklist (${config.blacklist.length} items)`);
    console.log(`  ${chalk.cyan('8')} View All Settings`);
    console.log(`  ${chalk.cyan('9')} Reset to Defaults`);
    console.log(`  ${chalk.cyan('0')} Exit`);
    console.log();

    const choice = await inputPrompt('Choose an option (0-9):');

    switch (choice) {
      case '1':
        await configureMonitorPreset(config);
        break;
      case '2':
        await configureSafetyLevel(config);
        break;
      case '3':
        config.autoConfirm = !config.autoConfirm;
        await saveConfig(config);
        success(`Auto Confirm set to: ${config.autoConfirm ? 'Yes' : 'No'}`);
        break;
      case '4':
        config.dryRun = !config.dryRun;
        await saveConfig(config);
        success(`Dry Run set to: ${config.dryRun ? 'Yes' : 'No'}`);
        break;
      case '5':
        config.verbose = !config.verbose;
        await saveConfig(config);
        success(`Verbose set to: ${config.verbose ? 'Yes' : 'No'}`);
        break;
      case '6':
        await manageWhitelist(config);
        break;
      case '7':
        await manageBlacklist(config);
        break;
      case '8':
        await listConfig();
        break;
      case '9':
        const confirmed = await confirmAction('Reset configuration to defaults?', false);
        if (confirmed) {
          await saveConfig({ ...DEFAULT_CONFIG });
          success('Configuration reset to defaults');
        } else {
          warning('Reset cancelled');
        }
        break;
      case '0':
        shouldExit = true;
        console.log();
        success('Configuration saved and exiting');
        break;
      default:
        error('Invalid option');
    }
  }
}

/**
 * Configure monitor preset
 */
async function configureMonitorPreset(config: typeof DEFAULT_CONFIG): Promise<void> {
  console.log();
  console.log(chalk.bold('Monitor Presets:'));
  console.log(`  ${chalk.cyan('1')} Classic Grid Layout (CPU, Memory, Disk, Network in grid)`);
  console.log(`  ${chalk.cyan('2')} Minimal Compact (Simple single-panel layout)`);
  console.log(`  ${chalk.cyan('3')} Detailed Information (Comprehensive system info)`);
  console.log(`  ${chalk.cyan('4')} Linux-style Dashboard (Like htop/top)`);
  console.log(`  ${chalk.cyan('5')} Modern Colorful Dashboard (Color-rich modern design)`);
  console.log();

  const choice = await inputPrompt('Select preset (1-5):');
  if (!choice) {
    return;
  }

  const preset = parseInt(choice) as 1 | 2 | 3 | 4 | 5;

  if (preset >= 1 && preset <= 5) {
    config.monitorPreset = preset;
    await saveConfig(config);
    success(`Monitor preset set to: ${preset}`);
  } else {
    error('Invalid preset selection');
  }
}

/**
 * Configure safety level
 */
async function configureSafetyLevel(config: typeof DEFAULT_CONFIG): Promise<void> {
  console.log();
  console.log(chalk.bold('Safety Levels:'));
  console.log(`  ${chalk.cyan('1')} Safe - Only remove very safe files`);
  console.log(`  ${chalk.cyan('2')} Moderate - Remove common temporary files (default)`);
  console.log(`  ${chalk.cyan('3')} Risky - Remove more aggressive including some system files`);
  console.log();

  const choice = await inputPrompt('Select safety level (1-3):');

  switch (choice) {
    case '1':
      config.safetyLevel = 'safe';
      await saveConfig(config);
      success('Safety level set to: safe');
      break;
    case '2':
      config.safetyLevel = 'moderate';
      await saveConfig(config);
      success('Safety level set to: moderate');
      break;
    case '3':
      config.safetyLevel = 'risky';
      await saveConfig(config);
      success('Safety level set to: risky');
      break;
    default:
      error('Invalid safety level selection');
  }
}

/**
 * Manage whitelist
 */
async function manageWhitelist(config: typeof DEFAULT_CONFIG): Promise<void> {
  let managing = true;

  while (managing) {
    console.log();
    console.log(chalk.bold('Whitelist Management'));
    if (config.whitelist.length === 0) {
      console.log(chalk.dim('No paths in whitelist'));
    } else {
      config.whitelist.forEach((path: string, i: number) => {
        console.log(`  ${chalk.cyan(`${i + 1}.`)} ${path}`);
      });
    }
    console.log();
    console.log(`  ${chalk.cyan('1')} Add path`);
    console.log(`  ${chalk.cyan('2')} Remove path`);
    console.log(`  ${chalk.cyan('0')} Back`);
    console.log();

    const choice = await inputPrompt('Choose option (0-2):');

    switch (choice) {
      case '1':
        const path = await inputPrompt('Enter path to add:');
        if (path && !config.whitelist.includes(path)) {
          config.whitelist.push(path);
          await saveConfig(config);
          success(`Added to whitelist: ${path}`);
        }
        break;
      case '2':
        if (config.whitelist.length > 0) {
          const index = await inputPrompt('Enter index to remove:');
          if (!index) {
            break;
          }
          const idx = parseInt(index) - 1;
          if (idx >= 0 && idx < config.whitelist.length) {
            const removed = config.whitelist.splice(idx, 1)[0];
            await saveConfig(config);
            success(`Removed from whitelist: ${removed}`);
          } else {
            error('Invalid index');
          }
        }
        break;
      case '0':
        managing = false;
        break;
      default:
        error('Invalid option');
    }
  }
}

/**
 * Manage blacklist
 */
async function manageBlacklist(config: typeof DEFAULT_CONFIG): Promise<void> {
  let managing = true;

  while (managing) {
    console.log();
    console.log(chalk.bold('Blacklist Management'));
    if (config.blacklist.length === 0) {
      console.log(chalk.dim('No paths in blacklist'));
    } else {
      config.blacklist.forEach((path: string, i: number) => {
        console.log(`  ${chalk.cyan(`${i + 1}.`)} ${path}`);
      });
    }
    console.log();
    console.log(`  ${chalk.cyan('1')} Add path`);
    console.log(`  ${chalk.cyan('2')} Remove path`);
    console.log(`  ${chalk.cyan('0')} Back`);
    console.log();

    const choice = await inputPrompt('Choose option (0-2):');

    switch (choice) {
      case '1':
        const path = await inputPrompt('Enter path to add:');
        if (path && !config.blacklist.includes(path)) {
          config.blacklist.push(path);
          await saveConfig(config);
          success(`Added to blacklist: ${path}`);
        }
        break;
      case '2':
        if (config.blacklist.length > 0) {
          const index = await inputPrompt('Enter index to remove:');
          if (!index) {
            break;
          }
          const idx = parseInt(index) - 1;
          if (idx >= 0 && idx < config.blacklist.length) {
            const removed = config.blacklist.splice(idx, 1)[0];
            await saveConfig(config);
            success(`Removed from blacklist: ${removed}`);
          } else {
            error('Invalid index');
          }
        }
        break;
      case '0':
        managing = false;
        break;
      default:
        error('Invalid option');
    }
  }
}

/**
 * Create config command
 */
export function createConfigCommand(): Command {
  const cmd = new Command('config')
    .description('Manage broom configuration (interactive or direct)')
    .argument('[action]', 'Action to perform (interactive, whitelist-add, etc.)')
    .argument('[value]', 'Value for the action')
    .option('-l, --list', 'List current configuration')
    .option('--reset', 'Reset configuration to defaults')
    .action(async (action, value, options) => {
      await configCommand(action, value, options);
    });

  return enhanceCommandHelp(cmd);
}
