# 🔄 mole → broom 移行ガイド

このドキュメントでは、mole から broom への移行方法と、両者の違いについて説明します。

---

## 📊 コマンド対応表

### 基本コマンド

| mole           | broom             | 説明                     |
| -------------- | ----------------- | ------------------------ |
| `mo`           | `broom`           | メインコマンド           |
| `mo clean`     | `broom clean`     | ディープクリーンアップ   |
| `mo uninstall` | `broom uninstall` | アプリのアンインストール |
| `mo optimize`  | `broom optimize`  | システム最適化           |
| `mo analyze`   | `broom analyze`   | ディスク分析             |
| `mo status`    | `broom status`    | システム監視             |
| `mo purge`     | `broom purge`     | プロジェクトパージ       |
| `mo installer` | `broom installer` | インストーラー削除       |

### ユーティリティコマンド

| mole            | broom              | 説明              |
| --------------- | ------------------ | ----------------- |
| `mo touchid`    | `broom touchid`    | Touch ID 設定     |
| `mo completion` | `broom completion` | シェル補完        |
| `mo update`     | `broom update`     | 自己アップデート  |
| `mo remove`     | `broom remove`     | アンインストール  |
| -               | `broom config`     | 設定管理 (新機能) |

---

## 🔧 オプション対応表

### clean コマンド

| mole オプション        | broom オプション                    | 説明               |
| ---------------------- | ----------------------------------- | ------------------ |
| `mo clean --dry-run`   | `broom clean --dry-run` または `-n` | プレビューモード   |
| `mo clean --yes`       | `broom clean --yes` または `-y`     | 確認スキップ       |
| `mo clean --debug`     | `broom clean --debug`               | デバッグモード     |
| `mo clean --whitelist` | `broom config` 経由                 | ホワイトリスト管理 |
| `mo clean --all`       | `broom clean --all` または `-a`     | 全カテゴリ対象     |

### status コマンド

| mole オプション | broom オプション | 説明                       |
| --------------- | ---------------- | -------------------------- |
| `mo status`     | `broom status`   | TUI ダッシュボード         |
| キー `k`        | キー `b`         | 箒🧹アニメーション表示切替 |
| キー `q`        | キー `q`         | 終了                       |

### optimize コマンド

| mole オプション           | broom オプション           | 説明             |
| ------------------------- | -------------------------- | ---------------- |
| `mo optimize --dry-run`   | `broom optimize --dry-run` | プレビューモード |
| `mo optimize --debug`     | 未実装                     | デバッグモード   |
| `mo optimize --whitelist` | 未実装                     | 除外ルール管理   |

### purge コマンド

| mole オプション      | broom オプション        | 説明                   |
| -------------------- | ----------------------- | ---------------------- |
| `mo purge`           | `broom purge`           | インタラクティブモード |
| `mo purge --paths`   | `broom purge --path`    | スキャンパス指定       |
| `mo purge --dry-run` | `broom purge --dry-run` | プレビューモード       |

---

## 💡 使用例の比較

### システムクリーンアップ

**mole:**

```bash
mo clean
mo clean --dry-run
mo clean --all --yes
```

**broom:**

```bash
broom clean
broom clean --dry-run  # または -n
broom clean --all --yes  # または -a -y
```

### アプリのアンインストール

**mole:**

```bash
mo uninstall
```

**broom:**

```bash
broom uninstall
```

### システム監視

**mole:**

```bash
mo status
# 'k' キーで猫表示切替
# 'q' キーで終了
```

**broom:**

```bash
broom status
broom status --interval 5  # 5秒間隔で更新
# 'q' または Ctrl+C で終了
```

### プロジェクトパージ

**mole:**

```bash
mo purge
mo purge --paths ~/projects
```

**broom:**

```bash
broom purge
broom purge --path ~/projects
```

### Touch ID 設定

**mole:**

```bash
mo touchid
```

**broom:**

```bash
broom touchid
broom touchid enable
broom touchid disable
broom touchid status
```

### シェル補完

**mole:**

```bash
mo completion
```

**broom:**

```bash
broom completion bash
broom completion zsh
broom completion fish
```

---

## ⚙️ 設定の移行

### mole の設定

mole は設定ファイルを使用しませんでした。ホワイトリストは `--whitelist` オプションで管理されていました。

### broom の設定

broom は `~/.config/broom/config.json` に設定を保存します。

```json
{
  "dryRun": false,
  "whitelist": [],
  "defaultCategories": []
}
```

**設定の管理:**

```bash
# 設定を表示
broom config show

# 設定を変更
broom config set dryRun true
broom config set whitelist '["~/Library/Caches/keep-this"]'

# デフォルトにリセット
broom config reset

# 設定ファイルのパスを表示
broom config path
```

---

## 🆕 broom の新機能

### 1. 設定管理コマンド

```bash
broom config          # 設定を表示
broom config show     # 設定を表示
broom config set <key> <value>  # 設定を変更
broom config reset    # リセット
broom config path     # パス表示
```

### 2. より詳細なオプション

- `-n` / `--dry-run` の短縮形
- `-y` / `--yes` の短縮形
- `-a` / `--all` の短縮形

### 3. touchid サブコマンド

```bash
broom touchid enable   # 有効化
broom touchid disable  # 無効化
broom touchid status   # ステータス確認
```

### 4. completion サブコマンド

```bash
broom completion bash  # Bash 補完
broom completion zsh   # Zsh 補完
broom completion fish  # Fish 補完
```

---

## ⚠️ 注意点

### 実装済み機能

以下の機能が新たに追加・実装されました：

1. **`--debug` オプション**: 詳細なデバッグログを出力
2. **箒🧹アニメーション**: `broom status` で箒が掃除するアニメーション
3. **グローバルデバッグ**: `broom --debug <command>` でどのコマンドでもデバッグ可能

### 未実装の機能

以下の mole 機能は broom では未実装です：

1. **インタラクティブメニュー**: `mo` を引数なしで実行した時のメニュー
2. **Vim キーバインド**: `h/j/k/l` でのナビゲーション（一部のみ対応）

### 動作の違い

1. **status コマンド**:
   - mole: Go の TUI ライブラリ + 猫表示
   - broom: blessed (Node.js) + 箒🧹アニメーション
   - レイアウトは同等、キー操作は `k`→`b` に変更

2. **パフォーマンス**:
   - mole: Go のネイティブバイナリ
   - broom: Node.js ランタイムが必要
   - 大量のファイルスキャン時に差が出る可能性

3. **インストール**:
   - mole: `brew install mole` または インストールスクリプト
   - broom: `npm install -g broom` または ローカルビルド

---

## 🔀 エイリアス設定

mole と同じコマンド名を使いたい場合は、エイリアスを設定できます。

### Bash / Zsh

```bash
# ~/.bashrc または ~/.zshrc に追加
alias mo="broom"
```

### Fish

```fish
# ~/.config/fish/config.fish に追加
alias mo="broom"
```

これにより、既存の `mo` コマンドと同じように使用できます：

```bash
mo clean
mo status
mo uninstall
```

---

## 📝 移行チェックリスト

- [ ] Node.js がインストールされていることを確認
- [ ] broom をインストール
- [ ] エイリアスを設定 (任意)
- [ ] シェル補完を設定
- [ ] ホワイトリストを `broom config` に移行
- [ ] 既存のスクリプトの `mo` を `broom` に置き換え (またはエイリアスを使用)
