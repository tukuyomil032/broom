/**
 * User logs scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { paths } from '../utils/paths.js';
import { exists, getSize } from '../utils/fs.js';

export class UserLogsScanner extends BaseScanner {
  category: Category = {
    id: 'user-logs',
    name: 'User Logs',
    group: 'System Junk',
    description: 'Application logs in ~/Library/Logs',
    safetyLevel: 'safe',
  };

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];

    try {
      if (!exists(paths.userLogs)) {
        return this.createResult([]);
      }

      const entries = await readdir(paths.userLogs);

      for (const entry of entries) {
        const entryPath = join(paths.userLogs, entry);

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

      items.sort((a, b) => b.size - a.size);

      return this.createResult(items);
    } catch (error) {
      return this.createResult([], (error as Error).message);
    }
  }
}
