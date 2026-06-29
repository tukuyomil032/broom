/**
 * CoreSimulator cache scanner
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

export class CoreSimulatorScanner extends BaseScanner {
	category: Category = {
		id: "core-simulator",
		name: "CoreSimulator Cache",
		group: "Development",
		description: "iOS/watchOS/tvOS simulator caches and temporary files",
		safetyLevel: "safe",
	};

	async scan(_options?: ScannerOptions): Promise<ScanResult> {
		const items: CleanableItem[] = [];
		const coreSimulatorBase = join(
			homedir(),
			"Library/Developer/CoreSimulator",
		);
		const cachesPath = join(coreSimulatorBase, "Caches");
		const devicesPath = join(coreSimulatorBase, "Devices");

		try {
			// Scan Caches directory
			if (exists(cachesPath)) {
				this.trackDirectory(cachesPath);

				const cacheEntries = await readdir(cachesPath);
				for (const entry of cacheEntries) {
					const entryPath = join(cachesPath, entry);

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

			// Scan Devices/*/data/tmp directories
			if (exists(devicesPath)) {
				this.trackDirectory(devicesPath);

				const deviceEntries = await readdir(devicesPath);
				for (const deviceId of deviceEntries) {
					const tmpPath = join(devicesPath, deviceId, "data/tmp");

					if (!exists(tmpPath)) {
						continue;
					}

					this.trackDirectory(tmpPath);

					try {
						const tmpEntries = await readdir(tmpPath);
						for (const tmpEntry of tmpEntries) {
							const tmpEntryPath = join(tmpPath, tmpEntry);

							if (isExcludedPath(tmpEntryPath)) {
								continue;
							}

							try {
								const stats = await stat(tmpEntryPath);
								const size = await getSize(tmpEntryPath);

								if (size > 0) {
									items.push({
										path: tmpEntryPath,
										size,
										name: `${deviceId}/data/tmp/${tmpEntry}`,
										isDirectory: stats.isDirectory(),
										modifiedAt: stats.mtime,
									});
								}
							} catch {
								// Skip if cannot access
							}
						}
					} catch {
						// Skip if cannot access device tmp
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
