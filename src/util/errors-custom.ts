/**
 * Custom Error Types for OpenCode Tools
 *
 * Provides type-safe error handling with error codes for better error management
 */
export abstract class OpenCodeError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export enum TaskErrorCode {
  TASK_NOT_FOUND = "TASK_NOT_FOUND",
  INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION",
  TASK_UPDATE_FAILED = "TASK_UPDATE_FAILED",
  TASK_CREATE_FAILED = "TASK_CREATE_FAILED",
  TASK_ALREADY_STARTED = "TASK_ALREADY_STARTED",
  TASK_ALREADY_COMPLETED = "TASK_ALREADY_COMPLETED",
  TASK_ALREADY_CANCELLED = "TASK_ALREADY_CANCELLED",
  TASK_ALREADY_FAILED = "TASK_ALREADY_FAILED",
  TASK_ALREADY_DELETED = "TASK_ALREADY_DELETED",
}

/**
 * Task lifecycle error
 */
export class TaskLifecycleError extends OpenCodeError {
  constructor(
    code: TaskErrorCode,
    message: string,
    details?: {
      taskId?: string;
      currentStatus?: string;
      targetStatus?: string;
    },
  ) {
    super(code, message, details);
  }
}

/**
 * Error factory for TaskLifecycle
 */
export const TaskErrors = {
  taskNotFound(taskId: string): TaskLifecycleError {
    return new TaskLifecycleError(
      TaskErrorCode.TASK_NOT_FOUND,
      `Task not found: ${taskId}`,
      { taskId },
    );
  },

  invalidStateTransition(
    taskId: string,
    currentStatus: string,
    targetStatus: string,
  ): TaskLifecycleError {
    return new TaskLifecycleError(
      TaskErrorCode.INVALID_STATE_TRANSITION,
      `Cannot transition task ${taskId} from ${currentStatus} to ${targetStatus}`,
      { taskId, currentStatus, targetStatus },
    );
  },

  taskUpdateFailed(taskId: string): TaskLifecycleError {
    return new TaskLifecycleError(
      TaskErrorCode.TASK_UPDATE_FAILED,
      `Failed to update task: ${taskId}`,
      { taskId },
    );
  },

  taskCreateFailed(taskId: string): TaskLifecycleError {
    return new TaskLifecycleError(
      TaskErrorCode.TASK_CREATE_FAILED,
      `Failed to create task: ${taskId}`,
      { taskId },
    );
  },
};

// ============================================================================
// Registry Errors
// ============================================================================

/**
 * Registry error codes
 */
export enum RegistryErrorCode {
  RECORD_NOT_FOUND = "RECORD_NOT_FOUND",
  RECORD_UPDATE_FAILED = "RECORD_UPDATE_FAILED",
  RECORD_CREATE_FAILED = "RECORD_CREATE_FAILED",
  RECORD_DELETE_FAILED = "RECORD_DELETE_FAILED",
  LOCK_ACQUISITION_FAILED = "LOCK_ACQUISITION_FAILED",
}

/**
 * Registry error
 */
export class RegistryError extends OpenCodeError {
  constructor(code: RegistryErrorCode, message: string, details?: any) {
    super(code, message, details);
  }
}

/**
 * Error factory for Registry operations
 */
export const RegistryErrors = {
  recordNotFound(id: string, type: string): RegistryError {
    return new RegistryError(
      RegistryErrorCode.RECORD_NOT_FOUND,
      `${type} not found: ${id}`,
      { id, type },
    );
  },

  recordUpdateFailed(id: string, type: string): RegistryError {
    return new RegistryError(
      RegistryErrorCode.RECORD_UPDATE_FAILED,
      `Failed to update ${type}: ${id}`,
      { id, type },
    );
  },

  recordCreateFailed(type: string): RegistryError {
    return new RegistryError(
      RegistryErrorCode.RECORD_CREATE_FAILED,
      `Failed to create ${type}`,
      { type },
    );
  },

  lockAcquisitionFailed(resource: string): RegistryError {
    return new RegistryError(
      RegistryErrorCode.LOCK_ACQUISITION_FAILED,
      `Failed to acquire lock for resource: ${resource}`,
      { resource },
    );
  },
};

// ============================================================================
// Docker Errors
// ============================================================================

/**
 * Docker error codes
 */
export enum DockerErrorCode {
  CONTAINER_NOT_FOUND = "CONTAINER_NOT_FOUND",
  CONTAINER_START_FAILED = "CONTAINER_START_FAILED",
  CONTAINER_STOP_FAILED = "CONTAINER_STOP_FAILED",
  CONTAINER_REMOVE_FAILED = "CONTAINER_REMOVE_FAILED",
  NETWORK_NOT_FOUND = "NETWORK_NOT_FOUND",
  NETWORK_CREATE_FAILED = "NETWORK_CREATE_FAILED",
  VOLUME_NOT_FOUND = "VOLUME_NOT_FOUND",
  VOLUME_CREATE_FAILED = "VOLUME_CREATE_FAILED",
  DOCKER_DAEMON_NOT_RUNNING = "DOCKER_DAEMON_NOT_RUNNING",
  DOCKER_SOCKET_NOT_FOUND = "DOCKER_SOCKET_NOT_FOUND",
}

/**
 * Docker error
 */
export class DockerError extends OpenCodeError {
  constructor(code: DockerErrorCode, message: string, details?: any) {
    super(code, message, details);
  }
}

/**
 * Error factory for Docker operations
 */
export const DockerErrors = {
  containerNotFound(containerId: string): DockerError {
    return new DockerError(
      DockerErrorCode.CONTAINER_NOT_FOUND,
      `Container not found: ${containerId}`,
      { containerId },
    );
  },

  networkNotFound(networkId: string): DockerError {
    return new DockerError(
      DockerErrorCode.NETWORK_NOT_FOUND,
      `Network not found: ${networkId}`,
      { networkId },
    );
  },

  socketNotFound(path: string): DockerError {
    return new DockerError(
      DockerErrorCode.DOCKER_SOCKET_NOT_FOUND,
      `Docker socket not found: ${path}`,
      { path },
    );
  },

  daemonNotRunning(): DockerError {
    return new DockerError(
      DockerErrorCode.DOCKER_DAEMON_NOT_RUNNING,
      "Docker daemon is not running",
      {},
    );
  },
};

// ============================================================================
// Persistence Errors
// ============================================================================

/**
 * Persistence error codes
 */
export enum PersistenceErrorCode {
  STATE_FILE_NOT_FOUND = "STATE_FILE_NOT_FOUND",
  LOG_FILE_NOT_FOUND = "LOG_FILE_NOT_FOUND",
  CHECKPOINT_NOT_FOUND = "CHECKPOINT_NOT_FOUND",
  CHECKPOINT_CREATE_FAILED = "CHECKPOINT_CREATE_FAILED",
  CHECKPOINT_RESTORE_FAILED = "CHECKPOINT_RESTORE_FAILED",
  SNAPSHOT_NOT_FOUND = "SNAPSHOT_NOT_FOUND",
  SNAPSHOT_CREATE_FAILED = "SNAPSHOT_CREATE_FAILED",
  SNAPSHOT_RESTORE_FAILED = "SNAPSHOT_RESTORE_FAILED",
  DATABASE_NOT_INITIALIZED = "DATABASE_NOT_INITIALIZED",
  DATABASE_CONNECTION_FAILED = "DATABASE_CONNECTION_FAILED",
  DATABASE_QUERY_FAILED = "DATABASE_QUERY_FAILED",
}

/**
 * Persistence error
 */
export class PersistenceError extends OpenCodeError {
  constructor(code: PersistenceErrorCode, message: string, details?: any) {
    super(code, message, details);
  }
}

/**
 * Error factory for Persistence operations
 */
export const PersistenceErrors = {
  checkpointNotFound(taskId: string): PersistenceError {
    return new PersistenceError(
      PersistenceErrorCode.CHECKPOINT_NOT_FOUND,
      `Checkpoint not found for task: ${taskId}`,
      { taskId },
    );
  },

  checkpointCreateFailed(taskId: string, reason: string): PersistenceError {
    return new PersistenceError(
      PersistenceErrorCode.CHECKPOINT_CREATE_FAILED,
      `Failed to create checkpoint for task ${taskId}: ${reason}`,
      { taskId, reason },
    );
  },

  checkpointRestoreFailed(taskId: string, reason: string): PersistenceError {
    return new PersistenceError(
      PersistenceErrorCode.CHECKPOINT_RESTORE_FAILED,
      `Failed to restore checkpoint for task ${taskId}: ${reason}`,
      { taskId, reason },
    );
  },

  databaseNotInitialized(): PersistenceError {
    return new PersistenceError(
      PersistenceErrorCode.DATABASE_NOT_INITIALIZED,
      "Database not initialized",
      {},
    );
  },

  snapshotNotFound(taskId: string): PersistenceError {
    return new PersistenceError(
      PersistenceErrorCode.SNAPSHOT_NOT_FOUND,
      `Snapshot not found for task: ${taskId}`,
      { taskId },
    );
  },
};

// ============================================================================
// Hook Errors
// ============================================================================

/**
 * Hook error codes
 */
export enum HookErrorCode {
  HOOK_NOT_FOUND = "HOOK_NOT_FOUND",
  HOOK_EXECUTION_FAILED = "HOOK_EXECUTION_FAILED",
  HOOK_REGISTRATION_FAILED = "HOOK_REGISTRATION_FAILED",
  HOOK_TYPE_INVALID = "HOOK_TYPE_INVALID",
}

/**
 * Hook error
 */
export class HookError extends OpenCodeError {
  constructor(code: HookErrorCode, message: string, details?: any) {
    super(code, message, details);
  }
}

/**
 * Error factory for Hook operations
 */
export const HookErrors = {
  hookNotFound(hookId: string): HookError {
    return new HookError(
      HookErrorCode.HOOK_NOT_FOUND,
      `Hook not found: ${hookId}`,
      { hookId },
    );
  },

  hookExecutionFailed(hookId: string, error: string): HookError {
    return new HookError(
      HookErrorCode.HOOK_EXECUTION_FAILED,
      `Hook execution failed: ${hookId} - ${error}`,
      { hookId, error },
    );
  },

  hookTypeInvalid(type: string): HookError {
    return new HookError(
      HookErrorCode.HOOK_TYPE_INVALID,
      `Invalid hook type: ${type}`,
      { type },
    );
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if error is a specific OpenCode error type
 */
export function isOpenCodeError(error: any): error is OpenCodeError {
  return error instanceof OpenCodeError;
}

/**
 * Get error code from any error
 */
export function getErrorCode(error: any): string | undefined {
  if (isOpenCodeError(error)) {
    return error.code;
  }
  return undefined;
}

/**
 * Get error details from any error
 */
export function getErrorDetails(error: any): any | undefined {
  if (isOpenCodeError(error)) {
    return error.details;
  }
  return undefined;
}
