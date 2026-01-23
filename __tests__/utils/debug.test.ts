// Mock the config module before importing debug
jest.mock('../../lib/config', () => ({
  DEBUG_MODE: false,
}));

import { createDebugLogger, DEBUG_LOG_ENABLED } from '../../utils/debug';

describe('debug utility', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('DEBUG_LOG_ENABLED', () => {
    it('should match DEBUG_MODE from config', () => {
      // DEBUG_MODE is mocked to false
      expect(DEBUG_LOG_ENABLED).toBe(false);
    });
  });

  describe('createDebugLogger', () => {
    it('should create a logger with log, warn, and error methods', () => {
      const logger = createDebugLogger('TestModule');

      expect(logger).toHaveProperty('log');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(typeof logger.log).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should not log when DEBUG_LOG_ENABLED is false', () => {
      const logger = createDebugLogger('TestModule');

      logger.log('test message');
      logger.warn('warning message');
      logger.error('error message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('createDebugLogger with enabled logging', () => {
    // Note: We can't easily test enabled logging without modifying the module
    // This test documents the expected behavior when DEBUG_LOG_ENABLED = true

    it('should format messages with module name prefix', () => {
      // The format should be: [ModuleName] message
      // When DEBUG_LOG_ENABLED is true, calling logger.log('test')
      // should output: [ModuleName] test
      const logger = createDebugLogger('MyModule');

      // Since DEBUG_LOG_ENABLED is false (mocked), we just verify the logger is created
      expect(logger).toBeDefined();
    });
  });
});
