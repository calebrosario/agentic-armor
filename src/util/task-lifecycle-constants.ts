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

export const VALID_STATE_TRANSITIONS = {
  pending: ["running", "cancelled"] as const,
  running: ["completed", "failed", "cancelled"] as const,
} as const;
