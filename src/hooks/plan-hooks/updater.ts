// Plan Updater Hook - Phase 2: MVP Core
// Week 12, Task 12.8: Plan Updater Hook

import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from '../../util/logger';
import { AfterTaskCompleteHook } from '../task-lifecycle';
import type { TaskResult } from '../../types/lifecycle';

/**
 * Update Plan.md on task completion
 *
 * This hook:
 * 1. Reads existing Plan.md
 * 2. Appends execution notes
 * 3. Tracks subtasks completed
 * 4. Saves updated Plan.md
 */
export function createPlanUpdaterHook(): AfterTaskCompleteHook {
  return async (taskId: string, result: TaskResult) => {
    try {
      const planPath = join(process.cwd(), 'data', 'tasks', taskId, 'Plan.md');
      
      // Read existing plan
      const existingPlan = await fs.readFile(planPath, 'utf-8');

      // Append execution notes
      const updatedPlan = appendExecutionNotes(existingPlan, result);

      // Save updated plan
      await fs.writeFile(planPath, updatedPlan, 'utf-8');

      logger.info('Plan file updated', { taskId, result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to update plan file', {
        taskId,
        error: errorMessage,
      });

      throw new Error(`Failed to update Plan.md: ${errorMessage}`);
    }
  };
}

function appendExecutionNotes(planContent: string, result: TaskResult): string {
  const timestamp = new Date().toISOString();
  const statusEmoji = result.success ? '✅' : '❌';
  
  const executionNotes = `

## Execution Summary

**Status**: ${statusEmoji} ${result.success ? 'Success' : 'Failed'}
**Completed At**: ${timestamp}

${result.data ? `**Result Data**:\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\`\n` : ''}

${result.error ? `**Error**: ${result.error}\n` : ''}

---

`;

  return planContent + executionNotes;
}
