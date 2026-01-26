# 🧹 Broom

A powerful macOS disk cleanup CLI written in TypeScript. Inspired by [Mole](https://github.com/tw93/Mole).

## Features

- **Clean**: Deep system cleanup (caches, logs, trash, browser data, dev artifacts)
- **Uninstall**: Completely remove apps and their leftover files
- **Optimize**: System maintenance tasks (flush DNS, rebuild Spotlight, purge memory)
- **Analyze**: Disk space visualization with drill-down
- **Status**: Real-time system monitoring dashboard
- **Purge**: Clean project-specific build artifacts (node_modules, dist, etc.)
- **Config**: Manage whitelist, blacklist, and settings

## Installation

```bash
# Clone and install
git clone https://github.com/your-username/broom.git
cd broom
bun install
bun run build

# Run
node dist/index.js
# or
bun run start
```

## Usage

```bash
# Show help
broom --help

# Interactive cleanup (scan and select what to clean)
broom clean

# Preview what would be cleaned (no deletions)
broom clean --dry-run

# Clean all safe categories automatically
broom clean --all --yes

# Include risky categories (downloads, etc.)
broom clean --unsafe

# Uninstall an app and its leftovers
broom uninstall

# Analyze disk usage
broom analyze
broom analyze --path ~/Library
broom analyze --depth 2

# System status dashboard
broom status
broom status --watch  # Live monitoring

# System optimization
broom optimize

# Clean project build artifacts
broom purge
broom purge --path /path/to/project

# Manage configuration
broom config
broom config whitelist-add ~/important-folder
broom config safety moderate
```

## Commands

| Command     | Description                            |
| ----------- | -------------------------------------- |
| `clean`     | Scan and clean up disk space           |
| `uninstall` | Remove apps and their leftovers        |
| `optimize`  | System maintenance and optimization    |
| `analyze`   | Analyze disk space usage               |
| `status`    | Show system status and resource usage  |
| `purge`     | Clean project-specific build artifacts |
| `config`    | Manage broom configuration             |

## Cleanup Categories

### Safe (Default)

- User Cache (`~/Library/Caches`)
- User Logs (`~/Library/Logs`)
- Browser Cache (Chrome, Safari, Firefox, Edge, Brave, Arc)
- Temporary Files (`/tmp`, `/var/folders`)

### Moderate

- Development Cache (npm, yarn, pip, cargo, gradle)
- Xcode (DerivedData, Archives, DeviceSupport)
- Homebrew Cache
- Docker (build cache, unused images)
- Node Modules (in workspace)

### Risky (Requires `--unsafe`)

- Trash
- Downloads
- iOS Backups
- Installer Packages

## Configuration

Config files are stored in `~/.config/broom/`:

- `config.json` - Main configuration
- `whitelist` - Protected paths (one per line)

### Whitelist Example

```
# Protected paths
~/Documents/important-project
~/Library/Application Support/MyApp
```

## Tech Stack

- **TypeScript** - Type-safe development
- **Commander.js** - CLI framework
- **@inquirer/prompts** - Interactive prompts
- **chalk** - Terminal styling
- **ora** - Spinners and loading indicators
- **systeminformation** - System monitoring
- **fast-glob** - Fast file pattern matching

## License

MIT
