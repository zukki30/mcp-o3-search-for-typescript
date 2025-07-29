#!/usr/bin/env node

import { startMCPSearchServer } from './server.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('Main');

async function main(): Promise<void> {
  try {
    logger.info('Starting MCP O3 Search Server...');
    await startMCPSearchServer();
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// プロセス終了シグナルの処理
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
  process.exit(1);
});

main().catch((error) => {
  logger.error('Main function failed', error);
  process.exit(1);
});
