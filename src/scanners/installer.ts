/**
 * Installer files scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { exists, getSize } from '../utils/fs.js';

export class InstallerScanner extends BaseScanner {
  category: Category = {
    id: 'app-data',
    name: 'Installer Files',
    group: 'Storage',
    description: '.dmg, .pkg, .iso, .xip, .zip files',
    safetyLevel: 'moderate',
    safetyNote: 'Installer files that may no longer be needed',
  };

  private searchPaths = [
    join(homedir(), 'Downloads'),
    join(homedir(), 'Desktop'),
    join(homedir(), 'Documents'),
  ];

  private installerExtensions = ['.dmg', '.pkg', '.mpkg', '.iso', '.xip'];

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];

    for (const searchPath of this.searchPaths) {
      try {
        if (!exists(searchPath)) {
          continue;
        }

        await this.scanDirectory(searchPath, items, 2);
      } catch {
        // Skip if cannot access
      }
    }

    items.sort((a, b) => b.size - a.size);

    return this.createResult(items);
  }

  private async scanDirectory(
    dirPath: string,
    items: CleanableItem[],
    depth: number
  ): Promise<void> {
    if (depth <= 0) {
      return;
    }

    try {
      const entries = await readdir(dirPath);

      for (const entry of entries) {
        // Skip hidden files
        if (entry.startsWith('.')) {
          continue;
        }

        const entryPath = join(dirPath, entry);

        try {
          const stats = await stat(entryPath);

          if (stats.isDirectory()) {
            await this.scanDirectory(entryPath, items, depth - 1);
          } else if (this.isInstallerFile(entry)) {
            const size = stats.size;

            if (size > 1024 * 1024) {
              // > 1MB
              items.push({
                path: entryPath,
                size,
                name: entry,
                isDirectory: false,
                modifiedAt: stats.mtime,
              });
            }
          }
        } catch {
          // Skip if cannot access
        }
      }
    } catch {
      // Skip if cannot access
    }
  }

  private isInstallerFile(filename: string): boolean {
    const lowerName = filename.toLowerCase();
    return this.installerExtensions.some((ext) => lowerName.endsWith(ext));
  }
}
