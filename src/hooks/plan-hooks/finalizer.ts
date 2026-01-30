// Plan Finalizer Hook - Phase 2: MVP Core
// Week 12, Task 12.9: Plan Finalizer Hook

import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from '../../util/logger';
import { AfterTaskCompleteHook } from '../task-lifecycle';
import type { TaskResult } from '../../types/lifecycle';

/**
 * Finalize Plan.md on task completion
 *
 * This hook:
 * 1. Reads existing Plan.md
 * 2. Marks plan as complete
 * 3. Adds summary section
 * 4. Adds next steps
 */
export function createPlanFinalizerHook(): AfterTaskCompleteHook {
  return async (taskId: string, result: TaskResult) => {
    try {
      const planPath = join(process.cwd(), 'data', 'tasks', taskId, 'Plan.md');
      
      // Read existing plan
      const existingPlan = await fs.readFile(planPath, 'utf-8');

      // Append finalization
      const finalizedPlan = appendFinalization(existingPlan, result);

      // Save finalized plan
      await fs.writeFile(planPath, finalizedPlan, 'utf-8');

      logger.info('Plan finalized', { taskId, result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to finalize plan', {
        taskId,
        error: errorMessage,
      });

      throw new Error(`Failed to finalize Plan.md: ${errorMessage}`);
    }
  };
}

function appendFinalization(planContent: string, result: TaskResult): string {
  const timestamp = new Date().toISOString();
  const successIcon = result.success ? '🎉' : '⚠️';
  
  const finalization = `
---

## 📋 Plan Summary

${successIcon} **Plan Status**: ${result.success ? 'Completed Successfully' : 'Completed with Issues'}

**Finalized At**: ${timestamp}

## 📊 Statistics

**Overall Result**: ${result.success ? 'Success' : 'Partial/Failed'}

## 🚀 Next Steps

${result.success ? `
- [ ] Review task output
- [ ] Verify acceptance criteria met
- [ ] Document lessons learned
- [ ] Clean up resources if needed
` : `
- [ ] Review error details
- [ ] Investigate root cause
- [ ] Fix reported issues
- [ ] Re-run task if needed
- [ ] Update documentation
`}

---

*Plan automatically finalized by task lifecycle*
`;

  return planContent + finalization;
}
