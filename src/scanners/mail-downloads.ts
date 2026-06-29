/**
 * Mail downloads scanner
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

const DAYS_OLD_THRESHOLD = 30;

export class MailDownloadsScanner extends BaseScanner {
	category: Category = {
		id: "mail-downloads",
		name: "Mail Downloads",
		group: "Apps",
		description: "Mail app download attachments older than 30 days",
		safetyLevel: "safe",
	};

	async scan(_options?: ScannerOptions): Promise<ScanResult> {
		const items: CleanableItem[] = [];
		const mailDownloadsPath = join(homedir(), "Library/Mail Downloads");
		const daysOld = _options?.daysOld || DAYS_OLD_THRESHOLD;

		try {
			if (!exists(mailDownloadsPath)) {
				return this.createResult([]);
			}

			this.trackDirectory(mailDownloadsPath);

			const entries = await readdir(mailDownloadsPath);
			const now = Date.now();
			const cutoffTime = now - daysOld * 24 * 60 * 60 * 1000;

			for (const entry of entries) {
				const entryPath = join(mailDownloadsPath, entry);

				// Skip excluded paths
				if (isExcludedPath(entryPath)) {
					continue;
				}

				try {
					const stats = await stat(entryPath);

					// Only include files older than threshold
					if (stats.mtime.getTime() > cutoffTime) {
						continue;
					}

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

			// Sort by size descending
			items.sort((a, b) => b.size - a.size);

			return this.createResult(items);
		} catch (error) {
			return this.createResult([], (error as Error).message);
		}
	}
}
