/**
 * Configuration management for Broom CLI
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import type { Config } from '../types/index.js';
import { DEFAULT_CONFIG } from '../types/index.js';

// Re-export Config type for consumers
export type { Config };

const CONFIG_DIR = join(homedir(), '.config', 'broom');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const WHITELIST_FILE = join(CONFIG_DIR, 'whitelist');

let configCache: Config | null = null;

/**
 * Ensure config directory exists
 */
async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load configuration
 */
export async function loadConfig(): Promise<Config> {
  if (configCache) {
    return configCache;
  }

  try {
    await ensureConfigDir();

    if (!existsSync(CONFIG_FILE)) {
      await saveConfig(DEFAULT_CONFIG);
      configCache = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }

    const content = await readFile(CONFIG_FILE, 'utf-8');
    const config = { ...DEFAULT_CONFIG, ...JSON.parse(content) };

    // Load whitelist
    if (existsSync(WHITELIST_FILE)) {
      const whitelistContent = await readFile(WHITELIST_FILE, 'utf-8');
      config.whitelist = whitelistContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));
    }

    configCache = config;
    return config;
  } catch (error) {
    configCache = DEFAULT_CONFIG;
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration
 */
export async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();

  const { whitelist, ...configWithoutWhitelist } = config;
  await writeFile(CONFIG_FILE, JSON.stringify(configWithoutWhitelist, null, 2), 'utf-8');

  // Save whitelist separately
  if (whitelist && whitelist.length > 0) {
    const whitelistContent = `# Broom Whitelist\n# One path per line\n\n${whitelist.join('\n')}`;
    await writeFile(WHITELIST_FILE, whitelistContent, 'utf-8');
  } else {
    // Delete whitelist file if empty
    if (existsSync(WHITELIST_FILE)) {
      const { unlink } = await import('fs/promises');
      await unlink(WHITELIST_FILE);
    }
  }

  configCache = config;
}

/**
 * Reset configuration to defaults
 */
export async function resetConfig(): Promise<void> {
  await saveConfig(DEFAULT_CONFIG);
  configCache = DEFAULT_CONFIG;
}

/**
 * Get config file path
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Get whitelist file path
 */
export function getWhitelistPath(): string {
  return WHITELIST_FILE;
}

/**
 * Check if path is whitelisted
 */
export function isWhitelisted(path: string, whitelist: string[]): boolean {
  const normalizedPath = path.replace(/\/+$/, '');

  for (const pattern of whitelist) {
    const normalizedPattern = pattern.replace(/\/+$/, '').replace('~', homedir());

    if (normalizedPath === normalizedPattern) {
      return true;
    }

    if (normalizedPath.startsWith(normalizedPattern + '/')) {
      return true;
    }
  }

  return false;
}

/**
 * Add path to whitelist
 */
export async function addToWhitelist(path: string): Promise<void> {
  const config = await loadConfig();

  if (!config.whitelist.includes(path)) {
    config.whitelist.push(path);
    await saveConfig(config);
  }
}

/**
 * Remove path from whitelist
 */
export async function removeFromWhitelist(path: string): Promise<void> {
  const config = await loadConfig();
  config.whitelist = config.whitelist.filter((p) => p !== path);
  await saveConfig(config);
}

/**
 * Clear config cache
 */
export function clearConfigCache(): void {
  configCache = null;
}

export { CONFIG_DIR, CONFIG_FILE, WHITELIST_FILE };
