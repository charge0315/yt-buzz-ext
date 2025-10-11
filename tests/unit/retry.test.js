/**
 * @jest-environment jsdom
 */

import { withRetry } from '../../src/utils/retry.js';

describe('Retry Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should succeed on first attempt', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('should retry on retryable error', async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
      .mockResolvedValue('success');

    const result = await withRetry(mockFn, 3, 10);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test('should not retry on non-retryable error', async () => {
    const mockFn = jest.fn().mockRejectedValue({ status: 404, message: 'Not found' });

    await expect(withRetry(mockFn, 3, 10)).rejects.toMatchObject({
      status: 404,
    });

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('should throw after max attempts', async () => {
    const mockFn = jest.fn().mockRejectedValue({ status: 500, message: 'Server error' });

    await expect(withRetry(mockFn, 3, 10)).rejects.toMatchObject({
      status: 500,
    });

    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});
