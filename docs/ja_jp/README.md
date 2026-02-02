# broom - macOS Disk Cleanup CLI

> **mole** (https://github.com/tw93/Mole) の TypeScript 完全リライト版

broom は、Shell + Go + Makefile で書かれた macOS ディスククリーンアップ CLI「mole」を、TypeScript + Node.js で完全に書き直したプロジェクトです。

---

## 📋 ドキュメント一覧

- **[COMMANDS.md](COMMANDS.md)** - 全コマンドの完全リファレンス
- **[HTML_REPORT.md](HTML_REPORT.md)** - HTMLレポート機能の詳細
- **[SCANNERS.md](SCANNERS.md)** - スキャナー実装の詳細
- **[MIGRATION.md](MIGRATION.md)** - Moleからの移行ガイド
- **[README.md](README.md)** - このファイル（プロジェクト概要）

---

## 📋 目次

- [プロジェクト概要](#プロジェクト概要)
- [クイックスタート](#クイックスタート)
- [主要機能](#主要機能)
- [コマンド一覧](#コマンド一覧)
- [mole との比較表](#mole-との比較表)
- [アーキテクチャ](#アーキテクチャ)
- [使用技術](#使用技術)
- [インストール](#インストール)
- [開発](#開発)

---

## 🎯 プロジェクト概要

### 目的

- mole の全機能を TypeScript で再実装
- コマンド名、オプション、UI/UXを mole と同等に
- モダンな Node.js エコシステムの活用
- さらなる機能拡張（HTMLレポート、重複ファイル検索など）

### 特徴

| 機能                         | 説明                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| **ディープクリーニング**     | キャッシュ、ログ、ブラウザデータなどを検出・削除             |
| **スマートアンインストール** | アプリ本体 + 残留ファイルを完全削除                          |
| **システム最適化**           | DNS フラッシュ、Spotlight 再構築など                         |
| **ディスク分析**             | 容量の大きいフォルダを可視化（グラデーション付きグラフ）     |
| **リアルタイム監視**         | CPU、メモリ、ディスク、ネットワークの TUI ダッシュボード     |
| **プロジェクトパージ**       | node_modules、target、build などのビルドアーティファクト削除 |
| **HTMLレポート**             | クリーンアップ結果をChart.js付きHTMLで出力                   |
| **重複ファイル検索**         | ハッシュベースで重複を検出・削除                             |
| **バックアップ・リストア**   | 削除前にファイルをバックアップ                               |
| **スケジューラー**           | 定期的な自動クリーンアップ                                   |
| **ディレクトリ監視**         | サイズ閾値を超えたら通知                                     |
| **Touch ID対応**             | sudoをTouch IDで認証                                         |
| **シェル補完**               | Bash/Zsh/Fish対応                                            |

---

## 🚀 クイックスタート

```bash
# インストール
git clone https://github.com/tukuyomil032/broom.git
cd broom
bun install
bun run build

# 基本的な使い方
broom clean                    # インタラクティブクリーンアップ
broom clean --dry-run          # プレビューモード
broom clean --all --yes        # 自動クリーンアップ
broom clean --report --open    # HTMLレポート生成

broom analyze                  # ディスク分析
broom status --watch           # システム監視
broom uninstall                # アプリ削除
```

---

## ✨ 主要機能

### 1. ディープクリーニング (`broom clean`)

- **カテゴリ別スキャン**: 安全性レベル別に分類
- **インタラクティブ選択**: 削除するカテゴリを選択
- **ドライランモード**: 削除せずにプレビュー
- **HTMLレポート**: Chart.js付きの詳細レポート
- **ホワイトリスト**: 重要なパスを保護

**対応カテゴリ:**

- ユーザーキャッシュ
- ブラウザキャッシュ（Chrome, Safari, Firefox, Edge, Brave, Arc）
- 開発キャッシュ（npm, yarn, pip, cargo, gradle）
- Xcode DerivedData
- Homebrew キャッシュ
- Docker キャッシュ
- iOS バックアップ
- インストーラーファイル
- ゴミ箱、ダウンロード（unsafe）

### 2. ディスク分析 (`broom analyze`)

- **ビジュアルグラフ**: グラデーション付き棒グラフ
- **区切り線**: 20%ごとに縦線表示
- **ドリルダウン**: ディレクトリを深く探索
- **サイズソート**: 大きい順に表示
- **カスタマイズ可能**: `--depth`, `--limit`オプション

### 3. システム監視 (`broom status`)

- **リアルタイム更新**: `--watch`でライブ監視
- **包括的メトリクス**: CPU、メモリ、ディスク、ネットワーク
- **プロセス情報**: トッププロセス表示
- **温度監視**: CPU/GPU温度（対応ハードウェア）

### 4. HTMLレポート機能

クリーンアップ後にHTMLレポートを生成：

```bash
broom clean --report --open
```

**レポート内容:**

- カテゴリ別円グラフ（Chart.js）
- ディスク使用量の前後比較
- 削除されたファイル一覧
- 統計情報（削除サイズ、ファイル数、処理時間）
- PDF印刷対応

詳細は[HTML_REPORT.md](HTML_REPORT.md)を参照。

### 5. 重複ファイル検索 (`broom duplicates`)

- **スマートハッシング**: ファイルサイズで最適化
- **インタラクティブモード**: 保持するファイルを選択
- **ハードリンク対応**: 重複をハードリンクに置換
- **クリック可能リンク**: Cmd+クリックでFinderを開く

### 6. バックアップ・リストア

```bash
broom backup --path ~/Documents --tag "before-cleanup"
broom restore --tag "before-cleanup"
```

---

## 📚 コマンド一覧

完全なコマンドリファレンスは[COMMANDS.md](COMMANDS.md)を参照。

### コアコマンド

| `mo optimize` | `broom optimize` | システム最適化 | ✅ 完了 |
| `mo analyze` | `broom analyze` | ディスク使用量分析 | ✅ 完了 |
| `mo status` | `broom status` | リアルタイムシステム監視 | ✅ 完了 (blessed TUI) |
| `mo purge` | `broom purge` | プロジェクトアーティファクト削除 | ✅ 完了 |
| `mo installer` | `broom installer` | インストーラーファイル削除 | ✅ 完了 |
| `mo touchid` | `broom touchid` | Touch ID for sudo 設定 | ✅ 完了 |
| `mo completion` | `broom completion` | シェル補完スクリプト生成 | ✅ 完了 |
| `mo update` | `broom update` | 自己アップデート | ✅ 完了 |
| `mo remove` | `broom remove` | アンインストール | ✅ 完了 |
| - | `broom config` | 設定管理 | ✅ 追加機能 |

### オプションマッピング

| mole オプション | broom オプション | 説明                         |
| --------------- | ---------------- | ---------------------------- |
| `--dry-run`     | `-n, --dry-run`  | プレビューモード（削除なし） |
| `--yes`         | `-y, --yes`      | 確認プロンプトをスキップ     |
| `--all`         | `-a, --all`      | すべてのカテゴリを対象       |
| `--debug`       | 未実装           | デバッグログ                 |
| `--whitelist`   | config 経由      | 除外パス管理                 |

---

## 🏗️ アーキテクチャ

### ディレクトリ構造

```
src/
├── index.ts              # メインエントリポイント
├── commands/             # CLIコマンド
│   ├── index.ts          # コマンドエクスポート
│   ├── clean.ts          # クリーンアップコマンド
│   ├── uninstall.ts      # アンインストールコマンド
│   ├── optimize.ts       # 最適化コマンド
│   ├── analyze.ts        # ディスク分析コマンド
│   ├── status.ts         # システム監視コマンド (blessed TUI)
│   ├── purge.ts          # プロジェクトパージコマンド
│   ├── installer.ts      # インストーラー削除コマンド
│   ├── touchid.ts        # Touch ID 設定コマンド
│   ├── completion.ts     # シェル補完コマンド
│   ├── update.ts         # 自己アップデートコマンド
│   ├── remove.ts         # アンインストールコマンド
│   └── config.ts         # 設定管理コマンド
├── scanners/             # ファイルスキャナー
│   ├── index.ts          # スキャナーエクスポート
│   ├── base.ts           # 基底スキャナークラス
│   ├── user-cache.ts     # ユーザーキャッシュスキャナー
│   ├── user-logs.ts      # ユーザーログスキャナー
│   ├── browser-cache.ts  # ブラウザキャッシュスキャナー
│   ├── dev-cache.ts      # 開発者キャッシュスキャナー
│   ├── node-modules.ts   # node_modules スキャナー
│   ├── xcode.ts          # Xcode キャッシュスキャナー
│   ├── homebrew.ts       # Homebrew キャッシュスキャナー
│   ├── docker.ts         # Docker スキャナー
│   ├── trash.ts          # ゴミ箱スキャナー
│   ├── downloads.ts      # ダウンロードスキャナー
│   ├── temp-files.ts     # 一時ファイルスキャナー
│   ├── ios-backups.ts    # iOS バックアップスキャナー
│   └── installer.ts      # インストーラーファイルスキャナー
├── types/                # 型定義
│   └── index.ts          # 共通型定義
├── ui/                   # UI ヘルパー
│   ├── output.ts         # 出力フォーマット
│   └── prompts.ts        # インタラクティブプロンプト
└── utils/                # ユーティリティ
    ├── fs.ts             # ファイルシステム操作
    ├── paths.ts          # macOS パス定義
    └── config.ts         # 設定管理
```

### 設計方針

1. **モジュラー設計**: 各コマンドは独立したモジュール
2. **型安全**: TypeScript で厳密な型定義
3. **スキャナーパターン**: 各クリーンアップカテゴリは独立したスキャナー
4. **設定駆動**: JSON 設定ファイルで動作をカスタマイズ

---

## 📖 コマンド詳細

### `broom clean` - システムクリーンアップ

キャッシュ、ログ、ブラウザデータなどをスキャンして削除。

```bash
broom clean              # インタラクティブモード
broom clean --dry-run    # プレビューのみ
broom clean --all        # すべてのカテゴリを削除
broom clean --yes        # 確認なしで実行
```

**スキャン対象:**

- ユーザーアプリキャッシュ (`~/Library/Caches`)
- ユーザーログ (`~/Library/Logs`)
- ブラウザキャッシュ (Chrome, Firefox, Safari, Edge)
- 開発者キャッシュ (npm, yarn, pip, gem など)
- Xcode 派生データ
- Homebrew キャッシュ
- Docker イメージ・コンテナ
- ゴミ箱
- 一時ファイル
- iOS バックアップ

### `broom uninstall` - アプリのアンインストール

アプリケーションとその残留ファイルを完全に削除。

```bash
broom uninstall          # アプリ選択画面
broom uninstall --dry-run
broom uninstall --yes
```

**削除対象:**

- アプリケーション本体 (`/Applications`)
- Application Support
- Preferences (plist)
- Caches
- Logs
- Launch Agents/Daemons
- Containers
- Group Containers

### `broom optimize` - システム最適化

macOS のメンテナンスタスクを実行。

```bash
broom optimize           # タスク選択画面
broom optimize --yes     # すべてのタスクを実行
```

**利用可能なタスク:**

- DNS キャッシュのフラッシュ
- Spotlight インデックスの再構築
- Launch Services の再構築
- メモリのパージ
- Finder の再起動
- Dock のリセット
- ディスクの修復
- PRAM/NVRAM のリセット（インテル Mac のみ）

### `broom analyze` - ディスク分析

ディレクトリごとの使用容量を可視化。

```bash
broom analyze            # ホームディレクトリから開始
broom analyze --path /   # ルートから開始
broom analyze --depth 3  # 深さ3まで分析
```

### `broom status` - システム監視

リアルタイムのシステム監視ダッシュボード。mole と同じ2カラムグリッドレイアウト。

```bash
broom status             # TUI ダッシュボード起動
broom status --interval 5 # 5秒間隔で更新
broom status --no-broom  # 箒アニメーション無効
```

**表示内容:**

- ヘルスコア (0-100)
- CPU 使用率・負荷・コアごとの使用率
- メモリ使用率・空き容量
- ディスク使用率・読み書き速度
- バッテリー残量・健康状態・サイクル数・温度
- ネットワーク速度
- 上位プロセス
- **箒🧹アニメーション** (埃を払うアニメーション)

**キーボード操作:**

- `q` / `Ctrl+C`: 終了
- `b`: 箒アニメーション切り替え

### `broom purge` - プロジェクトパージ

プロジェクトのビルドアーティファクトを削除。

```bash
broom purge              # プロジェクト選択画面
broom purge --path ~/dev # 特定のディレクトリをスキャン
broom purge --dry-run
```

**対象アーティファクト:**

- `node_modules` (Node.js)
- `target` (Rust)
- `build`, `dist`, `.next` (ビルド出力)
- `__pycache__`, `venv` (Python)
- `DerivedData`, `Pods` (iOS)
- `.gradle` (Java/Gradle)
- `.cache`, `.parcel-cache` (キャッシュ)
- `coverage` (テストカバレッジ)

### `broom installer` - インストーラー削除

DMG、PKG、ZIP などのインストーラーファイルを検出・削除。

```bash
broom installer          # インストーラー選択画面
broom installer --dry-run
broom installer --yes
```

**スキャン場所:**

- `~/Downloads`
- `~/Desktop`
- `~/Documents`
- Homebrew キャッシュ
- iCloud Downloads
- Mail Downloads

### `broom touchid` - Touch ID 設定

sudo コマンドで Touch ID を使用できるように設定。

```bash
broom touchid            # 現在のステータス表示
broom touchid enable     # Touch ID を有効化
broom touchid disable    # Touch ID を無効化
broom touchid status     # ステータス確認
```

### `broom completion` - シェル補完

シェルの Tab 補完スクリプトを生成。

```bash
broom completion bash    # Bash 補完スクリプト
broom completion zsh     # Zsh 補完スクリプト
broom completion fish    # Fish 補完スクリプト
```

**インストール方法:**

```bash
# Bash
eval "$(broom completion bash)"

# Zsh
broom completion zsh > ~/.zsh/completions/_broom

# Fish
broom completion fish > ~/.config/fish/completions/broom.fish
```

### `broom update` - 自己アップデート

broom を最新バージョンに更新。

```bash
broom update             # 更新を実行
broom update --check     # 更新の確認のみ
broom update --yes       # 確認なしで更新
```

### `broom remove` - アンインストール

broom 自体をシステムから削除。

```bash
broom remove             # アンインストール
broom remove --yes       # 確認なしで削除
broom remove --keep-config # 設定ファイルを保持
```

### `broom config` - 設定管理

broom の設定を管理。

```bash
broom config             # 現在の設定を表示
broom config show        # 設定を表示
broom config set <key> <value>  # 設定を変更
broom config reset       # デフォルトにリセット
broom config path        # 設定ファイルのパスを表示
```

---

## 🛠️ 使用技術

### 主要ライブラリ

| ライブラリ          | 用途                                 |
| ------------------- | ------------------------------------ |
| `commander`         | CLI フレームワーク                   |
| `@inquirer/prompts` | インタラクティブプロンプト           |
| `blessed`           | TUI ダッシュボード (status コマンド) |
| `systeminformation` | システム情報取得                     |
| `chalk`             | ターミナル色付け                     |
| `ora`               | スピナー表示                         |
| `fast-glob`         | 高速ファイル検索                     |
| `cli-table3`        | テーブル表示                         |

### 開発ツール

| ツール        | 用途                         |
| ------------- | ---------------------------- |
| `typescript`  | 型安全な JavaScript          |
| `eslint`      | リンター                     |
| `prettier`    | コードフォーマッター         |
| `husky`       | Git フック                   |
| `lint-staged` | ステージングファイルのリント |
| `bun`         | パッケージマネージャー       |

### デバッグ機能

全コマンドで `--debug` オプションが利用可能：

```bash
broom --debug clean --dry-run  # デバッグ付きクリーンアップ
broom --debug optimize        # デバッグ付き最適化
broom --debug status          # デバッグ付きシステム監視
```

**デバッグ出力内容:**

- タイムスタンプ付きログ
- ファイル操作詳細（スキャン、削除、スキップ）
- リスクレベル判定
- パフォーマンス計測
- エラー詳細

---

## 📦 インストール

### npm (公開後)

```bash
npm install -g broom
```

### ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/tukuyomil032/broom.git
cd broom

#　依存関係をインストール
bun install

# プロジェクトをビルド
bun run build

# グローバルとリンク
bun link

# プロジェクトを実行(グローバルリンク済みでないと使えない)
broom <command> <option>

# もしくは
bun run dev <command> <option>

# もしくは
bun dist/index.js <command> <option>

# CLI help windows
broom --help
```

---

## 💻 開発

### ビルド

```bash
bun run build
```

### 開発モード

```bash
bun run dev
```

### リント

```bash
bun run lint
bun run lint:fix
```

### フォーマット

```bash
bun run format
bun run format:check
```

---

## 📝 mole からの主な変更点

1. **言語**: Shell + Go → TypeScript
2. **ビルドシステム**: Makefile → tsc
3. **パッケージマネージャー**: なし → npm/bun
4. **TUI ライブラリ**: Go TUI → blessed (Node.js)
5. **システム情報**: gopsutil (Go) → systeminformation (Node.js)
6. **アニメーション**: 猫🐱 → 箒🧹（掃除するアニメーション）
7. **デバッグ**: なし → 詳細なデバッグログ機能
8. **追加機能**: `config` コマンドで設定管理

---

## 📄 ライセンス

MIT License

---

## 🙏 クレジット

- オリジナルの [mole](https://github.com/tw93/Mole) by [tw93](https://github.com/tw93)
