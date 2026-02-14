// Branch Creator Hook - Phase 2: Edge Cases
// Week 15, Day 1-2: Git Branch Naming Conflicts

import { logger } from "../../util/logger";
import { BeforeTaskStartHook } from "../task-lifecycle";
import { createTaskBranch } from "../../util/git-operations";

/**
 * Create Git branch for task with conflict handling
 *
 * Edge Case 6: Git Branch Naming Conflicts
 *
 * This hook:
 * 1. Creates Git branch with naming convention: task/TASK_ID
 * 2. Detects existing branches before creation
 * 3. Generates unique branch names on conflict (timestamp + random)
 * 4. Uses atomic operations with file locks
 * 5. Implements retry logic (max 10 attempts)
 * 6. Initializes workspace as Git repo if needed
 */
export function createPreTaskBranchCreatorHook(): BeforeTaskStartHook {
  return async (taskId: string, agentId: string) => {
    logger.info("Creating task branch with conflict handling", {
      taskId,
      agentId,
    });

    try {
      const result = await createTaskBranch(taskId);

      if (result.success) {
        logger.info("Task branch created successfully", {
          taskId,
          branchName: result.branchName,
          attempts: result.attempts,
          agentId,
        });

        if (result.note) {
          logger.info("Branch creation note", {
            taskId,
            note: result.note,
          });
        }
      } else {
        logger.error("Failed to create task branch", {
          taskId,
          error: result.error,
          attempts: result.attempts,
        });

        throw new Error(`Failed to create branch: ${result.error}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Task branch creation failed", {
        taskId,
        agentId,
        error: errorMessage,
      });

      throw new Error(`Task branch creation failed: ${errorMessage}`);
    }
  };
}
