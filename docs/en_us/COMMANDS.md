# 📚 Command Reference

Complete reference for all Broom commands.

## Table of Contents

- [Global Options](#global-options)
- [Core Commands](#core-commands)
  - [clean](#clean)
  - [analyze](#analyze)
  - [status](#status)
  - [uninstall](#uninstall)
  - [optimize](#optimize)
- [Utility Commands](#utility-commands)
  - [purge](#purge)
  - [installer](#installer)
  - [duplicates](#duplicates)
  - [reports](#reports)
  - [backup](#backup)
  - [restore](#restore)
- [Configuration Commands](#configuration-commands)
  - [config](#config)
  - [touchid](#touchid)
  - [completion](#completion)
  - [doctor](#doctor)
  - [schedule](#schedule)
  - [watch](#watch)
- [System Commands](#system-commands)
  - [update](#update)
  - [remove](#remove)
  - [help](#help)

---

## Global Options

Available for all commands:

| Option      | Short | Description                          |
| ----------- | ----- | ------------------------------------ |
| `--version` | `-v`  | Display version number               |
| `--help`    | `-h`  | Display help for command             |
| `--debug`   | -     | Enable debug mode with detailed logs |

---

## Core Commands

### clean

Deep system cleanup - scan and remove caches, logs, and junk files.

```bash
broom clean [options]
```

#### Options

| Option      | Short | Description                                 |
| ----------- | ----- | ------------------------------------------- |
| `--dry-run` | `-n`  | Preview only, no deletions                  |
| `--all`     | `-a`  | Clean all categories without prompting      |
| `--yes`     | `-y`  | Skip confirmation prompts                   |
| `--unsafe`  | -     | Include risky categories (trash, downloads) |
| `--report`  | `-r`  | Generate HTML report after cleanup          |
| `--open`    | `-o`  | Open report in browser after generation     |

#### Examples

```bash
# Interactive mode - select categories
broom clean

# Preview what would be cleaned
broom clean --dry-run

# Clean all safe categories automatically
broom clean --all --yes

# Clean with HTML report
broom clean --report --open

# Include risky categories
broom clean --unsafe --yes
```

#### Categories Cleaned

**Safe (Default):**

- User Cache (`~/Library/Caches`)
- User Logs (`~/Library/Logs`)
- Browser Cache (Chrome, Safari, Firefox, etc.)
- Temporary Files

**Moderate (with selection):**

- Development Cache (npm, yarn, pip, etc.)
- Xcode Cache
- Homebrew Cache
- Docker Cache

**Risky (requires `--unsafe`):**

- Trash
- Downloads (old files)
- iOS Backups
- Installer Files

---

### analyze

Analyze disk space usage with visual graphs.

```bash
broom analyze [options]
```

#### Options

| Option             | Short | Description                               |
| ------------------ | ----- | ----------------------------------------- |
| `--path <path>`    | `-p`  | Path to analyze (default: home directory) |
| `--depth <number>` | `-d`  | Scan depth level (default: 1)             |
| `--limit <number>` | `-l`  | Number of items to display (default: 15)  |

#### Examples

```bash
# Analyze home directory
broom analyze

# Analyze specific path with depth
broom analyze --path ~/Library --depth 3

# Show top 20 largest items
broom analyze --limit 20

# Deep dive into a directory
broom analyze --path /var --depth 5 --limit 25
```

#### Features

- **Visual Graphs** - Color-coded bar charts with gridlines
- **Size Sorting** - Largest items first
- **Drill-down** - Navigate deeper into directories
- **Disk Usage** - Overall disk space visualization
- **Quick Analysis** - Common large directories

---

### status

Real-time system monitoring dashboard.

```bash
broom status [options]
```

#### Options

| Option            | Short | Description                                     |
| ----------------- | ----- | ----------------------------------------------- |
| `--watch`         | `-w`  | Live monitoring mode (auto-refresh)             |
| `--interval <ms>` | `-i`  | Update interval in milliseconds (default: 1000) |

#### Examples

```bash
# Show current system status
broom status

# Live monitoring dashboard
broom status --watch

# Custom refresh interval (500ms)
broom status --watch --interval 500
```

#### Metrics Displayed

- **CPU Usage** - Per-core and overall percentage
- **Memory** - Used/free/total with percentage
- **Disk Usage** - All mounted volumes
- **Network** - Upload/download speed
- **System Info** - OS version, uptime, hostname
- **Temperature** - CPU/GPU temperature (if available)
- **Processes** - Top processes by CPU/memory

---

### uninstall

Completely remove apps and their leftover files.

```bash
broom uninstall [options]
```

#### Options

| Option      | Short | Description                |
| ----------- | ----- | -------------------------- |
| `--dry-run` | `-n`  | Preview only, no deletions |
| `--yes`     | `-y`  | Skip confirmation prompts  |

#### Examples

```bash
# Interactive app selection
broom uninstall

# Preview what would be removed
broom uninstall --dry-run

# Uninstall without confirmation
broom uninstall --yes
```

#### What Gets Removed

- **App Bundle** - `/Applications/App.app`
- **Application Support** - `~/Library/Application Support/App`
- **Preferences** - `~/Library/Preferences/com.app.*`
- **Caches** - `~/Library/Caches/com.app.*`
- **Logs** - `~/Library/Logs/App`
- **Saved State** - `~/Library/Saved Application State/com.app.*`
- **Containers** - `~/Library/Containers/com.app.*`
- **Group Containers** - `~/Library/Group Containers/com.app.*`

---

### optimize

System maintenance and optimization tasks.

```bash
broom optimize [options]
```

#### Options

| Option      | Short | Description                |
| ----------- | ----- | -------------------------- |
| `--dry-run` | `-n`  | Preview only, no changes   |
| `--yes`     | `-y`  | Skip confirmation prompts  |
| `--all`     | `-a`  | Run all optimization tasks |

#### Examples

```bash
# Interactive task selection
broom optimize

# Run all tasks
broom optimize --all --yes

# Preview tasks
broom optimize --dry-run
```

#### Optimization Tasks

- **Flush DNS Cache** - Clear DNS resolver cache
- **Rebuild Spotlight** - Reindex Spotlight search
- **Purge Memory** - Free inactive memory
- **Verify Disk** - Check disk integrity
- **Repair Permissions** - Fix file permissions
- **Rebuild Launch Services** - Fix app associations
- **Clear Font Cache** - Reset font cache

---

## Utility Commands

### purge

Clean project-specific build artifacts.

```bash
broom purge [options]
```

#### Options

| Option          | Short | Description                               |
| --------------- | ----- | ----------------------------------------- |
| `--dry-run`     | `-n`  | Preview only, no deletions                |
| `--yes`         | `-y`  | Skip confirmation prompts                 |
| `--path <path>` | `-p`  | Project path (default: current directory) |

#### Examples

```bash
# Clean current directory
broom purge

# Clean specific project
broom purge --path ~/projects/myapp

# Preview what would be cleaned
broom purge --dry-run
```

#### Artifacts Cleaned

- `node_modules/` - Node.js dependencies
- `dist/`, `build/` - Build outputs
- `target/` - Rust/Java builds
- `.next/` - Next.js cache
- `__pycache__/` - Python cache
- `vendor/` - PHP/Ruby dependencies
- `.gradle/` - Gradle cache
- `.turbo/` - Turborepo cache

---

### installer

Find and remove installer files.

```bash
broom installer [options]
```

#### Options

| Option      | Short | Description                |
| ----------- | ----- | -------------------------- |
| `--dry-run` | `-n`  | Preview only, no deletions |
| `--yes`     | `-y`  | Skip confirmation prompts  |

#### Examples

```bash
# Find installer files
broom installer

# Remove without confirmation
broom installer --yes

# Preview installer files
broom installer --dry-run
```

#### File Types Found

- `.dmg` - Disk images
- `.pkg` - Package installers
- `.zip` - Archive files in Downloads
- App installers in common locations

---

### duplicates

Find and remove duplicate files.

```bash
broom duplicates [options]
```

#### Options

| Option               | Short | Description                                     |
| -------------------- | ----- | ----------------------------------------------- |
| `--path <path>`      | `-p`  | Path to scan (default: home directory)          |
| `--min-size <size>`  | -     | Minimum file size (e.g., 1MB, 500KB)            |
| `--hash <algorithm>` | -     | Hash algorithm: md5 or sha256 (default: sha256) |
| `--interactive`      | `-i`  | Interactive mode to choose files to delete      |
| `--delete`           | `-d`  | Automatically delete duplicates (keep first)    |

#### Examples

```bash
# Find duplicates in home directory
broom duplicates

# Scan specific path with size filter
broom duplicates --path ~/Documents --min-size 1MB

# Interactive mode
broom duplicates --interactive

# Custom hash algorithm
broom duplicates --hash md5
```

#### Features

- **Smart Hashing** - Size-based optimization
- **Interactive Selection** - Choose which files to keep
- **Hardlink Support** - Replace duplicates with hardlinks
- **Size Filtering** - Only scan files above threshold
- **Relative Paths** - Easy to identify files
- **File Details** - Show size, modified date, clickable links

---

### reports

Manage cleanup HTML reports.

```bash
broom reports [subcommand] [options]
```

#### Subcommands

| Subcommand | Description                          |
| ---------- | ------------------------------------ |
| `list`     | List all generated reports (default) |
| `clean`    | Delete all reports                   |
| `open`     | Open latest report in browser        |

#### Options

| Option  | Short | Description               |
| ------- | ----- | ------------------------- |
| `--yes` | `-y`  | Skip confirmation prompts |

#### Examples

```bash
# List all reports
broom reports
broom reports list

# Delete all reports
broom reports clean

# Delete without confirmation
broom reports clean --yes

# Open latest report
broom reports open
```

#### Report Features

- **Visual Charts** - Category breakdown, disk comparison
- **Detailed Tables** - All deleted files with paths
- **Statistics** - Space freed, files cleaned, time elapsed
- **Metadata** - Command executed, system info
- **Print Ready** - PDF export support

---

### backup

Create file backups before cleanup.

```bash
broom backup [options]
```

#### Options

| Option          | Short | Description      |
| --------------- | ----- | ---------------- |
| `--path <path>` | `-p`  | Path to backup   |
| `--tag <name>`  | `-t`  | Backup tag/name  |
| `--list`        | `-l`  | List all backups |

#### Examples

```bash
# Backup directory with tag
broom backup --path ~/Documents --tag "before-cleanup"

# List all backups
broom backup --list

# Backup current directory
broom backup --tag "project-backup"
```

---

### restore

Restore files from backup.

```bash
broom restore [options]
```

#### Options

| Option          | Short | Description                                      |
| --------------- | ----- | ------------------------------------------------ |
| `--tag <name>`  | `-t`  | Backup tag to restore                            |
| `--path <path>` | `-p`  | Restore destination (default: original location) |

#### Examples

```bash
# Restore from backup tag
broom restore --tag "before-cleanup"

# Restore to different location
broom restore --tag "backup-001" --path ~/restored
```

---

## Configuration Commands

### config

Manage broom configuration.

```bash
broom config [subcommand] [options]
```

#### Subcommands

| Subcommand          | Description                             |
| ------------------- | --------------------------------------- |
| `show`              | Display current configuration (default) |
| `set <key> <value>` | Set configuration value                 |
| `reset`             | Reset to default configuration          |
| `path`              | Show config file path                   |

#### Examples

```bash
# Show current config
broom config show

# Set safety level
broom config set safetyLevel moderate

# Reset to defaults
broom config reset

# View config file location
broom config path
```

#### Configuration Keys

- `safetyLevel` - `safe`, `moderate`, `aggressive`
- `dryRun` - `true`, `false`
- `confirmBeforeDelete` - `true`, `false`
- `scanDepth` - Number (default: 3)

---

### touchid

Configure Touch ID for sudo authentication.

```bash
broom touchid <subcommand>
```

#### Subcommands

| Subcommand | Description               |
| ---------- | ------------------------- |
| `enable`   | Enable Touch ID for sudo  |
| `disable`  | Disable Touch ID for sudo |
| `status`   | Show Touch ID sudo status |

#### Options

| Option  | Short | Description               |
| ------- | ----- | ------------------------- |
| `--yes` | `-y`  | Skip confirmation prompts |

#### Examples

```bash
# Enable Touch ID
broom touchid enable

# Check status
broom touchid status

# Disable Touch ID
broom touchid disable
```

---

### completion

Generate shell completion scripts.

```bash
broom completion <shell>
```

#### Shells

| Shell     | Description                    |
| --------- | ------------------------------ |
| `bash`    | Bash completion script         |
| `zsh`     | Zsh completion script          |
| `fish`    | Fish completion script         |
| `install` | Auto-install for current shell |

#### Examples

```bash
# Auto-install for current shell
broom completion install

# Generate Bash completion
broom completion bash > /usr/local/etc/bash_completion.d/broom

# Generate Zsh completion
broom completion zsh > ~/.zsh/completions/_broom

# Generate Fish completion
broom completion fish > ~/.config/fish/completions/broom.fish
```

#### Manual Setup (Zsh)

```bash
# Generate completion
broom completion zsh > ~/.zsh/completions/_broom

# Add to ~/.zshrc
fpath=(~/.zsh/completions $fpath)
autoload -Uz compinit && compinit

# Reload shell
exec zsh
```

---

### doctor

Run system health diagnostics.

```bash
broom doctor
```

#### Checks Performed

- **System Requirements** - Node.js version, permissions
- **Disk Space** - Available space on all volumes
- **Configuration** - Valid config files
- **Dependencies** - Required system commands
- **Permissions** - Write access to cleanup paths
- **Backup Integrity** - Backup directory status

---

### schedule

Schedule automated cleanup tasks.

```bash
broom schedule <subcommand> [options]
```

#### Subcommands

| Subcommand    | Description              |
| ------------- | ------------------------ |
| `add`         | Add scheduled task       |
| `remove <id>` | Remove scheduled task    |
| `list`        | List all scheduled tasks |

#### Examples

```bash
# Schedule daily cleanup
broom schedule add --daily --time 02:00

# Schedule weekly cleanup
broom schedule add --weekly --day sunday --time 03:00

# List schedules
broom schedule list

# Remove schedule
broom schedule remove <id>
```

---

### watch

Monitor directory sizes and get alerts.

```bash
broom watch [options]
```

#### Options

| Option               | Short | Description                 |
| -------------------- | ----- | --------------------------- |
| `--add`              | `-a`  | Add directory to watch      |
| `--remove <path>`    | `-r`  | Remove directory from watch |
| `--list`             | `-l`  | List watched directories    |
| `--check`            | `-c`  | Check all watches now       |
| `--path <path>`      | `-p`  | Directory path              |
| `--threshold <size>` | `-t`  | Size threshold (e.g., 1GB)  |
| `--notify`           | `-n`  | Enable notifications        |

#### Examples

```bash
# Add directory to watch
broom watch --add --path ~/Downloads --threshold 1GB --notify

# List watched directories
broom watch --list

# Check all watches
broom watch --check

# Remove watch
broom watch --remove ~/Downloads
```

---

## System Commands

### update

Update broom to the latest version.

```bash
broom update
```

Checks for updates and installs the latest version from npm/GitHub.

---

### remove

Uninstall broom from the system.

```bash
broom remove [options]
```

#### Options

| Option  | Short | Description               |
| ------- | ----- | ------------------------- |
| `--yes` | `-y`  | Skip confirmation prompts |

#### Examples

```bash
# Uninstall with confirmation
broom remove

# Uninstall without confirmation
broom remove --yes
```

---

### help

Display help information.

```bash
broom help [command]
```

#### Examples

```bash
# General help
broom help

# Command-specific help
broom help clean
broom help analyze

# Show version
broom --version
```

---

## Tips & Best Practices

### Safety First

1. **Use --dry-run** - Always preview before deleting
2. **Backup Important Data** - Use `broom backup` before cleaning
3. **Review Categories** - Check what will be cleaned
4. **Start Safe** - Use default safety level first
5. **Whitelist Paths** - Protect important directories

### Efficiency

1. **Schedule Regular Cleanups** - Automate with `broom schedule`
2. **Monitor Key Directories** - Use `broom watch`
3. **Generate Reports** - Track cleanup history
4. **Use Tab Completion** - Install shell completion
5. **Combine Options** - `broom clean --all --yes --report`

### Troubleshooting

1. **Check Status** - `broom doctor`
2. **Enable Debug Mode** - `broom --debug clean`
3. **Review Reports** - Check HTML reports for details
4. **Check Permissions** - Ensure sudo access
5. **Restore from Backup** - Use `broom restore` if needed

---

For more information, see the [main README](../README.md) or visit the [documentation](README.md).
