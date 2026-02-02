/**
 * User cache scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { paths } from '../utils/paths.js';
import { exists, getSize, isExcludedPath } from '../utils/fs.js';

export class UserCacheScanner extends BaseScanner {
  category: Category = {
    id: 'user-cache',
    name: 'User Cache',
    group: 'System Junk',
    description: 'Application caches in ~/Library/Caches',
    safetyLevel: 'safe',
  };

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];

    try {
      if (!exists(paths.userCache)) {
        return this.createResult([]);
      }

      const entries = await readdir(paths.userCache);

      for (const entry of entries) {
        // Skip Apple system caches
        if (entry.startsWith('com.apple.')) {
          continue;
        }

        const entryPath = join(paths.userCache, entry);

        // Skip excluded paths (iCloud Drive, etc.)
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
