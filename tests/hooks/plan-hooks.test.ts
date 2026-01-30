// Plan Hooks Tests - Phase 2: MVP Core
// Week 12, Task 12.13: Hook Tests

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createPlanFileCreatorHook } from '../../src/hooks/plan-hooks/file-creator';
import { createPlanUpdaterHook } from '../../src/hooks/plan-hooks/updater';
import { createPlanFinalizerHook } from '../../src/hooks/plan-hooks/finalizer';

describe('Plan Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Plan File Creator Hook', () => {
    test('should create hook function', () => {
      const hook = createPlanFileCreatorHook();
      expect(typeof hook).toBe('function');
    });

    test('should execute hook with taskId and agentId', async () => {
      const hook = createPlanFileCreatorHook();
      const mockFS = jest.spyOn(require('fs/promises'), 'writeFile').mockResolvedValue();
      await hook('task-123', 'agent-1');
      expect(mockFS).toHaveBeenCalled();
      mockFS.mockRestore();
    });
  });

  describe('Plan Updater Hook', () => {
    test('should create hook function', () => {
      const hook = createPlanUpdaterHook();
      expect(typeof hook).toBe('function');
    });

    test('should execute hook with taskId and result', async () => {
      const hook = createPlanUpdaterHook();
      const mockFS = jest.spyOn(require('fs/promises'), 'writeFile').mockResolvedValue();
      await hook('task-456', { status: 'success', output: 'done', completedAt: new Date() });
      expect(mockFS).toHaveBeenCalled();
      mockFS.mockRestore();
    });
  });

  describe('Plan Finalizer Hook', () => {
    test('should create hook function', () => {
      const hook = createPlanFinalizerHook();
      expect(typeof hook).toBe('function');
    });

    test('should execute hook with taskId and result', async () => {
      const hook = createPlanFinalizerHook();
      const mockFS = jest.spyOn(require('fs/promises'), 'writeFile').mockResolvedValue();
      await hook('task-789', { status: 'success', output: 'done', completedAt: new Date() });
      expect(mockFS).toHaveBeenCalled();
      mockFS.mockRestore();
    });
  });
});
