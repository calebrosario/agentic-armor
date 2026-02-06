// Test Database Helpers
// Week 17, Task 17.5: Test database isolation and utilities

import { DatabaseManager } from "../../src/persistence/database";
import * as schema from "../../src/persistence/schema";
import { sql } from "drizzle-orm";
import { logger } from "../../src/util/logger";

/**
 * Setup test database with isolation
 * Creates a fresh database connection and clears existing data
 */
let transactionActive = false;

export async function setupTestDatabase(): Promise<void> {
  try {
    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getDatabase();

    // Create tasks table if it doesn't exist
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "tasks" (
          "id" text PRIMARY KEY,
          "name" text NOT NULL,
          "status" text NOT NULL,
          "owner" text,
          "metadata" jsonb,
          "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
          "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
        );
      `);
      logger.info("Test database schema verified");
    } catch (schemaError) {
      const schemaErrorMessage =
        schemaError instanceof Error
          ? schemaError.message
          : String(schemaError);
      logger.warn("Failed to create schema (may already exist)", {
        error: schemaErrorMessage,
        errorType: schemaError?.constructor?.name,
        fullError: JSON.stringify(schemaError),
      });
      // Continue - table may already exist
    }

    // Clear existing test data using TRUNCATE (faster than DELETE)
    try {
      await db.execute(sql`TRUNCATE TABLE "tasks" CASCADE`);
      logger.info("Test database cleared");
    } catch (truncateError) {
      const truncateErrorMessage =
        truncateError instanceof Error
          ? truncateError.message
          : String(truncateError);
      logger.warn("Failed to truncate table (may be empty)", {
        error: truncateErrorMessage,
      });
      // Continue - table may be empty
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to setup test database", {
      error: errorMessage,
    });
    throw new Error(`Failed to setup test database: ${errorMessage}`);
  }
}

/**
 * Cleanup test database after tests
 * Clears all data but keeps connection pool open for subsequent tests
 */
export async function cleanupTestDatabase(): Promise<void> {
  try {
    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getDatabase();

    // Use TRUNCATE for faster cleanup of all data
    try {
      await db.execute(sql`TRUNCATE TABLE "tasks" CASCADE`);
      logger.info("Test database data cleared");
    } catch (truncateError) {
      const truncateErrorMessage =
        truncateError instanceof Error
          ? truncateError.message
          : String(truncateError);
      logger.warn("Failed to truncate table during cleanup (may be empty)", {
        error: truncateErrorMessage,
      });
      // Continue - table may be empty
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to cleanup test database", {
      error: errorMessage,
    });
    // Don't rethrow - cleanup errors shouldn't fail tests
  }
}

/**
 * Begin transaction for test isolation
 * All changes will be rolled back on test completion
 */
export async function beginTestTransaction(): Promise<void> {
  try {
    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getDatabase();

    try {
      await db.execute(sql`BEGIN`);
      transactionActive = true;
      logger.debug("Test transaction begun");
    } catch (transactionError) {
      const txErrorMessage =
        transactionError instanceof Error
          ? transactionError.message
          : String(transactionError);

      // Check if error is about transactions in read-only mode or similar
      if (
        txErrorMessage.includes("read only") ||
        txErrorMessage.includes("cannot start")
      ) {
        logger.warn(
          "Transaction not supported (connection may be in use), skipping transaction isolation",
          {
            error: txErrorMessage,
          },
        );
        // Continue without transaction - tests will work but won't be isolated
        return;
      }

      throw transactionError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to begin test transaction", {
      error: errorMessage,
    });
    throw new Error(`Failed to begin test transaction: ${errorMessage}`);
  }
}

/**
 * Rollback transaction after test
 * Reverts all changes made during test
 */
export async function rollbackTestTransaction(): Promise<void> {
  if (!transactionActive) {
    logger.debug("No active transaction to rollback");
    return;
  }

  try {
    const dbManager = DatabaseManager.getInstance();
    const db = dbManager.getDatabase();

    try {
      await db.execute(sql`ROLLBACK`);
      transactionActive = false;
      logger.debug("Test transaction rolled back");
    } catch (rollbackError) {
      const rbErrorMessage =
        rollbackError instanceof Error
          ? rollbackError.message
          : String(rollbackError);

      // If there's no active transaction, ROLLBACK will fail - that's OK
      if (
        rbErrorMessage.includes("no transaction") ||
        rbErrorMessage.includes("cannot rollback")
      ) {
        transactionActive = false;
        logger.debug("No active transaction to rollback", {
          error: rbErrorMessage,
        });
        return;
      }

      throw rollbackError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed to rollback test transaction", {
      error: errorMessage,
    });
    // Don't rethrow - cleanup errors shouldn't fail test
  }
}

/**
 * Seed test tasks into database
 * @param tasks - Array of tasks to insert
 */
export async function seedTestTasks(tasks: any[]): Promise<void> {
  const dbManager = DatabaseManager.getInstance();
  const db = dbManager.getDatabase();

  if (tasks.length === 0) {
    logger.debug("No tasks to seed");
    return;
  }

  await db.insert(schema.tasks).values(tasks);
  logger.info(`Seeded ${tasks.length} test tasks`);
}

/**
 * Create a test task with default values
 * @param id - Task ID
 * @param name - Task name
 * @param status - Task status
 * @param owner - Task owner
 * @returns Test task object
 */
export function createTestTask(
  id: string,
  name: string,
  status: string = "pending",
  owner?: string,
): any {
  return {
    id,
    name,
    status,
    owner: owner || null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
