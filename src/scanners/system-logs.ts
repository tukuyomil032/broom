/**
 * System logs scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { exists, getSize, isExcludedPath } from '../utils/fs.js';

const DAYS_OLD_THRESHOLD = 30;

export class SystemLogsScanner extends BaseScanner {
  category: Category = {
    id: 'system-logs',
    name: 'System Logs',
    group: 'System Junk',
    description: 'System log files older than 30 days (requires sudo)',
    safetyLevel: 'safe',
  };

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];
    const systemLogsPath = '/private/var/log';
    const daysOld = _options?.daysOld || DAYS_OLD_THRESHOLD;

    try {
      if (!exists(systemLogsPath)) {
        return this.createResult([]);
      }

      this.trackDirectory(systemLogsPath);

      const entries = await readdir(systemLogsPath);
      const now = Date.now();
      const cutoffTime = now - daysOld * 24 * 60 * 60 * 1000;

      for (const entry of entries) {
        // Only scan .log, .gz, and .asl files
        if (!entry.match(/\.(log|gz|asl)$/)) {
          continue;
        }

        const entryPath = join(systemLogsPath, entry);

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

      // Sort by size descending
      items.sort((a, b) => b.size - a.size);

      return this.createResult(items);
    } catch (error) {
      return this.createResult([], (error as Error).message);
    }
  }
}
