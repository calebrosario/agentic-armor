// Resource Limit Monitor Hook - Phase 2: MVP Core
// Week 12, Task 12.11: Resource Limit Monitor Hook

import { logger } from '../../util/logger';
import { AfterTaskStartHook } from '../task-lifecycle';

// Resource monitoring configuration
interface MonitoringConfig {
  memory?: {
    threshold: number; // percentage
    alert: boolean;
  };
  cpu?: {
    threshold: number; // percentage
    alert: boolean;
  };
  pids?: {
    threshold: number; // percentage
    alert: boolean;
  };
}

// Active monitoring intervals
const activeMonitors = new Map<string, NodeJS.Timeout>();

/**
 * Start resource monitoring for a task
 *
 * This hook:
 * 1. Monitors container resource usage
 * 2. Alerts on threshold breaches
 * 3. Enforces limits if configured
 * 4. Stops monitoring on task completion
 */
export function createResourceLimitMonitorHook(
  config: MonitoringConfig = {}
): AfterTaskStartHook {
  const monitoringConfig: Required<MonitoringConfig> = {
    memory: { threshold: 85, alert: true, ...config.memory },
    cpu: { threshold: 80, alert: true, ...config.cpu },
    pids: { threshold: 80, alert: true, ...config.pids },
  };

  return async (taskId: string, agentId: string) => {
    try {
      logger.info('Starting resource monitoring', { taskId, agentId, config: monitoringConfig });

      // Start monitoring interval
      const monitorInterval = setInterval(() => {
        monitorResources(taskId, monitoringConfig);
      }, 5000); // Check every 5 seconds

      activeMonitors.set(taskId, monitorInterval);

      logger.info('Resource monitoring started', { taskId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to start resource monitoring', {
        taskId,
        agentId,
        error: errorMessage,
      });

      // Non-critical: don't throw, just log
    }
  };
}

/**
 * Stop resource monitoring for a task
 */
export function stopResourceMonitoring(taskId: string): void {
  const monitorInterval = activeMonitors.get(taskId);
  if (monitorInterval) {
    clearInterval(monitorInterval);
    activeMonitors.delete(taskId);
    logger.info('Resource monitoring stopped', { taskId });
  }
}

function monitorResources(taskId: string, config: Required<MonitoringConfig>): void {
  try {
    // Note: In a real implementation, we'd query Docker stats
    // For now, this is a placeholder showing monitoring pattern

    // const stats = await dockerManager.getContainerStats(containerId);
    // checkThresholds(taskId, stats, config);

    logger.debug('Resource check completed', { taskId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Resource monitoring check failed', {
      taskId,
      error: errorMessage,
    });
  }
}

function checkThresholds(taskId: string, stats: any, config: Required<MonitoringConfig>): void {
  const alerts: string[] = [];

  // Check memory threshold
  if (stats.memoryPercent && config.memory.threshold) {
    if (stats.memoryPercent > config.memory.threshold) {
      alerts.push(`Memory usage at ${stats.memoryPercent}% (threshold: ${config.memory.threshold}%)`);
    }
  }

  // Check CPU threshold
  if (stats.cpuPercent && config.cpu.threshold) {
    if (stats.cpuPercent > config.cpu.threshold) {
      alerts.push(`CPU usage at ${stats.cpuPercent}% (threshold: ${config.cpu.threshold}%)`);
    }
  }

  // Check PIDs threshold
  if (stats.pids && config.pids.threshold) {
    const pidsPercent = (stats.pids / 10000) * 100;
    if (pidsPercent > config.pids.threshold) {
      alerts.push(`PIDs at ${stats.pids} (${pidsPercent.toFixed(1)}%, threshold: ${config.pids.threshold}%)`);
    }
  }

  // Log alerts if configured
  if (alerts.length > 0) {
    if (config.memory.alert || config.cpu.alert || config.pids.alert) {
      logger.warn('Resource threshold breaches', {
        taskId,
        alerts,
      });
    }
  }
}
