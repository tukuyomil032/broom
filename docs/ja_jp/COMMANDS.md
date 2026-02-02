# 📚 コマンドリファレンス

Broom の全コマンドの完全なリファレンスです。

## 目次

- [共通オプション](#global-options)
- [コアコマンド](#core-commands)
  - [clean](#clean)
  - [analyze](#analyze)
  - [status](#status)
  - [uninstall](#uninstall)
  - [optimize](#optimize)
- [ユーティリティコマンド](#utility-commands)
  - [purge](#purge)
  - [installer](#installer)
  - [duplicates](#duplicates)
  - [reports](#reports)
  - [backup](#backup)
  - [restore](#restore)
- [設定コマンド](#configuration-commands)
  - [config](#config)
  - [touchid](#touchid)
  - [completion](#completion)
  - [doctor](#doctor)
  - [schedule](#schedule)
  - [watch](#watch)
- [システムコマンド](#system-commands)
  - [update](#update)
  - [remove](#remove)
  - [help](#help)

---

## 共通オプション

すべてのコマンドで利用可能なオプション:

| オプション  | 短縮 | 説明                         |
| ----------- | ---- | ---------------------------- |
| `--version` | `-v` | バージョン番号を表示         |
| `--help`    | `-h` | コマンドのヘルプを表示       |
| `--debug`   | -    | 詳細ログ（デバッグ）を有効化 |

---

## コアコマンド

### clean

ディスクのディープクリーンアップ — キャッシュ、ログ、不要ファイルをスキャンして削除します。

```bash
broom clean [options]
```

#### オプション

| オプション  | 短縮 | 説明                                                |
| ----------- | ---- | --------------------------------------------------- |
| `--dry-run` | `-n` | プレビューのみ（削除は行わない）                    |
| `--all`     | `-a` | プロンプトなしで全カテゴリをクリーン                |
| `--yes`     | `-y` | 確認プロンプトをスキップ                            |
| `--unsafe`  | -    | リスクのあるカテゴリ（ゴミ箱、Downloads等）を含める |
| `--report`  | `-r` | クリーン後にHTMLレポートを生成                      |
| `--open`    | `-o` | 生成したレポートをブラウザで開く                    |

#### 例

```bash
# インタラクティブにカテゴリを選択して実行
broom clean

# 何が削除されるかを確認
broom clean --dry-run

# 安全カテゴリを全自動で削除
broom clean --all --yes

# レポートを生成して開く
broom clean --report --open

# リスクのあるカテゴリも含めて削除
broom clean --unsafe --yes
```

#### 対象カテゴリ

**安全（デフォルト）:**

- ユーザーキャッシュ (`~/Library/Caches`)
- ユーザーログ (`~/Library/Logs`)
- ブラウザキャッシュ（Chrome, Safari, Firefox 等）
- 一時ファイル

**注意（選択時）:**

- 開発キャッシュ（npm, yarn, pip 等）
- Xcode キャッシュ
- Homebrew キャッシュ
- Docker キャッシュ

**リスキー（`--unsafe` で有効）:**

- ゴミ箱
- Downloads（古いファイル）
- iOS バックアップ
- インストーラーファイル

---

### analyze

ディスク使用量を解析し、ビジュアルグラフで表示します。

```bash
broom analyze [options]
```

#### オプション

| オプション         | 短縮 | 説明                               |
| ------------------ | ---- | ---------------------------------- |
| `--path <path>`    | `-p` | 解析対象パス（デフォルト: ホーム） |
| `--depth <number>` | `-d` | スキャン深度（デフォルト: 1）      |
| `--limit <number>` | `-l` | 表示件数（デフォルト: 15）         |

#### 例

```bash
# ホームディレクトリを解析
broom analyze

# 深さ3で特定パスを解析
broom analyze --path ~/Library --depth 3

# 上位20件を表示
broom analyze --limit 20

# 深掘り解析
broom analyze --path /var --depth 5 --limit 25
```

#### 機能

- ビジュアルグラフ（グラデーション付きバー）
- サイズ順ソート（大きい順）
- ドリルダウン（ディレクトリを深くたどる）
- ディスク使用量の概要表示

---

### status

リアルタイムのシステム監視ダッシュボードを表示します。

```bash
broom status [options]
```

#### オプション

| オプション        | 短縮 | 説明                                 |
| ----------------- | ---- | ------------------------------------ |
| `--watch`         | `-w` | ライブ監視モード（自動更新）         |
| `--interval <ms>` | `-i` | 更新間隔（ミリ秒、デフォルト: 1000） |

#### 例

```bash
# 現在のシステム状態を表示
broom status

# ライブ監視ダッシュボード
broom status --watch

# 更新間隔を500msに設定
broom status --watch --interval 500
```

#### 表示されるメトリクス

- CPU 使用率（コア毎/合計）
- メモリ（使用/空き/合計）
- ディスク使用量（マウントされたボリューム）
- ネットワーク速度（送受信）
- システム情報（OS、uptime、ホスト名）
- 温度（CPU/GPU、対応環境のみ）
- プロセス（CPU/メモリ上位）

---

### uninstall

アプリ本体と関連する残留ファイルを完全に削除します。

```bash
broom uninstall [options]
```

#### オプション

| オプション  | 短縮 | 説明                             |
| ----------- | ---- | -------------------------------- |
| `--dry-run` | `-n` | プレビューのみ（削除は行わない） |
| `--yes`     | `-y` | 確認プロンプトをスキップ         |

#### 例

```bash
# インタラクティブにアプリを選んで削除
broom uninstall

# 削除対象を確認
broom uninstall --dry-run

# 確認なしでアンインストール
broom uninstall --yes
```

#### 削除される項目

- アプリ本体： `/Applications/App.app`
- Application Support： `~/Library/Application Support/App`
- Preferences： `~/Library/Preferences/com.app.*`
- Caches： `~/Library/Caches/com.app.*`
- Logs： `~/Library/Logs/App`
- Saved State： `~/Library/Saved Application State/com.app.*`
- Containers： `~/Library/Containers/com.app.*`
- Group Containers： `~/Library/Group Containers/com.app.*`

---

### optimize

システムメンテナンスおよび最適化タスクを実行します。

```bash
broom optimize [options]
```

#### オプション

```
broom optimize

# 全optimize工程を実行
broom optimize --all --yes

# optimizeをプレビュー(実際の処理は走らない)
broom optimize --dry-run
```

#### Optimization

- **Flush DNS Cache** - DNSのキャッシュを削除する
- **Rebuild Spotlight** - スポットライトの再インデックスする
- **Purge Memory** - 使われていないメモリ領域を開放する
- **Verify Disk** - ディスクの整合性を確認する
- **Repair Permissions** - ファイルの権限を修正する
- **Rebuild Launch Services** - アプリの関連付けを修正する
- **Clear Font Cache** - フォントのキャッシュを削除する

---

## ユーティリティコマンド

### purge

プロジェクトのビルド成果物（例: `dist/`）をクリーンアップします。

```bash
broom purge [options]
```

#### オプション

| オプション      | 短縮 | 説明                                       |
| --------------- | ---- | ------------------------------------------ |
| `--dry-run`     | `-n` | プレビューのみ（実際の削除は行わない）     |
| `--yes`         | `-y` | 確認プロンプトをスキップ                   |
| `--path <path>` | `-p` | プロジェクトのパス（デフォルト: カレント） |

#### 例

```bash
# カレントディレクトリをクリーン
broom purge

# 特定プロジェクトをクリーン
broom purge --path ~/projects/myapp

# 実際に削除される内容をプレビュー
broom purge --dry-run
```

#### クリーン対象

- `node_modules/` - Node.js の依存
- `dist/`, `build/` - ビルド出力
- `target/` - Rust/Java のビルド出力
- `.next/` - Next.js のキャッシュ
- `__pycache__/` - Python のキャッシュ
- `vendor/` - PHP/Ruby の依存
- `.gradle/` - Gradle のキャッシュ
- `.turbo/` - Turborepo のキャッシュ

---

### installer

インストーラーファイルを検索し、削除できます。

```bash
broom installer [options]
```

#### オプション

| オプション  | 短縮 | 説明                             |
| ----------- | ---- | -------------------------------- |
| `--dry-run` | `-n` | プレビューのみ（削除は行わない） |
| `--yes`     | `-y` | 確認プロンプトをスキップ         |

#### 例

```bash
# インストーラーファイルを検索
broom installer

# 確認なしで削除
broom installer --yes

# 削除対象をプレビュー
broom installer --dry-run
```

#### 検出されるファイルタイプ

- `.dmg` - ディスクイメージ
- `.pkg` - パッケージインストーラ
- `.zip` - Downloads にあるアーカイブ
- 一般的な場所にあるアプリインストーラ

---

### duplicates

重複ファイルを検出して削除します。

```bash
broom duplicates [options]
```

#### オプション

| オプション           | 短縮 | 説明                                                      |
| -------------------- | ---- | --------------------------------------------------------- |
| `--path <path>`      | `-p` | スキャンするパス（デフォルト: ホームディレクトリ）        |
| `--min-size <size>`  | -    | 最小ファイルサイズ（例: 1MB、500KB）                      |
| `--hash <algorithm>` | -    | ハッシュアルゴリズム: `md5` または `sha256`（デフォルト） |
| `--interactive`      | `-i` | インタラクティブモード（削除するファイルを選択）          |
| `--delete`           | `-d` | 自動で重複を削除（最初のファイルを保持）                  |

#### 例

```bash
# ホームディレクトリで重複を検索
broom duplicates

# サイズフィルタ付きで特定パスをスキャン
broom duplicates --path ~/Documents --min-size 1MB

# インタラクティブモード
broom duplicates --interactive

# ハッシュアルゴリズムを指定
broom duplicates --hash md5
```

#### 機能

- **スマートハッシュ** - サイズに基づく最適化
- **インタラクティブ選択** - 残すファイルを選べる
- **ハードリンク対応** - 重複をハードリンクに置換
- **サイズフィルタ** - 指定サイズ以上のみスキャン
- **相対パス表示** - 識別しやすく表示
- **ファイル詳細** - サイズ、更新日時、クリック可能なリンクを表示

---

### reports

クリーンアップの HTML レポートを管理します。

```bash
broom reports [subcommand] [options]
```

#### サブコマンド

| サブコマンド | 説明                                       |
| ------------ | ------------------------------------------ |
| `list`       | 生成されたレポートを一覧表示（デフォルト） |
| `clean`      | すべてのレポートを削除                     |
| `open`       | 最新のレポートをブラウザで開く             |

#### オプション

| オプション | 短縮 | 説明                     |
| ---------- | ---- | ------------------------ |
| `--yes`    | `-y` | 確認プロンプトをスキップ |

#### 例

```bash
# すべてのレポートを一覧表示
broom reports
broom reports list

# すべてのレポートを削除
broom reports clean

# 確認なしで削除
broom reports clean --yes

# 最新のレポートを開く
broom reports open
```

#### レポート機能

- **視覚的チャート** - カテゴリ内訳、ディスク比較
- **詳細テーブル** - 削除されたファイル一覧（パス付き）
- **統計情報** - 解放容量、削除ファイル数、所要時間
- **メタデータ** - 実行コマンド、システム情報
- **印刷対応** - PDFエクスポート対応

---

### backup

クリーンアップ前にファイルをバックアップします。

```bash
broom backup [options]
```

#### オプション

| オプション      | 短縮 | 説明                           |
| --------------- | ---- | ------------------------------ |
| `--path <path>` | `-p` | バックアップ対象のパス         |
| `--tag <name>`  | `-t` | バックアップのタグ/名前        |
| `--list`        | `-l` | すべてのバックアップを一覧表示 |

#### 例

```bash
# タグ付きでディレクトリをバックアップ
broom backup --path ~/Documents --tag "before-cleanup"

# すべてのバックアップを一覧
broom backup --list

# カレントディレクトリをバックアップ（タグ指定）
broom backup --tag "project-backup"
```

---

### restore

バックアップからファイルを復元します。

```bash
broom restore [options]
```

#### オプション

| オプション      | 短縮 | 説明                           |
| --------------- | ---- | ------------------------------ |
| `--tag <name>`  | `-t` | 復元するバックアップのタグ     |
| `--path <path>` | `-p` | 復元先（デフォルト: 元の場所） |

#### 例

```bash
# タグ指定で復元
broom restore --tag "before-cleanup"

# 別の場所に復元
broom restore --tag "backup-001" --path ~/restored
```

---

## 設定コマンド

### config

broom の設定を管理します。

```bash
broom config [subcommand] [options]
```

#### サブコマンド

| サブコマンド        | 説明                           |
| ------------------- | ------------------------------ |
| `show`              | 現在の設定を表示（デフォルト） |
| `set <key> <value>` | 設定値を変更                   |
| `reset`             | 設定をデフォルトに戻す         |
| `path`              | 設定ファイルのパスを表示       |

#### 例

```bash
# 現在の設定を表示
broom config show

# 安全レベルを設定
broom config set safetyLevel moderate

# 設定をリセット
broom config reset

# 設定ファイルの場所を表示
broom config path
```

#### 設定キー

- `safetyLevel` - `safe`, `moderate`, `aggressive`
- `dryRun` - `true`, `false`
- `confirmBeforeDelete` - `true`, `false`
- `scanDepth` - 数値（デフォルト: 3）

---

### touchid

sudo 認証に Touch ID を使用する設定を行います。

```bash
broom touchid <subcommand>
```

#### サブコマンド

| サブコマンド | 説明                        |
| ------------ | --------------------------- |
| `enable`     | sudo 用の Touch ID を有効化 |
| `disable`    | sudo 用の Touch ID を無効化 |
| `status`     | Touch ID の sudo 状態を表示 |

#### オプション

| オプション | 短縮 | 説明                     |
| ---------- | ---- | ------------------------ |
| `--yes`    | `-y` | 確認プロンプトをスキップ |

#### 例

```bash
# Touch ID を有効化
broom touchid enable

# 状態を確認
broom touchid status

# Touch ID を無効化
broom touchid disable
```

---

### completion

Generate shell completion scripts.

```bash
broom completion <shell>
```

#### シェル

| シェル    | 説明                             |
| --------- | -------------------------------- |
| `bash`    | Bash 用の補完スクリプト          |
| `zsh`     | Zsh 用の補完スクリプト           |
| `fish`    | Fish 用の補完スクリプト          |
| `install` | カレントシェルへ自動インストール |

#### 例

```bash
# カレントシェルへ自動インストール
broom completion install

# Bash 補完を生成
broom completion bash > /usr/local/etc/bash_completion.d/broom

# Zsh 補完を生成
broom completion zsh > ~/.zsh/completions/_broom

# Fish 補完を生成
broom completion fish > ~/.config/fish/completions/broom.fish
```

#### 手動設定（Zsh）

```bash
# 補完スクリプトを生成
broom completion zsh > ~/.zsh/completions/_broom

# ~/.zshrc に追加
fpath=(~/.zsh/completions $fpath)
autoload -Uz compinit && compinit

# シェルをリロード
exec zsh
```

---

### doctor

システムのヘルス診断を実行します。

```bash
broom doctor
```

#### 実行されるチェック

- **システム要件** - Node.js のバージョン、権限
- **ディスク容量** - 全ボリュームの空き容量
- **設定** - 設定ファイルの妥当性
- **依存関係** - 必要なシステムコマンドの存在
- **権限** - クリーン対象パスへの書き込み権限
- **バックアップ整合性** - バックアップディレクトリの状態

---

### schedule

自動クリーンアップのスケジュールを管理します。

```bash
broom schedule <subcommand> [options]
```

#### サブコマンド

| サブコマンド  | 説明                       |
| ------------- | -------------------------- |
| `add`         | スケジュールを追加         |
| `remove <id>` | スケジュールを削除         |
| `list`        | すべてのスケジュールを表示 |

#### 例

```bash
# 毎日クリーンをスケジュール（例: 02:00）
broom schedule add --daily --time 02:00

# 毎週クリーンをスケジュール（例: 日曜 03:00）
broom schedule add --weekly --day sunday --time 03:00

# スケジュール一覧
broom schedule list

# スケジュールを削除
broom schedule remove <id>
```

---

### watch

Monitor directory sizes and get alerts.

```bash
broom watch [options]
```

#### オプション

| オプション           | 短縮 | 説明                           |
| -------------------- | ---- | ------------------------------ |
| `--add`              | `-a` | 監視対象ディレクトリを追加     |
| `--remove <path>`    | `-r` | 監視対象ディレクトリを削除     |
| `--list`             | `-l` | 監視中のディレクトリを一覧表示 |
| `--check`            | `-c` | 監視を今すぐチェック           |
| `--path <path>`      | `-p` | ディレクトリのパス             |
| `--threshold <size>` | `-t` | サイズ閾値（例: 1GB）          |
| `--notify`           | `-n` | 通知を有効にする               |

#### 例

```bash
# 監視対象を追加
broom watch --add --path ~/Downloads --threshold 1GB --notify

# 監視中ディレクトリを一覧
broom watch --list

# 監視を即時チェック
broom watch --check

# 監視を削除
broom watch --remove ~/Downloads
```

---

## System Commands

### update

broom を最新バージョンに更新します。

```bash
broom update
```

更新をチェックし、npm/GitHub から最新バージョンをインストールします。

---

### remove

broom をシステムからアンインストールします。

```bash
broom remove [options]
```

#### オプション

| オプション | 短縮 | 説明                     |
| ---------- | ---- | ------------------------ |
| `--yes`    | `-y` | 確認プロンプトをスキップ |

#### 例

```bash
# 確認ありでアンインストール
broom remove

# 確認なしでアンインストール
broom remove --yes
```

---

### help

ヘルプ情報を表示します。

```bash
broom help [command]
```

#### 例

```bash
# 全体のヘルプを表示
broom help

# コマンド固有のヘルプ
broom help clean
broom help analyze

# バージョンを表示
broom --version
```

---

## ヒントとベストプラクティス

### 安全第一

1. **--dry-run を使う** - 削除前に必ずプレビューする
2. **重要データのバックアップ** - クリーン前に `broom backup` を使う
3. **対象カテゴリを確認** - 何が削除されるか確認する
4. **まずは安全設定で開始** - デフォルトの安全レベルを使う
5. **ホワイトリストで保護** - 重要なディレクトリを除外する

### 効率化

1. **定期的にスケジュール** - `broom schedule` で自動化する
2. **重要ディレクトリを監視** - `broom watch` を使用
3. **レポートを生成** - クリーンの履歴を記録する
4. **タブ補完を利用** - 補完をインストールする
5. **オプションを組み合わせる** - 例: `broom clean --all --yes --report`

### トラブルシューティング

1. **状態を確認** - `broom doctor`
2. **デバッグモードを有効化** - `broom --debug clean`
3. **レポートを確認** - 詳細は HTML レポートを参照
4. **権限を確認** - sudo 権限が必要な場合がある
5. **バックアップから復元** - 必要なら `broom restore` を使う

---

詳細は [メインの README](../README.md) またはこのドキュメントを参照してください。
