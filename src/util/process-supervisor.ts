import { spawn, ChildProcess } from 'child_process';
import { logger } from './logger';
import { OpenCodeError } from '../types';

export interface ProcessConfig {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  restartDelay: number; // milliseconds
  maxRestarts: number;
  healthCheck?: {
    url?: string;
    port?: number;
    timeout: number; // milliseconds
  };
}

export interface ProcessState {
  pid?: number;
  startTime: Date;
  restartCount: number;
  lastHealthCheck: Date;
  status: 'running' | 'stopped' | 'restarting' | 'failed';
}

/**
 * Process supervisor for crash recovery and automatic restarts
 */
export class ProcessSupervisor {
  private static instance: ProcessSupervisor;
  private processes = new Map<string, ChildProcess>();
  private processStates = new Map<string, ProcessState>();
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();

  private constructor() {}

  public static getInstance(): ProcessSupervisor {
    if (!ProcessSupervisor.instance) {
      ProcessSupervisor.instance = new ProcessSupervisor();
    }
    return ProcessSupervisor.instance;
  }

  /**
   * Start and supervise a process
   * @param processId - Unique process identifier
   * @param config - Process configuration
   * @returns Promise resolving when process is started
   */
  public async startProcess(processId: string, config: ProcessConfig): Promise<void> {
    try {
      // Check if process is already running
      if (this.processes.has(processId)) {
        logger.warn('Process already running, ignoring start request', { processId });
        return;
      }

      const state: ProcessState = {
        startTime: new Date(),
        restartCount: 0,
        lastHealthCheck: new Date(),
        status: 'running',
      };

      this.processStates.set(processId, state);

      // Start the process
      await this.spawnProcess(processId, config);

      // Start health monitoring if configured
      if (config.healthCheck) {
        this.startHealthMonitoring(processId, config);
      }

      logger.info('Process started and supervised', {
        processId,
        command: config.command,
        args: config.args,
        pid: state.pid,
      });
    } catch (error: unknown) {
      logger.error('Failed to start supervised process', {
        processId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new OpenCodeError(
        'PROCESS_START_FAILED',
        `Failed to start process ${processId}`,
        { processId, config }
      );
    }
  }

  /**
   * Stop a supervised process
   * @param processId - Process identifier
   * @param signal - Signal to send (default: SIGTERM)
   * @returns Promise resolving when process is stopped
   */
  public async stopProcess(processId: string, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    const process = this.processes.get(processId);
    const state = this.processStates.get(processId);

    if (!process || !state) {
      logger.warn('Process not found for stopping', { processId });
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        logger.warn('Process stop timeout, force killing', { processId, pid: state.pid });
        if (process.pid) {
          process.kill('SIGKILL');
        }
        resolve(undefined);
      }, 10000); // 10 second timeout

      process.on('close', (code, signal) => { (code: number | null, signal: NodeJS.Signals | null) => {
        clearTimeout(timeout);
        state.status = 'stopped';
        logger.info('Process stopped', {
          processId,
          pid: state.pid,
          code,
          signal,
        });
        resolve(undefined);
      });

      process.on('error', (error) => { (error: Error) => {
        clearTimeout(timeout);
        logger.error('Error stopping process', {
          processId,
          pid: state.pid,
          error: error.message,
        });
        reject(error);
      });

      // Send stop signal
      process.kill(signal);
    }).finally(() => {
      // Clean up
      this.processes.delete(processId);
      this.processStates.delete(processId);
      this.stopHealthMonitoring(processId);
    });
  }

  /**
   * Get process status
   * @param processId - Process identifier
   * @returns Process state or null if not found
   */
  public getProcessStatus(processId: string): ProcessState | null {
    return this.processStates.get(processId) || null;
  }

  /**
   * Get all supervised processes
   * @returns Map of process IDs to states
   */
  public getAllProcesses(): Map<string, ProcessState> {
    return new Map(this.processStates);
  }

  /**
   * Emergency stop all processes
   * @returns Promise resolving when all processes are stopped
   */
  public async emergencyStopAll(): Promise<void> {
    const stopPromises: Promise<void>[] = [];

    for (const processId of this.processes.keys()) {
      stopPromises.push(this.stopProcess(processId, 'SIGKILL'));
    }

    await Promise.allSettled(stopPromises);
    logger.warn('Emergency stop of all supervised processes completed');
  }

  /**
   * Spawn a new process instance
   * @param processId - Process identifier
   * @param config - Process configuration
   */
  private async spawnProcess(processId: string, config: ProcessConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(config.command, config.args, {
        cwd: config.cwd,
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe'], // Capture all streams
      });

      const state = this.processStates.get(processId)!;
      state.pid = process.pid;

      // Handle process events
      process.on('spawn', () => {
        logger.debug('Process spawned successfully', {
          processId,
          pid: process.pid,
          command: config.command,
        });
        resolve(undefined);
      });

      process.on('error', (error) => {
        logger.error('Process spawn error', {
          processId,
          error: error.message,
        });
        reject(error);
      });

      // Handle unexpected exits
      process.on('close', (code, signal) => {
        const state = this.processStates.get(processId);
        if (state && state.status !== 'stopped') {
          logger.warn('Process exited unexpectedly', {
            processId,
            pid: process.pid,
            code,
            signal,
          });

          // Attempt restart if within limits
          this.handleProcessExit(processId, config, code, signal);
        }
      });

      // Log stdout/stderr for debugging
      if (process.stdout) {
        process.stdout.on('data', (data) => {
          logger.debug('Process stdout', {
            processId,
            pid: process.pid,
            data: data.toString().trim(),
          });
        });
      }

      if (process.stderr) {
        process.stderr.on('data', (data) => {
          logger.warn('Process stderr', {
            processId,
            pid: process.pid,
            data: data.toString().trim(),
          });
        });
      }

      this.processes.set(processId, process);
    });
  }

  /**
   * Handle process exit and decide on restart
   * @param processId - Process identifier
   * @param config - Process configuration
   * @param code - Exit code
   * @param signal - Exit signal
   */
  private async handleProcessExit(
    processId: string,
    config: ProcessConfig,
    code: number | null,
    signal: NodeJS.Signals | null
  ): Promise<void> {
    const state = this.processStates.get(processId);
    if (!state) return;

    state.restartCount++;

    if (state.restartCount >= config.maxRestarts) {
      logger.error('Process exceeded maximum restart attempts', {
        processId,
        restartCount: state.restartCount,
        maxRestarts: config.maxRestarts,
      });
      state.status = 'failed';
      return;
    }

    logger.info('Attempting process restart', {
      processId,
      restartCount: state.restartCount,
      maxRestarts: config.maxRestarts,
      delay: config.restartDelay,
    });

    state.status = 'restarting';

    // Wait before restart
    setTimeout(async () => {
      try {
        await this.spawnProcess(processId, config);
        state.status = 'running';
        state.startTime = new Date();
        logger.info('Process restarted successfully', {
          processId,
          pid: state.pid,
          restartCount: state.restartCount,
        });
      } catch (error: unknown) {
        logger.error('Process restart failed', {
          processId,
          error: error instanceof Error ? error.message : String(error),
        });
        state.status = 'failed';
      }
    }, config.restartDelay);
  }

  /**
   * Start health monitoring for a process
   * @param processId - Process identifier
   * @param config - Process configuration with health check
   */
  private startHealthMonitoring(processId: string, config: ProcessConfig): void {
    if (!config.healthCheck) return;

    const interval = setInterval(async () => {
      const isHealthy = await this.checkProcessHealth(processId, config.healthCheck!);
      const state = this.processStates.get(processId);

      if (state) {
        state.lastHealthCheck = new Date();

        if (!isHealthy && state.status === 'running') {
          logger.warn('Process health check failed, marking as unhealthy', {
            processId,
            pid: state.pid,
          });
          // Could trigger restart logic here
        }
      }
    }, 30000); // Check every 30 seconds

    this.healthCheckIntervals.set(processId, interval);
  }

  /**
   * Stop health monitoring for a process
   * @param processId - Process identifier
   */
  private stopHealthMonitoring(processId: string): void {
    const interval = this.healthCheckIntervals.get(processId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(processId);
    }
  }

  /**
   * Check process health
   * @param processId - Process identifier
   * @param healthCheck - Health check configuration
   * @returns Promise resolving to health status
   */
  private async checkProcessHealth(
    processId: string,
    healthCheck: NonNullable<ProcessConfig['healthCheck']>
  ): Promise<boolean> {
    try {
      if (healthCheck.url) {
        // HTTP health check
        const response = await fetch(healthCheck.url, {
          signal: AbortSignal.timeout(healthCheck.timeout),
        });
        return response.ok;
      } else if (healthCheck.port) {
        // TCP port check (simplified)
        // In real implementation, would use net.Socket
        return true; // Placeholder
      }
      return true;
    } catch (error: unknown) {
      logger.debug('Health check failed', {
        processId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

// Export singleton instance
export const processSupervisor = ProcessSupervisor.getInstance();
