/**
 * System temporary files scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { exists, getSize, isExcludedPath } from '../utils/fs.js';

const DAYS_OLD_THRESHOLD = 7;

export class SystemTempScanner extends BaseScanner {
  category: Category = {
    id: 'system-temp',
    name: 'System Temp',
    group: 'System Junk',
    description: 'System temporary files older than 7 days (requires sudo)',
    safetyLevel: 'safe',
  };

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];
    const tempPaths = ['/private/tmp', '/private/var/tmp'];
    const daysOld = _options?.daysOld || DAYS_OLD_THRESHOLD;

    try {
      const now = Date.now();
      const cutoffTime = now - daysOld * 24 * 60 * 60 * 1000;

      for (const tempPath of tempPaths) {
        if (!exists(tempPath)) {
          continue;
        }

        this.trackDirectory(tempPath);

        const entries = await readdir(tempPath);

        for (const entry of entries) {
          const entryPath = join(tempPath, entry);

          // Skip excluded paths
          if (isExcludedPath(entryPath)) {
            continue;
          }

          try {
            const stats = await stat(entryPath);

            // Only include files older than threshold
            if (stats.mtime.getTime() > cutoffTime) {
              continue;
            }

            const size = await getSize(entryPath);

            if (size > 0) {
              items.push({
                path: entryPath,
                size,
                name: entry,
                isDirectory: stats.isDirectory(),
                modifiedAt: stats.mtime,
              });
            }
          } catch {
            // Skip if cannot access
          }
        }
      }

      // Sort by size descending
      items.sort((a, b) => b.size - a.size);

      return this.createResult(items);
    } catch (error) {
      return this.createResult([], (error as Error).message);
    }
  }
}
