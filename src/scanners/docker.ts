/**
 * Docker cache scanner
 */

import { exec } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";
import type {
	Category,
	CleanableItem,
	CleanResult,
	ScannerOptions,
	ScanResult,
} from "../types/index.js";
import { exists, getSize } from "../utils/fs.js";
import { paths } from "../utils/paths.js";
import { BaseScanner } from "./base.js";

const execAsync = promisify(exec);

export class DockerScanner extends BaseScanner {
	category: Category = {
		id: "docker",
		name: "Docker Data",
		group: "Development",
		description: "Docker images, containers, and volumes",
		safetyLevel: "risky",
		safetyNote: "Will remove all unused Docker data",
	};

	async scan(_options?: ScannerOptions): Promise<ScanResult> {
		const items: CleanableItem[] = [];

		try {
			// Check Docker data directory
			if (exists(paths.docker.data)) {
				this.trackDirectory(paths.docker.data);

				const stats = await stat(paths.docker.data);
				const size = await getSize(paths.docker.data);

				if (size > 0) {
					items.push({
						path: paths.docker.data,
						size,
						name: "Docker Data",
						isDirectory: true,
						modifiedAt: stats.mtime,
					});
				}
			}

			// Check VM disk specifically
			if (exists(paths.docker.vmDisk)) {
				this.trackDirectory(paths.docker.vmDisk);

				const stats = await stat(paths.docker.vmDisk);
				const size = await getSize(paths.docker.vmDisk);

				if (size > 0) {
					items.push({
						path: paths.docker.vmDisk,
						size,
						name: "Docker VM Disk",
						isDirectory: true,
						modifiedAt: stats.mtime,
					});
				}
			}
		} catch {
			// Docker might not be installed
		}

		items.sort((a, b) => b.size - a.size);

		// Deduplicate (vmDisk is inside data)
		const uniqueItems = items.filter((item, index, self) => {
			return !self.some(
				(other, otherIndex) =>
					otherIndex !== index && item.path.startsWith(`${other.path}/`),
			);
		});

		return this.createResult(uniqueItems);
	}

	async clean(items: CleanableItem[], dryRun = false): Promise<CleanResult> {
		if (dryRun) {
			const totalSize = items.reduce((sum, item) => sum + item.size, 0);
			return {
				category: this.category,
				cleanedItems: items.length,
				freedSpace: totalSize,
				errors: [],
			};
		}

		try {
			// Try using docker system prune
			await execAsync("docker system prune -af --volumes 2>/dev/null || true");

			const totalSize = items.reduce((sum, item) => sum + item.size, 0);
			return {
				category: this.category,
				cleanedItems: items.length,
				freedSpace: totalSize,
				errors: [],
			};
		} catch {
			// Docker not running or not installed
			return {
				category: this.category,
				cleanedItems: 0,
				freedSpace: 0,
				errors: ["Docker is not running or not installed"],
			};
		}
	}
}
