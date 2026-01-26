/**
 * File system utilities for Broom CLI
 */
import { stat, readdir, rm, access, lstat, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { CleanableItem, RemovalResult, RemovalSummary } from '../types/index.js';

const execAsync = promisify(exec);

// Protected system paths that should NEVER be deleted
const PROTECTED_PATHS = [
  '/System',
  '/usr',
  '/bin',
  '/sbin',
  '/etc',
  '/var/log',
  '/var/db',
  '/var/root',
  '/private/var/db',
  '/private/var/root',
  '/Library/Apple',
  '/Applications/Utilities',
];

// Allowed cache/temp paths
const ALLOWED_PATHS = [
  '/tmp',
  '/private/tmp',
  '/var/tmp',
  '/private/var/tmp',
  '/var/folders',
  '/private/var/folders',
];

/**
 * Check if a path is a protected system path
 */
export function isProtectedPath(path: string): boolean {
  const normalizedPath = resolve(path);

  // Check allowed paths first
  for (const allowed of ALLOWED_PATHS) {
    if (normalizedPath.startsWith(allowed)) {
      return false;
    }
  }

  // Check protected paths
  for (const protected_ of PROTECTED_PATHS) {
    if (normalizedPath === protected_ || normalizedPath.startsWith(protected_ + '/')) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a path exists
 */
export function exists(path: string): boolean {
  return existsSync(path);
}

/**
 * Check if a path exists (async)
 */
export async function existsAsync(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file/directory size recursively
 * Uses 'du' command for efficiency on large directories
 */
export async function getSize(path: string): Promise<number> {
  try {
    const stats = await stat(path);

    if (stats.isFile()) {
      return stats.size;
    }

    if (stats.isDirectory()) {
      // Use du command for efficient directory size calculation
      try {
        const { stdout } = await execAsync(`du -sk "${path}" 2>/dev/null || echo "0"`);
        const sizeKb = parseInt(stdout.split('\t')[0], 10);
        return isNaN(sizeKb) ? 0 : sizeKb * 1024;
      } catch {
        // Fallback to recursive calculation for small directories
        return getSizeRecursive(path);
      }
    }

    return 0;
  } catch {
    return 0;
  }
}

/**
 * Recursive size calculation (fallback)
 */
async function getSizeRecursive(
  path: string,
  depth: number = 0,
  maxDepth: number = 5
): Promise<number> {
  if (depth > maxDepth) {
    return 0; // Limit recursion depth
  }

  try {
    const stats = await stat(path);

    if (stats.isFile()) {
      return stats.size;
    }

    if (stats.isDirectory()) {
      const files = await readdir(path);
      let total = 0;

      // Process in batches to avoid memory issues
      for (const file of files) {
        total += await getSizeRecursive(join(path, file), depth + 1, maxDepth);
      }

      return total;
    }

    return 0;
  } catch {
    return 0;
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Get all files in a directory (non-recursive)
 */
export async function getFilesInDirectory(path: string): Promise<string[]> {
  try {
    if (!exists(path)) {
      return [];
    }

    const stats = await stat(path);
    if (!stats.isDirectory()) {
      return [];
    }

    const files = await readdir(path);
    return files.map((file) => join(path, file));
  } catch {
    return [];
  }
}

/**
 * Check if path is a directory
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Remove a file or directory
 */
export async function remove(path: string): Promise<void> {
  if (isProtectedPath(path)) {
    throw new Error(`Cannot remove protected path: ${path}`);
  }

  try {
    await rm(path, { recursive: true, force: true });
  } catch (error) {
    throw new Error(`Failed to remove ${path}: ${(error as Error).message}`);
  }
}

/**
 * Remove a single item
 */
export async function removeItem(path: string, dryRun = false): Promise<boolean> {
  if (isProtectedPath(path)) {
    return false;
  }

  if (dryRun) {
    return true;
  }

  try {
    const stats = await lstat(path);

    if (stats.isSymbolicLink()) {
      await unlink(path);
    } else {
      await rm(path, { recursive: true, force: true });
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Remove multiple items
 */
export async function removeItems(
  items: CleanableItem[],
  dryRun = false,
  onProgress?: (current: number, total: number, item: CleanableItem) => void
): Promise<{ success: number; failed: number; freedSpace: number }> {
  let success = 0;
  let failed = 0;
  let freedSpace = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (onProgress) {
      onProgress(i + 1, items.length, item);
    }

    const removed = await removeItem(item.path, dryRun);

    if (removed) {
      success++;
      freedSpace += item.size;
    } else {
      failed++;
    }
  }

  return { success, failed, freedSpace };
}

/**
 * Create a cleanable item from a path
 */
export async function createCleanableItem(path: string): Promise<CleanableItem | null> {
  try {
    if (!exists(path)) {
      return null;
    }

    const stats = await stat(path);
    const size = await getSize(path);
    const name = path.split('/').pop() || path;

    return {
      path,
      size,
      name,
      isDirectory: stats.isDirectory(),
      modifiedAt: stats.mtime,
    };
  } catch {
    return null;
  }
}

/**
 * Get home directory
 */
export function getHomeDir(): string {
  return homedir();
}

/**
 * Expand ~ to home directory
 */
export function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return path.replace('~', homedir());
  }
  return path;
}
