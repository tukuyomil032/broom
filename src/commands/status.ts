/**
 * Status command - Real-time system monitoring with animated broom character
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import blessed from "blessed";
import { Command } from "commander";
import * as si from "systeminformation";
import { enhanceCommandHelp } from "../utils/help.js";

const execAsync = promisify(exec);

interface StatusOptions {
	interval?: number;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number, decimals = 1): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format speed (bytes per second)
 */
function formatSpeed(bytesPerSec: number): string {
	if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(1)} B/s`;
	if (bytesPerSec < 1024 * 1024)
		return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
	return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
}

/**
 * Create colored bar with border
 */
function createColoredBar(percent: number, width: number): string {
	const filled = Math.round((percent / 100) * width);
	let bar = "";

	for (let i = 0; i < filled; i++) {
		const ratio = i / width;
		if (ratio < 0.5) {
			bar += "{green-fg}█{/green-fg}";
		} else if (ratio < 0.75) {
			bar += "{yellow-fg}█{/yellow-fg}";
		} else {
			bar += "{red-fg}█{/red-fg}";
		}
	}

	bar += `{black-fg}${"░".repeat(width - filled)}{/black-fg}`;
	return bar;
}

/**
 * Get local IP address
 */
async function getLocalIP(): Promise<string> {
	try {
		const netInterfaces = await si.networkInterfaces();
		const netInterfacesArray = Array.isArray(netInterfaces)
			? netInterfaces
			: [netInterfaces];
		const active = netInterfacesArray.find(
			(n) => n.ip4 && !n.internal && n.operstate === "up",
		);
		return active?.ip4 || "N/A";
	} catch {
		return "N/A";
	}
}

/**
 * Get top processes by CPU
 */
async function getTopProcesses(): Promise<
	Array<{ name: string; cpu: number }>
> {
	try {
		const { stdout } = await execAsync(
			"ps -Ao comm,pcpu -r | head -11 | tail -10",
		);
		return stdout
			.trim()
			.split("\n")
			.map((line) => {
				const parts = line.trim().split(/\s+/);
				const cpu = parseFloat(parts.pop() || "0");
				const name = parts.join(" ").replace(/^.*\//, "").slice(0, 20);
				return { name, cpu };
			});
	} catch {
		return [];
	}
}

/**
 * Calculate system health score (0-100)
 */
function calculateHealth(
	cpuUsage: number,
	memUsage: number,
	diskUsage: number,
	batteryPercent: number,
): number {
	const cpuScore = Math.max(0, 100 - cpuUsage);
	const memScore = Math.max(0, 100 - memUsage);
	const diskScore = Math.max(0, 100 - diskUsage);
	const batteryScore = batteryPercent;

	return Math.round(
		cpuScore * 0.3 + memScore * 0.3 + diskScore * 0.2 + batteryScore * 0.2,
	);
}

/**
 * Run status TUI
 */
export async function statusCommand(options: StatusOptions): Promise<void> {
	const interval = (options.interval ?? 2) * 1000;

	// Create blessed screen
	const screen = blessed.screen({
		smartCSR: true,
		title: "Broom System Status",
		fullUnicode: true,
	});

	// Header
	const headerBox = blessed.box({
		parent: screen,
		top: 0,
		left: 0,
		width: "100%",
		height: 2,
		tags: true,
		style: { fg: "cyan" },
	});

	// CPU Box
	const cpuBox = blessed.box({
		parent: screen,
		top: 2,
		left: 0,
		width: "33%-1",
		height: 8,
		label: " {yellow-fg}●{/yellow-fg} CPU ",
		tags: true,
		border: { type: "line" },
		style: { border: { fg: "cyan" } },
	});

	// Memory Box
	const memBox = blessed.box({
		parent: screen,
		top: 2,
		left: "33%",
		width: "34%-1",
		height: 8,
		label: " {red-fg}▣{/red-fg} Memory ",
		tags: true,
		border: { type: "line" },
		style: { border: { fg: "cyan" } },
	});

	// Disk Box
	const diskBox = blessed.box({
		parent: screen,
		top: 2,
		left: "67%-1",
		width: "33%",
		height: 8,
		label: " {blue-fg}▣{/blue-fg} Disk ",
		tags: true,
		border: { type: "line" },
		style: { border: { fg: "cyan" } },
	});

	// Network Box
	const netBox = blessed.box({
		parent: screen,
		top: 10,
		left: 0,
		width: "50%-1",
		height: 6,
		label: " {cyan-fg}↕{/cyan-fg} Network ",
		tags: true,
		border: { type: "line" },
		style: { border: { fg: "cyan" } },
	});

	// Processes Box
	const procBox = blessed.box({
		parent: screen,
		top: 10,
		left: "50%",
		width: "50%",
		height: 6,
		label: " {magenta-fg}●{/magenta-fg} Top Processes ",
		tags: true,
		border: { type: "line" },
		style: { border: { fg: "cyan" } },
	});

	// Footer
	blessed.box({
		parent: screen,
		bottom: 0,
		left: 0,
		width: "100%",
		height: 1,
		tags: true,
		content: "{gray-fg}Press q or Ctrl+C to exit{/gray-fg}",
		style: { fg: "gray" },
	});

	// Exit keys
	screen.key(["escape", "q", "C-c"], () => {
		process.exit(0);
	});

	/**
	 * Update all data
	 */
	async function update() {
		try {
			// Gather all data in parallel
			const [
				cpuLoad,
				cpuInfo,
				cpuTemp,
				mem,
				disk,
				battery,
				netStats,
				osInfo,
				graphics,
			] = await Promise.all([
				si.currentLoad(),
				si.cpu(),
				si.cpuTemperature(),
				si.mem(),
				si.fsSize(),
				si.battery(),
				si.networkStats(),
				si.osInfo(),
				si.graphics(),
			]);

			const localIP = await getLocalIP();
			const topProcs = await getTopProcesses();
			const mainDisk = disk.find((d) => d.mount === "/") || disk[0];
			const activeNet =
				netStats.find((n) => n.operstate === "up") || netStats[0];

			// Calculate health
			const memUsage = (mem.used / mem.total) * 100;
			const diskUsage = mainDisk?.use ?? 0;
			const batteryPercent = battery.hasBattery ? battery.percent : 100;
			const health = calculateHealth(
				cpuLoad.currentLoad,
				memUsage,
				diskUsage,
				batteryPercent,
			);

			// Header content
			const gpu = graphics.controllers?.[0];
			const gpuName = gpu?.model
				? `(${gpu.model.replace("Apple ", "").split(" ")[0]})`
				: "";
			const headerContent =
				`{bold}🧹 Broom System Status{/bold}\n` +
				`Health: {${health > 70 ? "green" : health > 40 ? "yellow" : "red"}-fg}${health}%{/} | ` +
				`Host: {cyan-fg}${osInfo.hostname.split(".")[0]}{/} | ` +
				`CPU: ${cpuInfo.manufacturer} ${cpuInfo.brand} ${gpuName}`;
			headerBox.setContent(headerContent);

			// CPU content
			const cpuCores = cpuLoad.cpus || [];
			let cpuContent = "";
			const coresToShow = cpuCores.slice(0, 4);
			coresToShow.forEach((core, i: number) => {
				const bar = createColoredBar(core.load, 12);
				cpuContent += ` Core${(i + 1).toString().padStart(2)} ${bar} ${core.load.toFixed(1).padStart(5)}%\n`;
			});
			const temp = cpuTemp.main > 0 ? ` @ ${cpuTemp.main.toFixed(0)}°C` : "";
			cpuContent += `\n{gray-fg}Load: ${cpuLoad.currentLoad.toFixed(1)}%${temp}{/gray-fg}`;
			cpuBox.setContent(cpuContent);

			// Memory content
			const memUsedPercent = (mem.used / mem.total) * 100;
			const memFreePercent = (mem.free / mem.total) * 100;
			const swapUsedPercent =
				mem.swaptotal > 0 ? (mem.swapused / mem.swaptotal) * 100 : 0;
			let memContent = "";
			memContent += ` Used    ${createColoredBar(memUsedPercent, 12)} ${memUsedPercent.toFixed(1).padStart(5)}%\n`;
			memContent += ` Free    ${createColoredBar(100 - memFreePercent, 12)} ${memFreePercent.toFixed(1).padStart(5)}%\n`;
			memContent += ` Swap    ${createColoredBar(swapUsedPercent, 12)} ${swapUsedPercent.toFixed(1).padStart(5)}%\n`;
			memContent += `\n{gray-fg}Total: ${formatBytes(mem.total)}{/gray-fg}`;
			memBox.setContent(memContent);

			// Disk content
			const diskBar = createColoredBar(diskUsage, 15);
			let diskContent = "";
			diskContent += ` Usage   ${diskBar} ${diskUsage.toFixed(1).padStart(5)}%\n`;
			diskContent += ` {gray-fg}Used: ${formatBytes(mainDisk?.used ?? 0)}{/gray-fg}\n`;
			diskContent += ` {gray-fg}Free: ${formatBytes((mainDisk?.size ?? 0) - (mainDisk?.used ?? 0))}{/gray-fg}`;
			diskBox.setContent(diskContent);

			// Network content
			const rxSpeed = activeNet?.rx_sec ?? 0;
			const txSpeed = activeNet?.tx_sec ?? 0;
			let netContent = "";
			netContent += ` {green-fg}↓{/green-fg} ${formatSpeed(rxSpeed).padStart(12)}\n`;
			netContent += ` {red-fg}↑{/red-fg} ${formatSpeed(txSpeed).padStart(12)}\n`;
			netContent += ` {gray-fg}IP: ${localIP}{/gray-fg}`;
			netBox.setContent(netContent);

			// Processes content
			let procContent = "";
			topProcs.slice(0, 4).forEach((proc, i) => {
				const bar = createColoredBar(Math.min(proc.cpu, 100), 8);
				procContent += ` ${(i + 1).toString().padStart(2)}. ${proc.name.padEnd(18)} ${bar} ${proc.cpu.toFixed(1).padStart(5)}%\n`;
			});
			procBox.setContent(procContent);

			screen.render();
		} catch (_err) {
			// Ignore errors and try again
		}
	}

	// Initial update
	await update();

	// Set interval for updates
	const updateInterval = setInterval(update, interval);

	// Cleanup on exit
	screen.on("destroy", () => {
		clearInterval(updateInterval);
	});

	screen.render();
}

/**
 * Create status command
 */
export function createStatusCommand(): Command {
	const cmd = new Command("status")
		.description("Real-time system monitoring dashboard")
		.option(
			"-i, --interval <seconds>",
			"Update interval in seconds (default: 2)",
			parseInt,
		)
		.action(async (options) => {
			await statusCommand(options);
		});

	return enhanceCommandHelp(cmd);
}
