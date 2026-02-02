/**
 * Downloads scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { paths } from '../utils/paths.js';
import { exists, getSize, isExcludedPath } from '../utils/fs.js';

export class DownloadsScanner extends BaseScanner {
  category: Category = {
    id: 'downloads',
    name: 'Old Downloads',
    group: 'Storage',
    description: 'Files in Downloads folder older than 30 days',
    safetyLevel: 'risky',
    safetyNote: 'Review files before deleting',
  };

  async scan(options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];
    const daysOld = options?.daysOld ?? 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      if (!exists(paths.downloads)) {
        return this.createResult([]);
      }

      const entries = await readdir(paths.downloads);

      for (const entry of entries) {
        // Skip hidden files and .localized
        if (entry.startsWith('.')) {
          continue;
        }

        const entryPath = join(paths.downloads, entry);

        // Skip excluded paths (iCloud Drive, etc.)
        if (isExcludedPath(entryPath)) {
          continue;
        }

        try {
          const stats = await stat(entryPath);

          // Only include files older than cutoff
          if (stats.mtime < cutoffDate) {
            const size = await getSize(entryPath);

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

      items.sort((a, b) => b.size - a.size);

      return this.createResult(items);
    } catch (error) {
      return this.createResult([], (error as Error).message);
    }
  }
}
