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
  if (options?.list || !action) {
    await listConfig();
    return;
  }

  // Handle --reset flag
  if (options?.reset) {
    await resetConfig();
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
      console.log('  whitelist-add [path]     Add path to whitelist');
      console.log('  whitelist-remove [index] Remove path from whitelist');
      console.log('  blacklist-add [path]     Add path to blacklist');
      console.log('  blacklist-remove [index] Remove path from blacklist');
      console.log('  safety [level]           Set safety level (safe, moderate, risky)');
      console.log('  reset                    Reset configuration to defaults');
  }
}

/**
 * Create config command
 */
export function createConfigCommand(): Command {
  const cmd = new Command('config')
    .description('Manage broom configuration')
    .argument('[action]', 'Action to perform')
    .argument('[value]', 'Value for the action')
    .option('-l, --list', 'List current configuration')
    .option('--reset', 'Reset configuration to defaults')
    .action(async (action, value, options) => {
      await configCommand(action, value, options);
    });

  return enhanceCommandHelp(cmd);
}
