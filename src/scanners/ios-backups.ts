/**
 * iOS Backups scanner
 */
import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { paths } from '../utils/paths.js';
import { exists, getSize } from '../utils/fs.js';

interface BackupInfo {
  deviceName?: string;
  lastBackup?: Date;
}

export class IosBackupsScanner extends BaseScanner {
  category: Category = {
    id: 'ios-backups',
    name: 'iOS Backups',
    group: 'Storage',
    description: 'Local iPhone/iPad backup files',
    safetyLevel: 'risky',
    safetyNote: 'Backup data cannot be recovered after deletion',
  };

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];

    try {
      if (!exists(paths.iosBackups)) {
        return this.createResult([]);
      }

      const entries = await readdir(paths.iosBackups);

      for (const entry of entries) {
        // Skip .DS_Store
        if (entry.startsWith('.')) {
          continue;
        }

        const backupPath = join(paths.iosBackups, entry);

        try {
          const stats = await stat(backupPath);

          if (!stats.isDirectory()) {
            continue;
          }

          const size = await getSize(backupPath);
          const info = await this.getBackupInfo(backupPath);

          const name = info.deviceName
            ? `${info.deviceName} Backup`
            : `iOS Backup (${entry.substring(0, 8)})`;

          items.push({
            path: backupPath,
            size,
            name,
            isDirectory: true,
            modifiedAt: info.lastBackup || stats.mtime,
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

  private async getBackupInfo(backupPath: string): Promise<BackupInfo> {
    try {
      const infoPath = join(backupPath, 'Info.plist');

      if (!exists(infoPath)) {
        return {};
      }

      const content = await readFile(infoPath, 'utf-8');

      // Parse plist to get device name
      const nameMatch = content.match(/<key>Device Name<\/key>\s*<string>([^<]+)<\/string>/);
      const dateMatch = content.match(/<key>Last Backup Date<\/key>\s*<date>([^<]+)<\/date>/);

      return {
        deviceName: nameMatch?.[1],
        lastBackup: dateMatch?.[1] ? new Date(dateMatch[1]) : undefined,
      };
    } catch {
      return {};
    }
  }
}
