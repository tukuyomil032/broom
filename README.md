# 🧹 Broom

A powerful macOS disk cleanup CLI written in TypeScript. Inspired by [Mole](https://github.com/tw93/Mole).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Usage Examples](#usage-examples)
- [Cleanup Categories](#cleanup-categories)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [Tech Stack](#tech-stack)
- [License](#license)

## ✨ Features

- **🧹 Deep Cleaning** - Remove caches, logs, trash, browser data, and dev artifacts
- **🗑️ Smart Uninstall** - Completely remove apps and their leftover files
- **⚡ System Optimization** - Flush DNS, rebuild Spotlight, purge memory
- **📊 Disk Analysis** - Visualize disk usage with interactive drill-down
- **💻 System Monitoring** - Real-time CPU, memory, disk, and network dashboard
- **🔥 Project Purge** - Clean build artifacts (node_modules, target, dist, etc.)
- **📦 Installer Cleanup** - Find and remove old installer files
- **🔍 Duplicate Finder** - Locate and remove duplicate files
- **📈 HTML Reports** - Generate detailed cleanup reports with charts
- **⚙️ Configuration** - Whitelist/blacklist paths, customize safety levels
- **🩺 Health Check** - Run system diagnostics
- **💾 Backup & Restore** - Safe file backup before cleanup
- **⏰ Scheduler** - Automate cleanup tasks
- **👁️ Directory Watch** - Monitor directory sizes
- **👆 Touch ID** - Sudo authentication with Touch ID
- **📝 Shell Completion** - Tab completion for Bash, Zsh, Fish

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/broom.git
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

## 🎯 Usage

```bash
# Interactive cleanup - scan and select categories
broom clean

# Preview mode - see what would be cleaned
broom clean --dry-run

# Clean all safe categories automatically
broom clean --all --yes

# Generate HTML report after cleanup
broom clean --report --open

# Analyze disk usage
broom analyze

# System status dashboard
broom status --watch

# Complete uninstall of an app
broom uninstall
```

## 📚 Commands

### Core Commands

| Command     | Description                | Key Options                                                     |
| ----------- | -------------------------- | --------------------------------------------------------------- |
| `clean`     | Deep system cleanup        | `--dry-run`, `--all`, `--yes`, `--unsafe`, `--report`, `--open` |
| `analyze`   | Disk space analysis        | `--path <path>`, `--depth <n>`, `--limit <n>`                   |
| `status`    | System resource monitoring | `--watch`, `--interval <ms>`                                    |
| `uninstall` | Remove apps completely     | `--dry-run`, `--yes`                                            |
| `optimize`  | System maintenance         | `--dry-run`, `--yes`, `--all`                                   |

### Utility Commands

| Command      | Description             | Key Options                                           |
| ------------ | ----------------------- | ----------------------------------------------------- |
| `purge`      | Clean project artifacts | `--dry-run`, `--yes`, `--path <path>`                 |
| `installer`  | Remove installer files  | `--dry-run`, `--yes`                                  |
| `duplicates` | Find duplicate files    | `--path <path>`, `--min-size <size>`, `--interactive` |
| `reports`    | Manage cleanup reports  | `list`, `clean`, `open`, `--yes`                      |
| `backup`     | Create file backups     | `--path <path>`, `--tag <name>`                       |
| `restore`    | Restore from backup     | `--tag <name>`, `--path <path>`                       |

### Configuration Commands

| Command      | Description         | Subcommands                                  |
| ------------ | ------------------- | -------------------------------------------- |
| `config`     | Manage settings     | `show`, `set <key> <value>`, `reset`, `path` |
| `touchid`    | Touch ID for sudo   | `enable`, `disable`, `status`                |
| `completion` | Shell completion    | `bash`, `zsh`, `fish`, `install`             |
| `doctor`     | System diagnostics  | -                                            |
| `schedule`   | Automate cleanups   | `add`, `remove`, `list`                      |
| `watch`      | Monitor directories | `--add`, `--remove`, `--list`, `--check`     |

### System Commands

| Command  | Description     | Options     |
| -------- | --------------- | ----------- |
| `update` | Update broom    | -           |
| `remove` | Uninstall broom | `--yes`     |
| `help`   | Display help    | `[command]` |

## 💡 Usage Examples

### Cleanup Operations

```bash
# Interactive cleanup with category selection
broom clean

# Dry run - preview without deleting
broom clean --dry-run

# Clean all safe categories without prompts
broom clean --all --yes

# Include risky categories (downloads, trash)
broom clean --unsafe --yes

# Generate HTML report with charts
broom clean --report --open

# Clean specific categories interactively
broom clean  # then select from menu
```

### Disk Analysis

```bash
# Analyze home directory
broom analyze

# Analyze specific path with depth
broom analyze --path ~/Library --depth 3

# Show top 20 largest items
broom analyze --limit 20

# Analyze entire disk
broom analyze --path / --depth 2
```

### System Monitoring

```bash
# Show current system status
broom status

# Live monitoring dashboard
broom status --watch

# Custom refresh interval (500ms)
broom status --watch --interval 500
```

### App Management

```bash
# Uninstall app with interactive selection
broom uninstall

# Preview uninstall without deleting
broom uninstall --dry-run

# Uninstall without confirmation
broom uninstall --yes
```

### System Optimization

```bash
# Run all optimization tasks
broom optimize --all

# Preview optimization tasks
broom optimize --dry-run

# Tasks include:
# - Flush DNS cache
# - Rebuild Spotlight index
# - Purge memory cache
# - Verify disk
# - Repair permissions
```

### Project Cleanup

```bash
# Clean current directory
broom purge

# Clean specific project
broom purge --path ~/projects/myapp

# Preview what would be cleaned
broom purge --dry-run

# Cleans: node_modules, target, dist, build, .next, etc.
```

### Duplicate Files

```bash
# Find duplicates in home directory
broom duplicates

# Scan specific path with size filter
broom duplicates --path ~/Documents --min-size 1MB

# Interactive mode to choose what to keep
broom duplicates --interactive

# Custom hash algorithm
broom duplicates --hash md5
```

### Reports Management

```bash
# List all generated reports
broom reports
broom reports list

# Delete all reports
broom reports clean

# Delete without confirmation
broom reports clean --yes

# Open latest report in browser
broom reports open
```

### Backup & Restore

```bash
# Backup important files
broom backup --path ~/Documents --tag "before-cleanup"

# List backups
broom backup --list

# Restore from backup
broom restore --tag "before-cleanup"

# Restore to different location
broom restore --tag "backup-001" --path ~/restored
```

### Configuration

```bash
# Show current configuration
broom config show

# Set safety level (safe, moderate, aggressive)
broom config set safetyLevel moderate

# Add path to whitelist
echo ~/important-folder >> ~/.config/broom/whitelist

# View config file location
broom config path

# Reset to defaults
broom config reset
```

### Shell Completion

```bash
# Install for current shell (auto-detect)
broom completion install

# Generate for specific shell
broom completion bash > /usr/local/etc/bash_completion.d/broom
broom completion zsh > ~/.zsh/completions/_broom
broom completion fish > ~/.config/fish/completions/broom.fish

# Zsh manual setup
broom completion zsh > ~/.zsh/completions/_broom
# Add to ~/.zshrc: fpath=(~/.zsh/completions $fpath)
```

### Touch ID Setup

```bash
# Enable Touch ID for sudo
broom touchid enable

# Check status
broom touchid status

# Disable Touch ID
broom touchid disable
```

### Scheduling

```bash
# Schedule weekly cleanup
broom schedule add --weekly

# Schedule daily at 2 AM
broom schedule add --daily --time 02:00

# List scheduled tasks
broom schedule list

# Remove schedule
broom schedule remove <id>
```

### Directory Watch

```bash
# Add directory to watch
broom watch --add --path ~/Downloads --threshold 1GB

# List watched directories
broom watch --list

# Check all watches now
broom watch --check

# Remove watch
broom watch --remove ~/Downloads
```

## 🗂️ Cleanup Categories

## 🗂️ Cleanup Categories

### ✅ Safe (Default)

Always safe to clean without risk of data loss:

- **User Cache** - `~/Library/Caches` (app caches)
- **User Logs** - `~/Library/Logs` (application logs)
- **Browser Cache** - Chrome, Safari, Firefox, Edge, Brave, Arc
- **Temporary Files** - `/tmp`, `/var/folders`

### ⚠️ Moderate (Safe with review)

Generally safe but review before cleaning:

- **Development Cache** - npm, yarn, pip, cargo, gradle, Maven
- **Xcode Cache** - DerivedData, Archives, DeviceSupport
- **Homebrew Cache** - Downloaded packages
- **Docker Cache** - Build cache, unused images
- **Node Modules** - In workspace (check before deleting)
- **iOS Simulator** - Simulator data

### 🚨 Risky (Requires `--unsafe`)

May contain important files - review carefully:

- **Trash** - `~/.Trash` (deleted files)
- **Downloads** - `~/Downloads` (old files)
- **iOS Backups** - iPhone/iPad backups
- **Installer Packages** - `.dmg`, `.pkg` files

## ⚙️ Configuration

### Config Location

- Config directory: `~/.config/broom/`
- Main config: `~/.config/broom/config.json`
- Whitelist: `~/.config/broom/whitelist`
- Reports: `~/.broom/reports/`

### Whitelist Example

Create `~/.config/broom/whitelist`:

```
# Protected paths (one per line)
~/Documents/important-project
~/Library/Application Support/MyApp
/Volumes/External/backup
```

### Config Options

```json
{
  "safetyLevel": "safe", // safe, moderate, aggressive
  "dryRun": false,
  "confirmBeforeDelete": true,
  "excludePaths": [],
  "scanDepth": 3
}
```

### Global Options

All commands support these options:

| Option          | Description              |
| --------------- | ------------------------ |
| `-v, --version` | Display version number   |
| `-h, --help`    | Display help information |
| `--debug`       | Enable debug logging     |

## 📖 Documentation

Detailed documentation available in the `docs/` directory:

- **[COMMANDS.md](docs/COMMANDS.md)** - Complete command reference
- **[HTML_REPORT.md](docs/HTML_REPORT.md)** - HTML report features
- **[SCANNERS.md](docs/SCANNERS.md)** - Scanner implementation details
- **[MIGRATION.md](docs/MIGRATION.md)** - Migration from Mole
- **[README.md](docs/README.md)** - Full project documentation (Japanese)

## 🛠️ Tech Stack

### Core Dependencies

- **TypeScript** - Type-safe development
- **Node.js 18+** - Runtime environment
- **Commander.js** - CLI framework and argument parsing
- **@inquirer/prompts** - Interactive prompts and menus
- **chalk** - Terminal string styling
- **ora** - Elegant terminal spinners

### Utilities

- **systeminformation** - System monitoring and hardware info
- **fast-glob** - Fast file pattern matching
- **handlebars** - HTML template engine for reports
- **cli-progress** - Beautiful progress bars

### Development

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **tsup** - TypeScript bundler
- **bun** - Fast package manager (optional)

## 🏗️ Project Structure

```
broom/
├── src/
│   ├── commands/        # Command implementations
│   │   ├── clean.ts
│   │   ├── analyze.ts
│   │   ├── status.ts
│   │   └── ...
│   ├── scanners/        # File scanners
│   │   ├── base.ts
│   │   ├── browser-cache.ts
│   │   └── ...
│   ├── ui/              # User interface
│   │   ├── output.ts    # Formatted output
│   │   └── prompts.ts   # Interactive prompts
│   ├── utils/           # Utility functions
│   │   ├── fs.ts        # File system utilities
│   │   ├── config.ts    # Configuration
│   │   └── report.ts    # HTML report generator
│   ├── types/           # TypeScript types
│   └── index.ts         # Entry point
├── docs/                # Documentation
├── dist/                # Compiled output
└── package.json
```

## 🧪 Development

```bash
# Install dependencies
bun install

# Development mode with auto-reload
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Lint code
bun run lint

# Format code
bun run format

# Type check
bun run typecheck
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Mole](https://github.com/tw93/Mole) by [Tw93](https://github.com/tw93)
- Built with modern TypeScript and Node.js ecosystem

## 🔗 Links

- [GitHub Repository](https://github.com/tukuyomil032/broom)
- [Issue Tracker](https://github.com/tukuyomil032/issues)
- [Documentation](docs/README.md)

---

Made with ❤️ by the Broom team
