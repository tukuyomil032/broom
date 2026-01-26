/**
 * Browser cache scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { paths } from '../utils/paths.js';
import { exists, getSize } from '../utils/fs.js';

interface BrowserLocation {
  name: string;
  paths: string[];
}

export class BrowserCacheScanner extends BaseScanner {
  category: Category = {
    id: 'browser-cache',
    name: 'Browser Cache',
    group: 'Browsers',
    description: 'Cache from Chrome, Safari, Firefox, Edge, Brave, Arc',
    safetyLevel: 'safe',
  };

  private browsers: BrowserLocation[] = [
    {
      name: 'Chrome',
      paths: [paths.browserCache.chrome, paths.browserCache.chromeProfile],
    },
    {
      name: 'Safari',
      paths: [paths.browserCache.safari],
    },
    {
      name: 'Firefox',
      paths: [paths.browserCache.firefox],
    },
    {
      name: 'Edge',
      paths: [paths.browserCache.edge, paths.browserCache.edgeProfile],
    },
    {
      name: 'Brave',
      paths: [paths.browserCache.brave, paths.browserCache.braveProfile],
    },
    {
      name: 'Arc',
      paths: [paths.browserCache.arc, paths.browserCache.arcProfile],
    },
  ];

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];

    for (const browser of this.browsers) {
      for (const browserPath of browser.paths) {
        try {
          if (!exists(browserPath)) {
            continue;
          }

          // Check if it's a directory that contains cache
          const stats = await stat(browserPath);

          if (stats.isDirectory()) {
            const entries = await readdir(browserPath);

            // Look for cache-related directories
            const cachePatterns = ['Cache', 'cache', 'GPUCache', 'ShaderCache', 'Code Cache'];

            for (const entry of entries) {
              if (cachePatterns.some((p) => entry.includes(p)) || entry === 'Cache') {
                const entryPath = join(browserPath, entry);
                const entryStats = await stat(entryPath);
                const size = await getSize(entryPath);

                if (size > 0) {
                  items.push({
                    path: entryPath,
                    size,
                    name: `${browser.name} - ${entry}`,
                    isDirectory: entryStats.isDirectory(),
                    modifiedAt: entryStats.mtime,
                  });
                }
              }
            }

            // Also add the main cache directory if it's not too nested
            if (browserPath.includes('Cache')) {
              const size = await getSize(browserPath);
              if (size > 0) {
                items.push({
                  path: browserPath,
                  size,
                  name: `${browser.name} Cache`,
                  isDirectory: true,
                  modifiedAt: stats.mtime,
                });
              }
            }
          }
        } catch {
          // Skip if cannot access
        }
      }
    }

    // Remove duplicates (prefer larger paths)
    const uniqueItems = this.deduplicateItems(items);

    uniqueItems.sort((a, b) => b.size - a.size);

    return this.createResult(uniqueItems);
  }

  private deduplicateItems(items: CleanableItem[]): CleanableItem[] {
    const seen = new Map<string, CleanableItem>();

    for (const item of items) {
      const existing = seen.get(item.path);
      if (!existing || item.size > existing.size) {
        seen.set(item.path, item);
      }
    }

    return Array.from(seen.values());
  }
}
