// Git Submodule Conflicts Hook - Phase 2: Edge Cases
// Week 15, Day 1-2: Git Submodule Conflicts

import { logger } from "../../util/logger";
import { BeforeTaskStartHook } from "../task-lifecycle";
import {
  getSubmoduleStatus,
  hasSubmoduleConflicts,
  resolveSubmoduleConflict,
  getWorkspacePath,
} from "../../util/git-operations";

/**
 * Options for creating a git submodule conflicts hook
 */
export interface GitSubmoduleConflictsOptions {
  /** Resolution strategy for conflicts (default: "merge") */
  resolutionStrategy?: "merge" | "rebase" | "skip";
  /** Path to the submodule relative to workspace (default: ".task-memory") */
  submodulePath?: string;
}

/**
 * Git Submodule Conflicts Hook - Detects and resolves submodule conflicts (Edge Case 9)
 *
 * Checks submodule status (clean/dirty/diverged), resolves with configurable strategy.
 *
 * @param options - Configuration options
 * @param options.resolutionStrategy - How to resolve conflicts: "merge", "rebase", or "skip"
 * @param options.submodulePath - Path to submodule relative to workspace root
 * @returns BeforeTaskStartHook that handles submodule conflicts
 *
 * @example
 * // Default options
 * const hook = createGitSubmoduleConflictsHook();
 *
 * @example
 * // Custom options
 * const hook = createGitSubmoduleConflictsHook({
 *   resolutionStrategy: "rebase",
 *   submodulePath: "libs/shared"
 * });
 */
export function createGitSubmoduleConflictsHook(
  options: GitSubmoduleConflictsOptions = {},
): BeforeTaskStartHook {
  const { resolutionStrategy = "merge", submodulePath = ".task-memory" } =
    options;

  return async (taskId: string, agentId: string) => {
    logger.info("Checking for git submodule conflicts", {
      taskId,
      agentId,
      resolutionStrategy,
      submodulePath,
    });

    try {
      const workspacePath = getWorkspacePath(taskId);

      const status = await getSubmoduleStatus(workspacePath, submodulePath);

      logger.info("Submodule status", {
        taskId,
        submodulePath,
        status,
      });

      if (status === "clean") {
        logger.info("No submodule conflicts detected", {
          taskId,
        });
        return;
      }

      if (status === "error") {
        logger.error("Submodule error detected", {
          taskId,
          submodulePath,
        });
        throw new Error("Submodule status check failed");
      }

      const hasConflicts = await hasSubmoduleConflicts(
        workspacePath,
        submodulePath,
      );

      if (!hasConflicts) {
        logger.info("No submodule conflicts to resolve", {
          taskId,
        });
        return;
      }

      logger.info("Resolving submodule conflicts", {
        taskId,
        status,
        resolution: resolutionStrategy,
      });

      const result = await resolveSubmoduleConflict(
        workspacePath,
        submodulePath,
        resolutionStrategy,
      );

      if (result.success) {
        logger.info("Submodule conflicts resolved", {
          taskId,
          resolution: result.resolution,
          status: result.status,
        });
      } else {
        logger.error("Failed to resolve submodule conflicts", {
          taskId,
          error: result.error,
        });

        throw new Error(
          `Submodule conflict resolution failed: ${result.error}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Git submodule conflict check failed", {
        taskId,
        agentId,
        error: errorMessage,
      });

      throw new Error(`Git submodule conflict check failed: ${errorMessage}`);
    }
  };
}
