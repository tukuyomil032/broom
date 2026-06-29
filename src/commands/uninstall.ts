/**
 * Uninstall command - Remove applications and their leftovers
 */

import { exec } from "node:child_process";
import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import chalk from "chalk";
import { Command } from "commander";
import type { AppInfo, CleanableItem } from "../types/index.js";
import {
	createSpinner,
	error,
	failSpinner,
	info,
	printHeader,
	printSummaryBlock,
	succeedSpinner,
	warning,
} from "../ui/output.js";
import { confirmAction, selectApp, selectFiles } from "../ui/prompts.js";
import {
	exists,
	expandPath,
	formatSize,
	getSize,
	isProtectedPath,
} from "../utils/fs.js";
import { enhanceCommandHelp } from "../utils/help.js";
import { paths } from "../utils/paths.js";

const execAsync = promisify(exec);

interface UninstallOptions {
	dryRun?: boolean;
	yes?: boolean;
}

/**
 * Get bundle ID from app's Info.plist
 */
async function getBundleId(appPath: string): Promise<string | null> {
	try {
		const plistPath = join(appPath, "Contents", "Info.plist");

		if (!exists(plistPath)) {
			return null;
		}

		// Use plutil to convert plist to JSON
		const { stdout } = await execAsync(
			`plutil -convert json -o - "${plistPath}"`,
		);
		const plist = JSON.parse(stdout);

		return plist.CFBundleIdentifier || null;
	} catch {
		return null;
	}
}

/**
 * Scan for installed applications
 */
async function scanApplications(): Promise<AppInfo[]> {
	const apps: AppInfo[] = [];
	const appDirs = [paths.applications, paths.userApplications];

	for (const appDir of appDirs) {
		try {
			if (!exists(appDir)) {
				continue;
			}

			const entries = await readdir(appDir);

			for (const entry of entries) {
				if (!entry.endsWith(".app")) {
					continue;
				}

				const appPath = join(appDir, entry);

				try {
					const stats = await stat(appPath);

					if (!stats.isDirectory()) {
						continue;
					}

					const size = await getSize(appPath);
					const bundleId = await getBundleId(appPath);
					const name = entry.replace(".app", "");

					apps.push({
						name,
						path: appPath,
						bundleId: bundleId || undefined,
						size,
					});
				} catch {
					// Skip if cannot access
				}
			}
		} catch {
			// Skip if cannot access directory
		}
	}

	// Sort by name
	apps.sort((a, b) => a.name.localeCompare(b.name));

	return apps;
}

/**
 * Find app-related files
 */
async function findAppFiles(app: AppInfo): Promise<CleanableItem[]> {
	const items: CleanableItem[] = [];
	const searchTerms: string[] = [];

	// Build search terms from app name and bundle ID
	if (app.bundleId) {
		searchTerms.push(app.bundleId);

		// Also search for variations (e.g., com.company.app -> company.app)
		const parts = app.bundleId.split(".");
		if (parts.length >= 2) {
			searchTerms.push(parts.slice(-2).join("."));
		}
	}

	// Add app name variations
	searchTerms.push(app.name);
	searchTerms.push(app.name.toLowerCase());
	searchTerms.push(app.name.replace(/\s+/g, ""));

	// Directories to search
	const searchDirs = [
		paths.userCache,
		paths.applicationSupport,
		paths.preferences,
		paths.savedState,
		paths.userLogs,
		join(paths.applicationSupport, "..", "Containers"),
		join(paths.applicationSupport, "..", "Group Containers"),
	];

	for (const searchDir of searchDirs) {
		try {
			if (!exists(searchDir)) {
				continue;
			}

			const entries = await readdir(searchDir);

			for (const entry of entries) {
				const entryLower = entry.toLowerCase();

				// Check if entry matches any search term
				const matches = searchTerms.some((term) =>
					entryLower.includes(term.toLowerCase()),
				);

				if (!matches) {
					continue;
				}

				const entryPath = join(searchDir, entry);

				try {
					const stats = await stat(entryPath);
					const size = await getSize(entryPath);

					items.push({
						path: entryPath,
						size,
						name: entry,
						isDirectory: stats.isDirectory(),
						modifiedAt: stats.mtime,
					});
				} catch {
					// Skip if cannot access
				}
			}
		} catch {
			// Skip if cannot access directory
		}
	}

	// Also check for launch agents/daemons
	const launchDirs = [
		join(expandPath("~"), "Library", "LaunchAgents"),
		"/Library/LaunchAgents",
		"/Library/LaunchDaemons",
	];

	for (const launchDir of launchDirs) {
		try {
			if (!exists(launchDir)) {
				continue;
			}

			const entries = await readdir(launchDir);

			for (const entry of entries) {
				if (!entry.endsWith(".plist")) {
					continue;
				}

				const entryLower = entry.toLowerCase();
				const matches = searchTerms.some((term) =>
					entryLower.includes(term.toLowerCase()),
				);

				if (!matches) {
					continue;
				}

				const entryPath = join(launchDir, entry);

				try {
					const stats = await stat(entryPath);

					items.push({
						path: entryPath,
						size: stats.size,
						name: entry,
						isDirectory: false,
						modifiedAt: stats.mtime,
					});
				} catch {
					// Skip if cannot access
				}
			}
		} catch {
			// Skip if cannot access directory
		}
	}

	// Sort by size descending
	items.sort((a, b) => b.size - a.size);

	return items;
}

/**
 * Remove app using Finder (moves to trash)
 */
async function removeAppToTrash(appPath: string): Promise<boolean> {
	try {
		const script = `tell application "Finder" to delete POSIX file "${appPath}"`;
		await execAsync(`osascript -e '${script}'`);
		return true;
	} catch {
		return false;
	}
}

/**
 * Execute uninstall command
 */
export async function uninstallCommand(
	options: UninstallOptions,
): Promise<void> {
	const isDryRun = options.dryRun || false;

	printHeader(isDryRun ? "🗑️ Uninstall Apps (Dry Run)" : "🗑️ Uninstall Apps");

	// Scan for apps
	const spinner = createSpinner("Scanning applications...");
	const apps = await scanApplications();
	succeedSpinner(spinner, `Found ${apps.length} applications`);

	if (apps.length === 0) {
		warning("No applications found");
		return;
	}

	// Select apps (multiple selection via space)
	console.log();
	const selectedApps = await selectApp(apps);

	if (!selectedApps || selectedApps.length === 0) {
		warning("No application selected");
		return;
	}

	// Find related files for all selected apps
	console.log();
	const searchSpinner = createSpinner(`Searching for related files...`);
	const relatedFilesAll: Map<string, CleanableItem> = new Map();

	for (const app of selectedApps) {
		const files = await findAppFiles(app);
		for (const f of files) {
			relatedFilesAll.set(f.path, f);
		}
	}

	const relatedFiles = Array.from(relatedFilesAll.values());
	succeedSpinner(searchSpinner, `Found ${relatedFiles.length} related files`);

	// Show selected apps info
	console.log();
	console.log(chalk.bold("Selected Applications:"));
	let _totalAppSize = 0;
	for (const app of selectedApps) {
		_totalAppSize += app.size;
		console.log(
			`  - ${chalk.bold(app.name)} ${chalk.dim(app.path)} ${chalk.yellow(formatSize(app.size))}`,
		);
		if (app.bundleId) {
			console.log(`     Bundle ID: ${chalk.dim(app.bundleId)}`);
		}
	}
	// Ensure one blank line between Selected Applications and Related Files
	console.log();

	// Show related files
	if (relatedFiles.length > 0) {
		const totalRelatedSize = relatedFiles.reduce((sum, f) => sum + f.size, 0);
		console.log(chalk.bold(`Related Files (${formatSize(totalRelatedSize)}):`));

		// Determine column widths for neat alignment
		const filesToShow = relatedFiles.slice(0, 10);
		const maxPath = Math.min(
			80,
			Math.max(...filesToShow.map((f) => f.path.length), 20),
		);
		const sizeWidth = 12;

		for (const file of filesToShow) {
			const icon = file.isDirectory ? "📁" : "📄";
			const pathDisp = chalk.dim(file.path.padEnd(maxPath));
			const sizeDisp = chalk.yellow(formatSize(file.size).padStart(sizeWidth));
			console.log(`  ${icon} ${pathDisp} ${sizeDisp}`);
		}

		if (relatedFiles.length > filesToShow.length) {
			console.log(
				chalk.dim(`  ... and ${relatedFiles.length - filesToShow.length} more`),
			);
		}
	}

	// Confirm uninstall
	console.log();
	if (!options.yes) {
		const names = selectedApps.map((a) => a.name).join(", ");
		const confirmed = await confirmAction(
			`Uninstall ${selectedApps.length} app(s): ${names} and remove related files?`,
			false,
		);

		if (!confirmed) {
			warning("Uninstall cancelled");
			return;
		}
	}

	// Select files to remove
	let filesToRemove = relatedFiles;

	if (!options.yes && relatedFiles.length > 0) {
		console.log();
		info("Select which related files to remove:");
		filesToRemove = await selectFiles(relatedFiles);
	}

	// Execute uninstall
	console.log();
	const uninstallSpinner = createSpinner(
		isDryRun ? "Simulating uninstall..." : "Uninstalling...",
	);

	const _appRemoved = false;
	let filesRemoved = 0;
	let freedSpace = 0;
	const errors: string[] = [];

	if (!isDryRun) {
		// Remove each selected app
		let _appsRemovedCount = 0;
		for (const app of selectedApps) {
			const removed = await removeAppToTrash(app.path);
			if (removed) {
				_appsRemovedCount++;
				freedSpace += app.size;
			} else {
				errors.push(`Failed to remove ${app.name}`);
			}
		}

		// Remove related files
		for (const file of filesToRemove) {
			if (isProtectedPath(file.path)) {
				errors.push(`Skipped protected path: ${file.path}`);
				continue;
			}

			try {
				await rm(file.path, { recursive: true, force: true });
				filesRemoved++;
				freedSpace += file.size;
			} catch (err) {
				errors.push(`Failed to remove ${file.path}: ${(err as Error).message}`);
			}
		}
	} else {
		// Dry run - just count
		const _appsRemovedCount = selectedApps.length;
		freedSpace = selectedApps.reduce((s, a) => s + a.size, 0);
		filesRemoved = filesToRemove.length;
		freedSpace += filesToRemove.reduce((sum, f) => sum + f.size, 0);
	}

	if (errors.length === 0) {
		succeedSpinner(
			uninstallSpinner,
			isDryRun ? "Simulation complete" : "Uninstall complete",
		);
	} else {
		failSpinner(uninstallSpinner, "Uninstall completed with errors");
	}

	// Print summary
	const summaryHeading = isDryRun ? "Dry Run Complete" : "Uninstall Complete";
	const summaryDetails = [
		`Applications removed: ${chalk.green(String(selectedApps.length - errors.filter((e) => e.startsWith("Failed to remove")).length))}`,
		`Related files removed: ${filesRemoved}`,
		`Space freed: ${chalk.green(formatSize(freedSpace))}`,
	];

	if (errors.length > 0) {
		summaryDetails.push(`${chalk.red(`Errors: ${errors.length}`)}`);
	}

	printSummaryBlock(summaryHeading, summaryDetails);

	if (errors.length > 0) {
		console.log();
		console.log(chalk.bold.red("Errors:"));
		for (const err of errors) {
			error(err);
		}
	}
}

/**
 * Create uninstall command
 */
export function createUninstallCommand(): Command {
	const cmd = new Command("uninstall")
		.description("Remove apps and their leftovers")
		.option("-n, --dry-run", "Preview only, no deletions")
		.option("-y, --yes", "Skip confirmation prompts")
		.action(async (options) => {
			await uninstallCommand(options);
		});

	return enhanceCommandHelp(cmd);
}
