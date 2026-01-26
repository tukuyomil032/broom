/**
 * Node modules scanner (project artifacts)
 */
import { readdir, stat, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { BaseScanner } from './base.js';
import type { Category, ScanResult, CleanableItem, ScannerOptions } from '../types/index.js';
import { getSize } from '../utils/fs.js';
import fg from 'fast-glob';

export class NodeModulesScanner extends BaseScanner {
  category: Category = {
    id: 'node-modules',
    name: 'Node Modules',
    group: 'Development',
    description: 'node_modules directories in projects',
    safetyLevel: 'moderate',
    safetyNote: 'Can be reinstalled with npm/yarn/pnpm install',
  };

  private defaultSearchPaths = [
    join(homedir(), 'Projects'),
    join(homedir(), 'Developer'),
    join(homedir(), 'Code'),
    join(homedir(), 'Documents'),
    join(homedir(), 'Desktop'),
  ];

  async scan(options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];
    const minSize = options?.minSize ?? 10 * 1024 * 1024; // 10MB default

    // Find all node_modules directories
    for (const searchPath of this.defaultSearchPaths) {
      try {
        await access(searchPath);

        // Use fast-glob to find node_modules
        const nodeModulesDirs = await fg('**/node_modules', {
          cwd: searchPath,
          onlyDirectories: true,
          deep: 5,
          followSymbolicLinks: false,
          ignore: ['**/node_modules/**/node_modules'], // Don't scan nested node_modules
        });

        for (const relPath of nodeModulesDirs) {
          const fullPath = join(searchPath, relPath);

          try {
            const stats = await stat(fullPath);
            const size = await getSize(fullPath);

            if (size >= minSize) {
              // Get project name from parent directory
              const projectPath = fullPath.replace('/node_modules', '');
              const projectName = projectPath.split('/').pop() || 'Unknown';

              items.push({
                path: fullPath,
                size,
                name: `${projectName}/node_modules`,
                isDirectory: true,
                modifiedAt: stats.mtime,
              });
            }
          } catch {
            // Skip if cannot access
          }
        }
      } catch {
        // Search path doesn't exist
      }
    }

    items.sort((a, b) => b.size - a.size);

    // Limit to top 100 to avoid overwhelming the user
    return this.createResult(items.slice(0, 100));
  }
}
