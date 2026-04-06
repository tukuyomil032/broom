/**
 * Timeout utilities for command execution
 */
import { exec, type ChildProcess } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExecResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * Execute a command with timeout
 * @param command - Command to execute
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Promise with result including timeout flag
 */
export async function execWithTimeout(
  command: string,
  timeoutMs: number = 30000
): Promise<ExecResult> {
  let child: ChildProcess | null = null;
  let timedOut = false;

  const execPromise = new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    child = exec(command, (error, stdout, stderr) => {
      if (error && !timedOut) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      timedOut = true;
      if (child && child.pid) {
        try {
          process.kill(child.pid, 'SIGKILL');
        } catch (err) {
          // Process may have already exited
        }
      }
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([execPromise, timeoutPromise]);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      timedOut: false,
    };
  } catch (error) {
    if (timedOut) {
      return {
        stdout: '',
        stderr: (error as Error).message,
        timedOut: true,
      };
    }
    throw error;
  }
}
