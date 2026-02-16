/**
 * Constants for TaskLifecycle
 *
 * Centralized constants for magic strings and repeated patterns
 */
export const LOCK_PREFIX = {
  TASK: "task:",
  LIFECYCLE: "lifecycle:",
} as const;

export const LOG_LEVELS = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
} as const;
