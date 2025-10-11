/**
 * @jest-environment jsdom
 */

import { CacheManager } from '../../src/utils/cache.js';

describe('CacheManager', () => {
  let cacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager(1000); // 1 second TTL for tests
    jest.clearAllMocks();
  });

  test('should generate unique cache keys', () => {
    const key1 = cacheManager.generateKey('test', { a: 1, b: 2 });
    const key2 = cacheManager.generateKey('test', { b: 2, a: 1 });
    const key3 = cacheManager.generateKey('test', { a: 1 });

    expect(key1).toBe(key2); // Order shouldn't matter
    expect(key1).not.toBe(key3);
  });

  test('should store and retrieve values', async () => {
    await cacheManager.set('test-key', { data: 'test' });
    const value = await cacheManager.get('test-key');

    expect(value).toEqual({ data: 'test' });
  });

  test('should return null for expired cache', async () => {
    cacheManager = new CacheManager(10); // 10ms TTL
    await cacheManager.set('test-key', 'value');

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 20));

    const value = await cacheManager.get('test-key');
    expect(value).toBeNull();
  });

  test('should wrap function with caching', async () => {
    const mockFn = jest.fn().mockResolvedValue('result');

    const result1 = await cacheManager.wrap('key', mockFn);
    const result2 = await cacheManager.wrap('key', mockFn);

    expect(result1).toBe('result');
    expect(result2).toBe('result');
    expect(mockFn).toHaveBeenCalledTimes(1); // Should only call once
  });
});
