/**
 * Xcode cache scanner
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { paths } from '../utils/paths.js';
import { exists, getSize } from '../utils/fs.js';

interface XcodeLocation {
  name: string;
  path: string;
  description: string;
  safetyLevel: 'safe' | 'moderate' | 'risky';
}

export class XcodeScanner extends BaseScanner {
  category: Category = {
    id: 'xcode',
    name: 'Xcode Cache',
    group: 'Development',
    description: 'Xcode derived data, device support, and caches',
    safetyLevel: 'moderate',
    safetyNote: 'May need to rebuild projects',
  };

  private locations: XcodeLocation[] = [
    {
      name: 'Derived Data',
      path: paths.xcode.derivedData,
      description: 'Build intermediates and indices',
      safetyLevel: 'safe',
    },
    {
      name: 'Archives',
      path: paths.xcode.archives,
      description: 'Archived builds for distribution',
      safetyLevel: 'risky',
    },
    {
      name: 'iOS Device Support',
      path: paths.xcode.deviceSupport,
      description: 'Debug symbols for connected devices',
      safetyLevel: 'moderate',
    },
    {
      name: 'Simulator Caches',
      path: paths.xcode.simulatorCache,
      description: 'Simulator cache files',
      safetyLevel: 'safe',
    },
    {
      name: 'Module Cache',
      path: paths.xcode.modulesCache,
      description: 'Swift/Clang module caches',
      safetyLevel: 'safe',
    },
    {
      name: 'Previews Cache',
      path: paths.xcode.previewsCache,
      description: 'SwiftUI preview caches',
      safetyLevel: 'safe',
    },
  ];

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];

    for (const location of this.locations) {
      try {
        if (!exists(location.path)) {
          continue;
        }

        const stats = await stat(location.path);
        const size = await getSize(location.path);

        if (size > 0) {
          items.push({
            path: location.path,
            size,
            name: location.name,
            isDirectory: stats.isDirectory(),
            modifiedAt: stats.mtime,
          });
        }
      } catch {
        // Skip if cannot access
      }
    }

    // Also scan for old simulators
    await this.scanOldSimulators(items);

    items.sort((a, b) => b.size - a.size);

    return this.createResult(items);
  }

  private async scanOldSimulators(items: CleanableItem[]): Promise<void> {
    try {
      if (!exists(paths.xcode.simulatorDevices)) {
        return;
      }

      const entries = await readdir(paths.xcode.simulatorDevices);

      for (const entry of entries) {
        if (!entry.match(/^[A-F0-9-]{36}$/)) {
          continue;
        }

        const devicePath = join(paths.xcode.simulatorDevices, entry);
        const dataPath = join(devicePath, 'data');

        try {
          if (exists(dataPath)) {
            const stats = await stat(dataPath);
            const size = await getSize(dataPath);

            if (size > 100 * 1024 * 1024) {
              // > 100MB
              items.push({
                path: dataPath,
                size,
                name: `Simulator Data (${entry.substring(0, 8)})`,
                isDirectory: true,
                modifiedAt: stats.mtime,
              });
            }
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // Skip
    }
  }
}
