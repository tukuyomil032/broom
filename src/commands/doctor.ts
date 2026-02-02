/**
 * Doctor command - System health diagnostics
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { enhanceCommandHelp } from '../utils/help.js';
import { execSync } from 'child_process';
import { expandPath, exists, formatSize } from '../utils/fs.js';
import { printHeader, separator, warning, success, error, info } from '../ui/output.js';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  recommendation?: string;
  value?: string;
}

interface DoctorOptions {
  verbose?: boolean;
}

/**
 * Check disk usage
 */
async function checkDiskUsage(): Promise<HealthCheck> {
  try {
    const output = execSync("df -k / | tail -1 | awk '{print $2, $3, $4, $5}'").toString().trim();
    const [total, used, free, percentStr] = output.split(' ');
    const percent = parseInt(percentStr);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = `Disk usage: ${percent}%`;
    let recommendation: string | undefined;

    if (percent >= 90) {
      status = 'critical';
      recommendation = 'Critically low disk space! Run "broom clean" immediately';
    } else if (percent >= 80) {
      status = 'warning';
      recommendation = 'Disk space running low. Consider cleaning up';
    }

    return {
      name: 'Disk Usage',
      status,
      message,
      recommendation,
      value: `${formatSize(parseInt(used) * 1024)} / ${formatSize(parseInt(total) * 1024)}`,
    };
  } catch {
    return {
      name: 'Disk Usage',
      status: 'warning',
      message: 'Unable to check disk usage',
    };
  }
}

/**
 * Find large files (>1GB)
 */
async function checkLargeFiles(): Promise<HealthCheck> {
  try {
    const homePath = expandPath('~');
    const output = execSync(
      `find "${homePath}" -type f -size +1G 2>/dev/null | head -20`
    ).toString();
    const files = output
      .trim()
      .split('\n')
      .filter((f) => f);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = 'No large files found';
    let recommendation: string | undefined;

    if (files.length > 0) {
      status = files.length > 10 ? 'warning' : 'healthy';
      message = `${files.length} files larger than 1GB`;
      if (files.length > 10) {
        recommendation = 'Review and clean up large files';
      }
    }

    return {
      name: 'Large Files',
      status,
      message,
      recommendation,
      value: files.length > 0 ? `${files.length} files` : undefined,
    };
  } catch {
    return {
      name: 'Large Files',
      status: 'healthy',
      message: 'No large files detected',
    };
  }
}

/**
 * Check for broken symlinks
 */
async function checkBrokenSymlinks(): Promise<HealthCheck> {
  try {
    const homePath = expandPath('~');
    const output = execSync(
      `find "${homePath}" -type l ! -exec test -e {} \\; -print 2>/dev/null | head -50`
    ).toString();
    const brokenLinks = output
      .trim()
      .split('\n')
      .filter((f) => f);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = 'No broken symlinks';
    let recommendation: string | undefined;

    if (brokenLinks.length > 0) {
      status = brokenLinks.length > 10 ? 'warning' : 'healthy';
      message = `${brokenLinks.length} broken symlinks detected`;
      if (brokenLinks.length > 10) {
        recommendation = 'Clean up broken symlinks';
      }
    }

    return {
      name: 'Broken Symlinks',
      status,
      message,
      recommendation,
      value: brokenLinks.length > 0 ? `${brokenLinks.length} links` : undefined,
    };
  } catch {
    return {
      name: 'Broken Symlinks',
      status: 'healthy',
      message: 'No broken symlinks found',
    };
  }
}

/**
 * Check for old files (not accessed in 1 year)
 */
async function checkOldFiles(): Promise<HealthCheck> {
  try {
    const homePath = expandPath('~');
    const output = execSync(
      `find "${homePath}/Downloads" "${homePath}/Documents" -type f -atime +365 2>/dev/null | head -100`
    ).toString();
    const oldFiles = output
      .trim()
      .split('\n')
      .filter((f) => f);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = 'No old files found';
    let recommendation: string | undefined;

    if (oldFiles.length > 0) {
      status = oldFiles.length > 50 ? 'warning' : 'healthy';
      message = `${oldFiles.length}+ files not accessed in 1 year`;
      if (oldFiles.length > 50) {
        recommendation = 'Consider archiving or removing old files';
      }
    }

    return {
      name: 'Old Files',
      status,
      message,
      recommendation,
      value: oldFiles.length > 0 ? `${oldFiles.length}+ files` : undefined,
    };
  } catch {
    return {
      name: 'Old Files',
      status: 'healthy',
      message: 'No old files detected',
    };
  }
}

/**
 * Check common cache directories
 */
async function checkCacheSizes(): Promise<HealthCheck> {
  const cachePaths = [
    expandPath('~/Library/Caches'),
    expandPath('~/Library/Logs'),
    expandPath('~/.npm'),
    expandPath('~/.cache'),
  ];

  let totalSize = 0;

  for (const path of cachePaths) {
    if (exists(path)) {
      try {
        const output = execSync(`du -sk "${path}" 2>/dev/null`).toString();
        const size = parseInt(output.split('\t')[0]) * 1024;
        totalSize += size;
      } catch {
        // Skip if cannot read
      }
    }
  }

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  let message = 'Cache size is reasonable';
  let recommendation: string | undefined;

  const GB = 1024 * 1024 * 1024;

  if (totalSize > 10 * GB) {
    status = 'warning';
    message = `Large cache detected: ${formatSize(totalSize)}`;
    recommendation = 'Run "broom clean" to free up cache space';
  } else if (totalSize > 5 * GB) {
    status = 'healthy';
    message = `Cache size: ${formatSize(totalSize)}`;
  }

  return {
    name: 'Cache Size',
    status,
    message,
    recommendation,
    value: formatSize(totalSize),
  };
}

/**
 * Get status icon
 */
function getStatusIcon(status: 'healthy' | 'warning' | 'critical'): string {
  switch (status) {
    case 'healthy':
      return chalk.green('✓');
    case 'warning':
      return chalk.yellow('⚠️ ');
    case 'critical':
      return chalk.red('❌');
  }
}

/**
 * Execute doctor command
 */
export async function doctorCommand(options: DoctorOptions): Promise<void> {
  printHeader('🏥 System Health Check');

  console.log(chalk.dim('Running diagnostics...'));
  console.log();

  // Run all health checks
  const checks: HealthCheck[] = await Promise.all([
    checkDiskUsage(),
    checkCacheSizes(),
    checkLargeFiles(),
    checkBrokenSymlinks(),
    checkOldFiles(),
  ]);

  // Display results
  for (const check of checks) {
    const icon = getStatusIcon(check.status);
    const statusColor =
      check.status === 'healthy'
        ? chalk.green
        : check.status === 'warning'
          ? chalk.yellow
          : chalk.red;

    console.log(`${icon} ${chalk.bold(check.name)}: ${check.message}`);

    if (check.value && options.verbose) {
      console.log(chalk.dim(`   Value: ${check.value}`));
    }

    if (check.recommendation) {
      console.log(chalk.dim(`   → ${check.recommendation}`));
    }

    console.log();
  }

  // Summary
  separator();
  console.log();

  const healthyCount = checks.filter((c) => c.status === 'healthy').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;
  const criticalCount = checks.filter((c) => c.status === 'critical').length;

  console.log(chalk.bold('📊 Summary:'));
  console.log(`  ${chalk.green('●')} Healthy: ${healthyCount}`);
  console.log(`  ${chalk.yellow('●')} Warning: ${warningCount}`);
  console.log(`  ${chalk.red('●')} Critical: ${criticalCount}`);

  console.log();

  if (criticalCount > 0) {
    error('Critical issues detected! Please take action immediately.');
  } else if (warningCount > 0) {
    warning('Some issues detected. Consider cleaning up.');
  } else {
    success('Your system looks healthy!');
  }

  console.log();
  console.log(chalk.dim('Tip: Run "broom clean" to free up space'));
  console.log(chalk.dim('     Run "broom doctor --verbose" for detailed information'));
}

/**
 * Create doctor command
 */
export function createDoctorCommand(): Command {
  const cmd = new Command('doctor')
    .description('Run system health diagnostics')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (options) => {
      await doctorCommand(options);
    });

  return enhanceCommandHelp(cmd);
}
