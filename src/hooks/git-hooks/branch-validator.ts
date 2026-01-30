// Branch Name Validator Hook - Phase 2: MVP Core
// Week 12, Task 12.5: Branch Name Validator Hook

import { logger } from '../../util/logger';
import { BeforeTaskStartHook } from '../task-lifecycle';

/**
 * Validate task branch naming
 *
 * Enforces naming convention: task/TASK_ID
 * Example: task_1234567890, task_abc123-def456
 */
export function createBranchNameValidatorHook(): BeforeTaskStartHook {
  return async (taskId: string, agentId: string) => {
    const branchName = `task/${taskId}`;
    const pattern = /^task\/[a-z0-9-]+$/;

    if (!pattern.test(branchName)) {
      const errorMessage = `Invalid branch name: ${branchName}. Expected format: task/{taskId}`;
      logger.error('Branch name validation failed', {
        taskId,
        branchName,
        reason: 'Does not match pattern task/{taskId}',
      });

      throw new Error(errorMessage);
    }

    logger.debug('Branch name validated', { taskId, branchName });
  };
}
