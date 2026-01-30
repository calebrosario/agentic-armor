// Git Hooks Tests - Phase 2: MVP Core
// Week 12, Task 12.13: Hook Tests

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createPreTaskBranchCreatorHook } from '../../src/hooks/git-hooks/branch-creator';
import { createBranchNameValidatorHook } from '../../src/hooks/git-hooks/branch-validator';
import { createSubmoduleCreatorHook } from '../../src/hooks/git-hooks/submodule-creator';

describe('Git Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Branch Creator Hook', () => {
    test('should create hook function', () => {
      const hook = createPreTaskBranchCreatorHook();
      expect(typeof hook).toBe('function');
    });

    test('should execute hook with taskId and agentId', async () => {
      const hook = createPreTaskBranchCreatorHook();
      const mockExec = jest.spyOn(require('child_process'), 'exec').mockResolvedValue({ stdout: '', stderr: '' });
      await hook('task-123', 'agent-1');
      expect(mockExec).toHaveBeenCalled();
      mockExec.mockRestore();
    });
  });

  describe('Branch Validator Hook', () => {
    test('should create hook function', () => {
      const hook = createBranchNameValidatorHook();
      expect(typeof hook).toBe('function');
    });

    test('should validate branch name format', async () => {
      const hook = createBranchNameValidatorHook();
      await expect(hook('task-123', 'agent-1')).resolves.not.toThrow();
    });
  });

  describe('Submodule Creator Hook', () => {
    test('should create hook function', () => {
      const hook = createSubmoduleCreatorHook();
      expect(typeof hook).toBe('function');
    });

    test('should execute hook with taskId and agentId', async () => {
      const hook = createSubmoduleCreatorHook();
      const mockExec = jest.spyOn(require('child_process'), 'exec').mockResolvedValue({ stdout: '', stderr: '' });
      await hook('task-456', 'agent-1');
      expect(mockExec).toHaveBeenCalled();
      mockExec.mockRestore();
    });
  });
});
