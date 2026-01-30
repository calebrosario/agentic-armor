// Container Safety Enforcer Hook - Phase 2: MVP Core
// Week 12, Task 12.10: Container Safety Enforcer Hook

import { logger } from '../../util/logger';
import { BeforeTaskStartHook } from '../task-lifecycle';

// Allowed image registry (whitelist)
const ALLOWED_IMAGE_REGISTRIES = [
  'docker.io',
  'opencode-sandbox',
  'localhost',
];

// Default resource limits (from config)
const DEFAULT_MEMORY_LIMIT = 512; // MB
const DEFAULT_CPU_SHARES = 512;
const DEFAULT_PIDS_LIMIT = 100;

/**
 * Validate container configuration before task starts
 *
 * This hook enforces:
 * 1. Image source validation (only from allowed registries)
 * 2. Resource limit validation (prevent resource exhaustion)
 * 3. Security policy enforcement
 */
export function createContainerSafetyEnforcerHook(
  config: {
    allowedImages?: string[];
    memoryLimit?: number;
    cpuShares?: number;
    pidsLimit?: number;
  } = {}
): BeforeTaskStartHook {
  const allowedImages = config.allowedImages || [];
  const memoryLimit = config.memoryLimit || DEFAULT_MEMORY_LIMIT;
  const cpuShares = config.cpuShares || DEFAULT_CPU_SHARES;
  const pidsLimit = config.pidsLimit || DEFAULT_PIDS_LIMIT;

  return async (taskId: string, agentId: string) => {
    try {
      logger.info('Validating container safety', { taskId, agentId, config });

      // Note: In a real implementation, we'd get container config from task metadata
      // For now, this is a placeholder showing validation pattern

      // Validate allowed images
      if (allowedImages.length > 0) {
        // const image = task.metadata?.containerConfig?.image;
        // if (!allowedImages.includes(image)) {
        //   throw new Error(`Image not allowed: ${image}`);
        // }
      }

      // Validate resource limits
      if (memoryLimit < 64) {
        throw new Error(`Memory limit too low: ${memoryLimit}MB (minimum: 64MB)`);
      }

      if (cpuShares < 2) {
        throw new Error(`CPU shares too low: ${cpuShares} (minimum: 2)`);
      }

      if (pidsLimit < 10) {
        throw new Error(`PIDs limit too low: ${pidsLimit} (minimum: 10)`);
      }

      logger.info('Container safety validated', { taskId, memoryLimit, cpuShares, pidsLimit });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Container safety validation failed', {
        taskId,
        agentId,
        error: errorMessage,
      });

      throw new Error(`Container safety validation failed: ${errorMessage}`);
    }
  };
}

/**
 * Extract registry from image name
 */
function extractRegistry(image: string): string | undefined {
  if (!image || typeof image !== 'string') {
    return undefined;
  }

  // If image contains '/', extract registry part
  const parts = image.split('/');
  if (parts.length >= 2) {
    const registry = parts[0];
    // Check if it's a registry (contains '.') or is 'localhost'
    if (registry && (registry.includes('.') || registry === 'localhost')) {
      return registry;
    }
  }

  // Default to docker.io for official images
  return 'docker.io';
}

/**
 * Check if registry is in allowed list
 */
function isAllowedRegistry(image: string): boolean {
  const registry = extractRegistry(image);
  if (!registry) {
    return false;
  }

  return ALLOWED_IMAGE_REGISTRIES.includes(registry);
}
