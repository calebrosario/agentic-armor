// Plan File Creator Hook - Phase 2: MVP Core
// Week 12, Task 12.7: Plan File Creator Hook

import { promises as fs } from 'fs';
import { join } from 'path';
import { taskRegistry } from '../../task-registry/registry';
import { logger } from '../../util/logger';
import { AfterTaskStartHook } from '../task-lifecycle';

/**
 * Create Plan.md file for task
 *
 * This hook:
 * 1. Retrieves task metadata from TaskRegistry
 * 2. Generates plan content with task info and agent details
 * 3. Creates Plan.md file in task directory
 */
export function createPlanFileCreatorHook(): AfterTaskStartHook {
  return async (taskId: string, agentId: string) => {
    try {
      const task = await taskRegistry.getById(taskId);
      if (!task) {
        logger.warn('Task not found for plan creation', { taskId });
        return;
      }

      const planPath = join(process.cwd(), 'data', 'tasks', taskId, 'Plan.md');
      const planContent = generatePlanContent(task, agentId);

      // Create Plan.md file
      await fs.writeFile(planPath, planContent, 'utf-8');

      logger.info('Plan file created', { taskId, agentId, planPath });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to create plan file', {
        taskId,
        error: errorMessage,
      });

      throw new Error(`Failed to create Plan.md: ${errorMessage}`);
    }
  };
}

function generatePlanContent(task: any, agentId: string): string {
  const createdAt = task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString();
  
  return `# Plan: ${task.name}

**Task ID**: ${task.id}
**Status**: ${task.status}
**Owner**: ${task.owner || 'system'}
**Agent**: ${agentId}
**Created**: ${createdAt}

## Task Description

${task.name}

## Metadata

\`\`\`json
${JSON.stringify(task.metadata || {}, null, 2)}
\`\`\`

## Implementation Notes

*Plan created at task start*

---
*Last Updated: ${new Date().toISOString()}*
`;
}
