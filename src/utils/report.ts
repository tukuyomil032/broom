/**
 * HTML Report Generator
 */
import Handlebars from 'handlebars';
import { formatSize } from '../utils/fs.js';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { expandPath } from '../utils/fs.js';

export interface CleanupReport {
  metadata: {
    generatedAt: Date;
    broomVersion: string;
    command: string;
    hostname: string;
    username: string;
  };
  summary: {
    totalFilesDeleted: number;
    totalSpaceFreed: number;
    timeElapsed: number;
    status: 'success' | 'partial' | 'failed';
    errors: string[];
  };
  categories: Array<{
    name: string;
    filesDeleted: number;
    spaceFreed: number;
    percentage: number;
    color: string;
  }>;
  files: Array<{
    path: string;
    size: number;
    category: string;
    deletedAt: Date;
  }>;
  diskComparison: {
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
  };
}

// Register Handlebars helpers
Handlebars.registerHelper('formatSize', (bytes: number) => {
  return formatSize(bytes);
});

Handlebars.registerHelper('formatDate', (date: Date) => {
  return new Date(date).toLocaleString('ja-JP');
});

Handlebars.registerHelper('formatDuration', (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}時間${minutes % 60}分${seconds % 60}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
});

Handlebars.registerHelper('toFixed', (num: number, decimals: number) => {
  return num.toFixed(decimals);
});

Handlebars.registerHelper('json', (obj: any) => {
  return JSON.stringify(obj);
});

// Comparison helper
Handlebars.registerHelper('eq', (a: any, b: any) => {
  return a === b;
});

// Greater than helper
Handlebars.registerHelper('gt', (a: number, b: number) => {
  return a > b;
});

// Map helper - extract property from array
Handlebars.registerHelper('map', (array: any[], property: string) => {
  if (!Array.isArray(array)) return [];
  return array.map((item) => item[property]);
});

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Broom Cleanup Report - {{formatDate metadata.generatedAt}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @media print {
            .no-print { display: none; }
            body { background: white; }
        }
        @page {
            margin: 2cm;
        }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Header -->
    <header class="bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-8 no-print">
        <div class="container mx-auto px-4">
            <h1 class="text-4xl font-bold flex items-center gap-2">
                🧹 Broom Cleanup Report
            </h1>
            <p class="text-cyan-100 mt-2">{{formatDate metadata.generatedAt}}</p>
        </div>
    </header>

    <!-- Summary Cards -->
    <section class="container mx-auto px-4 py-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <!-- Space Freed -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="text-gray-600 text-sm font-medium">回収した容量</div>
                <div class="text-3xl font-bold text-green-600 mt-2">{{formatSize summary.totalSpaceFreed}}</div>
                <div class="text-gray-500 text-xs mt-1">{{summary.totalFilesDeleted}} ファイル</div>
            </div>

            <!-- Files Deleted -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="text-gray-600 text-sm font-medium">削除ファイル数</div>
                <div class="text-3xl font-bold text-blue-600 mt-2">{{summary.totalFilesDeleted}}</div>
                <div class="text-gray-500 text-xs mt-1">合計</div>
            </div>

            <!-- Time Elapsed -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="text-gray-600 text-sm font-medium">処理時間</div>
                <div class="text-3xl font-bold text-purple-600 mt-2">{{formatDuration summary.timeElapsed}}</div>
                <div class="text-gray-500 text-xs mt-1">経過時間</div>
            </div>

            <!-- Status -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="text-gray-600 text-sm font-medium">ステータス</div>
                <div class="text-3xl font-bold {{#if (eq summary.status 'success')}}text-green-600{{else}}text-yellow-600{{/if}} mt-2">
                    {{#if (eq summary.status 'success')}}✓ 成功{{else}}⚠ 部分的{{/if}}
                </div>
                <div class="text-gray-500 text-xs mt-1">完了</div>
            </div>
        </div>
    </section>

    <!-- Charts -->
    <section class="container mx-auto px-4 py-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Category Breakdown -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-xl font-semibold mb-4">カテゴリ別内訳</h3>
                <div class="h-64">
                    <canvas id="categoryChart"></canvas>
                </div>
            </div>

            <!-- Disk Comparison -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-xl font-semibold mb-4">ディスク使用量の変化</h3>
                <div class="h-64">
                    <canvas id="diskChart"></canvas>
                </div>
            </div>
        </div>
    </section>

    <!-- Files Table -->
    <section class="container mx-auto px-4 py-8">
        <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-xl font-semibold mb-4">削除されたファイル</h3>
            <div class="overflow-x-auto">
                <table class="min-w-full table-auto">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">パス</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">サイズ</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">カテゴリ</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">削除時刻</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        {{#each files}}
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3 font-mono text-xs text-gray-800">{{this.path}}</td>
                            <td class="px-4 py-3 text-sm">{{formatSize this.size}}</td>
                            <td class="px-4 py-3">
                                <span class="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                    {{this.category}}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-600">{{formatDate this.deletedAt}}</td>
                        </tr>
                        {{/each}}
                    </tbody>
                </table>
            </div>
        </div>
    </section>

    <!-- Metadata -->
    <section class="container mx-auto px-4 py-8">
        <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-xl font-semibold mb-4">実行情報</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <span class="text-gray-600">コマンド:</span>
                    <code class="ml-2 px-2 py-1 bg-gray-100 rounded">{{metadata.command}}</code>
                </div>
                <div>
                    <span class="text-gray-600">Broomバージョン:</span>
                    <span class="ml-2 font-mono">{{metadata.broomVersion}}</span>
                </div>
                <div>
                    <span class="text-gray-600">ホスト名:</span>
                    <span class="ml-2 font-mono">{{metadata.hostname}}</span>
                </div>
                <div>
                    <span class="text-gray-600">ユーザー:</span>
                    <span class="ml-2 font-mono">{{metadata.username}}</span>
                </div>
            </div>
        </div>
    </section>

    <!-- Export Button -->
    <div class="container mx-auto px-4 py-8 no-print">
        <button onclick="window.print()"
                class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow transition">
            📄 PDFとして保存
        </button>
    </div>

    <!-- Chart Scripts -->
    <script>
        // Category Pie Chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: {{{json (map categories 'name')}}},
                datasets: [{
                    data: {{{json (map categories 'spaceFreed')}}},
                    backgroundColor: {{{json (map categories 'color')}}}
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const size = (value / 1024 / 1024 / 1024).toFixed(2) + ' GB';
                                return label + ': ' + size;
                            }
                        }
                    }
                }
            }
        });

        // Disk Comparison Bar Chart
        const diskCtx = document.getElementById('diskChart').getContext('2d');
        new Chart(diskCtx, {
            type: 'bar',
            data: {
                labels: ['削除前', '削除後'],
                datasets: [
                    {
                        label: '使用中',
                        data: [
                            {{diskComparison.before.used}},
                            {{diskComparison.after.used}}
                        ],
                        backgroundColor: 'rgba(239, 68, 68, 0.8)'
                    },
                    {
                        label: '空き容量',
                        data: [
                            {{diskComparison.before.free}},
                            {{diskComparison.after.free}}
                        ],
                        backgroundColor: 'rgba(16, 185, 129, 0.8)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: {
                        stacked: true,
                        ticks: {
                            callback: function(value) {
                                return (value / 1024 / 1024 / 1024 / 1024).toFixed(1) + ' TB';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                const size = (value / 1024 / 1024 / 1024).toFixed(2) + ' GB';
                                return label + ': ' + size;
                            }
                        }
                    }
                }
            }
        });

        // Helper for mapping arrays
        Handlebars.registerHelper('map', function(array, property) {
            return array.map(item => item[property]);
        });

        Handlebars.registerHelper('eq', function(a, b) {
            return a === b;
        });
    </script>

    <footer class="container mx-auto px-4 py-8 text-center text-gray-600 text-sm">
        <p>Generated by Broom v{{metadata.broomVersion}} - macOS Disk Cleanup Tool</p>
    </footer>
</body>
</html>`;

export class ReportGenerator {
  private startTime: Date;
  private deletedFiles: Array<{
    path: string;
    size: number;
    category: string;
    deletedAt: Date;
  }> = [];
  private categories = new Map<
    string,
    { filesDeleted: number; spaceFreed: number; color: string }
  >();
  private beforeDisk: { total: number; used: number; free: number; percentage: number } | null =
    null;

  constructor() {
    this.startTime = new Date();
  }

  /**
   * Record disk state before cleanup
   */
  recordDiskBefore(disk: { total: number; used: number; free: number; percentage: number }) {
    this.beforeDisk = disk;
  }

  /**
   * Record a file deletion
   */
  recordDeletion(file: string, size: number, category: string) {
    this.deletedFiles.push({
      path: file,
      size,
      category,
      deletedAt: new Date(),
    });

    // Update category stats
    const existing = this.categories.get(category) || {
      filesDeleted: 0,
      spaceFreed: 0,
      color: this.getCategoryColor(category),
    };
    existing.filesDeleted++;
    existing.spaceFreed += size;
    this.categories.set(category, existing);
  }

  /**
   * Get color for category
   */
  private getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'User Cache': '#3B82F6',
      'Browser Cache': '#10B981',
      Logs: '#F59E0B',
      Trash: '#EF4444',
      'Dev Cache': '#8B5CF6',
      Xcode: '#EC4899',
      Installer: '#6366F1',
      Downloads: '#F97316',
    };
    return colors[category] || '#6B7280';
  }

  /**
   * Generate HTML report
   */
  async generate(
    outputPath: string,
    afterDisk: { total: number; used: number; free: number; percentage: number }
  ): Promise<void> {
    const { hostname } = await import('os');
    const { execSync } = await import('child_process');

    const username = execSync('whoami').toString().trim();

    // Calculate summary
    const totalSpaceFreed = this.deletedFiles.reduce((sum, f) => sum + f.size, 0);
    const timeElapsed = Date.now() - this.startTime.getTime();

    // Prepare category data
    const categoryData = Array.from(this.categories.entries()).map(([name, data]) => ({
      name,
      filesDeleted: data.filesDeleted,
      spaceFreed: data.spaceFreed,
      percentage: (data.spaceFreed / totalSpaceFreed) * 100,
      color: data.color,
    }));

    const report: CleanupReport = {
      metadata: {
        generatedAt: new Date(),
        broomVersion: '1.0.0',
        command: process.argv.slice(2).join(' '),
        hostname: hostname(),
        username,
      },
      summary: {
        totalFilesDeleted: this.deletedFiles.length,
        totalSpaceFreed,
        timeElapsed,
        status: 'success',
        errors: [],
      },
      categories: categoryData,
      files: this.deletedFiles,
      diskComparison: {
        before: this.beforeDisk || afterDisk,
        after: afterDisk,
      },
    };

    // Compile template
    const template = Handlebars.compile(HTML_TEMPLATE);
    const html = template(report);

    // Ensure directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    // Write HTML file
    await writeFile(outputPath, html, 'utf-8');
  }
}
