/**
 * System cache scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { exists, getSize, isExcludedPath } from '../utils/fs.js';

export class SystemCacheScanner extends BaseScanner {
  category: Category = {
    id: 'system-cache',
    name: 'System Cache',
    group: 'System Junk',
    description: 'System-level caches in /Library/Caches (requires sudo)',
    safetyLevel: 'moderate',
    safetyNote: 'May require system restart for some services',
  };

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];
    const systemCachePath = '/Library/Caches';

    try {
      if (!exists(systemCachePath)) {
        return this.createResult([]);
      }

      this.trackDirectory(systemCachePath);

      const entries = await readdir(systemCachePath);

      for (const entry of entries) {
        // Skip Apple system caches
        if (entry.startsWith('com.apple.')) {
          continue;
        }

        const entryPath = join(systemCachePath, entry);

        // Skip excluded paths
        if (isExcludedPath(entryPath)) {
          continue;
        }

        try {
          const stats = await stat(entryPath);
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
