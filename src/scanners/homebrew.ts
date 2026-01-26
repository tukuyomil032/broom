/**
 * Homebrew cache scanner
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

export class HomebrewScanner extends BaseScanner {
  category: Category = {
    id: 'homebrew',
    name: 'Homebrew Cache',
    group: 'Development',
    description: 'Homebrew downloads and logs',
    safetyLevel: 'safe',
  };

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];
    const homebrewPaths = [paths.homebrew.cache, paths.homebrew.logs, paths.homebrew.downloads];

    for (const brewPath of homebrewPaths) {
      try {
        if (!exists(brewPath)) {
          continue;
        }

        const stats = await stat(brewPath);
        const size = await getSize(brewPath);

        if (size > 0) {
          items.push({
            path: brewPath,
            size,
            name: brewPath.includes('Logs') ? 'Homebrew Logs' : 'Homebrew Cache',
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
      // Try using brew cleanup first
      await execAsync('brew cleanup --prune=all 2>/dev/null || true');

      // Then remove remaining items
      const result = await removeItems(items, false);

      return {
        category: this.category,
        cleanedItems: result.success,
        freedSpace: result.freedSpace,
        errors: result.failed > 0 ? [`Failed to remove ${result.failed} items`] : [],
      };
    } catch (error) {
      // Fallback to manual removal
      const result = await removeItems(items, false);
      return {
        category: this.category,
        cleanedItems: result.success,
        freedSpace: result.freedSpace,
        errors: result.failed > 0 ? [`Failed to remove ${result.failed} items`] : [],
      };
    }
  }
}
