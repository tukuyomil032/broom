# broom - macOS Disk Cleanup CLI

> A complete TypeScript rewrite of [mole](https://github.com/tw93/Mole)

Broom is a full TypeScript + Node.js rewrite of "mole", a macOS disk cleanup CLI originally written in Shell + Go + Makefile.

---

## 📋 Documentation Index

- **[COMMANDS.md](COMMANDS.md)** - Complete command reference
- **[HTML_REPORT.md](HTML_REPORT.md)** - HTML report features
- **[SCANNERS.md](SCANNERS.md)** - Scanner implementation details
- **[README.md](README.md)** - This file (Project overview)

**Languages:**

- **[English](../en_us/README.md)** - This file
- **[Japanese](../ja_jp/README.md)** - Japanese version

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Quick Start](#quick-start)
- [Key Features](#key-features)
- [Commands](#commands)
- [Comparison with mole](#comparison-with-mole)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Development](#development)

---

## 🎯 Project Overview

### Goals

- Complete TypeScript reimplementation of mole's features
- Maintain command names, options, and UI/UX parity with mole
- Leverage modern Node.js ecosystem
- Add extended features (HTML reports, duplicate finder, etc.)

### Features

| Feature                  | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| **Deep Cleaning**        | Detect and remove caches, logs, browser data, etc.        |
| **Smart Uninstall**      | Completely remove apps and their leftover files           |
| **System Optimization**  | Flush DNS, rebuild Spotlight, etc.                        |
| **Disk Analysis**        | Visualize disk usage with gradient graphs                 |
| **Real-time Monitoring** | TUI dashboard for CPU, memory, disk, network              |
| **Project Purge**        | Clean build artifacts (node_modules, target, build, etc.) |
| **HTML Reports**         | Generate detailed cleanup reports with Chart.js           |
| **Duplicate Finder**     | Hash-based duplicate file detection and removal           |
| **Backup & Restore**     | Safe file backup before cleanup                           |
| **Scheduler**            | Automated periodic cleanup tasks                          |
| **Directory Watch**      | Monitor directory sizes with alerts                       |
| **Touch ID Support**     | Sudo authentication with Touch ID                         |
| **Shell Completion**     | Bash/Zsh/Fish support                                     |

---

## 🚀 Quick Start

```bash
# Installation
git clone https://github.com/tukuyomil032/broom.git
cd broom
bun install
bun run build

# Basic Usage
broom clean                    # Interactive cleanup
broom clean --dry-run          # Preview mode
broom clean --all --yes        # Automatic cleanup
broom clean --report --open    # Generate HTML report

broom analyze                  # Disk analysis
broom status --watch           # System monitoring
broom uninstall                # App removal
```

---

## ✨ Key Features

### 1. Deep Cleaning (`broom clean`)

- **Category-based Scanning**: Organized by safety level
- **Interactive Selection**: Choose categories to clean
- **Dry Run Mode**: Preview without deletion
- **HTML Reports**: Detailed reports with Chart.js
- **Whitelist**: Protect important paths

**Supported Categories:**

- User Cache
- Browser Cache (Chrome, Safari, Firefox, Edge, Brave, Arc)
- Development Cache (npm, yarn, pip, cargo, gradle)
- Xcode DerivedData
- Homebrew Cache
- Docker Cache
- iOS Backups
- Installer Files
- Trash, Downloads (unsafe)

### 2. Disk Analysis (`broom analyze`)

- **Visual Graphs**: Gradient bar charts
- **Gridlines**: Vertical lines every 20%
- **Drill-down**: Deep directory exploration
- **Size Sorting**: Largest items first
- **Customizable**: `--depth`, `--limit` options

### 3. System Monitoring (`broom status`)

- **Real-time Updates**: Live monitoring with `--watch`
- **Comprehensive Metrics**: CPU, memory, disk, network
- **Process Info**: Top processes display
- **Temperature Monitoring**: CPU/GPU temp (if supported)

### 4. HTML Report Feature

Generate HTML reports after cleanup:

```bash
broom clean --report --open
```

**Report Contents:**

- Category breakdown pie chart (Chart.js)
- Disk usage before/after comparison
- List of deleted files
- Statistics (freed space, file count, duration)
- PDF print support

See [HTML_REPORT.md](HTML_REPORT.md) for details.

### 5. Duplicate File Finder (`broom duplicates`)

- **Smart Hashing**: Optimized by file size
- **Interactive Mode**: Choose which files to keep
- **Hardlink Support**: Replace duplicates with hardlinks
- **Clickable Links**: Cmd+click to open in Finder

### 6. Backup & Restore

```bash
broom backup --path ~/Documents --tag "before-cleanup"
broom restore --tag "before-cleanup"
```

---

## 📚 Commands

See [COMMANDS.md](COMMANDS.md) for complete command reference.

### Core Commands

| Command     | Description         | Key Options                                           |
| ----------- | ------------------- | ----------------------------------------------------- |
| `clean`     | Deep cleaning       | `--dry-run`, `--all`, `--yes`, `--unsafe`, `--report` |
| `analyze`   | Disk analysis       | `--path`, `--depth`, `--limit`                        |
| `status`    | System monitoring   | `--watch`, `--interval`                               |
| `uninstall` | App removal         | `--dry-run`, `--yes`                                  |
| `optimize`  | System optimization | `--dry-run`, `--yes`, `--all`                         |

### Utility Commands

| Command      | Description       | Key Options                             |
| ------------ | ----------------- | --------------------------------------- |
| `purge`      | Project cleanup   | `--path`, `--dry-run`, `--yes`          |
| `installer`  | Installer removal | `--dry-run`, `--yes`                    |
| `duplicates` | Duplicate finder  | `--path`, `--min-size`, `--interactive` |
| `reports`    | Report management | `list`, `clean`, `open`                 |
| `backup`     | Create backups    | `--path`, `--tag`                       |
| `restore`    | Restore files     | `--tag`, `--path`                       |

### Configuration Commands

| Command      | Description          | Subcommands                      |
| ------------ | -------------------- | -------------------------------- |
| `config`     | Settings management  | `show`, `set`, `reset`, `path`   |
| `touchid`    | Touch ID setup       | `enable`, `disable`, `status`    |
| `completion` | Shell completion     | `bash`, `zsh`, `fish`, `install` |
| `doctor`     | Health check         | -                                |
| `schedule`   | Scheduler            | `add`, `remove`, `list`          |
| `watch`      | Directory monitoring | `--add`, `--remove`, `--list`    |

---

## 🔄 Comparison with mole

### Command Mapping

| mole            | broom                  | Feature              | Status          |
| --------------- | ---------------------- | -------------------- | --------------- |
| `mo`            | `broom`                | Interactive menu     | ✅ Help display |
| `mo clean`      | `broom clean`          | System cleanup       | ✅ Complete     |
| `mo uninstall`  | `broom uninstall`      | App uninstall        | ✅ Complete     |
| `mo optimize`   | `broom optimize`       | System optimization  | ✅ Complete     |
| `mo analyze`    | `broom analyze`        | Disk analysis        | ✅ Complete     |
| `mo status`     | `broom status`         | Real-time monitoring | ✅ Complete     |
| `mo purge`      | `broom purge`          | Project artifacts    | ✅ Complete     |
| `mo installer`  | `broom installer`      | Installer removal    | ✅ Complete     |
| `mo touchid`    | `broom touchid`        | Touch ID setup       | ✅ Complete     |
| `mo completion` | `broom completion`     | Shell completion     | ✅ Complete     |
| `mo update`     | `broom update`         | Self-update          | ✅ Complete     |
| `mo remove`     | `broom remove`         | Uninstall            | ✅ Complete     |
| -               | `broom config`         | Settings             | ✅ Added        |
| -               | `broom duplicates`     | Duplicate finder     | ✅ Added        |
| -               | `broom reports`        | Report management    | ✅ Added        |
| -               | `broom backup/restore` | Backup               | ✅ Added        |
| -               | `broom schedule`       | Scheduler            | ✅ Added        |
| -               | `broom watch`          | Directory watch      | ✅ Added        |
| -               | `broom doctor`         | Health check         | ✅ Added        |

### Option Mapping

| mole          | broom           | Description                |
| ------------- | --------------- | -------------------------- |
| `--dry-run`   | `-n, --dry-run` | Preview mode (no deletion) |
| `--yes`       | `-y, --yes`     | Skip confirmation          |
| `--all`       | `-a, --all`     | All categories             |
| `--whitelist` | via config      | Exclusion path management  |

---

## 🏗️ Architecture

### Directory Structure

```
src/
├── index.ts              # Main entry point
├── commands/             # CLI commands
│   ├── index.ts          # Command exports
│   ├── clean.ts          # Cleanup command
│   ├── uninstall.ts      # Uninstall command
│   ├── optimize.ts       # Optimization command
│   ├── analyze.ts        # Disk analysis command
│   ├── status.ts         # System monitoring
│   ├── purge.ts          # Project purge
│   ├── installer.ts      # Installer removal
│   ├── duplicates.ts     # Duplicate finder
│   ├── reports.ts        # Report management
│   ├── backup.ts         # Backup/restore
│   ├── touchid.ts        # Touch ID setup
│   ├── completion.ts     # Shell completion
│   ├── config.ts         # Settings management
│   ├── schedule.ts       # Scheduler
│   ├── watch.ts          # Directory watch
│   ├── doctor.ts         # Health check
│   ├── update.ts         # Self-update
│   └── remove.ts         # Uninstall
├── scanners/             # File scanners
│   ├── index.ts          # Scanner exports
│   ├── base.ts           # Base scanner class
│   ├── user-cache.ts     # User cache scanner
│   ├── user-logs.ts      # User logs scanner
│   ├── browser-cache.ts  # Browser cache scanner
│   ├── dev-cache.ts      # Development cache scanner
│   ├── xcode.ts          # Xcode scanner
│   ├── homebrew.ts       # Homebrew scanner
│   ├── docker.ts         # Docker scanner
│   ├── node-modules.ts   # Node modules scanner
│   ├── temp-files.ts     # Temp files scanner
│   ├── trash.ts          # Trash scanner
│   ├── downloads.ts      # Downloads scanner
│   ├── ios-backups.ts    # iOS backups scanner
│   └── installer.ts      # Installer scanner
├── ui/                   # User interface
│   ├── output.ts         # Formatted output
│   └── prompts.ts        # Interactive prompts
├── utils/                # Utility functions
│   ├── fs.ts             # File system utilities
│   ├── config.ts         # Configuration
│   ├── paths.ts          # Path definitions
│   ├── debug.ts          # Debug logging
│   ├── help.ts           # Help formatter
│   └── report.ts         # HTML report generator
├── types/                # TypeScript types
│   └── index.ts          # Type definitions
└── index.ts              # Entry point
```

### Core Design Patterns

1. **Scanner Pattern**: Each cleanup category has its own scanner
2. **Command Pattern**: Each CLI command is a separate module
3. **Strategy Pattern**: Different cleaning strategies for different safety levels
4. **Observer Pattern**: Real-time monitoring and updates
5. **Template Pattern**: Base scanner class for common functionality

---

## 🛠️ Tech Stack

### Core Dependencies

- **TypeScript 5.0+** - Type-safe development
- **Node.js 18+** - Runtime environment
- **Commander.js** - CLI framework
- **@inquirer/prompts** - Interactive prompts
- **chalk** - Terminal styling
- **ora** - Elegant spinners

### Utilities

- **systeminformation** - System metrics
- **fast-glob** - Fast file matching
- **handlebars** - HTML templates
- **cli-progress** - Progress bars

### Development

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **tsup** - TypeScript bundler
- **bun** - Fast package manager

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/tukuyomil032/broom.git
cd broom

# Install dependencies
bun install  # or npm install

# Build the project
bun run build  # or npm run build

# Link globally (optional)
bun link

# Run projects
broom <command> <option>

# or
bun run dev <command> <option>

# or
bun dist/index.js <command> <option>

# CLI help windows
broom --help
```

---

## 🧪 Development

```bash
# Install dependencies
bun install

# Development mode (auto-reload)
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Lint code
bun run lint
bun run lint:fix

# Format code
bun run format
bun run format:check

# Type check
bun run typecheck
```

### Project Scripts

```json
{
  "dev": "tsup --watch",
  "build": "tsup && chmod +x dist/index.js",
  "start": "node dist/index.js",
  "typecheck": "tsc --noEmit",
  "lint": "eslint src",
  "format": "prettier --write src"
}
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License - see the [LICENSE](../../LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by [Mole](https://github.com/tw93/Mole) by [Tw93](https://github.com/tw93)
- Built with modern TypeScript and Node.js ecosystem
- Community contributions and feedback

---

## 🔗 Links

- [GitHub Repository](https://github.com/tukuyomil032/broom)
- [Issue Tracker](https://github.com/tukuyomil032/broom/issues)
- [Main README](../../README.md)
- [Japanese docs](../ja_jp/README.md)

---

Made with ❤️ by the Broom team
