# HTML Report — Detailed Guide

---

## Overview

Broom's `clean` command can produce a standalone HTML report summarizing what was deleted, how much space was reclaimed, category breakdowns, a timeline of the cleanup, and a table of deleted files. The report is generated from a Handlebars template and uses Chart.js and Tailwind CSS (CDN) for styling and charts.

### Key points

- Interactive charts (Chart.js)
- Full list of deleted files and metadata
- Before/after disk comparison
- Printable / PDF-friendly layout
- Saved to the reports directory (default: `~/.broom/reports/`)

---

## Usage

Generate a report after a cleanup run:

```bash
broom clean --report

# Generate and open the report
broom clean --report --open

# Note: Reports are generated for actual deletions (not dry-run)
broom clean --dry-run --report  # no report will be created
```

### Options

| Option     | Short | Description                              |
| ---------- | ----- | ---------------------------------------- |
| `--report` | `-r`  | Generate HTML report after cleanup       |
| `--open`   | `-o`  | Open the generated report in the browser |

---

## Data model

Reports are produced from a JSON-like data model. Key interfaces used by the generator:

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
  generatedAt: string;
  broomVersion: string;
  command: string;
  options: Record<string, any>;
  hostname: string;
  username: string;
}

interface CleanupSummary {
  totalFilesDeleted: number;
  totalSpaceFreed: number;
  timeElapsed: number;
  status: 'success' | 'partial' | 'failed';
  errors: string[];
}

interface CategoryBreakdown {
  name: string;
  filesDeleted: number;
  spaceFreed: number;
  percentage: number;
  color: string;
}

interface DeletedFile {
  path: string;
  size: number;
  category: string;
  deletedAt: string;
  scanner: string;
}

interface TimelineEntry {
  timestamp: string;
  action: string;
  filesDeleted: number;
  spaceFreed: number;
}

interface DiskComparison {
  before: { total: number; used: number; free: number; percentage: number };
  after: { total: number; used: number; free: number; percentage: number };
}
```

---

## Template notes

The Handlebars template outputs localized labels (English by default) and embeds JSON data for client-side Chart.js rendering. The template includes export/print buttons and is responsive.

Example template excerpt:

````html
# HTML Report — Detailed Guide **Document version**: 2.0 **Last updated**: 2026-02-02 **Status**: ✅
Implemented --- ## Overview Broom's `clean` command generates a detailed HTML report summarizing
deleted files, reclaimed space, category breakdowns, and a cleanup timeline. Reports are produced
via Handlebars templates and use Chart.js + Tailwind CSS (CDN). ### Key features - Interactive
charts (Chart.js) - Full deleted-files audit trail - Before/after disk comparison - Printable /
PDF-friendly layout - Reports saved to `~/.config/broom/reports/` by default --- ## Usage Generate
and optionally open a report: ```bash broom clean --report broom clean --report --open
````

Notes:

- Reports are created only for actual deletions (not for `--dry-run`).

---

## Data model

The report generator consumes a structured data model. Relevant interfaces:

```ts
interface CleanupReport {
  metadata: ReportMetadata;
  summary: CleanupSummary;
  categories: CategoryBreakdown[];
  files: DeletedFile[];
  timeline: TimelineEntry[];
  beforeAfter: DiskComparison;
}
```

---

## Template & charts

The Handlebars template renders summary cards, three charts (category breakdown, timeline, before/after comparison), and a paginated table of deleted files. Charts are rendered client-side using embedded JSON.

Example: category doughnut chart

```js
new Chart(document.getElementById('categoryChart'), {
  type: 'doughnut',
  data: {
    labels: {{json categories.labels}},
    datasets: [{ data: {{json categories.data}}, backgroundColor: {{json categories.colors}} }]
  }
});
```

The template includes export buttons (`window.print()`) and is responsive via Tailwind CSS.

---

## Storage

Default layout under `~/.config/broom/reports/`:

```
~/.config/broom/
└── reports/
    ├── 2026-02-02_14-30-25.html
    ├── 2026-02-02_14-30-25.json
    └── index.json
```

`index.json` contains a short list of reports with metadata for quick listing in the CLI.

---

## Integration notes

- The generator is implemented in `src/utils/report.ts` and uses Handlebars helpers registered in code (formatSize, formatDate, json, etc.).
- Reports are written as both HTML and raw JSON (for programmatic processing).
- `--open` uses the macOS `open` command to launch the report in the default browser.

---

## Examples

```bash
# Generate report and save to default location
broom clean --report

# Generate and open
broom clean --report --open

# List reports
broom reports list

# Open a specific report
broom reports open 2026-02-02_14-30-25
```

---

## Implementation checklist

- [x] Collect per-scanner data (files/deleted sizes)
- [x] Produce JSON snapshot for each run
- [x] Handlebars templates + Tailwind layout
- [x] Chart.js integration for 3 charts
- [x] CLI commands to list/clean/open reports

---

For implementation details, see `src/utils/report.ts` and the Handlebars templates in the repository.

### Phase 4: PDF Export (1 hour)

- [ ] Optimize `window.print()`
- [ ] Adjust print CSS
- [ ] Control page breaks

### Phase 5: CLI Integration (30 minutes)

- [ ] Add `--report <path>` option
- [ ] Add report listing command
- [ ] Add report comparison feature

---

## Examples

### Basic usage

```bash
# Generate report for a cleanup run
broom clean --report ~/cleanup-report.html

# Save report to default location
broom clean --report

# List reports
broom reports list

# Open a specific report
broom reports open 2026-02-02_14-30-25

# Compare two reports
broom reports compare 2026-02-01_09-15-10 2026-02-02_14-30-25
```

### Advanced usage

```bash
# Output report as JSON
broom clean --report report.json --format json

# Open report automatically in browser
broom clean --report --open

# Send report by email (via SMTP)
broom clean --report --email admin@example.com
```

---

## 🎯 Benefits

### User perspective

1. **Visual clarity**: Quickly see what was deleted
2. **Auditability**: Detailed records for later inspection
3. **Shareable**: HTML reports are widely viewable

### Administrator perspective

1. **Auditing**: Keep records for system administration
2. **Trend analysis**: Observe disk-usage trends over time
3. **Reporting**: Material for team or manager reports

### Developer perspective

1. **Debugging**: Inspect cleanup details for troubleshooting
2. **Metrics**: Data for performance improvement
3. **Extensibility**: JSON format allows integration with other tools

---

## 🔮 Future enhancements

### v2.0 features

- **Realtime reports**: Show progress via WebSockets
- **Dashboard**: Aggregate multiple reports into a single view
- **AI analysis**: Suggest optimal cleanup schedules from patterns

### Integrations

- **Slack/Discord notifications**: Notify on cleanup completion
- **Dropbox/Google Drive**: Auto-upload reports
- **Grafana**: Send metrics to Grafana

---

## 🛠️ Implementation details

### Template engine

**Choice**: Handlebars.js

```typescript
import Handlebars from 'handlebars';

// Custom helpers
Handlebars.registerHelper('formatSize', (bytes: number) => {
  return formatSize(bytes);
});

Handlebars.registerHelper('formatDate', (date: Date) => {
  return date.toLocaleString('en-US');
});

// Compile template
const template = Handlebars.compile(templateSource);
const html = template(reportData);
```

### Data aggregation

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

## 📚 References

- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Handlebars.js](https://handlebarsjs.com/)
- [HTML to PDF Best Practices](https://www.smashingmagazine.com/2018/05/print-stylesheets-in-2018/)

---
