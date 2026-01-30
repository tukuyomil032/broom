/**
 * Debug utilities for Broom CLI
 */
import chalk from 'chalk';

let debugMode = false;

/**
 * Enable debug mode
 */
export function enableDebug(): void {
  debugMode = true;
}

/**
 * Disable debug mode
 */
export function disableDebug(): void {
  debugMode = false;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return debugMode;
}

/**
 * Log debug message
 */
export function debug(message: string, ...args: any[]): void {
  if (!debugMode) {
    return;
  }

  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  console.log(chalk.dim(`[${timestamp}] `) + chalk.magenta('[DEBUG] ') + message, ...args);
}

/**
 * Log debug object
 */
export function debugObj(label: string, obj: any): void {
  if (!debugMode) {
    return;
  }

  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  console.log(chalk.dim(`[${timestamp}] `) + chalk.magenta('[DEBUG] ') + chalk.cyan(label + ':'));
  console.log(JSON.stringify(obj, null, 2));
}

/**
 * Log debug section header
 */
export function debugSection(title: string): void {
  if (!debugMode) {
    return;
  }

  console.log();
  console.log(chalk.magenta('━'.repeat(60)));
  console.log(chalk.magenta.bold(`[DEBUG] ${title}`));
  console.log(chalk.magenta('━'.repeat(60)));
}

/**
 * Log debug timing
 */
export function debugTime(label: string): () => void {
  if (!debugMode) {
    return () => {};
  }

  const start = performance.now();
  debug(`Starting: ${label}`);

  return () => {
    const duration = performance.now() - start;
    debug(`Completed: ${label} (${duration.toFixed(2)}ms)`);
  };
}

/**
 * Debug wrapper for async functions
 */
export async function debugAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const end = debugTime(label);
  try {
    const result = await fn();
    end();
    return result;
  } catch (error) {
    debug(`Error in ${label}: ${error}`);
    throw error;
  }
}

/**
 * Log file operation
 */
export function debugFile(operation: string, path: string, details?: string): void {
  if (!debugMode) {
    return;
  }

  const opColors: Record<string, (s: string) => string> = {
    scan: chalk.blue,
    read: chalk.cyan,
    write: chalk.yellow,
    delete: chalk.red,
    skip: chalk.gray,
  };

  const colorFn = opColors[operation.toLowerCase()] || chalk.white;
  const detailsStr = details ? chalk.dim(` (${details})`) : '';
  debug(`${colorFn(operation.toUpperCase().padEnd(6))} ${path}${detailsStr}`);
}

/**
 * Log risk level info
 */
export function debugRisk(
  path: string,
  level: 'safe' | 'moderate' | 'risky',
  reason?: string
): void {
  if (!debugMode) {
    return;
  }

  const colors: Record<string, (s: string) => string> = {
    safe: chalk.green,
    moderate: chalk.yellow,
    risky: chalk.red,
  };

  const colorFn = colors[level];
  const reasonStr = reason ? chalk.dim(` - ${reason}`) : '';
  debug(`Risk: ${colorFn(level.toUpperCase())} ${path}${reasonStr}`);
}
