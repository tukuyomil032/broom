# AGENTS Guide

## Project Summary

Broom is a macOS disk cleanup CLI tool written in TypeScript, inspired by [Mole](https://github.com/tw93/Mole). It provides deep cleaning, system optimization, and disk analysis features for macOS users through an intuitive command-line interface.

## Tech Stack

- **Language**: TypeScript 5.9+
- **Runtime**: Node.js 18+
- **Package Manager**: Bun (npm/pnpm compatible)
- **CLI Framework**: Commander.js 14.x
- **UI Libraries**: 
  - @inquirer/prompts - Interactive prompts
  - chalk - Terminal styling
  - ora - Spinners
  - cli-table3 - Tables
- **Utilities**:
  - fast-glob - File pattern matching
  - systeminformation - System monitoring
  - handlebars - HTML report templates

## Common Commands

### Development
```bash
# Install dependencies
bun install

# Development mode with auto-reload
bun run dev

# Build TypeScript to JavaScript
bun run build
```

### Testing & Quality
```bash
# Type checking
bun run typecheck

# Linting
bun run lint
bun run lint:fix

# Format code
bun run format
bun run format:check
```

### Running the CLI
```bash
# After build - global installation
broom <command>

# Development mode
bun run dev <command>

# Direct execution
bun dist/index.js <command>
```

## Project Structure

```
broom/
├── src/
│   ├── commands/          # Command implementations
│   │   ├── clean.ts       # Deep system cleanup
│   │   ├── optimize.ts    # System optimization tasks
│   │   ├── analyze.ts     # Disk space analysis
│   │   ├── status.ts      # System monitoring
│   │   └── ...
│   ├── scanners/          # File scanners for cleanup
│   │   ├── base.ts        # Base scanner class
│   │   ├── user-cache.ts  # User cache scanner
│   │   ├── browser-cache.ts
│   │   └── ...
│   ├── ui/                # User interface components
│   │   ├── output.ts      # Formatted console output
│   │   └── prompts.ts     # Interactive prompts
│   ├── utils/             # Utility functions
│   │   ├── fs.ts          # File system operations
│   │   ├── config.ts      # Configuration management
│   │   └── report.ts      # HTML report generation
│   ├── types/             # TypeScript type definitions
│   └── index.ts           # CLI entry point
├── dist/                  # Compiled JavaScript output
├── docs/                  # Documentation
└── package.json
```

## TypeScript Conventions

### 1. Type Safety
- Use strict TypeScript settings (noImplicitAny, strictNullChecks enabled)
- Prefer interfaces over type aliases for object shapes
- Export types from `src/types/index.ts` for shared definitions
- Use discriminated unions for scanner categories and results

### 2. Async/Await
- All file system operations must be async
- Use `Promise.all()` for parallel operations
- Always handle errors with try/catch blocks
- Provide meaningful error messages

### 3. Code Organization
- One scanner per file in `src/scanners/`
- One command per file in `src/commands/`
- Extend `BaseScanner` class for all scanners
- Follow single responsibility principle

### 4. Naming Conventions
- PascalCase for classes and interfaces (e.g., `UserCacheScanner`, `ScanResult`)
- camelCase for functions and variables (e.g., `scanItems`, `totalSize`)
- UPPER_SNAKE_CASE for constants (e.g., `DEFAULT_CONFIG`, `ICONS`)
- Descriptive names for async functions (e.g., `removeItems`, `calculateSize`)

### 5. Scanner Implementation Pattern
```typescript
export class MyScanner extends BaseScanner {
  category: Category = {
    id: 'my-category',
    name: 'My Category',
    group: 'System Junk',
    description: 'Clear description',
    safetyLevel: 'safe',
  };

  async scan(_options?: ScannerOptions): Promise<ScanResult> {
    const items: CleanableItem[] = [];
    
    try {
      // Scan logic here
      return this.createResult(items);
    } catch (error) {
      return this.createResult([], (error as Error).message);
    }
  }
}
```

## Safety Guidelines

### 1. File Deletion Safety
- Always check whitelist before deletion
- Skip Apple system files (com.apple.*)
- Provide dry-run mode (`--dry-run`) for preview
- Require confirmation for risky operations
- Log all deletions for audit trail

### 2. System Operations
- Request sudo only when absolutely necessary
- Show clear warnings for risky operations
- Implement timeout for long-running tasks
- Provide option to skip problematic tasks

### 3. User Data Protection
- Never delete user documents without explicit confirmation
- Mark downloads/trash as "risky" category
- Default to safe operations only
- Provide detailed descriptions of what will be deleted

## Output & Logging

### 1. Console Output Style
- Use chalk for colored output
- Use ora for progress spinners
- Use cli-table3 for structured data
- Consistent emoji icons for categories

### 2. Verbosity Levels
- Default: Essential information only
- `--debug`: Detailed diagnostic output
- `--verbose`: Include scanner details

### 3. Progress Feedback
- Show spinner during scans
- Display progress for multi-step operations
- Provide time estimates when possible
- Show final summary with statistics

## Error Handling

### 1. Graceful Degradation
- Continue operation if one scanner fails
- Collect and report errors at the end
- Don't stop entire cleanup for single failure

### 2. User-Friendly Messages
- Translate technical errors to plain language
- Provide actionable suggestions
- Include relevant paths in error messages

### 3. Exit Codes
- 0: Success
- 1: General error
- 2: Invalid arguments

**Example:**
```
User: "Add 3 new scanners: 1. System logs, 2. Mail cache, 3. Podcast cache"

Agent response:
- Stage 1: Implementing system logs scanner...
- [implementation details]
- Stage 2: Implementing mail cache scanner...
- [implementation details]
- Stage 3: Implementing podcast cache scanner...
- [implementation details]
- All 3 stages completed.
```

## Testing Strategy

### Manual Testing
```bash
# Test in dry-run mode first
broom clean --dry-run

# Test specific commands
broom analyze
broom status
broom optimize --dry-run

# Test with debug output
broom clean --debug
```

### Test Different Scenarios
- Fresh macOS installation
- System with large caches
- System with many dev tools
- Different hardware (Intel vs M1/M2)
- Different macOS versions

## Documentation

Keep documentation in sync with code changes:
- Update README.md for user-facing features
- Update COMMANDS.md for command reference
- Add code comments for complex logic only
- Generate HTML reports with clear explanations

## Security Considerations

1. **Never expose sensitive data** in logs or reports
2. **Validate all file paths** before operations
3. **Use safe file deletion** (no `rm -rf /` patterns)
4. **Sanitize user input** for shell commands
5. **Request minimal permissions** (avoid unnecessary sudo)

## Performance Guidelines

1. **Parallel scanning** for independent scanners
2. **Lazy loading** for large directory trees
3. **Incremental progress** updates
4. **Memory-efficient** file size calculations
5. **Debounce** rapid UI updates

## Release Checklist

Before releasing a new version:

- [ ] All TypeScript errors resolved
- [ ] Linting passes
- [ ] Manual testing on Intel and Apple Silicon Macs
- [ ] Update version in package.json
- [ ] Update CHANGELOG (if exists)
- [ ] Build succeeds
- [ ] Test installation via npm/bun
- [ ] Update documentation
- [ ] Create git tag for version

---
