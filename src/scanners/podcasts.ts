/**
 * Podcasts cache scanner
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

export class PodcastsScanner extends BaseScanner {
	category: Category = {
		id: "podcasts",
		name: "Podcasts Cache",
		group: "Apps",
		description: "Apple Podcasts temporary files",
		safetyLevel: "safe",
	};

	async scan(_options?: ScannerOptions): Promise<ScanResult> {
		const items: CleanableItem[] = [];
		const podcastsTmpPath = join(
			homedir(),
			"Library/Containers/com.apple.podcasts/Data/tmp",
		);

		try {
			if (!exists(podcastsTmpPath)) {
				return this.createResult([]);
			}

			this.trackDirectory(podcastsTmpPath);

			const entries = await readdir(podcastsTmpPath);

			for (const entry of entries) {
				const entryPath = join(podcastsTmpPath, entry);

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
