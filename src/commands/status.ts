/**
 * Status command - Real-time system monitoring (mole-style TUI)
 */
import blessed from 'blessed';
import { Command } from 'commander';
import * as si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';
import { enhanceCommandHelp } from '../utils/help.js';

const execAsync = promisify(exec);

interface StatusOptions {
  interval?: number;
  broom?: boolean;
}

// Broom sweeping animation frames
const BROOM_FRAMES = [
  // Frame 1 - Broom left, dust right
  ['    🧹      ░░░░', '   /|\\    ░░░░░░', '    |     ░░░░░', '   / \\      ░░░'],
  // Frame 2 - Broom sweeping
  ['      🧹    ░░', '     /|\\  ░░░', '      |   ░░░░', '     / \\    ░░'],
  // Frame 3 - Broom center
  ['        🧹  ░', '       /|\\░', '        | ░░', '       / \\░'],
  // Frame 4 - Dust dispersing
  ['          🧹  ·', '         /|\\  ·', '          |    ·', '         / \\'],
  // Frame 5 - Clean!
  ['            🧹 ✨', '           /|\\', '            |', '           / \\'],
  // Frame 6 - Reset
  ['  🧹        ░░░░░', ' /|\\      ░░░░░░░', '  |       ░░░░░░', ' / \\        ░░░░'],
];

// Alternative ASCII broom animation (for non-emoji terminals)
const ASCII_BROOM_FRAMES = [
  ['   \\|/    ....', '   -+-    ::.:', '    |     .:..', '   /_\\      :.'],
  ['     \\|/  ..:', '     -+-  ::.', '      |   .:.', '     /_\\   :'],
  ['       \\|/ .', '       -+- :', '        | .', '       /_\\'],
  ['         \\|/ *', '         -+-', '          |', '         /_\\'],
  ['   \\|/      ....', '   -+-    ..:::.', '    |     .:...:', '   /_\\      ....'],
];

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format speed (bytes per second)
 */
function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return bytesPerSec.toFixed(2) + ' B/s';
  if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(2) + ' KB/s';
  return (bytesPerSec / 1024 / 1024).toFixed(2) + ' MB/s';
}

/**
 * Create a horizontal bar with gradient colors
 */
function createColoredBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  let bar = '';

  for (let i = 0; i < filled; i++) {
    const ratio = i / width;
    if (ratio < 0.5) {
      bar += '{green-fg}█{/green-fg}';
    } else if (ratio < 0.75) {
      bar += '{yellow-fg}█{/yellow-fg}';
    } else {
      bar += '{red-fg}█{/red-fg}';
    }
  }

  bar += '{black-fg}' + '░'.repeat(width - filled) + '{/black-fg}';
  return bar;
}

/**
 * Create simple colored bar
 */
function createSimpleBar(percent: number, width: number, color: string = 'green'): string {
  const filled = Math.round((percent / 100) * width);
  return `{${color}-fg}${'█'.repeat(filled)}{/${color}-fg}{black-fg}${'░'.repeat(width - filled)}{/black-fg}`;
}

/**
 * Calculate system health score (0-100)
 */
function calculateHealth(
  cpuUsage: number,
  memUsage: number,
  diskUsage: number,
  batteryPercent: number
): number {
  const cpuScore = Math.max(0, 100 - cpuUsage);
  const memScore = Math.max(0, 100 - memUsage);
  const diskScore = Math.max(0, 100 - diskUsage);
  const batteryScore = batteryPercent;

  return Math.round(cpuScore * 0.3 + memScore * 0.3 + diskScore * 0.2 + batteryScore * 0.2);
}

/**
 * Get local IP address
 */
async function getLocalIP(): Promise<string> {
  try {
    const netInterfaces = await si.networkInterfaces();
    const active = (netInterfaces as any[]).find(
      (n) => n.ip4 && !n.internal && n.operstate === 'up'
    );
    return active?.ip4 || 'N/A';
  } catch {
    return 'N/A';
  }
}

/**
 * Get top processes by CPU
 */
async function getTopProcesses(): Promise<Array<{ name: string; cpu: number }>> {
  try {
    const { stdout } = await execAsync('ps -Ao comm,pcpu -r | head -6 | tail -5');
    return stdout
      .trim()
      .split('\n')
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        const cpu = parseFloat(parts.pop() || '0');
        const name = parts.join(' ').replace(/^.*\//, '').slice(0, 14);
        return { name, cpu };
      });
  } catch {
    return [];
  }
}

/**
 * Run status TUI
 */
export async function statusCommand(options: StatusOptions): Promise<void> {
  const interval = (options.interval ?? 2) * 1000;
  const showBroom = options.broom !== false; // Default to showing broom animation
  let broomFrame = 0;

  // Create blessed screen
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Broom Status',
    fullUnicode: true,
  });

  // Header bar
  const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    style: {
      fg: 'white',
      bg: 'black',
    },
  });

  // Broom animation box (top right area)
  const logoBox = blessed.box({
    parent: screen,
    top: 1,
    right: 1,
    width: 22,
    height: 6,
    tags: true,
    style: {
      fg: 'cyan',
    },
  });

  // CPU box (top left)
  const cpuBox = blessed.box({
    parent: screen,
    top: 2,
    left: 0,
    width: '50%-1',
    height: 8,
    label: ' {yellow-fg}●{/yellow-fg} CPU ',
    tags: true,
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' },
    },
  });

  // Memory box (top right)
  const memBox = blessed.box({
    parent: screen,
    top: 2,
    left: '50%',
    width: '50%',
    height: 8,
    label: ' {red-fg}▣{/red-fg} Memory ',
    tags: true,
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' },
    },
  });

  // Disk box (middle left)
  const diskBox = blessed.box({
    parent: screen,
    top: 10,
    left: 0,
    width: '50%-1',
    height: 6,
    label: ' {blue-fg}▣{/blue-fg} Disk ',
    tags: true,
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' },
    },
  });

  // Power box (middle right)
  const powerBox = blessed.box({
    parent: screen,
    top: 10,
    left: '50%',
    width: '50%',
    height: 6,
    label: ' {green-fg}⚡{/green-fg} Power ',
    tags: true,
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' },
    },
  });

  // Processes box (bottom left)
  const procBox = blessed.box({
    parent: screen,
    top: 16,
    left: 0,
    width: '50%-1',
    height: 8,
    label: ' {magenta-fg}●{/magenta-fg} Processes ',
    tags: true,
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' },
    },
  });

  // Network box (bottom right)
  const netBox = blessed.box({
    parent: screen,
    top: 16,
    left: '50%',
    width: '50%',
    height: 8,
    label: ' {cyan-fg}↕{/cyan-fg} Network ',
    tags: true,
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' },
    },
  });

  // Exit instructions
  const footer = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    tags: true,
    content: '{gray-fg}Press q or Ctrl+C to exit | b to toggle broom animation{/gray-fg}',
    style: {
      fg: 'gray',
    },
  });

  // Toggle broom animation
  let broomVisible = showBroom;
  screen.key(['b'], () => {
    broomVisible = !broomVisible;
    if (!broomVisible) {
      logoBox.setContent('');
    }
  });

  // Exit keys
  screen.key(['escape', 'q', 'C-c'], () => {
    process.exit(0);
  });

  /**
   * Update all data
   */
  async function update() {
    try {
      // Gather all data in parallel
      const [cpuLoad, cpuInfo, cpuTemp, mem, disk, battery, netStats, osInfo, diskIO, graphics] =
        await Promise.all([
          si.currentLoad(),
          si.cpu(),
          si.cpuTemperature(),
          si.mem(),
          si.fsSize(),
          si.battery(),
          si.networkStats(),
          si.osInfo(),
          si.disksIO(),
          si.graphics(),
        ]);

      const localIP = await getLocalIP();
      const topProcs = await getTopProcesses();
      const mainDisk = disk.find((d) => d.mount === '/') || disk[0];
      const activeNet = netStats.find((n) => n.operstate === 'up') || netStats[0];

      // Calculate health
      const memUsage = (mem.used / mem.total) * 100;
      const diskUsage = mainDisk?.use ?? 0;
      const batteryPercent = battery.hasBattery ? battery.percent : 100;
      const health = calculateHealth(cpuLoad.currentLoad, memUsage, diskUsage, batteryPercent);

      // GPU info
      const gpu = graphics.controllers?.[0];
      const gpuName = gpu?.model ? `(${gpu.model.replace('Apple ', '').split(' ')[0]})` : '';

      // Header
      const memTotalStr = formatBytes(mem.total, 1);
      const diskTotalStr = formatBytes(mainDisk?.size ?? 0, 1);
      header.setContent(
        `{bold}Broom Status{/bold}  {green-fg}●{/green-fg} Health {bold}{yellow-fg}${health}{/yellow-fg}{/bold}  ` +
          `${osInfo.hostname.split('.')[0]} • ${cpuInfo.manufacturer} ${cpuInfo.brand} ${gpuName} • ` +
          `${memTotalStr}/${diskTotalStr} • ${osInfo.distro} ${osInfo.release}`
      );

      // Broom animation
      if (broomVisible) {
        const frame = BROOM_FRAMES[broomFrame % BROOM_FRAMES.length];
        logoBox.setContent(frame.join('\n'));
        broomFrame++;
      }

      // CPU - show individual cores
      const cpuCores = cpuLoad.cpus || [];
      let cpuContent = '';

      // Show up to 6 cores with their load
      const coresToShow = cpuCores.slice(0, 6);
      coresToShow.forEach((core: any, i: number) => {
        const bar = createColoredBar(core.load, 12);
        cpuContent += `Core${i + 1}  ${bar}  ${core.load.toFixed(1)}%\n`;
      });

      const temp = cpuTemp.main > 0 ? `@ ${cpuTemp.main.toFixed(1)}°C` : '';
      const loadAvg = cpuLoad.avgLoad ? cpuLoad.avgLoad.toFixed(2) : '0.00';
      cpuContent += `Load  ${loadAvg} / ${cpuLoad.currentLoad.toFixed(2)} ${temp}`;
      cpuBox.setContent(cpuContent);

      // Memory
      const memUsedPercent = (mem.used / mem.total) * 100;
      const memFreePercent = (mem.free / mem.total) * 100;
      const swapUsedPercent = mem.swaptotal > 0 ? (mem.swapused / mem.swaptotal) * 100 : 0;

      let memContent = '';
      memContent += `Used    ${createColoredBar(memUsedPercent, 12)}  ${memUsedPercent.toFixed(1)}%\n`;
      memContent += `Free    ${createSimpleBar(memFreePercent, 12, 'green')}  ${memFreePercent.toFixed(1)}%\n`;
      memContent += `Swap    ${createColoredBar(swapUsedPercent, 12)}  ${swapUsedPercent.toFixed(1)}% (${formatBytes(mem.swapused)}/${formatBytes(mem.swaptotal)})\n`;
      memContent += `Total ${formatBytes(mem.total)} / Avail ${formatBytes(mem.available)}`;
      memBox.setContent(memContent);

      // Disk
      const diskPercent = mainDisk?.use ?? 0;
      const readSpeed = diskIO?.rIO_sec ?? 0;
      const writeSpeed = diskIO?.wIO_sec ?? 0;

      let diskContent = '';
      diskContent += `INTR   ${createColoredBar(diskPercent, 12)}  ${diskPercent.toFixed(1)}% (${formatBytes(mainDisk?.used ?? 0)}/${formatBytes(mainDisk?.size ?? 0)})\n`;
      diskContent += `Read   {green-fg}${'█'.repeat(Math.min(6, Math.floor(readSpeed / 1024 / 1024) + 1))}{/green-fg}  ${formatSpeed(readSpeed)}\n`;
      diskContent += `Write  {yellow-fg}${'█'.repeat(Math.min(6, Math.floor(writeSpeed / 1024 / 1024) + 1))}{/yellow-fg}  ${formatSpeed(writeSpeed)}`;
      diskBox.setContent(diskContent);

      // Power
      let powerContent = '';
      if (battery.hasBattery) {
        const batteryColor = battery.percent > 20 ? 'green' : 'red';
        const batteryBar = createSimpleBar(battery.percent, 12, batteryColor);
        const healthPercent =
          battery.maxCapacity && battery.designedCapacity
            ? Math.round((battery.maxCapacity / battery.designedCapacity) * 100)
            : 100;
        const healthBar = createSimpleBar(Math.min(healthPercent, 100), 12, 'green');
        const timeStr =
          battery.timeRemaining > 0
            ? `${Math.floor(battery.timeRemaining / 60)}:${String(Math.round(battery.timeRemaining % 60)).padStart(2, '0')}`
            : '';
        const chargingIcon = battery.isCharging ? '{yellow-fg}⚡{/yellow-fg}' : '';
        const wattage = battery.currentCapacity ? `${Math.abs(battery.currentCapacity)}W` : '';

        powerContent += `Level    ${batteryBar}  ${battery.percent.toFixed(0)}%\n`;
        powerContent += `Health   ${healthBar}  ${healthPercent}%\n`;
        powerContent += `${battery.isCharging ? 'Charging' : 'Battery'} • ${timeStr} • ${wattage} ${chargingIcon}\n`;
        powerContent += `Normal • ${battery.cycleCount || 0} cycles`;
      } else {
        powerContent = 'No battery detected\n(Desktop or AC power)';
      }
      powerBox.setContent(powerContent);

      // Processes - top by CPU
      let procContent = '';
      topProcs.forEach((proc) => {
        const bar = createColoredBar(Math.min(proc.cpu, 100), 8);
        procContent += `${proc.name.padEnd(14)} ${bar}  ${proc.cpu.toFixed(1)}%\n`;
      });
      procBox.setContent(procContent);

      // Network
      const rxSpeed = activeNet?.rx_sec ?? 0;
      const txSpeed = activeNet?.tx_sec ?? 0;
      const rxBars = Math.min(10, Math.max(1, Math.floor(rxSpeed / 1024 / 50)));
      const txBars = Math.min(10, Math.max(1, Math.floor(txSpeed / 1024 / 50)));

      let netContent = '';
      netContent += `Down  {green-fg}${'█'.repeat(rxBars)}{/green-fg}${'░'.repeat(10 - rxBars)}  ${formatSpeed(rxSpeed)}\n`;
      netContent += `Up    {yellow-fg}${'█'.repeat(txBars)}{/yellow-fg}${'░'.repeat(10 - txBars)}  ${formatSpeed(txSpeed)}\n\n`;
      netContent += `${localIP}`;
      netBox.setContent(netContent);

      screen.render();
    } catch (err) {
      // Ignore errors and try again
    }
  }

  // Initial update
  await update();

  // Set interval for updates
  const updateInterval = setInterval(update, interval);

  // Cleanup on exit
  screen.on('destroy', () => {
    clearInterval(updateInterval);
  });

  screen.render();
}

/**
 * Create status command
 */
export function createStatusCommand(): Command {
  const cmd = new Command('status')
    .description('Real-time system monitoring dashboard')
    .option('-i, --interval <seconds>', 'Update interval in seconds (default: 2)', parseInt)
    .option('--no-broom', 'Disable broom animation')
    .action(async (options) => {
      await statusCommand(options);
    });

  return enhanceCommandHelp(cmd);
}
