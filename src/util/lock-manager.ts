import { optimisticLock } from './optimistic-lock';
import { logger } from './logger';
import { LockMode, OpenCodeError } from '../types';

export class LockManager {
  private static instance: LockManager;
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    this.startCleanupInterval();
  }

  public static getInstance(): LockManager {
    if (!LockManager.instance) {
      LockManager.instance = new LockManager();
    }
    return LockManager.instance;
  }

  /**
   * Acquire a lock with automatic retry for collaborative mode
   * @param resource - Resource to lock
   * @param owner - Owner acquiring the lock
   * @param mode - Lock mode
   * @param maxRetries - Maximum retry attempts for collaborative mode
   * @param timeout - Lock timeout
   */
  public async acquireLockWithRetry(
    resource: string,
    owner: string,
    mode: LockMode = 'exclusive',
    maxRetries: number = 3,
    timeout?: number
  ) {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const lockInfo = await optimisticLock.acquireLock(resource, owner, mode, timeout);
        return lockInfo;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (mode === 'exclusive' || attempt === maxRetries) {
          throw lastError;
        }

        // For collaborative mode, wait and retry
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000); // Exponential backoff, max 1s
        logger.warn(`Lock attempt ${attempt} failed, retrying in ${delay}ms`, {
          resource,
          owner,
          mode,
          error: lastError.message,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Execute a function with automatic lock management
   * @param resource - Resource to lock
   * @param owner - Lock owner
   * @param fn - Function to execute while holding lock
   * @param mode - Lock mode
   * @param timeout - Lock timeout
   */
  public async withLock<T>(
    resource: string,
    owner: string,
    fn: () => Promise<T>,
    mode: LockMode = 'exclusive',
    timeout?: number
  ): Promise<T> {
    const lockInfo = await this.acquireLockWithRetry(resource, owner, mode, 3, timeout);

    try {
      const result = await fn();
      return result;
    } finally {
      try {
        await optimisticLock.releaseLock(resource, owner);
      } catch (error: unknown) {
        logger.error('Failed to release lock in withLock', {
          resource,
          owner,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Batch lock multiple resources (prevents deadlocks by sorting)
   * @param resources - Resources to lock
   * @param owner - Lock owner
   * @param mode - Lock mode
   * @param timeout - Lock timeout
   */
  public async acquireBatchLock(
    resources: string[],
    owner: string,
    mode: LockMode = 'exclusive',
    timeout?: number
  ) {
    // Sort resources to prevent deadlocks
    const sortedResources = [...resources].sort();

    const acquiredLocks: string[] = [];

    try {
      for (const resource of sortedResources) {
        await this.acquireLockWithRetry(resource, owner, mode, 3, timeout);
        acquiredLocks.push(resource);
      }

      return acquiredLocks;
    } catch (error: unknown) {
      // Release any locks we acquired
      for (const resource of acquiredLocks) {
        try {
          await optimisticLock.releaseLock(resource, owner);
        } catch (releaseError: unknown) {
          logger.error('Failed to release lock during batch rollback', {
            resource,
            owner,
            error: releaseError instanceof Error ? releaseError.message : String(releaseError),
          });
        }
      }
      throw error;
    }
  }

  /**
   * Release multiple locks
   * @param resources - Resources to unlock
   * @param owner - Lock owner
   */
  public async releaseBatchLock(resources: string[], owner: string): Promise<void> {
    const errors: string[] = [];

    for (const resource of resources) {
      try {
        await optimisticLock.releaseLock(resource, owner);
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${resource}: ${errorMsg}`);
        logger.error('Failed to release batch lock', { resource, owner, error: errorMsg });
      }
    }

    if (errors.length > 0) {
      throw new OpenCodeError(
        'BATCH_UNLOCK_FAILED',
        `Failed to release ${errors.length} locks: ${errors.join(', ')}`,
        { resources, owner, errors }
      );
    }
  }

  /**
   * Get lock status for monitoring
   * @param resource - Specific resource to check, or undefined for all
   */
  public getLockStatus(resource?: string) {
    if (resource) {
      return optimisticLock.isLocked(resource);
    }
    return optimisticLock.getAllLocks();
  }

  /**
   * Get lock statistics
   */
  public getLockStatistics() {
    return optimisticLock.getStatistics();
  }

  /**
   * Force cleanup for a specific owner (emergency use only)
   * @param owner - Owner to clean up
   */
  public emergencyCleanup(owner: string): number {
    logger.warn('Emergency lock cleanup initiated', { owner });
    return optimisticLock.forceReleaseOwnerLocks(owner);
  }

  /**
   * Start periodic cleanup of expired locks
   */
  private startCleanupInterval(): void {
    // Clean up expired locks every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const cleaned = optimisticLock.cleanupExpiredLocks();
      if (cleaned > 0) {
        logger.info('Periodic lock cleanup completed', { cleaned });
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop periodic cleanup (for testing)
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}

// Export singleton instance
export const lockManager = LockManager.getInstance();
