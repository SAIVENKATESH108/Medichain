import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../src/lib/dataStructures/LRUCache';

describe('High-Performance O(1) LRU Cache Data Structure', () => {
  let cache: LRUCache<string, string>;

  beforeEach(() => {
    cache = new LRUCache<string, string>(3, 1000); // capacity 3, ttl 1s
  });

  it('stores and retrieves key-value pairs with O(1) complexity', () => {
    cache.put('med1', 'Amoxicillin');
    cache.put('med2', 'Paracetamol');

    expect(cache.get('med1')).toBe('Amoxicillin');
    expect(cache.get('med2')).toBe('Paracetamol');
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('evicts the least recently used item when capacity is exceeded', () => {
    cache.put('a', '1');
    cache.put('b', '2');
    cache.put('c', '3');

    // Access 'a' so 'b' becomes the least recently used (LRU)
    cache.get('a');

    // Insert 'd', which should evict 'b'
    cache.put('d', '4');

    expect(cache.get('b')).toBeNull(); // Evicted
    expect(cache.get('a')).toBe('1');
    expect(cache.get('c')).toBe('3');
    expect(cache.get('d')).toBe('4');
  });

  it('expires entries after TTL duration', async () => {
    const shortTtlCache = new LRUCache<string, string>(5, 50); // 50ms TTL
    shortTtlCache.put('temp', 'EphemeralData');

    expect(shortTtlCache.get('temp')).toBe('EphemeralData');

    // Wait 60ms for TTL expiration
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(shortTtlCache.get('temp')).toBeNull();
  });

  it('tracks accurate performance and hit/miss telemetry stats', () => {
    cache.put('k1', 'v1');
    cache.put('k2', 'v2');
    cache.put('k3', 'v3');
    cache.put('k4', 'v4'); // 1 eviction

    cache.get('k2'); // 1 hit
    cache.get('k3'); // 1 hit
    cache.get('k1'); // 1 miss (evicted)
    cache.get('unknown'); // 1 miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(2);
    expect(stats.evictions).toBe(1);
    expect(stats.hitRatio).toBe(0.5);
    expect(stats.size).toBe(3);
  });
});
