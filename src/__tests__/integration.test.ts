/**
 * Integration Tests - Phase 1
 * Tests integration of critical edge case implementations
 */

import { lockManager } from "../util/lock-manager";
import { resourceMonitor } from "../util/resource-monitor";
import { stateValidator } from "../util/state-validator";

describe("Phase 1 Integration Tests", () => {
  beforeAll(async () => {
    await resourceMonitor.initialize();
  });

  afterAll(() => {
    resourceMonitor.stopMonitoring();
    lockManager.stopCleanup();
  });

  test("Concurrency + State integration", async () => {
    const testState = { taskId: "test-1", status: "running" };

    await lockManager.withLock(
      "test-resource",
      "agent-1",
      async () => {
        stateValidator.saveState("./data/test-state.json", testState, 1);
        const loaded = stateValidator.loadState("./data/test-state.json");
        expect(loaded).toBeTruthy();
      },
      "collaborative",
    );
  });

  test("Resource monitoring integration", async () => {
    const containerId = "test-container";
    const limits = resourceMonitor.getDefaultLimits();

    resourceMonitor.registerContainer(containerId, limits);
    const usage = resourceMonitor.getContainerUsage(containerId);
    expect(usage).toBeTruthy();

    resourceMonitor.unregisterContainer(containerId);
  });

  test("Full system integration", async () => {
    const taskId = "integration-task";

    await lockManager.withLock(
      taskId,
      "test-agent",
      async () => {
        const limits = resourceMonitor.getDefaultLimits();
        const canCreate = await resourceMonitor.checkResourceLimits(limits);
        expect(canCreate).toBe(true);

        const state = {
          taskId,
          status: "running",
          timestamp: new Date().toISOString(),
        };
        stateValidator.saveState(`./data/${taskId}.json`, state, 1);

        const loaded = stateValidator.loadState(`./data/${taskId}.json`);
        expect(loaded?.taskId).toBe(taskId);
      },
      "exclusive",
    );
  });
});
