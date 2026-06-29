/**
 * Base scanner class
 */
import type {
	Category,
	CleanableItem,
	CleanResult,
	Scanner,
	ScannerOptions,
	ScanResult,
} from "../types/index.js";
import { removeItems } from "../utils/fs.js";

export abstract class BaseScanner implements Scanner {
	abstract category: Category;
	protected scannedDirectories: string[] = [];

	abstract scan(options?: ScannerOptions): Promise<ScanResult>;

	async clean(items: CleanableItem[], dryRun = false): Promise<CleanResult> {
		const result = await removeItems(items, dryRun);

		return {
			category: this.category,
			cleanedItems: result.success,
			freedSpace: result.freedSpace,
			errors:
				result.failed > 0 ? [`Failed to remove ${result.failed} items`] : [],
		};
	}

	protected trackDirectory(path: string): void {
		if (!this.scannedDirectories.includes(path)) {
			this.scannedDirectories.push(path);
		}
	}

	getScannedDirectories(): string[] {
		return this.scannedDirectories;
	}

	protected createResult(items: CleanableItem[], error?: string): ScanResult {
		const totalSize = items.reduce((sum, item) => sum + item.size, 0);
		return {
			category: this.category,
			items,
			totalSize,
			scannedDirectories: this.scannedDirectories,
			error,
		};
	}
}
