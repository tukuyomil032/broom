# Scanner Details

Broom's cleanup is implemented as a modular "scanner" system. Each scanner detects files for a specific category and returns a list of removable items.

---

## Scanner list

| Scanner             | File               | Category          | Safety level |
| ------------------- | ------------------ | ----------------- | ------------ |
| UserCacheScanner    | `user-cache.ts`    | User cache        | 🟢 Safe      |
| UserLogsScanner     | `user-logs.ts`     | User logs         | 🟢 Safe      |
| BrowserCacheScanner | `browser-cache.ts` | Browser cache     | 🟢 Safe      |
| DevCacheScanner     | `dev-cache.ts`     | Development cache | 🟡 Moderate  |
| NodeModulesScanner  | `node-modules.ts`  | node_modules      | 🟡 Moderate  |
| XcodeScanner        | `xcode.ts`         | Xcode cache       | 🟡 Moderate  |
| HomebrewScanner     | `homebrew.ts`      | Homebrew cache    | 🟢 Safe      |
| DockerScanner       | `docker.ts`        | Docker            | 🟡 Moderate  |
| TrashScanner        | `trash.ts`         | Trash             | 🟢 Safe      |
| DownloadsScanner    | `downloads.ts`     | Downloads         | 🔴 Careful   |
| TempFilesScanner    | `temp-files.ts`    | Temporary files   | 🟢 Safe      |
| iOSBackupsScanner   | `ios-backups.ts`   | iOS backups       | 🔴 Careful   |
| InstallerScanner    | `installer.ts`     | Installer files   | 🟢 Safe      |

---

## Scanner details

### UserCacheScanner

**File:** `src/scanners/user-cache.ts`

Scans application caches under the user's Library.

**Target paths:**

```
~/Library/Caches/
```

**Notes:**

- Computes per-app cache sizes
- Excludes system caches
- Safe: caches will be regenerated as needed

---

### UserLogsScanner

**File:** `src/scanners/user-logs.ts`

Scans application logs under the user's Library.

**Target paths:**

```
~/Library/Logs/
```

**Notes:**

- Computes per-app log sizes
- Old log files can accumulate over time
- Safe to remove if debug information isn't required

---

### BrowserCacheScanner

**File:** `src/scanners/browser-cache.ts`

Scans cache data for major browsers.

**Supported browsers:**

- Google Chrome
- Firefox
- Safari
- Microsoft Edge
- Brave
- Opera
- Vivaldi

**Scan targets:**

```
~/Library/Caches/Google/Chrome/
~/Library/Caches/Firefox/
~/Library/Caches/com.apple.Safari/
~/Library/Application Support/Google/Chrome/Default/Cache/
~/Library/Application Support/Firefox/Profiles/*/cache2/
```

**Notes:**

- Removing browser caches does not typically break browser behavior
- Caches will be rebuilt on next access
- These folders can become large

---

### DevCacheScanner

**File:** `src/scanners/dev-cache.ts`

Scans caches used by development tools and package managers.

**Target tools:**

- npm / yarn / pnpm / bun
- pip / pipenv / poetry
- gem / bundler
- cargo
- composer
- gradle / maven
- CocoaPods

**Typical paths:**

```
~/.npm/
~/.yarn/
~/.pnpm-store/
~/.bun/
~/.cache/pip/
~/.gem/
~/.cargo/registry/
~/.cocoapods/
```

**Notes:**

- Removing these caches may require re-downloading packages
- These caches often consume significant disk space
- Intended for developers

---

### NodeModulesScanner

**File:** `src/scanners/node-modules.ts`

Scans `node_modules` directories inside common project paths.

**Scan targets:**

```
~/Documents/**/node_modules/
~/Projects/**/node_modules/
~/dev/**/node_modules/
```

**Notes:**

- `npm install` can restore deleted node_modules
  **File:** `src/scanners/installer.ts`
  Scans installer files (DMG, PKG, ZIP) commonly found in Downloads and Desktop.
  **Scan targets:**

```
~/Downloads/*.dmg
~/Downloads/*.pkg
~/Downloads/*.zip
~/Desktop/*.dmg
~/Documents/*.dmg
$(brew --cache)/*.dmg
~/Library/Mobile Documents/**/Downloads/
```

**Features:**

- Installer files for installed applications
- Can be re-downloaded
- Effective for saving disk space

```
~/Library/Developer/Xcode/DerivedData/
~/Library/Developer/Xcode/Archives/
~/Library/Developer/Xcode/iOS DeviceSupport/
~/Library/Developer/CoreSimulator/
~/Library/Caches/com.apple.dt.Xcode/
```

**Notes:**

- DerivedData is safe to remove (recreated on build)
- Archives: prefer removing older archives only
- Simulator data can be very large

---

### HomebrewScanner

**File:** `src/scanners/homebrew.ts`

Scans Homebrew caches and package downloads.

**Scan targets:**

```
$(brew --cache)
/opt/homebrew/Caches/
~/Library/Caches/Homebrew/
```

**Notes:**

- Similar effect to `brew cleanup`
- Downloaded bottles and caches are removed
- Re-download is possible after removal

---

### DockerScanner

**File:** `src/scanners/docker.ts`

Scans Docker caches, unused images and containers.

**Scan targets:**

```
~/Library/Containers/com.docker.docker/
~/.docker/
```

**Checks:**

- Unused images
- Stopped containers
- Unused volumes
- Build cache

**Notes:**

- Similar effect to `docker system prune`
- Targets unused resources only
- Useful for reclaiming Docker Desktop space

---

### TrashScanner

**File:** `src/scanners/trash.ts`

Scans the system Trash for removable items.

**Scan targets:**

```
~/.Trash/
```

**Notes:**

- Files not fully removed elsewhere
- Equivalent to Finder's "Empty Trash"
- Deletions can be previewed before execution

---

### DownloadsScanner

**File:** `src/scanners/downloads.ts`

Scans for old files in the Downloads folder.

**Scan targets:**

```
~/Downloads/
```

**Notes:**

- Only files older than 30 days
- May include files you still need
- Review carefully before deletion

---

### TempFilesScanner

**File:** `src/scanners/temp-files.ts`

Scans temporary files created by apps and the system.

**Scan targets:**

```
/tmp/
/var/tmp/
~/Library/Application Support/**/tmp/
```

**Notes:**

- System temporary files
- Often cleared on reboot
- Generally safe to remove

---

### iOSBackupsScanner

**File:** `src/scanners/ios-backups.ts`

iOS backups scanner.

**Scan targets:**

```
~/Library/Application Support/MobileSync/Backup/
```

**Notes:**

- Can be very large (tens of GB)
- Old backups are often safe to remove
- If you use iCloud backups, local backups may be removable

---

### InstallerScanner

**File:** `src/scanners/installer.ts`

Scans installer files (DMG, PKG, ZIP) commonly found in Downloads and Desktop.

**Scan targets:**

```
~/Downloads/*.dmg
~/Downloads/*.pkg
~/Downloads/*.zip
~/Desktop/*.dmg
~/Documents/*.dmg
$(brew --cache)/*.dmg
~/Library/Mobile Documents/**/Downloads/
```

**Notes:**

- Installer packages for installed apps
- Re-downloadable if needed
- Effective for reclaiming disk space

---

## 🔧 Scanner implementation

### Base class

All scanners extend the `BaseScanner` class.

```typescript
// src/scanners/base.ts

export abstract class BaseScanner {
  abstract readonly category: ScanCategory;
  abstract scan(): Promise<ScanResult>;
}
```

### Scan result types

```typescript
// src/types/index.ts

interface ScanResult {
  category: ScanCategory;
  items: CleanableItem[];
  totalSize: number;
}

interface CleanableItem {
  path: string;
  size: number;
  name: string;
  type: 'file' | 'directory';
  lastModified?: Date;
}

interface ScanCategory {
  id: CategoryId;
  name: string;
  description: string;
  safetyLevel: 'safe' | 'moderate' | 'careful';
  icon: string;
}
```

### Adding a new scanner

1. Create a new file under `src/scanners/`
2. Implement a class that extends `BaseScanner`
3. Add an export to `src/scanners/index.ts`

```typescript
// example: src/scanners/custom.ts

import { BaseScanner } from './base.js';
import type { ScanResult, ScanCategory } from '../types/index.js';

export class CustomScanner extends BaseScanner {
  readonly category: ScanCategory = {
    id: 'custom',
    name: 'Custom Cache',
    description: 'Custom application cache',
    safetyLevel: 'safe',
    icon: '📁',
  };

  async scan(): Promise<ScanResult> {
    // implement scan logic
    return {
      category: this.category,
      items: [],
      totalSize: 0,
    };
  }
}
```

---

## 📊 Safety levels

| Level           | Description                               | Examples                   |
| --------------- | ----------------------------------------- | -------------------------- |
| 🟢 **Safe**     | Safe to remove; items will be regenerated | Caches, logs, trash        |
| 🟡 **Moderate** | Removal may require re-download/rebuild   | node_modules, Xcode caches |
| 🔴 **Careful**  | May contain important files; review first | Downloads, iOS backups     |

---

## 🔒 Whitelist

You can exclude specific paths from deletion.

```bash
broom config set whitelist '["~/Library/Caches/important-app"]'
```

config file (`~/.config/broom/config.json`):

```json
{
  "whitelist": [
    "~/Library/Caches/important-app",
    "~/Documents/Projects/critical-project/node_modules"
  ]
}
```
