/**
 * Backup/Restore command - Safe file deletion with backup
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { enhanceCommandHelp } from '../utils/help.js';
import { expandPath, formatSize, exists } from '../utils/fs.js';
import { printHeader, separator, success, error, warning, info } from '../ui/output.js';
import { mkdir, readFile, writeFile, unlink, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

const BACKUP_DIR = expandPath('~/.config/broom/backups');
const METADATA_FILE = expandPath('~/.config/broom/backups/metadata.json');
const DEFAULT_RETENTION_DAYS = 7;

interface BackupMetadata {
  id: string;
  timestamp: Date;
  files: string[];
  totalSize: number;
  expiresAt: Date;
  description: string;
}

interface BackupOptions {
  list?: boolean;
  clean?: boolean;
  retention?: number;
}

interface RestoreOptions {
  backupId?: string;
  list?: boolean;
}

/**
 * Load backup metadata
 */
async function loadMetadata(): Promise<Map<string, BackupMetadata>> {
  const metadataMap = new Map<string, BackupMetadata>();

  try {
    if (exists(METADATA_FILE)) {
      const content = await readFile(METADATA_FILE, 'utf-8');
      const data = JSON.parse(content) as Record<string, any>;

      for (const [id, meta] of Object.entries(data)) {
        metadataMap.set(id, {
          ...meta,
          timestamp: new Date(meta.timestamp),
          expiresAt: new Date(meta.expiresAt),
        } as BackupMetadata);
      }
    }
  } catch {
    // Return empty map if cannot read
  }

  return metadataMap;
}

/**
 * Save backup metadata
 */
async function saveMetadata(metadataMap: Map<string, BackupMetadata>): Promise<void> {
  const data: Record<string, any> = {};

  for (const [id, meta] of metadataMap.entries()) {
    data[id] = meta;
  }

  await mkdir(join(BACKUP_DIR, '..'), { recursive: true });
  await writeFile(METADATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Create a backup
 */
export async function createBackup(
  filePaths: string[],
  description: string = 'Manual backup'
): Promise<string> {
  const backupId = `backup-${Date.now()}`;
  const backupPath = join(BACKUP_DIR, `${backupId}.tar.gz`);

  // Ensure backup directory exists
  await mkdir(BACKUP_DIR, { recursive: true });

  // Create tar.gz archive
  const filesList = filePaths.map((p) => `"${p}"`).join(' ');

  try {
    execSync(`tar -czf "${backupPath}" ${filesList} 2>/dev/null`, {
      cwd: expandPath('~'),
    });
  } catch (err) {
    throw new Error(`Failed to create backup: ${err}`);
  }

  // Calculate backup size
  const stats = await stat(backupPath);
  const totalSize = stats.size;

  // Save metadata
  const metadata: BackupMetadata = {
    id: backupId,
    timestamp: new Date(),
    files: filePaths,
    totalSize,
    expiresAt: new Date(Date.now() + DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000),
    description,
  };

  const metadataMap = await loadMetadata();
  metadataMap.set(backupId, metadata);
  await saveMetadata(metadataMap);

  return backupId;
}

/**
 * List backups
 */
async function listBackups(): Promise<void> {
  printHeader('📦 Backup List');

  const metadataMap = await loadMetadata();

  if (metadataMap.size === 0) {
    warning('No backups found');
    return;
  }

  // Sort by timestamp (newest first)
  const backups = Array.from(metadataMap.values()).sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  console.log();

  for (const backup of backups) {
    const isExpired = new Date() > backup.expiresAt;
    const age = Math.floor((Date.now() - backup.timestamp.getTime()) / (1000 * 60 * 60 * 24));

    console.log(chalk.bold(`ID: ${backup.id}`));
    console.log(`  Description: ${backup.description}`);
    console.log(`  Created: ${backup.timestamp.toLocaleString()} (${age} days ago)`);
    console.log(`  Size: ${formatSize(backup.totalSize)}`);
    console.log(`  Files: ${backup.files.length}`);

    if (isExpired) {
      console.log(chalk.red('  Status: Expired'));
    } else {
      const daysLeft = Math.floor(
        (backup.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      console.log(chalk.green(`  Status: Active (${daysLeft} days left)`));
    }

    console.log();
  }

  separator();
  console.log();
  console.log(chalk.dim('Use "broom restore <backup-id>" to restore a backup'));
  console.log(chalk.dim('Use "broom backup --clean" to remove expired backups'));
}

/**
 * Clean expired backups
 */
async function cleanExpiredBackups(): Promise<void> {
  printHeader('🧹 Cleaning Expired Backups');

  const metadataMap = await loadMetadata();
  const now = new Date();
  let removedCount = 0;
  let freedSpace = 0;

  for (const [id, meta] of metadataMap.entries()) {
    if (now > meta.expiresAt) {
      const backupPath = join(BACKUP_DIR, `${id}.tar.gz`);

      if (exists(backupPath)) {
        const stats = await stat(backupPath);
        freedSpace += stats.size;

        await unlink(backupPath);
        metadataMap.delete(id);
        removedCount++;

        console.log(chalk.dim(`Removed: ${id} (${formatSize(stats.size)})`));
      }
    }
  }

  await saveMetadata(metadataMap);

  console.log();

  if (removedCount > 0) {
    success(`Removed ${removedCount} expired backup(s), freed ${formatSize(freedSpace)}`);
  } else {
    info('No expired backups to remove');
  }
}

/**
 * Restore a backup
 */
async function restoreBackup(backupId: string): Promise<void> {
  printHeader(`📦 Restoring Backup: ${backupId}`);

  const metadataMap = await loadMetadata();
  const metadata = metadataMap.get(backupId);

  if (!metadata) {
    error(`Backup not found: ${backupId}`);
    return;
  }

  const backupPath = join(BACKUP_DIR, `${backupId}.tar.gz`);

  if (!exists(backupPath)) {
    error(`Backup file not found: ${backupPath}`);
    return;
  }

  console.log();
  console.log(chalk.bold('Backup Information:'));
  console.log(`  Created: ${metadata.timestamp.toLocaleString()}`);
  console.log(`  Files: ${metadata.files.length}`);
  console.log(`  Size: ${formatSize(metadata.totalSize)}`);
  console.log();

  // Ask for confirmation
  const { confirm } = await import('../ui/prompts.js');
  const shouldRestore = await confirm({ message: 'Restore this backup?' });

  if (!shouldRestore) {
    warning('Restore cancelled');
    return;
  }

  console.log();
  info('Restoring files...');

  try {
    // Extract to home directory
    execSync(`tar -xzf "${backupPath}" -C "${expandPath('~')}"`, {
      stdio: 'inherit',
    });

    success('Backup restored successfully!');
    console.log();
    console.log(chalk.dim('Restored files:'));

    for (const file of metadata.files) {
      console.log(chalk.dim(`  - ${file}`));
    }
  } catch (err) {
    error(`Failed to restore backup: ${err}`);
  }
}

/**
 * Execute backup command
 */
export async function backupCommand(options: BackupOptions): Promise<void> {
  if (options.list) {
    await listBackups();
    return;
  }

  if (options.clean) {
    await cleanExpiredBackups();
    return;
  }

  // Show help
  printHeader('📦 Backup Management');
  console.log();
  console.log(chalk.bold('Usage:'));
  console.log('  broom backup --list         List all backups');
  console.log('  broom backup --clean        Remove expired backups');
  console.log('  broom restore <backup-id>   Restore a specific backup');
  console.log('  broom restore --list        List restorable backups');
  console.log();
  console.log(chalk.dim('Backups are automatically created when using --backup flag with clean'));
  console.log(chalk.dim(`Default retention period: ${DEFAULT_RETENTION_DAYS} days`));
}

/**
 * Execute restore command
 */
export async function restoreCommand(options: RestoreOptions, backupId?: string): Promise<void> {
  if (options.list || !backupId) {
    await listBackups();
    return;
  }

  await restoreBackup(backupId);
}

/**
 * Create backup command
 */
export function createBackupCommand(): Command {
  const cmd = new Command('backup')
    .description('Manage file backups')
    .option('-l, --list', 'List all backups')
    .option('-c, --clean', 'Remove expired backups')
    .option('-r, --retention <days>', 'Set retention period in days', parseInt)
    .action(async (options) => {
      await backupCommand(options);
    });

  return enhanceCommandHelp(cmd);
}

/**
 * Create restore command
 */
export function createRestoreCommand(): Command {
  const cmd = new Command('restore')
    .description('Restore files from backup')
    .argument('[backup-id]', 'Backup ID to restore')
    .option('-l, --list', 'List restorable backups')
    .action(async (backupId, options) => {
      await restoreCommand(options, backupId);
    });

  return enhanceCommandHelp(cmd);
}
