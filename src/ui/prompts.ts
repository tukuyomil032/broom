/**
 * Interactive prompts for Broom CLI
 */
import { select, confirm, checkbox, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { formatSize } from '../utils/fs.js';
import type { CleanableItem, ScanResult, AppInfo, Category } from '../types/index.js';

export interface SelectableItem<T> {
  name: string;
  value: T;
  checked?: boolean;
}

/**
 * Select a category to clean
 */
export async function selectCategory(results: ScanResult[]): Promise<ScanResult | null> {
  const choices = results
    .filter((r) => r.items.length > 0)
    .map((r) => ({
      name: `${r.category.name} (${formatSize(r.totalSize)} - ${r.items.length} items)`,
      value: r,
    }));

  if (choices.length === 0) {
    return null;
  }

  try {
    return await select({
      message: 'Select a category to clean:',
      choices,
    });
  } catch {
    return null;
  }
}

/**
 * Select multiple categories to clean
 */
export async function selectCategories(results: ScanResult[]): Promise<ScanResult[]> {
  const choices = results
    .filter((r) => r.items.length > 0)
    .map((r) => ({
      name: `${r.category.name} (${formatSize(r.totalSize)} - ${r.items.length} items)`,
      value: r,
      checked: r.category.safetyLevel === 'safe',
    }));

  if (choices.length === 0) {
    return [];
  }

  try {
    return await checkbox({
      message: 'Select categories to clean (space to toggle):',
      choices,
    });
  } catch {
    return [];
  }
}

/**
 * Select files to clean
 */
export async function selectFiles(items: CleanableItem[]): Promise<CleanableItem[]> {
  if (items.length === 0) {
    return [];
  }

  const choices = items.map((item) => ({
    name: `${item.isDirectory ? '📁' : '📄'} ${item.name} (${formatSize(item.size)}) - ${chalk.dim(item.path)}`,
    value: item,
    checked: true,
  }));

  try {
    return await checkbox({
      message: 'Select files to remove:',
      choices,
    });
  } catch {
    return [];
  }
}

/**
 * Select an application
 */
export async function selectApp(apps: AppInfo[]): Promise<AppInfo | null> {
  if (apps.length === 0) {
    return null;
  }

  const choices = apps.map((app) => ({
    name: `${app.name} (${formatSize(app.size)})${app.bundleId ? chalk.dim(` - ${app.bundleId}`) : ''}`,
    value: app,
  }));

  try {
    return await select({
      message: 'Select an application:',
      choices,
    });
  } catch {
    return null;
  }
}

/**
 * Confirm action
 */
export async function confirmAction(message: string, defaultValue = false): Promise<boolean> {
  try {
    return await confirm({
      message,
      default: defaultValue,
    });
  } catch {
    return false;
  }
}

/**
 * Confirm removal
 */
export async function confirmRemoval(itemCount: number, totalSize: number): Promise<boolean> {
  try {
    return await confirm({
      message: `Remove ${itemCount} item(s) (${formatSize(totalSize)})?`,
      default: false,
    });
  } catch {
    return false;
  }
}

/**
 * Prompt for text input
 */
export async function promptInput(message: string, defaultValue?: string): Promise<string | null> {
  try {
    return await input({
      message,
      default: defaultValue,
    });
  } catch {
    return null;
  }
}

/**
 * Text input prompt (alias for promptInput)
 */
export async function inputPrompt(message: string, defaultValue?: string): Promise<string | null> {
  return promptInput(message, defaultValue);
}

/**
 * Select from generic items
 */
export async function selectItems<T extends string>(
  message: string,
  choices: Array<{ name: string; value: T; description?: string }>
): Promise<T[]> {
  if (choices.length === 0) {
    return [];
  }

  try {
    return await checkbox({
      message,
      choices: choices.map((c) => ({
        name: c.description ? `${c.name} - ${chalk.dim(c.description)}` : c.name,
        value: c.value,
      })),
    });
  } catch {
    return [];
  }
}

/**
 * Select a path (directory browser)
 */
export async function selectPath(
  message: string,
  choices: Array<{ name: string; value: string }>
): Promise<string | null> {
  if (choices.length === 0) {
    return null;
  }

  try {
    return await select({
      message,
      choices,
    });
  } catch {
    return null;
  }
}

/**
 * Select main menu action
 */
export async function selectMainAction(): Promise<string | null> {
  try {
    return await select({
      message: 'What would you like to do?',
      choices: [
        { name: '🧹 Clean - Deep system cleanup', value: 'clean' },
        { name: '🗑️  Uninstall - Remove apps completely', value: 'uninstall' },
        { name: '🔧 Optimize - Check and maintain system', value: 'optimize' },
        { name: '📊 Analyze - Explore disk usage', value: 'analyze' },
        { name: '📈 Status - Monitor system health', value: 'status' },
        { name: '📦 Purge - Clean project artifacts', value: 'purge' },
        { name: '💿 Installer - Remove installer files', value: 'installer' },
        { name: '⚙️  Config - Manage settings', value: 'config' },
        { name: '❌ Exit', value: 'exit' },
      ],
    });
  } catch {
    return null;
  }
}

/**
 * Select config option
 */
export async function selectConfigOption(): Promise<string | null> {
  try {
    return await select({
      message: 'Select a configuration option:',
      choices: [
        { name: 'Toggle scan locations', value: 'locations' },
        { name: 'Manage whitelist', value: 'whitelist' },
        { name: 'Toggle dry run mode', value: 'dryrun' },
        { name: 'Reset to defaults', value: 'reset' },
        { name: 'Exit', value: 'exit' },
      ],
    });
  } catch {
    return null;
  }
}

/**
 * Select scan locations to toggle
 */
export async function selectScanLocations(
  currentLocations: Record<string, boolean>
): Promise<string[]> {
  const choices = [
    { name: 'User Cache', value: 'userCache', checked: currentLocations.userCache },
    { name: 'System Cache', value: 'systemCache', checked: currentLocations.systemCache },
    { name: 'System Logs', value: 'systemLogs', checked: currentLocations.systemLogs },
    { name: 'User Logs', value: 'userLogs', checked: currentLocations.userLogs },
    { name: 'Trash', value: 'trash', checked: currentLocations.trash },
    { name: 'Downloads', value: 'downloads', checked: currentLocations.downloads },
    { name: 'Browser Cache', value: 'browserCache', checked: currentLocations.browserCache },
    { name: 'Development Cache', value: 'devCache', checked: currentLocations.devCache },
    { name: 'Xcode Cache', value: 'xcodeCache', checked: currentLocations.xcodeCache },
  ];

  try {
    return await checkbox({
      message: 'Select locations to scan:',
      choices,
    });
  } catch {
    return [];
  }
}

/**
 * Select cleanup action
 */
export async function selectCleanupAction(): Promise<'remove' | 'back' | 'cancel'> {
  try {
    return await select({
      message: 'What would you like to do?',
      choices: [
        { name: 'Remove selected files', value: 'remove' },
        { name: 'Back to category selection', value: 'back' },
        { name: 'Cancel', value: 'cancel' },
      ],
    });
  } catch {
    return 'cancel';
  }
}
