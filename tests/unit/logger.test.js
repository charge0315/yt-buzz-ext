/**
 * @jest-environment jsdom
 */

import { LogManager } from '../../src/utils/logger.js';

describe('LogManager', () => {
  let logManager;

  beforeEach(() => {
    logManager = new LogManager();
    jest.clearAllMocks();
  });

  test('should log messages', async () => {
    await logManager.log('Test message', 'info');
    const logs = await logManager.getLogs();

    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Test message');
    expect(logs[0].level).toBe('info');
  });

  test('should maintain max queue size', async () => {
    logManager.maxQueueSize = 5;

    for (let i = 0; i < 10; i++) {
      await logManager.log(`Message ${i}`, 'info');
    }

    const logs = await logManager.getLogs();
    expect(logs).toHaveLength(5);
    expect(logs[0].message).toBe('Message 5');
  });

  test('should filter logs by level', async () => {
    await logManager.info('Info message');
    await logManager.error('Error message');
    await logManager.warn('Warning message');

    const errorLogs = await logManager.getLogsByLevel('error');
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0].message).toBe('Error message');
  });

  test('should clear all logs', async () => {
    await logManager.log('Message 1', 'info');
    await logManager.log('Message 2', 'info');
    await logManager.clear();

    const logs = await logManager.getLogs();
    expect(logs).toHaveLength(0);
  });
});
