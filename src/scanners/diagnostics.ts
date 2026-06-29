/**
 * Diagnostic reports scanner
 */
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
	Category,
	CleanableItem,
	ScannerOptions,
	ScanResult,
} from "../types/index.js";
import { exists, getSize, isExcludedPath } from "../utils/fs.js";
import { BaseScanner } from "./base.js";

export class DiagnosticsScanner extends BaseScanner {
	category: Category = {
		id: "diagnostics",
		name: "Diagnostic Reports",
		group: "System Junk",
		description: "System and application crash/diagnostic reports",
		safetyLevel: "safe",
	};

	async scan(_options?: ScannerOptions): Promise<ScanResult> {
		const items: CleanableItem[] = [];
		const diagnosticsPaths = [
			"/Library/Logs/DiagnosticReports",
			join(homedir(), "Library/Logs/DiagnosticReports"),
		];

		try {
			for (const diagnosticsPath of diagnosticsPaths) {
				if (!exists(diagnosticsPath)) {
					continue;
				}

				this.trackDirectory(diagnosticsPath);

				const entries = await readdir(diagnosticsPath);

				for (const entry of entries) {
					const entryPath = join(diagnosticsPath, entry);

					// Skip excluded paths
					if (isExcludedPath(entryPath)) {
						continue;
					}

					try {
						const stats = await stat(entryPath);
						const size = await getSize(entryPath);

						if (size > 0) {
							items.push({
								path: entryPath,
								size,
								name: entry,
								isDirectory: stats.isDirectory(),
								modifiedAt: stats.mtime,
							});
						}
					} catch {
						// Skip if cannot access
					}
				}
			}

			// Sort by size descending
			items.sort((a, b) => b.size - a.size);

			return this.createResult(items);
		} catch (error) {
			return this.createResult([], (error as Error).message);
		}
	}
}
