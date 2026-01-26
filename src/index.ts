#!/usr/bin/env node

import { logger } from './util/logger';
import { MCP_PORT, MCP_HOST } from './config';

// Import main components (to be implemented)
import './docker/docker-manager'; // Docker integration
import './persistence/database';   // SQLite database
import './mcp/server';            // MCP server

// Main application class
class OpenCodeTools {
  private static instance: OpenCodeTools;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): OpenCodeTools {
    if (!OpenCodeTools.instance) {
      OpenCodeTools.instance = new OpenCodeTools();
    }
    return OpenCodeTools.instance;
  }

  private async initialize(): Promise<void> {
    try {
      logger.info('🚀 Starting OpenCode Tools...', {
        version: '0.1.0',
        nodeVersion: process.version,
        platform: process.platform,
      });

      // Initialize components will be implemented in Phase 1
      await this.initializeComponents();

      logger.info('✅ OpenCode Tools started successfully', {
        mcpHost: MCP_HOST,
        mcpPort: MCP_PORT,
      });

    } catch (error: unknown) {
      logger.error('❌ Failed to start OpenCode Tools', { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    }
  }

  private async initializeComponents(): Promise<void> {
    // Components will be initialized here as they are implemented
    logger.info('Initializing components...');

    // Docker Manager (Phase 1)
    // Database (Phase 1)
    // MCP Server (Phase 1)

    logger.info('Components initialized');
  }

  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down OpenCode Tools...');

    // Graceful shutdown logic will be implemented
    // - Close database connections
    // - Stop Docker containers
    // - Close MCP server

    logger.info('✅ OpenCode Tools shut down successfully');
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, initiating graceful shutdown...');
  await OpenCodeTools.getInstance().shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, initiating graceful shutdown...');
  await OpenCodeTools.getInstance().shutdown();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error instanceof Error ? error.message : String(error), stack: error.stack });
  process.exit(1);
});

// Start the application
OpenCodeTools.getInstance();
