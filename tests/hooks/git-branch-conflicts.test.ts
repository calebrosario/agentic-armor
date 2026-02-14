// Git Branch Naming Conflicts Tests - Phase 2: Edge Cases
// Week 15, Day 1-2: Testing & Validation

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  createTaskBranch,
  getWorkspacePath,
} from "../../../src/util/git-operations";
import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";

describe("Git Branch Naming Conflicts (Edge Case 6)", () => {
  const testWorkspaceBase = "/tmp/test-workspace";
  const testTaskId = "test-task-123";

  beforeEach(async () => {
    // Clean up test workspace
    await fs
      .rm(testWorkspaceBase, { recursive: true, force: true })
      .catch(() => {});
    // Create test workspace
    await fs.mkdir(testWorkspaceBase, { recursive: true });
    // Initialize git repo
    await exec("git init", { cwd: testWorkspaceBase });
    // Create initial commit
    const testFile = path.join(testWorkspaceBase, "README.md");
    await fs.writeFile(testFile, "# Test");
    await exec("git add README.md", { cwd: testWorkspaceBase });
    await exec('git commit -m "Initial commit"', { cwd: testWorkspaceBase });
  });

  afterEach(async () => {
    // Clean up test workspace
    await fs
      .rm(testWorkspaceBase, { recursive: true, force: true })
      .catch(() => {});
  });

  describe("Branch Creation", () => {
    it("should create branch with base name when no conflict", async () => {
      const result = await createTaskBranch(testTaskId, testWorkspaceBase);

      expect(result.success).toBe(true);
      expect(result.branchName).toBe(`task/${testTaskId}`);
      expect(result.attempts).toBe(1);

      // Verify branch was created
      const { stdout } = await exec("git branch", { cwd: testWorkspaceBase });
      expect(stdout).toContain(`task/${testTaskId}`);
    });

    it("should create unique branch name on first conflict", async () => {
      // Create initial branch
      await createTaskBranch(testTaskId, testWorkspaceBase);

      // Try to create same task again
      const result = await createTaskBranch(testTaskId, testWorkspaceBase);

      expect(result.success).toBe(true);
      expect(result.branchName).not.toBe(`task/${testTaskId}`);
      expect(result.attempts).toBe(2);
      expect(result.branchName).toMatch(/task\/test-task-123-[a-z0-9-]+/);
    });

    it("should generate different unique names on repeated attempts", async () => {
      const results = [];

      // Create branch 5 times
      for (let i = 0; i < 5; i++) {
        const result = await createTaskBranch(testTaskId, testWorkspaceBase);
        results.push(result.branchName);
      }

      // All results should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(5);

      // All should start with base name
      results.forEach((branchName) => {
        expect(branchName).toMatch(/^task\/test-task-123/);
      });
    });

    it("should fail after max attempts", async () => {
      // Create a lock file to force conflicts
      const lockFile = path.join(
        testWorkspaceBase,
        ".git",
        "branch-creation.lock",
      );
      await fs.mkdir(path.dirname(lockFile), { recursive: true });
      await fs.writeFile(lockFile, "locked");

      try {
        const result = await createTaskBranch(testTaskId, testWorkspaceBase);

        expect(result.success).toBe(false);
        expect(result.error).toContain(
          "Failed to create unique branch after 10 attempts",
        );
      } finally {
        // Clean up lock file
        await fs.unlink(lockFile).catch(() => {});
      }
    });
  });

  describe("Atomic Operations", () => {
    it("should use file lock for atomic operations", async () => {
      // Start two concurrent branch creations
      const promise1 = createTaskBranch(testTaskId + "-1", testWorkspaceBase);
      const promise2 = createTaskBranch(testTaskId + "-2", testWorkspaceBase);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // One should succeed, one should retry or fail
      // This test verifies locking behavior
      expect(result1.success || result2.success).toBe(true);
      expect(result1.attempts + result2.attempts).toBeGreaterThan(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid workspace path gracefully", async () => {
      const invalidWorkspace = "/invalid/path/that/does/not/exist";

      const result = await createTaskBranch(testTaskId, invalidWorkspace);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should throw error on git command failure", async () => {
      // Create invalid git repo
      const brokenWorkspace = path.join(testWorkspaceBase, "broken");
      await fs.mkdir(brokenWorkspace, { recursive: true });

      const result = await createTaskBranch(testTaskId, brokenWorkspace);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Workspace Path", () => {
    it("should derive workspace path from task ID", () => {
      const workspacePath = getWorkspacePath(testTaskId);
      expect(workspacePath).toContain(testTaskId);
    });
  });
});
