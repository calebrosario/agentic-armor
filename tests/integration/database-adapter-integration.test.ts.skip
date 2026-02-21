import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TaskRegistry } from "../../src/task-registry/registry";
import { Task, TaskStatus } from "../../src/types";
import { PostgreSQLAdapter } from "../../src/persistence/postgresql-adapter";
import { TaskRegistry as TaskRegistryInstance } from "../../src/task-registry/registry";

describe("Database Adapter Integration", () => {
  const TEST_DATABASE_URL =
    process.env.DATABASE_URL || "postgresql://localhost:5432/opencode_test";

  beforeAll(async () => {
    TaskRegistryInstance.setAdapter(
      new PostgreSQLAdapter({
        type: "postgresql",
        connectionString: TEST_DATABASE_URL,
        pool: {
          min: 1,
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
    );

    await TaskRegistry.getInstance().initialize();
  });

  afterAll(async () => {
    const registry = TaskRegistry.getInstance();
    await registry.delete("integration-task-1");
    await registry.delete("integration-task-2");
    await registry.delete("integration-task-3");
    await registry.delete("integration-task-4");
    await registry.delete("integration-task-5");
  });

  describe("TaskRegistry with PostgreSQL Adapter", () => {
    it("should create and retrieve task", async () => {
      const task: Task = {
        id: "integration-task-1",
        name: "Integration Test Task 1",
        status: "pending" as TaskStatus,
        owner: "test-agent",
        metadata: { test: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const registry = TaskRegistry.getInstance();
      await registry.create(task);

      const found = await registry.getById(task.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(task.id);
      expect(found?.name).toBe(task.name);
      expect(found?.status).toBe(task.status);
      expect(found?.owner).toBe(task.owner);
      expect(found?.metadata).toEqual(task.metadata);
    });

    it("should list tasks with filters", async () => {
      const task1: Task = {
        id: "integration-task-2",
        name: "Integration Test Task 2",
        status: "pending" as TaskStatus,
        owner: "agent-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const task2: Task = {
        id: "integration-task-3",
        name: "Integration Test Task 3",
        status: "running" as TaskStatus,
        owner: "agent-2",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const registry = TaskRegistry.getInstance();
      await registry.create(task1);
      await registry.create(task2);

      const allTasks = await registry.list();
      expect(allTasks.length).toBeGreaterThanOrEqual(2);

      const pendingTasks = await registry.list({
        status: "pending" as TaskStatus,
      });
      expect(pendingTasks.some((t) => t.id === task1.id)).toBe(true);
      expect(pendingTasks.some((t) => t.id === task2.id)).toBe(false);

      const agent1Tasks = await registry.list({ owner: "agent-1" });
      expect(agent1Tasks.some((t) => t.id === task1.id)).toBe(true);
      expect(agent1Tasks.some((t) => t.id === task2.id)).toBe(false);
    });

    it("should update task", async () => {
      const task: Task = {
        id: "integration-task-4",
        name: "Original Name",
        status: "pending" as TaskStatus,
        owner: "test-agent",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const registry = TaskRegistry.getInstance();
      await registry.create(task);

      const updated = await registry.update(task.id, {
        name: "Updated Name",
        status: "completed" as TaskStatus,
      });

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(task.id);
      expect(updated?.name).toBe("Updated Name");
      expect(updated?.status).toBe("completed");
    });

    it("should delete task", async () => {
      const task: Task = {
        id: "integration-task-5",
        name: "To Be Deleted",
        status: "pending" as TaskStatus,
        owner: "test-agent",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const registry = TaskRegistry.getInstance();
      await registry.create(task);

      const deleted = await registry.delete(task.id);
      expect(deleted).toBe(true);

      const found = await registry.getById(task.id);
      expect(found).toBeNull();
    });

    it("should count tasks with filters", async () => {
      const registry = TaskRegistry.getInstance();

      const allCount = await registry.count();
      expect(allCount).toBeGreaterThanOrEqual(0);

      const pendingCount = await registry.count({
        status: "pending" as TaskStatus,
      });
      expect(pendingCount).toBeGreaterThanOrEqual(0);

      const agentCount = await registry.count({ owner: "agent-1" });
      expect(agentCount).toBeGreaterThanOrEqual(0);
    });

    it("should handle bulk create operations", async () => {
      const tasks: Task[] = [
        {
          id: `bulk-integration-${Date.now()}-1`,
          name: "Bulk Task 1",
          status: "pending" as TaskStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: `bulk-integration-${Date.now()}-2`,
          name: "Bulk Task 2",
          status: "running" as TaskStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: `bulk-integration-${Date.now()}-3`,
          name: "Bulk Task 3",
          status: "completed" as TaskStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const registry = TaskRegistry.getInstance();
      const created = await registry.bulkCreate(tasks);

      expect(created).toHaveLength(3);
      expect(created.every((t) => t.id)).toBe(true);

      await registry.delete(created[0].id);
      await registry.delete(created[1].id);
      await registry.delete(created[2].id);
    });
  });

  describe("Adapter Health and Error Handling", () => {
    it("should handle auto-initialization correctly", async () => {
      const task: Task = {
        id: "auto-init-test-" + Date.now(),
        name: "Auto Initialization Test",
        status: "pending" as TaskStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const registry = TaskRegistry.getInstance();
      await registry.create(task);

      const found = await registry.getById(task.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(task.id);

      await registry.delete(task.id);
    });

    it("should handle non-existent operations gracefully", async () => {
      const registry = TaskRegistry.getInstance();

      const notFound = await registry.getById("non-existent-task-id");
      expect(notFound).toBeNull();

      const updateResult = await registry.update("non-existent-task", {
        name: "New Name",
      });
      expect(updateResult).toBeNull();

      const deleteResult = await registry.delete("another-non-existent-task");
      expect(deleteResult).toBe(false);
    });

    it("should handle limit and offset in list", async () => {
      const registry = TaskRegistry.getInstance();

      const firstPage = await registry.list({ limit: 5, offset: 0 });
      expect(firstPage.length).toBeLessThanOrEqual(5);

      const secondPage = await registry.list({ limit: 5, offset: 5 });

      if (firstPage.length === 5 && secondPage.length > 0) {
        const firstIds = firstPage.map((t) => t.id);
        const secondIds = secondPage.map((t) => t.id);

        firstIds.forEach((id) => {
          expect(secondIds).not.toContain(id);
        });
      }
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent creates", async () => {
      const registry = TaskRegistry.getInstance();

      const tasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-${Date.now()}-${i}`,
        name: `Concurrent Task ${i}`,
        status: "pending" as TaskStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const createPromises = tasks.map((task) => registry.create(task));
      const results = await Promise.all(createPromises);

      expect(results).toHaveLength(10);
      expect(results.every((t) => t.id)).toBe(true);

      await Promise.all(results.map((t) => registry.delete(t.id)));
    });

    it("should handle concurrent reads", async () => {
      const registry = TaskRegistry.getInstance();

      const readPromises = Array.from({ length: 5 }, (_, i) =>
        registry.list({ limit: 20, offset: i * 20 }),
      );

      const results = await Promise.all(readPromises);

      expect(results).toHaveLength(5);
      expect(results.every((r) => Array.isArray(r))).toBe(true);
    });
  });
});
