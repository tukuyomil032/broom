/**
 * Status command - Real-time system monitoring (Multiple preset designs)
 */
import blessed from 'blessed';
import { Command } from 'commander';
import * as si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';
import { enhanceCommandHelp } from '../utils/help.js';
import { loadConfig } from '../utils/config.js';
import { getMonitorRenderer } from '../ui/monitors.js';
import type { MonitorData } from '../ui/monitors.js';

const execAsync = promisify(exec);

interface StatusOptions {
  interval?: number;
  broom?: boolean;
  preset?: number;
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
    const { stdout } = await execAsync('ps -Ao comm,pcpu -r | head -11 | tail -10');
    return stdout
      .trim()
      .split('\n')
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        const cpu = parseFloat(parts.pop() || '0');
        const name = parts.join(' ').replace(/^.*\//, '').slice(0, 20);
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
  const config = await loadConfig();
  const interval = (options.interval ?? 2) * 1000;
  const showBroom = options.broom !== false;
  let preset: 1 | 2 | 3 | 4 | 5 = options.preset
    ? (options.preset as 1 | 2 | 3 | 4 | 5)
    : (config.monitorPreset as 1 | 2 | 3 | 4 | 5);
  if (!preset || preset < 1 || preset > 5) {
    preset = 1;
  }
  let broomFrame = 0;

  // Create blessed screen
  const screen = blessed.screen({
    smartCSR: true,
    title: `Broom Status - Preset ${preset}`,
    fullUnicode: true,
  });

  // Box element storage
  const boxes: Record<string, blessed.Widgets.BoxElement> = {};

  // Create initial layout based on preset
  createScreenLayout(preset, screen, boxes);

  // Get renderer function for preset
  let renderMonitor = getMonitorRenderer(preset);

  // Exit keys
  screen.key(['escape', 'q', 'C-c'], () => {
    process.exit(0);
  });

  // Change preset
  screen.key(['p'], () => {
    const nextPreset = (preset % 5) + 1;
    console.error(`[DEBUG] Preset change requested: ${preset} -> ${nextPreset}`);
    preset = nextPreset as 1 | 2 | 3 | 4 | 5;
    screen.title = `Broom Status - Preset ${preset}`;

    // Remove all children
    screen.children.slice().forEach((child) => {
      child.destroy();
    });

    // Clear box references
    Object.keys(boxes).forEach((key) => {
      delete boxes[key];
    });

    createScreenLayout(preset, screen, boxes);
    renderMonitor = getMonitorRenderer(preset);
    screen.render();
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

      const monitorData: MonitorData = {
        cpuLoad,
        cpuInfo,
        cpuTemp,
        mem,
        disk,
        battery,
        netStats,
        osInfo,
        diskIO,
        graphics,
        localIP,
        topProcs,
        mainDisk,
        activeNet,
      };

      // Render using selected preset
      await renderMonitor(screen, monitorData, boxes);

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
 * Create screen layout for different presets
 */
function createScreenLayout(
  preset: 1 | 2 | 3 | 4 | 5,
  screen: blessed.Widgets.Screen,
  boxes: Record<string, blessed.Widgets.BoxElement>
): void {
  console.error(`[DEBUG] createScreenLayout called with preset: ${preset}`);
  // Clear existing children safely
  screen.children.slice().forEach((child) => {
    if (child !== screen) {
      child.destroy();
    }
  });

  if (preset === 1) {
    // Preset 1: Classic Grid Layout
    const header = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      name: 'header',
      style: { fg: 'white', bg: 'black' },
    });
    boxes['header'] = header;

    const cpuBox = blessed.box({
      parent: screen,
      top: 2,
      left: 0,
      width: '50%-1',
      height: 8,
      label: ' {yellow-fg}●{/yellow-fg} CPU ',
      tags: true,
      name: 'cpu',
      border: { type: 'line' },
      style: { border: { fg: 'cyan' } },
    });
    boxes['cpu'] = cpuBox;

    const memBox = blessed.box({
      parent: screen,
      top: 2,
      left: '50%',
      width: '50%',
      height: 8,
      label: ' {red-fg}▣{/red-fg} Memory ',
      tags: true,
      name: 'mem',
      border: { type: 'line' },
      style: { border: { fg: 'cyan' } },
    });
    boxes['mem'] = memBox;

    const diskBox = blessed.box({
      parent: screen,
      top: 10,
      left: 0,
      width: '50%-1',
      height: 6,
      label: ' {blue-fg}▣{/blue-fg} Disk ',
      tags: true,
      name: 'disk',
      border: { type: 'line' },
      style: { border: { fg: 'cyan' } },
    });
    boxes['disk'] = diskBox;

    const netBox = blessed.box({
      parent: screen,
      top: 10,
      left: '50%',
      width: '50%',
      height: 6,
      label: ' {cyan-fg}↕{/cyan-fg} Network ',
      tags: true,
      name: 'net',
      border: { type: 'line' },
      style: { border: { fg: 'cyan' } },
    });
    boxes['net'] = netBox;

    const procBox = blessed.box({
      parent: screen,
      top: 16,
      left: 0,
      width: '100%',
      height: 7,
      label: ' {magenta-fg}●{/magenta-fg} Processes ',
      tags: true,
      name: 'proc',
      border: { type: 'line' },
      style: { border: { fg: 'cyan' } },
    });
    boxes['proc'] = procBox;

    blessed.box({
      parent: screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      name: 'footer',
      content: '{gray-fg}Press q or Ctrl+C to exit | p to change preset{/gray-fg}',
      style: { fg: 'gray' },
    });
  } else {
    // Presets 2-5: Single main content area
    console.error(`[DEBUG] Creating layout for preset ${preset}`);
    const header = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 2,
      tags: true,
      name: 'header',
      border: { type: 'line' },
      style: { border: { fg: 'cyan' } },
    });
    console.error('[DEBUG] header box created and assigning to boxes...');
    boxes['header'] = header;
    console.error('[DEBUG] boxes["header"] assigned:', boxes['header'] ? 'success' : 'failed');

    const mainBox = blessed.box({
      parent: screen,
      top: 2,
      left: 0,
      width: '100%',
      bottom: 1,
      tags: true,
      name: 'main',
      border: { type: 'line' },
      scrollable: true,
      mouse: true,
      keys: true,
      style: { border: { fg: 'cyan' } },
    });
    console.error('[DEBUG] main box created and assigning to boxes...');
    boxes['main'] = mainBox;
    console.error('[DEBUG] boxes["main"] assigned:', boxes['main'] ? 'success' : 'failed');

    blessed.box({
      parent: screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      name: 'footer',
      content: '{gray-fg}Press q or Ctrl+C to exit | p to change preset{/gray-fg}',
      style: { fg: 'gray' },
    });
  }
}

/**
 * Create status command
 */
export function createStatusCommand(): Command {
  const cmd = new Command('status')
    .description('Real-time system monitoring dashboard (5 presets available)')
    .option('-i, --interval <seconds>', 'Update interval in seconds (default: 2)', parseInt)
    .option('--no-broom', 'Disable broom animation')
    .option('-p, --preset <number>', 'Monitor preset (1-5)', parseInt)
    .action(async (options) => {
      await statusCommand(options);
    });

  return enhanceCommandHelp(cmd);
}
