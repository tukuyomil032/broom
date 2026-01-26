/**
 * Path definitions for cleanup operations
 */
import { homedir } from 'os';
import { join } from 'path';

const HOME = homedir();

export const paths = {
  // User caches
  userCache: join(HOME, 'Library/Caches'),
  userLogs: join(HOME, 'Library/Logs'),

  // System caches (requires sudo)
  systemCache: '/Library/Caches',
  systemLogs: '/Library/Logs',

  // Trash
  trash: join(HOME, '.Trash'),

  // Downloads
  downloads: join(HOME, 'Downloads'),

  // Browser caches
  browserCache: {
    chrome: join(HOME, 'Library/Caches/Google/Chrome'),
    chromeProfile: join(HOME, 'Library/Application Support/Google/Chrome/Default/Cache'),
    safari: join(HOME, 'Library/Caches/com.apple.Safari'),
    firefox: join(HOME, 'Library/Caches/Firefox'),
    firefoxProfile: join(HOME, 'Library/Application Support/Firefox/Profiles'),
    edge: join(HOME, 'Library/Caches/Microsoft Edge'),
    edgeProfile: join(HOME, 'Library/Application Support/Microsoft Edge/Default/Cache'),
    brave: join(HOME, 'Library/Caches/BraveSoftware/Brave-Browser'),
    braveProfile: join(
      HOME,
      'Library/Application Support/BraveSoftware/Brave-Browser/Default/Cache'
    ),
    arc: join(HOME, 'Library/Caches/company.thebrowser.Browser'),
    arcProfile: join(HOME, 'Library/Application Support/Arc/User Data/Default/Cache'),
  },

  // Development caches
  devCache: {
    npm: join(HOME, '.npm'),
    npmCache: join(HOME, '.npm/_cacache'),
    yarn: join(HOME, '.yarn/cache'),
    pnpm: join(HOME, '.pnpm-store'),
    bun: join(HOME, '.bun'),
    pip: join(HOME, 'Library/Caches/pip'),
    pipCache: join(HOME, '.cache/pip'),
    cargo: join(HOME, '.cargo/registry/cache'),
    rustup: join(HOME, '.rustup/downloads'),
    go: join(HOME, 'go/pkg/mod/cache'),
    gradle: join(HOME, '.gradle/caches'),
    maven: join(HOME, '.m2/repository'),
    cocoapods: join(HOME, 'Library/Caches/CocoaPods'),
    carthage: join(HOME, 'Library/Caches/org.carthage.CarthageKit'),
    composer: join(HOME, '.composer/cache'),
  },

  // Xcode caches
  xcode: {
    derivedData: join(HOME, 'Library/Developer/Xcode/DerivedData'),
    archives: join(HOME, 'Library/Developer/Xcode/Archives'),
    deviceSupport: join(HOME, 'Library/Developer/Xcode/iOS DeviceSupport'),
    simulatorCache: join(HOME, 'Library/Developer/CoreSimulator/Caches'),
    simulatorDevices: join(HOME, 'Library/Developer/CoreSimulator/Devices'),
    modulesCache: join(HOME, 'Library/Developer/Xcode/ModuleCache'),
    previewsCache: join(HOME, 'Library/Developer/Xcode/UserData/Previews'),
  },

  // Homebrew
  homebrew: {
    cache: join(HOME, 'Library/Caches/Homebrew'),
    logs: join(HOME, 'Library/Logs/Homebrew'),
    downloads: '/opt/homebrew/var/homebrew/cache', // Apple Silicon
  },

  // Docker
  docker: {
    data: join(HOME, 'Library/Containers/com.docker.docker/Data'),
    vmDisk: join(HOME, 'Library/Containers/com.docker.docker/Data/vms'),
  },

  // iOS backups
  iosBackups: join(HOME, 'Library/Application Support/MobileSync/Backup'),

  // Temp files
  tempFiles: {
    userTemp: join(HOME, 'Library/Caches/TemporaryItems'),
    systemTemp: '/private/tmp',
    varTmp: '/var/tmp',
  },

  // Spotlight
  spotlight: {
    index: '/.Spotlight-V100',
  },

  // Time Machine local snapshots
  timeMachine: '/.MobileBackups',

  // Application Support
  applicationSupport: join(HOME, 'Library/Application Support'),

  // Preferences
  preferences: join(HOME, 'Library/Preferences'),

  // Saved Application State
  savedState: join(HOME, 'Library/Saved Application State'),

  // Applications
  applications: '/Applications',
  userApplications: join(HOME, 'Applications'),
};

// Common app data patterns
export const appDataPatterns = [
  // General caches
  'Library/Caches/*',
  'Library/Application Support/*',
  'Library/Preferences/*',
  'Library/Saved Application State/*',
  'Library/Logs/*',

  // Launch agents/daemons
  'Library/LaunchAgents/*',
  'Library/LaunchDaemons/*',

  // Containers
  'Library/Containers/*',
  'Library/Group Containers/*',
];

// Files to exclude from cleanup
export const excludePatterns = [
  // System essentials
  'com.apple.*',

  // Active browser profiles
  '**/Cookies',
  '**/Bookmarks',
  '**/History',
  '**/Login Data',

  // Development essentials
  'node_modules/.package-lock.json',
  '.git',

  // User data
  '**/LocalStorage',
  '**/IndexedDB',
];

// Category paths mapping
export const categoryPaths: Record<string, string[]> = {
  'user-cache': [paths.userCache],
  'system-cache': [paths.systemCache],
  'user-logs': [paths.userLogs],
  'system-logs': [paths.systemLogs],
  trash: [paths.trash],
  downloads: [paths.downloads],
  'browser-cache': Object.values(paths.browserCache),
  'dev-cache': Object.values(paths.devCache),
  xcode: Object.values(paths.xcode),
  homebrew: [paths.homebrew.cache, paths.homebrew.logs],
  docker: [paths.docker.data],
  'ios-backups': [paths.iosBackups],
  'temp-files': Object.values(paths.tempFiles),
};

export default paths;
