// Task Lifecycle Manager - Phase 2: MVP Core
// Week 9, Day 4: Task Lifecycle Implementation

import { Task, TaskStatus, TaskConfig, TaskResult } from '../types';
import { taskRegistry } from '../task-registry/registry';
import { multiLayerPersistence } from '../persistence/multi-layer';
import { logger } from '../util/logger';
import { lockManager } from '../util/lock-manager';

export class TaskLifecycle {
  private static instance: TaskLifecycle;

  private constructor() {}

  public static getInstance(): TaskLifecycle {
    if (!TaskLifecycle.instance) {
      TaskLifecycle.instance = new TaskLifecycle();
    }
    return TaskLifecycle.instance;
  }

  /**
   * Create a new task
   */
  public async createTask(config: TaskConfig): Promise<Task> {
    const taskId = config.id || `task_${Date.now()}`;
    const owner = config.owner || 'system';

    return lockManager.withLock(
      `task:${taskId}`,
      `lifecycle:${owner}`,
      async () => {
        // Create task object
        const task: Task = {
          id: taskId,
          name: config.name,
          status: 'pending',
          owner,
          metadata: config.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Save to registry
        await taskRegistry.create(task);

        // Initialize persistence layers
        await this.initializePersistence(taskId, task);

        logger.info('Task created', { taskId, name: task.name, owner });

        return task;
      }
    );
  }

  /**
   * Start a task (transition: pending → running)
   */
  public async startTask(taskId: string, agentId: string): Promise<Task> {
    return lockManager.withLock(
      `task:${taskId}`,
      `lifecycle:${agentId}`,
      async () => {
        const task = await taskRegistry.getById(taskId);
        if (!task) {
          throw new Error(`Task not found: ${taskId}`);
        }

        // Validate state transition
        if (task.status !== 'pending') {
          throw new Error(`Cannot start task with status: ${task.status}`);
        }

        // Update task status
        const updated = await taskRegistry.markRunning(taskId);

        // Log state transition
        await multiLayerPersistence.appendLog(taskId, {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Task started by agent ${agentId}`,
          data: { fromStatus: task.status, toStatus: 'running', agentId },
        });

        logger.info('Task started', { taskId, agentId });

        return updated;
      }
    );
  }

  /**
   * Complete a task (transition: running → completed)
   */
  public async completeTask(taskId: string, result: TaskResult): Promise<Task> {
    const task = await taskRegistry.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return lockManager.withLock(
      `task:${taskId}`,
      `lifecycle:${task.owner || 'system'}`,
      async () => {
        // Validate state transition
        if (task.status !== 'running') {
          throw new Error(`Cannot complete task with status: ${task.status}`);
        }

        // Update task status
        const updated = await taskRegistry.markCompleted(taskId);

        // Save result to persistence
        await multiLayerPersistence.appendLog(taskId, {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Task completed successfully',
          data: { result },
        });

        logger.info('Task completed', { taskId, result });

        return updated;
      }
    );
  }

  /**
   * Fail a task (transition: running → failed)
   */
  public async failTask(taskId: string, error: string): Promise<Task> {
    const task = await taskRegistry.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return lockManager.withLock(
      `task:${taskId}`,
      `lifecycle:${task.owner || 'system'}`,
      async () => {
        // Validate state transition
        if (task.status !== 'running') {
          throw new Error(`Cannot fail task with status: ${task.status}`);
        }

        // Update task status
        const updated = await taskRegistry.markFailed(taskId, error);

        // Save error to persistence
        await multiLayerPersistence.appendLog(taskId, {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Task failed',
          data: { error },
        });

        logger.error('Task failed', { taskId, error });

        return updated;
      }
    );
  }

  /**
   * Cancel a task (transition: pending → cancelled or running → cancelled)
   */
  public async cancelTask(taskId: string): Promise<Task> {
    const task = await taskRegistry.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return lockManager.withLock(
      `task:${taskId}`,
      `lifecycle:${task.owner || 'system'}`,
      async () => {
        // Validate state transition
        if (!['pending', 'running'].includes(task.status)) {
          throw new Error(`Cannot cancel task with status: ${task.status}`);
        }

        // Update task status
        const updated = await taskRegistry.update(taskId, { status: 'cancelled' });

        // Log cancellation
        await multiLayerPersistence.appendLog(taskId, {
          timestamp: new Date().toISOString(),
          level: 'warning',
          message: 'Task cancelled',
          data: { fromStatus: task.status },
        });

        logger.warn('Task cancelled', { taskId });

        return updated;
      }
    );
  }

  /**
   * Delete a task (transition: any status → deleted)
   */
  public async deleteTask(taskId: string): Promise<void> {
    const task = await taskRegistry.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return lockManager.withLock(
      `task:${taskId}`,
      `lifecycle:${task.owner || 'system'}`,
      async () => {
        // Delete from registry
        await taskRegistry.delete(taskId);

        // Cleanup persistence
        await multiLayerPersistence.cleanup(taskId);

        logger.info('Task deleted', { taskId });
      }
    );
  }

  /**
   * Get task status
   */
  public async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const task = await taskRegistry.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return task.status;
  }

  /**
   * Initialize persistence layers for a new task
   */
  private async initializePersistence(taskId: string, task: Task): Promise<void> {
    // Save initial state
    await multiLayerPersistence.saveState(taskId, {
      taskId,
      status: task.status,
      data: task.metadata || {},
      lastUpdated: task.updatedAt.toISOString(),
    });

    // Log task creation
    await multiLayerPersistence.appendLog(taskId, {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Task created',
      data: { name: task.name, owner: task.owner },
    });
  }
}

// Export singleton instance
export const taskLifecycle = TaskLifecycle.getInstance();
