/**
 * Schedule command - Automated cleanup scheduling
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { enhanceCommandHelp } from '../utils/help.js';
import { expandPath, exists } from '../utils/fs.js';
import { printHeader, separator, success, error, warning, info } from '../ui/output.js';
import { writeFile, readFile, unlink } from 'fs/promises';
import { execSync } from 'child_process';

const LAUNCH_AGENT_PATH = expandPath('~/Library/LaunchAgents/com.broom.cleanup.plist');

interface ScheduleOptions {
  list?: boolean;
  remove?: boolean;
  daily?: boolean;
  weekly?: boolean;
  monthly?: boolean;
  day?: string;
  time?: string;
  scanners?: string;
}

/**
 * Days of week mapping
 */
const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Generate LaunchAgent plist content
 */
function generateLaunchAgent(config: {
  interval: 'daily' | 'weekly' | 'monthly';
  time: string;
  weekday?: number;
  scanners?: string[];
}): string {
  const [hour, minute] = config.time.split(':').map(Number);

  const broomPath = execSync('which broom').toString().trim() || '/usr/local/bin/broom';

  const args = ['<string>clean</string>', '<string>--yes</string>', '<string>--safe</string>'];

  if (config.scanners && config.scanners.length > 0) {
    args.push(`<string>--scanners</string>`, `<string>${config.scanners.join(',')}</string>`);
  }

  let calendarInterval = '';

  if (config.interval === 'daily') {
    calendarInterval = `
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>${hour}</integer>
        <key>Minute</key>
        <integer>${minute}</integer>
    </dict>`;
  } else if (config.interval === 'weekly' && config.weekday !== undefined) {
    calendarInterval = `
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>${config.weekday}</integer>
        <key>Hour</key>
        <integer>${hour}</integer>
        <key>Minute</key>
        <integer>${minute}</integer>
    </dict>`;
  } else if (config.interval === 'monthly') {
    calendarInterval = `
    <key>StartCalendarInterval</key>
    <dict>
        <key>Day</key>
        <integer>1</integer>
        <key>Hour</key>
        <integer>${hour}</integer>
        <key>Minute</key>
        <integer>${minute}</integer>
    </dict>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.broom.cleanup</string>

    <key>ProgramArguments</key>
    <array>
        <string>${broomPath}</string>
        ${args.join('\n        ')}
    </array>

    ${calendarInterval}

    <key>StandardOutPath</key>
    <string>${expandPath('~/.config/broom/schedule.log')}</string>

    <key>StandardErrorPath</key>
    <string>${expandPath('~/.config/broom/schedule-error.log')}</string>
</dict>
</plist>`;
}

/**
 * Install schedule
 */
async function installSchedule(options: ScheduleOptions): Promise<void> {
  const time = options.time || '09:00';
  let interval: 'daily' | 'weekly' | 'monthly' = 'weekly';
  let weekday: number | undefined;

  if (options.daily) {
    interval = 'daily';
  } else if (options.monthly) {
    interval = 'monthly';
  } else if (options.weekly) {
    interval = 'weekly';
    const dayStr = (options.day || 'monday').toLowerCase();
    weekday = WEEKDAYS[dayStr];

    if (weekday === undefined) {
      error(`Invalid day: ${options.day}. Use: ${Object.keys(WEEKDAYS).join(', ')}`);
      return;
    }
  }

  const scanners = options.scanners?.split(',');

  printHeader('⏰ Schedule Cleanup');

  console.log(chalk.bold('Configuration:'));
  console.log(`  Interval: ${chalk.cyan(interval)}`);

  if (interval === 'weekly' && weekday !== undefined) {
    const dayName = Object.keys(WEEKDAYS).find((k) => WEEKDAYS[k] === weekday);
    console.log(`  Day: ${chalk.cyan(dayName)}`);
  }

  console.log(`  Time: ${chalk.cyan(time)}`);

  if (scanners) {
    console.log(`  Scanners: ${chalk.cyan(scanners.join(', '))}`);
  } else {
    console.log(`  Scanners: ${chalk.cyan('all safe scanners')}`);
  }

  console.log();

  // Check if already scheduled
  if (exists(LAUNCH_AGENT_PATH)) {
    warning('A schedule already exists. Remove it first with --remove');
    return;
  }

  // Generate plist
  const plist = generateLaunchAgent({ interval, time, weekday, scanners });

  // Write plist
  await writeFile(LAUNCH_AGENT_PATH, plist, 'utf-8');

  // Load with launchctl
  try {
    execSync(`launchctl load "${LAUNCH_AGENT_PATH}"`);
    success('Schedule installed successfully!');
    console.log();
    console.log(chalk.dim('Cleanup will run automatically according to the schedule.'));
    console.log(chalk.dim(`Logs: ~/.config/broom/schedule.log`));
  } catch (err) {
    error(`Failed to load schedule: ${err}`);
    await unlink(LAUNCH_AGENT_PATH);
  }
}

/**
 * Remove schedule
 */
async function removeSchedule(): Promise<void> {
  printHeader('⏰ Remove Schedule');

  if (!exists(LAUNCH_AGENT_PATH)) {
    warning('No schedule found');
    return;
  }

  try {
    // Unload from launchctl
    execSync(`launchctl unload "${LAUNCH_AGENT_PATH}"`);

    // Remove plist
    await unlink(LAUNCH_AGENT_PATH);

    success('Schedule removed successfully');
  } catch (err) {
    error(`Failed to remove schedule: ${err}`);
  }
}

/**
 * List schedules
 */
async function listSchedule(): Promise<void> {
  printHeader('⏰ Scheduled Cleanups');

  if (!exists(LAUNCH_AGENT_PATH)) {
    warning('No schedule configured');
    console.log();
    console.log(chalk.dim('Use "broom schedule --weekly --time 09:00" to create a schedule'));
    return;
  }

  try {
    const content = await readFile(LAUNCH_AGENT_PATH, 'utf-8');

    // Parse basic info from plist
    const timeMatch = content.match(/<key>Hour<\/key>\s*<integer>(\d+)<\/integer>/);
    const minuteMatch = content.match(/<key>Minute<\/key>\s*<integer>(\d+)<\/integer>/);
    const weekdayMatch = content.match(/<key>Weekday<\/key>\s*<integer>(\d+)<\/integer>/);
    const dayMatch = content.match(/<key>Day<\/key>\s*<integer>(\d+)<\/integer>/);

    console.log(chalk.bold('Active Schedule:'));

    if (dayMatch) {
      console.log(`  Interval: ${chalk.cyan('Monthly')}`);
      console.log(`  Day: ${chalk.cyan('1st of month')}`);
    } else if (weekdayMatch) {
      const weekday = parseInt(weekdayMatch[1]);
      const dayName = Object.keys(WEEKDAYS).find((k) => WEEKDAYS[k] === weekday) || 'Unknown';
      console.log(`  Interval: ${chalk.cyan('Weekly')}`);
      console.log(`  Day: ${chalk.cyan(dayName)}`);
    } else {
      console.log(`  Interval: ${chalk.cyan('Daily')}`);
    }

    if (timeMatch && minuteMatch) {
      const hour = timeMatch[1].padStart(2, '0');
      const minute = minuteMatch[1].padStart(2, '0');
      console.log(`  Time: ${chalk.cyan(`${hour}:${minute}`)}`);
    }

    console.log();
    console.log(chalk.dim(`Config: ${LAUNCH_AGENT_PATH}`));
    console.log(chalk.dim('Use "broom schedule --remove" to uninstall'));
  } catch (err) {
    error(`Failed to read schedule: ${err}`);
  }
}

/**
 * Execute schedule command
 */
export async function scheduleCommand(options: ScheduleOptions): Promise<void> {
  if (options.list || (!options.daily && !options.weekly && !options.monthly && !options.remove)) {
    await listSchedule();
    return;
  }

  if (options.remove) {
    await removeSchedule();
    return;
  }

  await installSchedule(options);
}

/**
 * Create schedule command
 */
export function createScheduleCommand(): Command {
  const cmd = new Command('schedule')
    .description('Schedule automated cleanups')
    .option('-l, --list', 'Show current schedule')
    .option('-r, --remove', 'Remove scheduled cleanup')
    .option('--daily', 'Schedule daily cleanup')
    .option('--weekly', 'Schedule weekly cleanup')
    .option('--monthly', 'Schedule monthly cleanup')
    .option('--day <day>', 'Day of week for weekly (default: monday)')
    .option('--time <time>', 'Time to run (HH:MM format, default: 09:00)')
    .option('--scanners <list>', 'Comma-separated list of scanners to run')
    .action(async (options) => {
      await scheduleCommand(options);
    });

  return enhanceCommandHelp(cmd);
}
