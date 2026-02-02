# HTMLレポート機能 - 詳細ガイド

---

## 📋 概要

Broomの`clean`コマンドは、クリーンアップの結果を視覚的で詳細なHTMLレポートとして生成できます。このレポートは、削除されたファイル、回収した容量、カテゴリ別の内訳などを見やすいダッシュボード形式で表示します。

### 主な機能

1. **📊 視覚的分析**: Chart.jsによるインタラクティブなグラフ
2. **📝 詳細な監査証跡**: 削除されたすべてのファイルのリスト
3. **💾 履歴管理**: レポートを保存して過去のクリーンアップと比較
4. **🖨️ 印刷/PDF対応**: レポートをPDFとして保存可能
5. **📱 レスポンシブデザイン**: デスクトップ、タブレット、モバイルで最適表示

---

## 🚀 使い方

### 基本的な使用方法

```bash
# クリーンアップを実行してレポートを生成
broom clean --report

# レポートを生成して自動的にブラウザで開く
broom clean --report --open

# 全カテゴリをクリーンアップしてレポート生成
broom clean --all --report --open

# ドライランでは生成されない（実際の削除が必要）
broom clean --dry-run --report  # ❌ レポートは生成されない
```

### コマンドオプション

| オプション | 短縮形 | 説明                                         |
| ---------- | ------ | -------------------------------------------- |
| `--report` | `-r`   | クリーンアップ後にHTMLレポートを生成         |
| `--open`   | `-o`   | 生成したレポートを自動的にブラウザで開く     |
| `--all`    | `-a`   | 全カテゴリをクリーンアップ（プロンプトなし） |
| `--yes`    | `-y`   | 確認プロンプトをスキップ                     |
| `--unsafe` | なし   | リスキーなカテゴリも含める                   |

---

│ ┌──────────────────────────────────────────────────┐ │
│ │ File Path │ Size │ Category │ │
│ ├──────────────────────────────────────────────────┤ │
│ │ ~/Library/Caches/... │ 2.3 GB │ User Cache │ │
│ │ ~/Downloads/installer │ 850 MB │ Installer │ │
│ └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

````

---

## 🔧 技術仕様

### データ構造

```typescript
interface CleanupReport {
  metadata: ReportMetadata;
  summary: CleanupSummary;
  categories: CategoryBreakdown[];
  files: DeletedFile[];
  timeline: TimelineEntry[];
  beforeAfter: DiskComparison;
}

interface ReportMetadata {
  generatedAt: Date;
  broomVersion: string;
  command: string;
  options: Record<string, any>;
  hostname: string;
  username: string;
}

interface CleanupSummary {
  totalFilesDeleted: number;
  totalSpaceFreed: number; // bytes
  timeElapsed: number; // milliseconds
  status: 'success' | 'partial' | 'failed';
  errors: string[];
}

interface CategoryBreakdown {
  name: string;
  filesDeleted: number;
  spaceFreed: number;
  percentage: number;
  color: string; // for chart
}

interface DeletedFile {
  path: string;
  size: number;
  category: string;
  deletedAt: Date;
  scanner: string;
}

interface TimelineEntry {
  timestamp: Date;
  action: string;
  filesDeleted: number;
  spaceFreed: number;
}

interface DiskComparison {
  before: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  after: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
}
````

### HTMLテンプレート構造

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Broom Cleanup Report - {{date}}</title>

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- Chart.js CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <style>
      @media print {
        .no-print {
          display: none;
        }
      }
    </style>
  </head>
  <body class="bg-gray-50">
    <!-- Header -->
    <header class="bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-6">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl font-bold">🧹 Broom Cleanup Report</h1>
        <p class="text-cyan-100">Generated on {{date}}</p>
      </div>
    </header>

    <!-- Summary Cards -->
    <section class="container mx-auto px-4 py-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Card 1: Space Freed -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="text-gray-600 text-sm">Space Freed</div>
          <div class="text-3xl font-bold text-green-600">{{spaceFreed}}</div>
        </div>
        <!-- ... more cards -->
      </div>
    </section>

    <!-- Charts -->
    <section class="container mx-auto px-4 py-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Pie Chart -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-xl font-semibold mb-4">Category Breakdown</h3>
          <canvas id="categoryChart"></canvas>
        </div>

        <!-- Timeline Chart -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-xl font-semibold mb-4">Cleanup Progress</h3>
          <canvas id="timelineChart"></canvas>
        </div>
      </div>
    </section>

    <!-- Files Table -->
    <section class="container mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-semibold mb-4">Deleted Files</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full table-auto">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left">File Path</th>
                <th class="px-4 py-2 text-left">Size</th>
                <th class="px-4 py-2 text-left">Category</th>
                <th class="px-4 py-2 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {{#each files}}
              <tr class="border-t">
                <td class="px-4 py-2 font-mono text-sm">{{path}}</td>
                <td class="px-4 py-2">{{size}}</td>
                <td class="px-4 py-2">
                  <span class="px-2 py-1 rounded text-xs bg-{{color}}-100 text-{{color}}-800">
                    {{category}}
                  </span>
                </td>
                <td class="px-4 py-2 text-gray-600">{{time}}</td>
              </tr>
              {{/each}}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Chart Scripts -->
    <script>
      // Category Pie Chart
      const categoryCtx = document.getElementById('categoryChart').getContext('2d');
      new Chart(categoryCtx, {
          type: 'doughnut',
          data: {
              labels: {{categoryLabels}},
              datasets: [{
                  data: {{categoryData}},
                  backgroundColor: {{categoryColors}}
              }]
          },
          options: {
              responsive: true,
              plugins: {
                  legend: { position: 'bottom' }
              }
          }
      });

      // Timeline Chart
      const timelineCtx = document.getElementById('timelineChart').getContext('2d');
      new Chart(timelineCtx, {
          type: 'line',
          data: {
              labels: {{timelineLabels}},
              datasets: [{
                  label: 'Space Freed (GB)',
                  data: {{timelineData}},
                  borderColor: 'rgb(59, 130, 246)',
                  tension: 0.4
              }]
          },
          options: {
              responsive: true,
              scales: {
                  y: { beginAtZero: true }
              }
          }
      });
    </script>

    <!-- Export Buttons -->
    <div class="container mx-auto px-4 py-8 no-print">
      <button
        onclick="window.print()"
        class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
      >
        📄 Export as PDF
      </button>
    </div>
  </body>
</html>
```

---

## 📊 チャート詳細

### 1. Category Breakdown (ドーナツチャート)

**目的**: どのカテゴリが最も容量を占めていたかを視覚化

**データ**:

```javascript
{
  labels: ['User Cache', 'Browser Cache', 'Logs', 'Trash', 'Dev Cache'],
  data: [45.2, 23.8, 12.5, 8.9, 9.6], // GB
  colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
}
```

### 2. Cleanup Progress (折れ線グラフ)

**目的**: クリーンアップの進行状況を時系列で表示

**データ**:

```javascript
{
  labels: ['00:00', '00:30', '01:00', '01:30', '02:00'],
  data: [0, 25.3, 48.7, 78.2, 125.5] // 累積GB
}
```

### 3. Before/After Comparison (棒グラフ)

**目的**: ディスク使用率のビフォーアフター比較

**データ**:

```javascript
{
  labels: ['Before', 'After'],
  datasets: [
    { label: 'Used', data: [450, 325], color: '#EF4444' },
    { label: 'Free', data: [50, 175], color: '#10B981' }
  ]
}
```

---

## 💾 データ保存

### ファイル構造

```
~/.config/broom/
├── reports/
│   ├── 2026-02-02_14-30-25.html
│   ├── 2026-02-02_14-30-25.json  (生データ)
│   ├── 2026-02-01_09-15-10.html
│   └── index.json  (レポート一覧)
```

### index.json

```json
{
  "reports": [
    {
      "id": "2026-02-02_14-30-25",
      "timestamp": "2026-02-02T14:30:25Z",
      "spaceFreed": 135000000000,
      "filesDeleted": 1234,
      "status": "success"
    }
  ]
}
```

---

## 📝 使用例

### 基本的な使用

```bash
# クリーンアップしてレポート生成
broom clean --report ~/cleanup-report.html

# レポートをデフォルトの場所に保存
broom clean --report

# レポート一覧
broom report list

# 特定のレポートを開く
broom report open 2026-02-02_14-30-25

# 2つのレポートを比較
broom report compare 2026-02-01_09-15-10 2026-02-02_14-30-25
```

### 高度な使用

```bash
# JSON形式でレポート出力
broom clean --report report.json --format json

# レポートを自動的にブラウザで開く
broom clean --report --open

# メール送信（SMTPサーバー経由）
broom clean --report --email admin@example.com
```

---

## 🎯 利点

### ユーザー視点

1. **視覚的理解**: 何が削除されたかすぐにわかる
2. **安心感**: 詳細な記録で後から確認可能
3. **共有可能**: HTMLなのでどこでも開ける

### 管理者視点

1. **監査**: システム管理の記録として保存
2. **トレンド分析**: 時系列でディスク使用傾向を把握
3. **レポーティング**: 上司やチームへの報告資料

### 開発者視点

1. **デバッグ**: クリーンアップの詳細を確認
2. **統計**: パフォーマンス改善のデータ
3. **拡張性**: JSON形式で他ツールとの連携

---

## 🛠️ 技術的な実装詳細

### テンプレートエンジン

**選択**: Handlebars.js

```typescript
import Handlebars from 'handlebars';

// カスタムヘルパー
Handlebars.registerHelper('formatSize', (bytes: number) => {
  return formatSize(bytes);
});

Handlebars.registerHelper('formatDate', (date: Date) => {
  return date.toLocaleString('ja-JP');
});

// テンプレートコンパイル
const template = Handlebars.compile(templateSource);
const html = template(reportData);
```

### データ集約

```typescript
class ReportGenerator {
  private startTime: Date;
  private timeline: TimelineEntry[] = [];
  private deletedFiles: DeletedFile[] = [];

  start() {
    this.startTime = new Date();
  }

  recordDeletion(file: string, size: number, category: string) {
    this.deletedFiles.push({
      path: file,
      size,
      category,
      deletedAt: new Date(),
      scanner: currentScanner,
    });

    // Timeline entry (every 30 seconds)
    if (this.shouldCreateTimelineEntry()) {
      this.timeline.push({
        timestamp: new Date(),
        action: 'cleanup',
        filesDeleted: this.deletedFiles.length,
        spaceFreed: this.calculateTotalSize(),
      });
    }
  }

  async generate(): Promise<string> {
    const report: CleanupReport = {
      metadata: this.generateMetadata(),
      summary: this.generateSummary(),
      categories: this.generateCategoryBreakdown(),
      files: this.deletedFiles,
      timeline: this.timeline,
      beforeAfter: this.generateComparison(),
    };

    return await this.renderHTML(report);
  }
}
```

---

## 📚 参考リソース

- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Handlebars.js](https://handlebarsjs.com/)
- [HTML to PDF Best Practices](https://www.smashingmagazine.com/2018/05/print-stylesheets-in-2018/)

---
