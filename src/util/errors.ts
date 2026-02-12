/**
 * Extract a human-readable error message from an unknown error
 *
 * Safely handles all error types including:
 * - Error instances (returns error.message)
 * - String errors (returns as-is)
 * - Objects with message property
 * - null/undefined (returns fallback)
 * - Everything else (returns String() representation)
 *
 * @param error - The caught error of unknown type
 * @param fallback - Optional fallback message if error is empty/undefined
 * @returns A string error message suitable for logging or display
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Unknown error",
): string {
  if (error === null || error === undefined) {
    return fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string") {
    return error || fallback;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string") {
      return msg || fallback;
    }
  }

  const stringified = String(error);
  return stringified === "[object Object]" ? fallback : stringified;
}
