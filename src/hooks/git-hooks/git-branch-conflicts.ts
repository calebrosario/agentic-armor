// Git Branch Conflicts Hook - Phase 2: Edge Cases
// Week 15, Day 1-2: Git Branch Naming Conflicts

import { logger } from "../../util/logger";
import { BeforeTaskStartHook } from "../task-lifecycle";
import { createTaskBranch } from "../../util/git-operations";

/**
 * Git Branch Conflicts Hook - Handles branch naming conflicts (Edge Case 6)
 *
 * This is a specialized hook focused on branch conflict resolution.
 * Internally uses createTaskBranch which handles:
 * - Detecting existing branches before creation
 * - Generating unique branch names on conflict (timestamp + random suffix)
 * - Retry logic with max 10 attempts
 *
 * For simpler branch creation without conflict focus, use createPreTaskBranchCreatorHook.
 *
 * @returns BeforeTaskStartHook that creates a task branch with conflict handling
 */
export function createGitBranchConflictsHook(): BeforeTaskStartHook {
  return async (taskId: string, agentId: string) => {
    logger.info("Checking for git branch conflicts", {
      taskId,
      agentId,
    });

    try {
      const result = await createTaskBranch(taskId);

      if (result.success) {
        logger.info("Branch created with conflict handling", {
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
        logger.error("Failed to create branch after conflicts", {
          taskId,
          error: result.error,
          attempts: result.attempts,
        });

        throw new Error(`Branch creation failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Git branch conflict check failed", {
        taskId,
        agentId,
        error: errorMessage,
      });

      throw new Error(`Git branch conflict check failed: ${errorMessage}`);
    }
  };
}
