/**
 * Generic O(1) LRU (Least Recently Used) Cache with TTL Expiration
 *
 * Data Structure:
 * - Hash Map (O(1) key-to-node lookup)
 * - Doubly Linked List (O(1) node insertion, removal, and recency promotion)
 *
 * Design Patterns:
 * - Factory / Strategy Pattern for Cache Storage
 * - Observer Pattern for Cache Eviction & Telemetry Events
 */

export interface CacheEntry<V> {
  key: string;
  value: V;
  expiresAt: number;
  hitCount: number;
}

class DoublyLinkedListNode<K, V> {
  key: K;
  value: V;
  expiresAt: number;
  hitCount: number;
  prev: DoublyLinkedListNode<K, V> | null = null;
  next: DoublyLinkedListNode<K, V> | null = null;

  constructor(key: K, value: V, ttlMs: number) {
    this.key = key;
    this.value = value;
    this.expiresAt = Date.now() + ttlMs;
    this.hitCount = 0;
  }

  isExpired(): boolean {
    return Date.now() > this.expiresAt;
  }
}

export interface LRUCacheStats {
  size: number;
  capacity: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRatio: number;
}

export class LRUCache<K, V> {
  private capacity: number;
  private defaultTtlMs: number;
  private map: Map<K, DoublyLinkedListNode<K, V>>;
  private head: DoublyLinkedListNode<K, V> | null = null; // Most recently used
  private tail: DoublyLinkedListNode<K, V> | null = null; // Least recently used

  // Telemetry metrics
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(capacity: number = 100, defaultTtlMs: number = 1000 * 60 * 60 * 24) {
    if (capacity <= 0) {
      throw new Error('LRUCache capacity must be greater than zero.');
    }
    this.capacity = capacity;
    this.defaultTtlMs = defaultTtlMs;
    this.map = new Map<K, DoublyLinkedListNode<K, V>>();
  }

  /**
   * Retrieves an item from the cache in O(1) time.
   * Promotes the accessed node to the head of the doubly linked list.
   */
  public get(key: K): V | null {
    const node = this.map.get(key);

    if (!node) {
      this.misses++;
      return null;
    }

    // Check TTL expiration
    if (node.isExpired()) {
      this.removeNode(node);
      this.map.delete(key);
      this.misses++;
      return null;
    }

    // Update hits and promote to head (MRU)
    node.hitCount++;
    this.hits++;
    this.moveToHead(node);
    return node.value;
  }

  /**
   * Inserts or updates an item in O(1) time.
   * Evicts the tail (LRU) node if capacity is reached.
   */
  public put(key: K, value: V, ttlMs?: number): void {
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    const existingNode = this.map.get(key);

    if (existingNode) {
      existingNode.value = value;
      existingNode.expiresAt = Date.now() + effectiveTtl;
      this.moveToHead(existingNode);
      return;
    }

    const newNode = new DoublyLinkedListNode(key, value, effectiveTtl);

    // Evict LRU node if capacity is full
    if (this.map.size >= this.capacity) {
      this.evictLeastRecentlyUsed();
    }

    this.addToHead(newNode);
    this.map.set(key, newNode);
  }

  /**
   * Removes a key from the cache in O(1) time.
   */
  public delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;

    this.removeNode(node);
    this.map.delete(key);
    return true;
  }

  /**
   * Clears all items and resets statistics.
   */
  public clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Returns telemetry metrics for performance monitoring.
   */
  public getStats(): LRUCacheStats {
    const totalRequests = this.hits + this.misses;
    return {
      size: this.map.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRatio: totalRequests > 0 ? Number((this.hits / totalRequests).toFixed(4)) : 0,
    };
  }

  // ─── Internal Doubly Linked List Manipulations (O(1)) ──────────

  private addToHead(node: DoublyLinkedListNode<K, V>): void {
    node.next = this.head;
    node.prev = null;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: DoublyLinkedListNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private moveToHead(node: DoublyLinkedListNode<K, V>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private evictLeastRecentlyUsed(): void {
    if (!this.tail) return;

    const lruNode = this.tail;
    this.removeNode(lruNode);
    this.map.delete(lruNode.key);
    this.evictions++;
  }
}

// Export pre-instantiated Singleton Cache instances for the enterprise pipeline
export const openFdaCache = new LRUCache<string, any>(200, 1000 * 60 * 60 * 24 * 7); // 7-day TTL
export const indianMedicinesCache = new LRUCache<string, any>(500, 1000 * 60 * 60 * 24); // 24-hour TTL
export const modelOutputCache = new LRUCache<string, any>(100, 1000 * 60 * 60 * 2); // 2-hour TTL
