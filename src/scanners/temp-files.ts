/**
 * Temporary files scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { paths } from '../utils/paths.js';
import { exists, getSize } from '../utils/fs.js';

export class TempFilesScanner extends BaseScanner {
  category: Category = {
    id: 'temp-files',
    name: 'Temporary Files',
    group: 'System Junk',
    description: 'System and user temporary files',
    safetyLevel: 'safe',
  };

  private tempPaths = Object.values(paths.tempFiles);

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];

    for (const tempPath of this.tempPaths) {
      try {
        if (!exists(tempPath)) {
          continue;
        }

        const entries = await readdir(tempPath);

        for (const entry of entries) {
          // Skip important system files
          if (entry.startsWith('.') || entry === 'com.apple.launchd') {
            continue;
          }

          const entryPath = join(tempPath, entry);

          try {
            const stats = await stat(entryPath);

            // Only include files older than 1 day
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);

            if (stats.mtime < oneDayAgo) {
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
            }
          } catch {
            // Skip if cannot access
          }
        }
      } catch {
        // Skip if cannot access directory
      }
    }

    items.sort((a, b) => b.size - a.size);

    return this.createResult(items);
  }
}
