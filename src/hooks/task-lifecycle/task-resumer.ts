// Task Resumer Hook - Phase 2: MVP Core
// Week 12, Task 12.3: Task Resumer Hook

import { multiLayerPersistence } from '../../persistence/multi-layer';
import { taskRegistry } from '../../task-registry/registry';
import { logger } from '../../util/logger';

/**
 * Resume a task from a checkpoint
 *
 * This hook:
 * 1. Restores the checkpoint state
 * 2. Restores JSONL logs
 * 3. Sets task status to pending (ready to resume)
 * 4. Updates TaskRegistry
 *
 * Task can then be started again with startTask()
 */
export async function resumeFromCheckpoint(taskId: string, checkpointId: string): Promise<void> {
  try {
    // Validate task exists
    const task = await taskRegistry.getById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Restore checkpoint
    await multiLayerPersistence.restoreCheckpoint(taskId, checkpointId);

    // Set task to pending (ready to resume)
    if (task.status !== 'pending') {
      await taskRegistry.update(taskId, { status: 'pending' });
    }

    logger.info('Task resumed from checkpoint', { taskId, checkpointId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to resume task from checkpoint', {
      taskId,
      checkpointId,
      error: errorMessage,
    });
    throw error;
  }
}
