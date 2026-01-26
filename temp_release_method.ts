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
