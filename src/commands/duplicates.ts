/**
 * Duplicates command - Find and remove duplicate files
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { enhanceCommandHelp } from '../utils/help.js';
import { expandPath, formatSize, exists } from '../utils/fs.js';
import {
  printHeader,
  separator,
  success,
  error,
  warning,
  info,
  createSpinner,
  succeedSpinner,
} from '../ui/output.js';
import { readdir, stat, unlink } from 'fs/promises';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';

interface DuplicatesOptions {
  path?: string;
  minSize?: string;
  hash?: 'md5' | 'sha256';
  delete?: boolean;
  interactive?: boolean;
}

interface FileHash {
  path: string;
  size: number;
  hash: string;
}

/**
 * Parse size string (e.g., "1MB", "500KB", "2GB")
 */
function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)(KB|MB|GB)?$/i);

  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`);
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();

  switch (unit) {
    case 'KB':
      return value * 1024;
    case 'MB':
      return value * 1024 * 1024;
    case 'GB':
      return value * 1024 * 1024 * 1024;
    default:
      return value;
  }
}

/**
 * Calculate file hash
 */
async function calculateFileHash(
  filePath: string,
  algorithm: 'md5' | 'sha256' = 'sha256'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm);
    const stream = createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Optimized hash calculation for large files
 */
async function calculateSmartHash(filePath: string, fileSize: number): Promise<string> {
  // For small files (<1MB), use full hash
  if (fileSize < 1024 * 1024) {
    return await calculateFileHash(filePath, 'sha256');
  }

  // For large files, use size + partial hash
  const partialHash = await calculatePartialHash(filePath);
  return `${fileSize}:${partialHash}`;
}

/**
 * Calculate partial hash (first and last 64KB)
 */
async function calculatePartialHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath, {
      start: 0,
      end: 64 * 1024, // First 64KB
    });

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => {
      // Also read last 64KB
      const endStream = createReadStream(filePath, {
        start: -64 * 1024,
      });

      endStream.on('data', (data) => hash.update(data));
      endStream.on('end', () => resolve(hash.digest('hex')));
      endStream.on('error', reject);
    });
    stream.on('error', reject);
  });
}

/**
 * Get all files recursively
 */
async function getAllFiles(
  dirPath: string,
  minSize: number = 0,
  files: string[] = []
): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      // Skip hidden files and system directories
      if (entry.name.startsWith('.')) continue;

      if (entry.isDirectory()) {
        await getAllFiles(fullPath, minSize, files);
      } else if (entry.isFile()) {
        const stats = await stat(fullPath);

        if (stats.size >= minSize) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Skip directories we cannot read
  }

  return files;
}

/**
 * Find duplicates
 */
async function findDuplicates(
  paths: string[],
  minSize: number = 0,
  hashAlgorithm: 'md5' | 'sha256' = 'sha256'
): Promise<Map<string, string[]>> {
  const spinner = createSpinner('Scanning files...');

  // Get all files
  const allFiles: string[] = [];

  for (const path of paths) {
    await getAllFiles(path, minSize, allFiles);
  }

  succeedSpinner(spinner, `Found ${allFiles.length} files`);

  // Group by size first (optimization)
  const sizeGroups = new Map<number, string[]>();

  for (const file of allFiles) {
    const stats = await stat(file);
    const size = stats.size;

    if (!sizeGroups.has(size)) {
      sizeGroups.set(size, []);
    }

    sizeGroups.get(size)!.push(file);
  }

  // Only hash files with duplicate sizes
  const hashSpinner = createSpinner('Calculating hashes...');
  const hashMap = new Map<string, string[]>();
  let processed = 0;

  for (const [size, files] of sizeGroups.entries()) {
    if (files.length > 1) {
      // Multiple files with same size - need to hash
      for (const file of files) {
        const hash = await calculateSmartHash(file, size);

        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }

        hashMap.get(hash)!.push(file);
        processed++;

        if (processed % 10 === 0) {
          hashSpinner.text = `Hashing files... (${processed}/${files.length * sizeGroups.size})`;
        }
      }
    }
  }

  succeedSpinner(hashSpinner, `Hashed ${processed} files`);

  // Return only groups with duplicates
  return new Map([...hashMap.entries()].filter(([_, files]) => files.length > 1));
}

/**
 * Interactive duplicate handler
 */
async function handleDuplicatesInteractive(duplicates: Map<string, string[]>): Promise<void> {
  const { select } = await import('../ui/prompts.js');
  const cwd = process.cwd();

  let groupIndex = 1;

  for (const [hash, files] of duplicates.entries()) {
    console.log();
    console.log(
      chalk.bold(
        `Group ${groupIndex} (${files.length} files, ${formatSize((await stat(files[0])).size)} each):`
      )
    );
    console.log();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const stats = await stat(file);
      const relPath = relative(cwd, file);
      const modTime = new Date(stats.mtime).toLocaleString('ja-JP');

      // Create clickable file link (Cmd+Click in terminal opens in Finder)
      console.log(`  ${i + 1}. ${chalk.cyan.underline(`file://${file}`)}`);
      console.log(`     ${chalk.dim(`└─ ${relPath}`)}`);
      console.log(`     ${chalk.dim(`   Modified: ${modTime}`)}`);
    }

    console.log();

    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { name: 'Keep first, delete others', value: 'delete-others' },
        { name: 'Keep last, delete others', value: 'delete-except-last' },
        { name: 'Skip this group', value: 'skip' },
        { name: 'Hardlink duplicates', value: 'hardlink' },
        { name: 'Exit', value: 'exit' },
      ],
    });

    if (action === 'exit') {
      break;
    }

    if (action === 'skip') {
      groupIndex++;
      continue;
    }

    if (action === 'delete-others') {
      for (let i = 1; i < files.length; i++) {
        await unlink(files[i]);
        console.log(chalk.dim(`  Deleted: ${files[i]}`));
      }
      success(`Kept: ${files[0]}`);
    } else if (action === 'delete-except-last') {
      for (let i = 0; i < files.length - 1; i++) {
        await unlink(files[i]);
        console.log(chalk.dim(`  Deleted: ${files[i]}`));
      }
      success(`Kept: ${files[files.length - 1]}`);
    } else if (action === 'hardlink') {
      // Keep first, hardlink others
      for (let i = 1; i < files.length; i++) {
        await unlink(files[i]);

        const { execSync } = await import('child_process');
        execSync(`ln "${files[0]}" "${files[i]}"`);

        console.log(chalk.dim(`  Hardlinked: ${files[i]} -> ${files[0]}`));
      }
      success('Created hardlinks');
    }

    groupIndex++;
  }
}

/**
 * Validate and get scan path
 */
async function getValidPath(initialPath?: string): Promise<string> {
  const { input } = await import('../ui/prompts.js');

  let path = initialPath ? expandPath(initialPath) : expandPath('~');

  // If path provided via option, validate it
  if (initialPath) {
    const pathExists = await exists(path);
    if (!pathExists) {
      error(`Path does not exist: ${path}`);
      console.log();

      // Prompt for valid path
      while (true) {
        const newPath = await input({
          message: 'Enter a valid path to scan:',
          default: expandPath('~'),
        });

        const expandedPath = expandPath(newPath);
        const pathExists = await exists(expandedPath);

        if (pathExists) {
          path = expandedPath;
          break;
        } else {
          error(`Path does not exist: ${expandedPath}`);
          console.log();
        }
      }
    }
  }

  return path;
}

/**
 * Execute duplicates command
 */
export async function duplicatesCommand(options: DuplicatesOptions): Promise<void> {
  const path = await getValidPath(options.path);
  const paths = [path];
  const minSize = options.minSize ? parseSize(options.minSize) : 1024 * 1024; // Default 1MB
  const hashAlgorithm = options.hash || 'sha256';

  printHeader('🔍 Duplicate File Finder');

  console.log(chalk.dim(`Scanning: ${paths.join(', ')}`));
  console.log(chalk.dim(`Min size: ${formatSize(minSize)}`));
  console.log(chalk.dim(`Hash algorithm: ${hashAlgorithm}`));
  console.log();

  const duplicates = await findDuplicates(paths, minSize, hashAlgorithm);

  if (duplicates.size === 0) {
    success('No duplicates found!');
    return;
  }

  // Calculate potential space savings
  let totalSavings = 0;

  for (const [_, files] of duplicates.entries()) {
    const fileSize = (await stat(files[0])).size;
    totalSavings += fileSize * (files.length - 1);
  }

  console.log();
  separator();
  console.log();

  console.log(chalk.bold('📊 Summary:'));
  console.log(`  Duplicate groups: ${duplicates.size}`);
  console.log(`  Potential savings: ${chalk.yellow(formatSize(totalSavings))}`);
  console.log();

  if (options.interactive || options.delete) {
    await handleDuplicatesInteractive(duplicates);
  } else {
    // Just list duplicates with details
    const cwd = process.cwd();
    let groupIndex = 1;

    for (const [_, files] of duplicates.entries()) {
      const fileSize = (await stat(files[0])).size;
      console.log(
        chalk.bold(`Group ${groupIndex} (${files.length} files, ${formatSize(fileSize)} each):`)
      );
      console.log();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const stats = await stat(file);
        const relPath = relative(cwd, file);
        const modTime = new Date(stats.mtime).toLocaleString('ja-JP');

        // Create clickable file link
        console.log(`  ${i + 1}. ${chalk.cyan.underline(`file://${file}`)}`);
        console.log(`     ${chalk.dim(`└─ ${relPath}`)}`);
        console.log(`     ${chalk.dim(`   Modified: ${modTime}`)}`);
      }

      console.log();
      groupIndex++;
    }

    console.log(chalk.dim('Use --interactive to select which files to keep/delete'));
  }
}

/**
 * Create duplicates command
 */
export function createDuplicatesCommand(): Command {
  const cmd = new Command('duplicates')
    .description('Find and remove duplicate files')
    .option('-p, --path <path>', 'Path to scan (default: home directory)')
    .option('--min-size <size>', 'Minimum file size (e.g., 1MB, 500KB)', '1MB')
    .option('--hash <algorithm>', 'Hash algorithm (md5 or sha256)', 'sha256')
    .option('-i, --interactive', 'Interactive mode to choose which files to delete')
    .option('-d, --delete', 'Automatically delete duplicates (keep first)')
    .action(async (options) => {
      await duplicatesCommand(options);
    });

  return enhanceCommandHelp(cmd);
}
