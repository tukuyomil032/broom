/**
 * iOS device logs scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { exists, getSize, isExcludedPath } from '../utils/fs.js';

export class IosDeviceLogsScanner extends BaseScanner {
  category: Category = {
    id: 'ios-device-logs',
    name: 'iOS Device Logs',
    group: 'Development',
    description: 'Logs from connected iOS devices',
    safetyLevel: 'safe',
  };

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];
    const iosLogsPath = join(homedir(), 'Library/Developer/Xcode/iOS Device Logs');

    try {
      if (!exists(iosLogsPath)) {
        return this.createResult([]);
      }

      this.trackDirectory(iosLogsPath);

      const entries = await readdir(iosLogsPath);

      for (const entry of entries) {
        const entryPath = join(iosLogsPath, entry);

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
