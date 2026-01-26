/**
 * Core types for Broom CLI
 */

export interface CleanableItem {
  path: string;
  size: number;
  name: string;
  isDirectory: boolean;
  modifiedAt?: Date;
}

export interface ScanResult {
  category: Category;
  items: CleanableItem[];
  totalSize: number;
  error?: string;
}

export interface ScanSummary {
  results: ScanResult[];
  totalSize: number;
  totalItems: number;
}

export interface CleanResult {
  category: Category;
  cleanedItems: number;
  freedSpace: number;
  errors: string[];
}

export interface CleanSummary {
  results: CleanResult[];
  totalFreedSpace: number;
  totalCleanedItems: number;
  totalErrors: number;
}

export type SafetyLevel = 'safe' | 'moderate' | 'risky';

export type CategoryId =
  | 'user-cache'
  | 'system-cache'
  | 'system-logs'
  | 'user-logs'
  | 'temp-files'
  | 'trash'
  | 'downloads'
  | 'browser-cache'
  | 'dev-cache'
  | 'xcode'
  | 'homebrew'
  | 'docker'
  | 'ios-backups'
  | 'node-modules'
  | 'app-data';

export type CategoryGroup = 'System Junk' | 'Development' | 'Storage' | 'Browsers' | 'Apps';

export interface Category {
  id: CategoryId;
  name: string;
  group: CategoryGroup;
  description: string;
  safetyLevel: SafetyLevel;
  safetyNote?: string;
}

export interface ScannerOptions {
  verbose?: boolean;
  daysOld?: number;
  minSize?: number;
}

export interface Scanner {
  category: Category;
  scan(options?: ScannerOptions): Promise<ScanResult>;
  clean(items: CleanableItem[], dryRun?: boolean): Promise<CleanResult>;
}

export interface Config {
  dryRun: boolean;
  verbose: boolean;
  whitelist: string[];
  blacklist: string[];
  autoConfirm: boolean;
  safetyLevel: SafetyLevel;
  scanLocations: {
    userCache: boolean;
    systemCache: boolean;
    systemLogs: boolean;
    userLogs: boolean;
    trash: boolean;
    downloads: boolean;
    browserCache: boolean;
    devCache: boolean;
    xcodeCache: boolean;
  };
}

export const DEFAULT_CONFIG: Config = {
  dryRun: false,
  verbose: false,
  whitelist: [],
  blacklist: [],
  autoConfirm: false,
  safetyLevel: 'moderate',
  scanLocations: {
    userCache: true,
    systemCache: true,
    systemLogs: true,
    userLogs: true,
    trash: true,
    downloads: false,
    browserCache: true,
    devCache: true,
    xcodeCache: true,
  },
};

export interface SystemInfo {
  cpu: {
    usage: number;
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usedPercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usedPercent: number;
  };
  network: {
    download: number;
    upload: number;
  };
  uptime: number;
}

export interface AppInfo {
  name: string;
  path: string;
  bundleId?: string;
  size: number;
}

export interface DirEntry {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  lastAccess?: Date;
}

export interface RemovalResult {
  path: string;
  success: boolean;
  error?: string;
}

export interface RemovalSummary {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  totalSizeFreed: number;
  results: RemovalResult[];
}
