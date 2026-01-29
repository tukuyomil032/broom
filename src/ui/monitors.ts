/**
 * System Monitor Presets - Multiple UI designs for status display
 */
import blessed, { Widgets } from 'blessed';
import * as si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface MonitorData {
  cpuLoad: Awaited<ReturnType<typeof si.currentLoad>>;
  cpuInfo: Awaited<ReturnType<typeof si.cpu>>;
  cpuTemp: Awaited<ReturnType<typeof si.cpuTemperature>>;
  mem: Awaited<ReturnType<typeof si.mem>>;
  disk: Awaited<ReturnType<typeof si.fsSize>>;
  battery: Awaited<ReturnType<typeof si.battery>>;
  netStats: Awaited<ReturnType<typeof si.networkStats>>;
  osInfo: Awaited<ReturnType<typeof si.osInfo>>;
  diskIO: Awaited<ReturnType<typeof si.disksIO>>;
  graphics: Awaited<ReturnType<typeof si.graphics>>;
  localIP: string;
  topProcs: Array<{ name: string; cpu: number }>;
  mainDisk: Awaited<ReturnType<typeof si.fsSize>>[0];
  activeNet: Awaited<ReturnType<typeof si.networkStats>>[0];
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format speed (bytes per second)
 */
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return bytesPerSec.toFixed(2) + ' B/s';
  if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(2) + ' KB/s';
  return (bytesPerSec / 1024 / 1024).toFixed(2) + ' MB/s';
}

/**
 * Create colored bar for progress display
 */
export function createColoredBar(percent: number, width: number): string {
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
export function createSimpleBar(percent: number, width: number, color: string = 'green'): string {
  const filled = Math.round((percent / 100) * width);
  return `{${color}-fg}${'█'.repeat(filled)}{/${color}-fg}{black-fg}${'░'.repeat(width - filled)}{/black-fg}`;
}

/**
 * Calculate system health score (0-100)
 */
export function calculateHealth(
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
 * Monitor Preset 1: Original design (Classic Grid Layout)
 */
export async function renderMonitorPreset1(
  screen: Widgets.Screen,
  data: MonitorData,
  boxes: Record<string, Widgets.BoxElement>
): Promise<void> {
  console.error('[DEBUG] renderMonitorPreset1 called');
  const { cpuLoad, cpuInfo, cpuTemp, mem, battery, diskIO, osInfo, graphics, topProcs } = data;
  const { mainDisk, activeNet, localIP } = data;

  // Header
  const memTotalStr = formatBytes(mem.total, 1);
  const diskTotalStr = formatBytes(mainDisk?.size ?? 0, 1);
  const memUsage = (mem.used / mem.total) * 100;
  const diskUsage = mainDisk?.use ?? 0;
  const batteryPercent = battery.hasBattery ? battery.percent : 100;
  const health = calculateHealth(cpuLoad.currentLoad, memUsage, diskUsage, batteryPercent);

  const gpu = graphics.controllers?.[0];
  const gpuName = gpu?.model ? `(${gpu.model.replace('Apple ', '').split(' ')[0]})` : '';

  let headerContent =
    `{bold}Broom Status{/bold}  {green-fg}●{/green-fg} Health {bold}{yellow-fg}${health}{/yellow-fg}{/bold}  ` +
    `${osInfo.hostname.split('.')[0]} • ${cpuInfo.manufacturer} ${cpuInfo.brand} ${gpuName} • ` +
    `${memTotalStr}/${diskTotalStr} • ${osInfo.distro} ${osInfo.release}`;

  // CPU
  const cpuCores = cpuLoad.cpus || [];
  let cpuContent = '';
  const coresToShow = cpuCores.slice(0, 6);
  coresToShow.forEach((core: any, i: number) => {
    const bar = createColoredBar(core.load, 12);
    cpuContent += `Core${i + 1}  ${bar}  ${core.load.toFixed(1)}%\n`;
  });
  const temp = cpuTemp.main > 0 ? `@ ${cpuTemp.main.toFixed(1)}°C` : '';
  const loadAvg = cpuLoad.avgLoad ? cpuLoad.avgLoad.toFixed(2) : '0.00';
  cpuContent += `Load  ${loadAvg} / ${cpuLoad.currentLoad.toFixed(2)} ${temp}`;

  // Memory
  const memUsedPercent = (mem.used / mem.total) * 100;
  const memFreePercent = (mem.free / mem.total) * 100;
  const swapUsedPercent = mem.swaptotal > 0 ? (mem.swapused / mem.swaptotal) * 100 : 0;
  let memContent = '';
  memContent += `Used    ${createColoredBar(memUsedPercent, 12)}  ${memUsedPercent.toFixed(1)}%\n`;
  memContent += `Free    ${createSimpleBar(memFreePercent, 12, 'green')}  ${memFreePercent.toFixed(1)}%\n`;
  memContent += `Swap    ${createColoredBar(swapUsedPercent, 12)}  ${swapUsedPercent.toFixed(1)}%\n`;
  memContent += `Total ${formatBytes(mem.total)} / Avail ${formatBytes(mem.available)}`;

  // Disk
  const diskPercent = mainDisk?.use ?? 0;
  const readSpeed = diskIO?.rIO_sec ?? 0;
  const writeSpeed = diskIO?.wIO_sec ?? 0;
  let diskContent = '';
  diskContent += `INTR   ${createColoredBar(diskPercent, 12)}  ${diskPercent.toFixed(1)}%\n`;
  diskContent += `Read   {green-fg}█{/green-fg}  ${formatSpeed(readSpeed)}\n`;
  diskContent += `Write  {yellow-fg}█{/yellow-fg}  ${formatSpeed(writeSpeed)}`;

  // Network
  const rxSpeed = activeNet?.rx_sec ?? 0;
  const txSpeed = activeNet?.tx_sec ?? 0;
  let netContent = '';
  netContent += `Down  ${formatSpeed(rxSpeed)}\n`;
  netContent += `Up    ${formatSpeed(txSpeed)}\n\n`;
  netContent += `IP: ${localIP}`;

  // Processes
  let procContent = '';
  topProcs.slice(0, 5).forEach((proc) => {
    const bar = createColoredBar(Math.min(proc.cpu, 100), 8);
    procContent += `${proc.name.padEnd(14)} ${bar}  ${proc.cpu.toFixed(1)}%\n`;
  });

  // Update box contents using boxes object
  if (boxes['header']) boxes['header'].setContent(headerContent);
  if (boxes['cpu']) boxes['cpu'].setContent(cpuContent);
  if (boxes['mem']) boxes['mem'].setContent(memContent);
  if (boxes['disk']) boxes['disk'].setContent(diskContent);
  if (boxes['net']) boxes['net'].setContent(netContent);
  if (boxes['proc']) boxes['proc'].setContent(procContent);
}

/**
 * Monitor Preset 2: Minimal Compact Layout
 */
export async function renderMonitorPreset2(
  screen: Widgets.Screen,
  data: MonitorData,
  boxes: Record<string, Widgets.BoxElement>
): Promise<void> {
  console.error('[DEBUG] renderMonitorPreset2 called');
  console.error('[DEBUG] boxes keys:', Object.keys(boxes));
  console.error('[DEBUG] boxes["main"]:', boxes['main'] ? 'exists' : 'undefined');
  console.error('[DEBUG] boxes["header"]:', boxes['header'] ? 'exists' : 'undefined');
  const {
    cpuLoad,
    cpuInfo,
    cpuTemp,
    mem,
    battery,
    osInfo,
    topProcs,
    mainDisk,
    activeNet,
    localIP,
  } = data;

  const memUsage = (mem.used / mem.total) * 100;
  const diskUsage = mainDisk?.use ?? 0;
  const batteryPercent = battery.hasBattery ? battery.percent : 100;
  const health = calculateHealth(cpuLoad.currentLoad, memUsage, diskUsage, batteryPercent);

  // Compact header
  let headerContent = `┌─ System ─┐  ${cpuInfo.brand} @ ${cpuTemp.main.toFixed(0)}°C  │ CPU ${cpuLoad.currentLoad.toFixed(0)}% │ MEM ${memUsage.toFixed(0)}% │ DISK ${diskUsage.toFixed(0)}% │ HEALTH ${health}`;

  // System stats in one line
  let mainContent = '';
  mainContent += `CPU   ${createColoredBar(cpuLoad.currentLoad, 20)} ${cpuLoad.currentLoad.toFixed(1)}%\n`;
  mainContent += `MEM   ${createColoredBar(memUsage, 20)} ${memUsage.toFixed(1)}%\n`;
  mainContent += `DISK  ${createColoredBar(diskUsage, 20)} ${diskUsage.toFixed(1)}%\n`;
  mainContent += '\n';

  // Top processes
  mainContent += `Top Processes:\n`;
  topProcs.slice(0, 3).forEach((proc) => {
    mainContent += `  ${proc.name.padEnd(12)} ${proc.cpu.toFixed(1)}%\n`;
  });

  mainContent += `\nNetwork: ↓ ${formatSpeed(activeNet?.rx_sec ?? 0)} ↑ ${formatSpeed(activeNet?.tx_sec ?? 0)}\n`;
  mainContent += `IP: ${localIP}`;

  console.error('[DEBUG] About to call setContent on boxes...');
  console.error('[DEBUG] boxes["header"] value:', boxes['header']);
  console.error('[DEBUG] boxes["main"] value:', boxes['main']);

  if (boxes['header']) {
    console.error('[DEBUG] Setting header content');
    boxes['header'].setContent(headerContent);
  } else {
    console.error('[DEBUG] ERROR: boxes["header"] is falsy!');
  }

  if (boxes['main']) {
    console.error('[DEBUG] Setting main content');
    boxes['main'].setContent(mainContent);
  } else {
    console.error('[DEBUG] ERROR: boxes["main"] is falsy!');
  }
}

/**
 * Monitor Preset 3: Detailed Information
 */
export async function renderMonitorPreset3(
  screen: Widgets.Screen,
  data: MonitorData,
  boxes: Record<string, Widgets.BoxElement>
): Promise<void> {
  console.error('[DEBUG] renderMonitorPreset3 called');
  const {
    cpuLoad,
    cpuInfo,
    cpuTemp,
    mem,
    battery,
    diskIO,
    osInfo,
    graphics,
    topProcs,
    mainDisk,
    activeNet,
    localIP,
  } = data;

  const memUsage = (mem.used / mem.total) * 100;
  const diskUsage = mainDisk?.use ?? 0;

  let content = '';
  content += `{bold}═══ SYSTEM INFORMATION ═══{/bold}\n`;
  content += `Hostname: ${osInfo.hostname}\n`;
  content += `OS: ${osInfo.distro} ${osInfo.release}\n\n`;

  content += `{bold}═══ HARDWARE ═══{/bold}\n`;
  content += `CPU: ${cpuInfo.manufacturer} ${cpuInfo.brand}\n`;
  content += `Cores: ${cpuInfo.cores} physical, ${cpuInfo.processors} logical\n`;
  content += `GPU: ${graphics.controllers?.[0]?.model || 'N/A'}\n`;
  content += `RAM: ${formatBytes(mem.total)}\n\n`;

  content += `{bold}═══ PERFORMANCE ═══{/bold}\n`;
  content += `CPU Usage: ${createColoredBar(cpuLoad.currentLoad, 15)} ${cpuLoad.currentLoad.toFixed(1)}%\n`;
  content += `Temp: ${cpuTemp.main.toFixed(1)}°C\n`;
  content += `Memory: ${createColoredBar(memUsage, 15)} ${memUsage.toFixed(1)}% (${formatBytes(mem.used)}/${formatBytes(mem.total)})\n`;
  content += `Disk: ${createColoredBar(diskUsage, 15)} ${diskUsage.toFixed(1)}% (${formatBytes(mainDisk?.used ?? 0)}/${formatBytes(mainDisk?.size ?? 0)})\n\n`;

  if (battery.hasBattery) {
    content += `{bold}═══ POWER ═══{/bold}\n`;
    content += `Battery: ${battery.percent.toFixed(0)}% ${battery.isCharging ? '(charging)' : '(discharging)'}\n`;
    content += `Health: ${battery.maxCapacity && battery.designedCapacity ? Math.round((battery.maxCapacity / battery.designedCapacity) * 100) : 100}%\n\n`;
  }

  content += `{bold}═══ NETWORK ═══{/bold}\n`;
  content += `IP: ${localIP}\n`;
  content += `Download: ${formatSpeed(activeNet?.rx_sec ?? 0)}\n`;
  content += `Upload: ${formatSpeed(activeNet?.tx_sec ?? 0)}\n\n`;

  content += `{bold}═══ TOP PROCESSES ═══{/bold}\n`;
  topProcs.slice(0, 5).forEach((proc) => {
    content += `${proc.name.padEnd(15)} ${proc.cpu.toFixed(1)}%\n`;
  });

  if (boxes['main']) boxes['main'].setContent(content);
}

/**
 * Monitor Preset 4: Linux-style Dashboard (like in reference image)
 */
export async function renderMonitorPreset4(
  screen: Widgets.Screen,
  data: MonitorData,
  boxes: Record<string, Widgets.BoxElement>
): Promise<void> {
  console.error('[DEBUG] renderMonitorPreset4 called');
  const { cpuLoad, cpuInfo, cpuTemp, mem, battery, diskIO, osInfo, topProcs, mainDisk, activeNet } =
    data;

  const memUsage = (mem.used / mem.total) * 100;
  const diskUsage = mainDisk?.use ?? 0;
  const swapUsage = mem.swaptotal > 0 ? (mem.swapused / mem.swaptotal) * 100 : 0;

  let headerContent = `{cyan-fg}┌─ Broom Status ${cpuInfo.brand} ─────────────────────┐{/cyan-fg}`;

  let content = '';

  // CPU section
  content += `{yellow-fg}CPU Usage{/yellow-fg}\n`;
  const cpuCores = cpuLoad.cpus || [];
  const coresToShow = cpuCores.slice(0, 8);
  coresToShow.forEach((core: any, i: number) => {
    const bar = createColoredBar(core.load, 18);
    content += `  CPU${i}  ${bar}  ${core.load.toFixed(1)}%\n`;
  });
  content += `  Avg   ${cpuLoad.currentLoad.toFixed(1)}%  Temp ${cpuTemp.main.toFixed(1)}°C\n\n`;

  // Memory section
  content += `{red-fg}Memory Usage{/red-fg}\n`;
  content += `  Main  ${createColoredBar(memUsage, 18)}  ${memUsage.toFixed(1)}%  ${formatBytes(mem.used)}/${formatBytes(mem.total)}\n`;
  content += `  Swap  ${createColoredBar(swapUsage, 18)}  ${swapUsage.toFixed(1)}%  ${formatBytes(mem.swapused)}/${formatBytes(mem.swaptotal)}\n\n`;

  // Disk section
  content += `{blue-fg}Disk Usage{/blue-fg}\n`;
  const readSpeed = diskIO?.rIO_sec ?? 0;
  const writeSpeed = diskIO?.wIO_sec ?? 0;
  content += `  I/O   ${createColoredBar(diskUsage, 18)}  ${diskUsage.toFixed(1)}%  ${formatBytes(mainDisk?.used ?? 0)}/${formatBytes(mainDisk?.size ?? 0)}\n`;
  content += `  R/s   ${formatSpeed(readSpeed)}\n`;
  content += `  W/s   ${formatSpeed(writeSpeed)}\n\n`;

  // Network section
  content += `{cyan-fg}Network{/cyan-fg}\n`;
  const rxSpeed = activeNet?.rx_sec ?? 0;
  const txSpeed = activeNet?.tx_sec ?? 0;
  content += `  RX    ${createSimpleBar(Math.min((rxSpeed / 1024 / 100) * 10, 100), 18, 'green')}  ${formatSpeed(rxSpeed)}\n`;
  content += `  TX    ${createSimpleBar(Math.min((txSpeed / 1024 / 100) * 10, 100), 18, 'yellow')}  ${formatSpeed(txSpeed)}\n\n`;

  // Processes section
  content += `{magenta-fg}Top Processes (by CPU){/magenta-fg}\n`;
  content += `  PID     Command          CPU%\n`;
  topProcs.slice(0, 6).forEach((proc) => {
    content += `         ${proc.name.padEnd(14)}  ${proc.cpu.toFixed(1)}%\n`;
  });

  if (boxes['header']) boxes['header'].setContent(headerContent);
  if (boxes['main']) boxes['main'].setContent(content);
}

/**
 * Monitor Preset 5: Modern Colorful Dashboard
 */
export async function renderMonitorPreset5(
  screen: Widgets.Screen,
  data: MonitorData,
  boxes: Record<string, Widgets.BoxElement>
): Promise<void> {
  console.error('[DEBUG] renderMonitorPreset5 called');
  const {
    cpuLoad,
    cpuInfo,
    cpuTemp,
    mem,
    battery,
    diskIO,
    osInfo,
    topProcs,
    mainDisk,
    activeNet,
    localIP,
  } = data;

  const memUsage = (mem.used / mem.total) * 100;
  const diskUsage = mainDisk?.use ?? 0;
  const batteryPercent = battery.hasBattery ? battery.percent : 100;
  const health = calculateHealth(cpuLoad.currentLoad, memUsage, diskUsage, batteryPercent);

  let headerContent = `{bold}{cyan-fg}🚀 BROOM DASHBOARD {/cyan-fg}{/bold}  Health: {bold}${health}{/bold}  Hostname: {bold}${osInfo.hostname}{/bold}`;

  let content = '';

  // Quick stats row
  content += `┌────────────────────────────────────────────────────────────────────┐\n`;
  content += `│ {yellow-fg}◆ CPU{/yellow-fg} ${createColoredBar(cpuLoad.currentLoad, 12)} ${cpuLoad.currentLoad.toFixed(1)}%  {red-fg}◆ MEM{/red-fg} ${createColoredBar(memUsage, 12)} ${memUsage.toFixed(1)}%  {blue-fg}◆ DISK{/blue-fg} ${createColoredBar(diskUsage, 12)} ${diskUsage.toFixed(1)}% │\n`;
  content += `└────────────────────────────────────────────────────────────────────┘\n\n`;

  // Detailed sections
  content += `{yellow-fg}📊 CPU{/yellow-fg}  Cores: ${cpuInfo.cores}  Brand: ${cpuInfo.brand}  Temp: ${cpuTemp.main.toFixed(1)}°C  Load: ${cpuLoad.avgLoad?.toFixed(2)}\n`;
  content += `${createColoredBar(cpuLoad.currentLoad, 35)}  ${cpuLoad.currentLoad.toFixed(2)}%\n\n`;

  content += `{red-fg}🧠 MEMORY{/red-fg}  Total: ${formatBytes(mem.total)}\n`;
  content += `Used      ${createColoredBar((mem.used / mem.total) * 100, 32)}  ${formatBytes(mem.used)}\n`;
  content += `Available ${createSimpleBar((mem.available / mem.total) * 100, 32, 'green')}  ${formatBytes(mem.available)}\n\n`;

  content += `{blue-fg}💾 DISK{/blue-fg}  Total: ${formatBytes(mainDisk?.size ?? 0)}\n`;
  content += `Used   ${createColoredBar(diskUsage, 32)}  ${formatBytes(mainDisk?.used ?? 0)}\n`;
  content += `I/O: ↓ ${formatSpeed(diskIO?.rIO_sec ?? 0).padEnd(12)} ↑ ${formatSpeed(diskIO?.wIO_sec ?? 0)}\n\n`;

  if (battery.hasBattery) {
    const batteryColor = battery.percent > 20 ? 'green' : 'red';
    content += `{green-fg}Power{/green-fg}  Status: ${battery.isCharging ? 'Charging' : 'Battery'}\n`;
    content += `${createSimpleBar(battery.percent, 35, batteryColor)}  ${battery.percent.toFixed(0)}%\n\n`;
  }

  content += `{cyan-fg}Network{/cyan-fg}  IP: ${localIP}\n`;
  const rxSpeed = activeNet?.rx_sec ?? 0;
  const txSpeed = activeNet?.tx_sec ?? 0;
  content += `Download ${createSimpleBar(Math.min((rxSpeed / 1024 / 100) * 10, 100), 28, 'green')}  ${formatSpeed(rxSpeed)}\n`;
  content += `Upload   ${createSimpleBar(Math.min((txSpeed / 1024 / 100) * 10, 100), 28, 'yellow')}  ${formatSpeed(txSpeed)}\n\n`;

  content += `{magenta-fg}⚙️  TOP PROCESSES{/magenta-fg}\n`;
  topProcs.slice(0, 5).forEach((proc, i) => {
    content += `${i + 1}. ${proc.name.padEnd(16)} ${proc.cpu.toFixed(1)}%\n`;
  });

  if (boxes['header']) boxes['header'].setContent(headerContent);
  if (boxes['main']) boxes['main'].setContent(content);
}

/**
 * Get render function for preset
 */
export function getMonitorRenderer(
  preset: 1 | 2 | 3 | 4 | 5
): (
  screen: Widgets.Screen,
  data: MonitorData,
  boxes: Record<string, Widgets.BoxElement>
) => Promise<void> {
  switch (preset) {
    case 1:
      return renderMonitorPreset1;
    case 2:
      return renderMonitorPreset2;
    case 3:
      return renderMonitorPreset3;
    case 4:
      return renderMonitorPreset4;
    case 5:
      return renderMonitorPreset5;
    default:
      return renderMonitorPreset1;
  }
}
