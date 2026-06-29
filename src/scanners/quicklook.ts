/**
 * QuickLook thumbnails scanner
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

export class QuickLookScanner extends BaseScanner {
	category: Category = {
		id: "quicklook",
		name: "QuickLook Thumbnails",
		group: "System Junk",
		description: "QuickLook thumbnail cache",
		safetyLevel: "safe",
	};

	async scan(_options?: ScannerOptions): Promise<ScanResult> {
		const items: CleanableItem[] = [];
		const quicklookPath = join(
			homedir(),
			"Library/Caches/com.apple.QuickLook.thumbnailcache",
		);

		try {
			if (!exists(quicklookPath)) {
				return this.createResult([]);
			}

			this.trackDirectory(quicklookPath);

			const entries = await readdir(quicklookPath);

			for (const entry of entries) {
				const entryPath = join(quicklookPath, entry);

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

			// Sort by size descending
			items.sort((a, b) => b.size - a.size);

			return this.createResult(items);
		} catch (error) {
			return this.createResult([], (error as Error).message);
		}
	}
}
