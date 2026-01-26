/**
 * Scanners module - exports all scanners and utilities
 */
import type { Scanner, ScanSummary, ScanResult } from '../types/index.js';
import { UserCacheScanner } from './user-cache.js';
import { UserLogsScanner } from './user-logs.js';
import { TrashScanner } from './trash.js';
import { BrowserCacheScanner } from './browser-cache.js';
import { DevCacheScanner } from './dev-cache.js';
import { XcodeScanner } from './xcode.js';
import { DownloadsScanner } from './downloads.js';
import { HomebrewScanner } from './homebrew.js';
import { DockerScanner } from './docker.js';
import { IosBackupsScanner } from './ios-backups.js';
import { TempFilesScanner } from './temp-files.js';
import { NodeModulesScanner } from './node-modules.js';
import { InstallerScanner } from './installer.js';
import pLimit from 'p-limit';

// All available scanners
const scanners: Scanner[] = [
  new UserCacheScanner(),
  new UserLogsScanner(),
  new TrashScanner(),
  new BrowserCacheScanner(),
  new DevCacheScanner(),
  new XcodeScanner(),
  new DownloadsScanner(),
  new HomebrewScanner(),
  new DockerScanner(),
  new IosBackupsScanner(),
  new TempFilesScanner(),
  new NodeModulesScanner(),
  new InstallerScanner(),
];

/**
 * Get all scanners
 */
export function getAllScanners(): Scanner[] {
  return scanners;
}

/**
 * Get scanner by category ID
 */
export function getScanner(categoryId: string): Scanner | undefined {
  return scanners.find((s) => s.category.id === categoryId);
}

/**
 * Run all scanners
 */
export async function runAllScans(options?: {
  parallel?: boolean;
  concurrency?: number;
  onProgress?: (completed: number, total: number, scanner: Scanner) => void;
}): Promise<ScanSummary> {
  const { parallel = true, concurrency = 4, onProgress } = options || {};

  const results: ScanResult[] = [];
  let completed = 0;

  if (parallel) {
    const limit = pLimit(concurrency);

    const promises = scanners.map((scanner) =>
      limit(async () => {
        const result = await scanner.scan();
        completed++;
        onProgress?.(completed, scanners.length, scanner);
        return result;
      })
    );

    const scanResults = await Promise.all(promises);
    results.push(...scanResults);
  } else {
    for (const scanner of scanners) {
      const result = await scanner.scan();
      results.push(result);
      completed++;
      onProgress?.(completed, scanners.length, scanner);
    }
  }

  const totalSize = results.reduce((sum, r) => sum + r.totalSize, 0);
  const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);

  return {
    results,
    totalSize,
    totalItems,
  };
}

/**
 * Run specific scanners
 */
export async function runScans(
  categoryIds: string[],
  options?: {
    parallel?: boolean;
    concurrency?: number;
    onProgress?: (completed: number, total: number, scanner: Scanner) => void;
  }
): Promise<ScanSummary> {
  const selectedScanners = scanners.filter((s) => categoryIds.includes(s.category.id));

  const { parallel = true, concurrency = 4, onProgress } = options || {};

  const results: ScanResult[] = [];
  let completed = 0;

  if (parallel) {
    const limit = pLimit(concurrency);

    const promises = selectedScanners.map((scanner) =>
      limit(async () => {
        const result = await scanner.scan();
        completed++;
        onProgress?.(completed, selectedScanners.length, scanner);
        return result;
      })
    );

    const scanResults = await Promise.all(promises);
    results.push(...scanResults);
  } else {
    for (const scanner of selectedScanners) {
      const result = await scanner.scan();
      results.push(result);
      completed++;
      onProgress?.(completed, selectedScanners.length, scanner);
    }
  }

  const totalSize = results.reduce((sum, r) => sum + r.totalSize, 0);
  const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);

  return {
    results,
    totalSize,
    totalItems,
  };
}

// Export individual scanners
export { UserCacheScanner } from './user-cache.js';
export { UserLogsScanner } from './user-logs.js';
export { TrashScanner } from './trash.js';
export { BrowserCacheScanner } from './browser-cache.js';
export { DevCacheScanner } from './dev-cache.js';
export { XcodeScanner } from './xcode.js';
export { DownloadsScanner } from './downloads.js';
export { HomebrewScanner } from './homebrew.js';
export { DockerScanner } from './docker.js';
export { IosBackupsScanner } from './ios-backups.js';
export { TempFilesScanner } from './temp-files.js';
export { NodeModulesScanner } from './node-modules.js';
export { InstallerScanner } from './installer.js';
export { BaseScanner } from './base.js';
