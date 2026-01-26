/**
 * Trash scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BaseScanner } from './base.js';
import type {
  Category,
  ScanResult,
  CleanableItem,
  ScannerOptions,
  CleanResult,
} from '../types/index.js';
import { paths } from '../utils/paths.js';
import { exists, getSize, removeItems } from '../utils/fs.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class TrashScanner extends BaseScanner {
  category: Category = {
    id: 'trash',
    name: 'Trash',
    group: 'Storage',
    description: 'Files in Trash',
    safetyLevel: 'safe',
  };

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];

    try {
      if (!exists(paths.trash)) {
        return this.createResult([]);
      }

      const entries = await readdir(paths.trash);

      for (const entry of entries) {
        // Skip .DS_Store
        if (entry === '.DS_Store') {
          continue;
        }

        const entryPath = join(paths.trash, entry);

        try {
          const stats = await stat(entryPath);
          const size = await getSize(entryPath);

          items.push({
            path: entryPath,
            size,
            name: entry,
            isDirectory: stats.isDirectory(),
            modifiedAt: stats.mtime,
          });
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

  async clean(items: CleanableItem[], dryRun = false): Promise<CleanResult> {
    if (dryRun) {
      const totalSize = items.reduce((sum, item) => sum + item.size, 0);
      return {
        category: this.category,
        cleanedItems: items.length,
        freedSpace: totalSize,
        errors: [],
      };
    }

    try {
      // Use AppleScript to empty trash properly
      await execAsync('osascript -e \'tell application "Finder" to empty trash\'');

      const totalSize = items.reduce((sum, item) => sum + item.size, 0);
      return {
        category: this.category,
        cleanedItems: items.length,
        freedSpace: totalSize,
        errors: [],
      };
    } catch (error) {
      // Fallback to manual removal
      const result = await removeItems(items, dryRun);
      return {
        category: this.category,
        cleanedItems: result.success,
        freedSpace: result.freedSpace,
        errors: result.failed > 0 ? [`Failed to remove ${result.failed} items`] : [],
      };
    }
  }
}
