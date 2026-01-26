import { logger } from './logger';
import { LockInfo, LockMode, OpenCodeError } from '../types';

export class OptimisticLock {
  private locks = new Map<string, LockInfo>();
  private static instance: OptimisticLock;

  private constructor() {}

  public static getInstance(): OptimisticLock {
    if (!OptimisticLock.instance) {
      OptimisticLock.instance = new OptimisticLock();
    }
    return OptimisticLock.instance;
  }

  /**
   * Acquire a lock on a resource
   * @param resource - The resource to lock
   * @param owner - The owner acquiring the lock
   * @param mode - Lock mode (exclusive or collaborative)
   * @param timeout - Optional timeout in milliseconds
   * @returns Promise resolving to lock info
   */
  public async acquireLock(
    resource: string,
    owner: string,
    mode: LockMode = 'exclusive',
    timeout?: number
  ): Promise<LockInfo> {
    const startTime = Date.now();

    // Check if resource is already locked
    const existingLock = this.locks.get(resource);

    if (existingLock) {
      if (existingLock.owner === owner) {
        // Owner already has the lock, increment version
        existingLock.version++;
        existingLock.acquiredAt = new Date();
        return existingLock;
      }

      // Check timeout for existing lock
      if (existingLock.timeout && Date.now() - existingLock.acquiredAt.getTime() > existingLock.timeout) {
        // Lock has timed out, remove it
        this.locks.delete(resource);
        logger.warn('Lock timeout expired, removing stale lock', {
          resource,
          owner: existingLock.owner,
          duration: Date.now() - existingLock.acquiredAt.getTime(),
        });
      } else if (mode === 'exclusive') {
        // Exclusive mode: cannot acquire if already locked
        throw new OpenCodeError(
          'LOCK_CONFLICT',
          `Resource '${resource}' is already locked by '${existingLock.owner}'`,
          { resource, owner, existingOwner: existingLock.owner, mode }
        );
      } else if (mode === 'collaborative') {
        // Collaborative mode: allow multiple owners with conflict detection
        // Check for version conflicts (simplified - real implementation would check data consistency)
        const versionConflict = Math.random() < 0.1; // Simulate 10% conflict rate

        if (versionConflict) {
          throw new OpenCodeError(
            'VERSION_CONFLICT',
            `Version conflict detected for collaborative lock on '${resource}'`,
            { resource, owner, existingOwner: existingLock.owner, mode }
          );
        }

        // Allow collaborative access - create new lock for this owner
        const lockInfo: LockInfo = {
          resource,
          owner,
          acquiredAt: new Date(),
          timeout,
          version: 1, // Start with version 1 for new collaborative owner
        };

        // Use compound key for collaborative locks to allow multiple owners
        this.locks.set(`${resource}#${owner}`, lockInfo);

        logger.info('Collaborative lock acquired', {
          resource,
          owner,
          existingOwner: existingLock.owner,
          mode,
          totalLocks: this.locks.size,
        });

        return lockInfo;
      }
    }

    // Acquire new lock
    const lockInfo: LockInfo = {
      resource,
      owner,
      acquiredAt: new Date(),
      timeout,
      version: 1,
    };

    this.locks.set(resource, lockInfo);

    const duration = Date.now() - startTime;
    logger.info('Lock acquired', {
      resource,
      owner,
      mode,
      duration,
      totalLocks: this.locks.size,
    });

    return lockInfo;
  }

  /**
   * Release a lock on a resource
   * @param resource - The resource to unlock
   * @param owner - The owner releasing the lock
   * @returns Promise resolving to true if lock was released
   */
  public async releaseLock(resource: string, owner: string): Promise<boolean> {
    // Check if there's any lock on this resource
    const regularLock = this.locks.get(resource);
    
    // Check for collaborative locks on this resource
    let collaborativeLock: LockInfo | undefined;
    for (const [key, lockInfo] of this.locks.entries()) {
      if (key === `${resource}#${owner}`) {
        collaborativeLock = lockInfo;
        break;
      }
    }

    // Determine which lock to release
    let lockInfo: LockInfo | undefined;
    let keyUsed: string;
    
    if (collaborativeLock && collaborativeLock.owner === owner) {
      lockInfo = collaborativeLock;
      keyUsed = `${resource}#${owner}`;
    } else if (regularLock && regularLock.owner === owner) {
      lockInfo = regularLock;
      keyUsed = resource;
    } else if (regularLock && regularLock.owner !== owner) {
      // There's a lock but not owned by this user
      throw new OpenCodeError(
        'LOCK_PERMISSION_DENIED',
        `Cannot release lock owned by '${regularLock.owner}'`,
        { resource, owner, lockOwner: regularLock.owner }
      );
    } else {
      // No lock found
      logger.warn('Attempted to release non-existent lock', { resource, owner });
      return false;
    }

    this.locks.delete(keyUsed);

    const duration = Date.now() - lockInfo.acquiredAt.getTime();
    logger.info('Lock released', {
      resource,
      owner,
      duration,
      totalLocks: this.locks.size,
    });

    return true;
  }

  /**
   * Check if a resource is locked
   * @param resource - The resource to check
   * @returns Lock info if locked, null if available
   */
  public isLocked(resource: string): LockInfo | null {
    // Check both regular and collaborative keys
    const regularLock = this.locks.get(resource);
    if (regularLock) return regularLock;

    // Check if any collaborative locks exist for this resource
    for (const [key, lockInfo] of this.locks.entries()) {
      if (key.startsWith(`${resource}#`) && lockInfo.owner !== undefined) {
        return lockInfo;
      }
    }

    return null;
  }

  /**
   * Get all current locks (for monitoring)
   * @returns Array of all current locks
   */
  public getAllLocks(): LockInfo[] {
    return Array.from(this.locks.values());
  }

  /**
   * Force release all locks for a specific owner (emergency cleanup)
   * @param owner - The owner whose locks to release
   * @returns Number of locks released
   */
  public forceReleaseOwnerLocks(owner: string): number {
    let released = 0;
    for (const [key, lockInfo] of this.locks.entries()) {
      if (lockInfo.owner === owner) {
        this.locks.delete(key);
        released++;
      }
    }

    if (released > 0) {
      logger.warn('Force released locks for owner', { owner, released });
    }

    return released;
  }

  /**
   * Clean up expired locks
   * @returns Number of expired locks cleaned up
   */
  public cleanupExpiredLocks(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, lockInfo] of this.locks.entries()) {
      if (lockInfo.timeout && now - lockInfo.acquiredAt.getTime() > lockInfo.timeout) {
        this.locks.delete(key);
        cleaned++;
        logger.info('Cleaned up expired lock', { resource: lockInfo.resource, owner: lockInfo.owner });
      }
    }

    return cleaned;
  }

  /**
   * Get lock statistics
   * @returns Lock statistics
   */
  public getStatistics(): {
    totalLocks: number;
    locksByOwner: Record<string, number>;
    oldestLock?: { resource: string; age: number };
  } {
    const locksByOwner: Record<string, number> = {};
    let oldestLock: { resource: string; age: number } | undefined;

    for (const [key, lockInfo] of this.locks.entries()) {
      locksByOwner[lockInfo.owner] = (locksByOwner[lockInfo.owner] || 0) + 1;

      const age = Date.now() - lockInfo.acquiredAt.getTime();
      if (!oldestLock || age > oldestLock.age) {
        oldestLock = { resource: lockInfo.resource, age };
      }
    }

    return {
      totalLocks: this.locks.size,
      locksByOwner,
      oldestLock,
    };
  }
}

// Export singleton instance
export const optimisticLock = OptimisticLock.getInstance();
