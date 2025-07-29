import { beforeEach, afterAll, describe, it, expect, vi } from 'vitest';

// モジュールのモック - configを最初にモック
vi.mock('../../src/config.js', () => ({
  default: {
    openaiKey: 'test-key',
    model: 'gpt-4-o3',
    timeout: 30000,
    maxRetries: 3,
    logLevel: 'debug', // テスト用にdebugレベル
  },
}));

import { createLogger, type Logger } from '../../src/utils/logger.js';

// console メソッドをモック
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('createLogger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createLogger('TestContext');
    mockConsoleLog.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('Test message');
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [TestContext] Test message'),
      );
    });

    it('should log info messages with data', () => {
      const testData = { key: 'value' };
      logger.info('Test message', testData);
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [TestContext] Test message'),
      );
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.warn('Warning message');
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] [TestContext] Warning message'),
      );
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      logger.error('Error message');
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [TestContext] Error message'),
      );
    });

    it('should log error messages with Error object', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [TestContext] Error occurred'),
      );
    });
  });

  describe('debug', () => {
    it('should log debug messages when log level is debug', () => {
      logger.debug('Debug message');
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] [TestContext] Debug message'),
      );
    });
  });
});
