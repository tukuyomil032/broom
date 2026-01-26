/**
 * Development cache scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { paths } from '../utils/paths.js';
import { exists, getSize } from '../utils/fs.js';

interface DevTool {
  name: string;
  path: string;
  safeToClean: boolean;
}

export class DevCacheScanner extends BaseScanner {
  category: Category = {
    id: 'dev-cache',
    name: 'Development Cache',
    group: 'Development',
    description: 'Package manager caches (npm, yarn, pip, cargo, etc.)',
    safetyLevel: 'moderate',
    safetyNote: 'May require reinstalling packages',
  };

  private devTools: DevTool[] = [
    { name: 'npm cache', path: paths.devCache.npm, safeToClean: true },
    { name: 'npm _cacache', path: paths.devCache.npmCache, safeToClean: true },
    { name: 'Yarn cache', path: paths.devCache.yarn, safeToClean: true },
    { name: 'pnpm store', path: paths.devCache.pnpm, safeToClean: true },
    { name: 'Bun cache', path: paths.devCache.bun, safeToClean: true },
    { name: 'pip cache', path: paths.devCache.pip, safeToClean: true },
    { name: 'pip cache (alt)', path: paths.devCache.pipCache, safeToClean: true },
    { name: 'Cargo cache', path: paths.devCache.cargo, safeToClean: true },
    { name: 'Rustup downloads', path: paths.devCache.rustup, safeToClean: true },
    { name: 'Go mod cache', path: paths.devCache.go, safeToClean: true },
    { name: 'Gradle caches', path: paths.devCache.gradle, safeToClean: true },
    { name: 'Maven repository', path: paths.devCache.maven, safeToClean: false },
    { name: 'CocoaPods cache', path: paths.devCache.cocoapods, safeToClean: true },
    { name: 'Carthage cache', path: paths.devCache.carthage, safeToClean: true },
    { name: 'Composer cache', path: paths.devCache.composer, safeToClean: true },
  ];

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];

    for (const tool of this.devTools) {
      try {
        if (!exists(tool.path)) {
          continue;
        }

        const stats = await stat(tool.path);
        const size = await getSize(tool.path);

        if (size > 1024 * 1024) {
          // Only include if > 1MB
          items.push({
            path: tool.path,
            size,
            name: tool.name,
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
}
