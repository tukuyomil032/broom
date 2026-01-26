# 🔍 スキャナー詳細

broom のクリーンアップ機能は、モジュラーな「スキャナー」システムで実装されています。各スキャナーは特定のカテゴリのファイルを検出し、削除可能なアイテムのリストを返します。

---

## 📋 スキャナー一覧

| スキャナー          | ファイル           | カテゴリ            | 安全性レベル |
| ------------------- | ------------------ | ------------------- | ------------ |
| UserCacheScanner    | `user-cache.ts`    | ユーザーキャッシュ  | 🟢 Safe      |
| UserLogsScanner     | `user-logs.ts`     | ユーザーログ        | 🟢 Safe      |
| BrowserCacheScanner | `browser-cache.ts` | ブラウザキャッシュ  | 🟢 Safe      |
| DevCacheScanner     | `dev-cache.ts`     | 開発者キャッシュ    | 🟡 Moderate  |
| NodeModulesScanner  | `node-modules.ts`  | node_modules        | 🟡 Moderate  |
| XcodeScanner        | `xcode.ts`         | Xcode キャッシュ    | 🟡 Moderate  |
| HomebrewScanner     | `homebrew.ts`      | Homebrew キャッシュ | 🟢 Safe      |
| DockerScanner       | `docker.ts`        | Docker              | 🟡 Moderate  |
| TrashScanner        | `trash.ts`         | ゴミ箱              | 🟢 Safe      |
| DownloadsScanner    | `downloads.ts`     | ダウンロード        | 🔴 Careful   |
| TempFilesScanner    | `temp-files.ts`    | 一時ファイル        | 🟢 Safe      |
| iOSBackupsScanner   | `ios-backups.ts`   | iOS バックアップ    | 🔴 Careful   |
| InstallerScanner    | `installer.ts`     | インストーラー      | 🟢 Safe      |

---

## 📂 各スキャナーの詳細

### UserCacheScanner

**ファイル:** `src/scanners/user-cache.ts`

ユーザーのアプリケーションキャッシュをスキャン。

**対象パス:**

```
~/Library/Caches/
```

**特徴:**

- アプリごとのキャッシュサイズを計算
- システムキャッシュは除外
- 削除しても再生成されるため安全

---

### UserLogsScanner

**ファイル:** `src/scanners/user-logs.ts`

ユーザーのアプリケーションログをスキャン。

**対象パス:**

```
~/Library/Logs/
```

**特徴:**

- アプリごとのログサイズを計算
- 古いログファイルが蓄積されがち
- デバッグ情報が不要なら削除可能

---

### BrowserCacheScanner

**ファイル:** `src/scanners/browser-cache.ts`

主要ブラウザのキャッシュをスキャン。

**対象ブラウザ:**

- Google Chrome
- Firefox
- Safari
- Microsoft Edge
- Brave
- Opera
- Vivaldi

**スキャン対象:**

```
~/Library/Caches/Google/Chrome/
~/Library/Caches/Firefox/
~/Library/Caches/com.apple.Safari/
~/Library/Application Support/Google/Chrome/Default/Cache/
~/Library/Application Support/Firefox/Profiles/*/cache2/
```

**特徴:**

- ブラウザの動作には影響なし
- 再訪問時にキャッシュが再生成される
- 大容量になりやすい

---

### DevCacheScanner

**ファイル:** `src/scanners/dev-cache.ts`

開発ツールのキャッシュをスキャン。

**対象ツール:**

- npm / yarn / pnpm / bun
- pip / pipenv / poetry
- gem / bundler
- cargo
- composer
- gradle / maven
- CocoaPods

**スキャン対象:**

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

**特徴:**

- パッケージの再ダウンロードが必要になる可能性
- 大容量になりやすい
- 開発者向け

---

### NodeModulesScanner

**ファイル:** `src/scanners/node-modules.ts`

プロジェクト内の node_modules をスキャン。

**スキャン対象:**

```
~/Documents/**/node_modules/
~/Projects/**/node_modules/
~/dev/**/node_modules/
```

**特徴:**

- `npm install` で復元可能
- 非常に大容量になりやすい
- 最終更新日で優先度付け

---

### XcodeScanner

**ファイル:** `src/scanners/xcode.ts`

Xcode 関連のキャッシュをスキャン。

**スキャン対象:**

```
~/Library/Developer/Xcode/DerivedData/
~/Library/Developer/Xcode/Archives/
~/Library/Developer/Xcode/iOS DeviceSupport/
~/Library/Developer/CoreSimulator/
~/Library/Caches/com.apple.dt.Xcode/
```

**特徴:**

- DerivedData は再ビルドで復元
- Archives は古いアーカイブのみ削除推奨
- シミュレータデータは大容量

---

### HomebrewScanner

**ファイル:** `src/scanners/homebrew.ts`

Homebrew のキャッシュをスキャン。

**スキャン対象:**

```
$(brew --cache)
/opt/homebrew/Caches/
~/Library/Caches/Homebrew/
```

**特徴:**

- ダウンロードされたパッケージファイル
- `brew cleanup` と同等の効果
- 削除しても再ダウンロード可能

---

### DockerScanner

**ファイル:** `src/scanners/docker.ts`

Docker のキャッシュ・未使用イメージをスキャン。

**スキャン対象:**

```
~/Library/Containers/com.docker.docker/
~/.docker/
```

**チェック項目:**

- 未使用イメージ
- 停止中のコンテナ
- 未使用のボリューム
- ビルドキャッシュ

**特徴:**

- `docker system prune` と同等の効果
- 未使用リソースのみ対象
- Docker Desktop の容量削減に効果的

---

### TrashScanner

**ファイル:** `src/scanners/trash.ts`

ゴミ箱の内容をスキャン。

**スキャン対象:**

```
~/.Trash/
```

**特徴:**

- 完全に削除されていないファイル
- Finder の「ゴミ箱を空にする」と同等
- 削除前に確認可能

---

### DownloadsScanner

**ファイル:** `src/scanners/downloads.ts`

ダウンロードフォルダの古いファイルをスキャン。

**スキャン対象:**

```
~/Downloads/
```

**特徴:**

- 30日以上前のファイルのみ
- 必要なファイルが含まれる可能性
- 慎重に確認が必要

---

### TempFilesScanner

**ファイル:** `src/scanners/temp-files.ts`

一時ファイルをスキャン。

**スキャン対象:**

```
/tmp/
/var/tmp/
~/Library/Application Support/**/tmp/
```

**特徴:**

- システムの一時ファイル
- 再起動で削除されることが多い
- 通常は安全に削除可能

---

### iOSBackupsScanner

**ファイル:** `src/scanners/ios-backups.ts`

iOS デバイスのバックアップをスキャン。

**スキャン対象:**

```
~/Library/Application Support/MobileSync/Backup/
```

**特徴:**

- 非常に大容量 (数十GB)
- 古いバックアップは不要な場合が多い
- iCloud バックアップを使用している場合は削除可能

---

### InstallerScanner

**ファイル:** `src/scanners/installer.ts`

インストーラーファイル (DMG, PKG, ZIP) をスキャン。

**スキャン対象:**

```
~/Downloads/*.dmg
~/Downloads/*.pkg
~/Downloads/*.zip
~/Desktop/*.dmg
~/Documents/*.dmg
$(brew --cache)/*.dmg
~/Library/Mobile Documents/**/Downloads/
```

**特徴:**

- インストール済みアプリのインストーラー
- 再ダウンロード可能
- ディスク容量の節約に効果的

---

## 🔧 スキャナーの実装

### 基底クラス

すべてのスキャナーは `BaseScanner` クラスを継承しています。

```typescript
// src/scanners/base.ts

export abstract class BaseScanner {
  abstract readonly category: ScanCategory;
  abstract scan(): Promise<ScanResult>;
}
```

### スキャン結果の型

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

### 新しいスキャナーの追加方法

1. `src/scanners/` に新しいファイルを作成
2. `BaseScanner` を継承したクラスを実装
3. `src/scanners/index.ts` にエクスポートを追加

```typescript
// 例: src/scanners/custom.ts

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
    // スキャンロジックを実装
    return {
      category: this.category,
      items: [],
      totalSize: 0,
    };
  }
}
```

---

## 📊 安全性レベル

| レベル          | 説明                                  | 例                             |
| --------------- | ------------------------------------- | ------------------------------ |
| 🟢 **Safe**     | 削除しても問題なし。再生成される。    | キャッシュ、ログ、ゴミ箱       |
| 🟡 **Moderate** | 削除後に再ダウンロード/再ビルドが必要 | node_modules、Xcode            |
| 🔴 **Careful**  | 重要なファイルが含まれる可能性        | ダウンロード、iOS バックアップ |

---

## 🔒 ホワイトリスト

特定のパスを削除対象から除外できます。

```bash
broom config set whitelist '["~/Library/Caches/important-app"]'
```

設定ファイル (`~/.config/broom/config.json`):

```json
{
  "whitelist": [
    "~/Library/Caches/important-app",
    "~/Documents/Projects/critical-project/node_modules"
  ]
}
```
