/**
 * LRU (Least Recently Used) Cache
 * 
 * A simple LRU cache implementation with size limit and TTL support.
 * Used for caching file contents, blobs, and other frequently accessed data.
 */

interface CacheEntry<T> {
  value: T
  timestamp: number
  size: number // Size in bytes (for memory management)
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>()
  private maxSize: number // Maximum cache size in bytes
  private currentSize = 0
  private ttl: number // Time to live in milliseconds

  constructor(maxSize: number = 50 * 1024 * 1024, ttl: number = 5 * 60 * 1000) {
    this.maxSize = maxSize // Default: 50MB
    this.ttl = ttl // Default: 5 minutes
  }

  /**
   * Get value from cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    
    if (!entry) return undefined

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key)
      return undefined
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V, size?: number): void {
    // Calculate size if not provided
    const entrySize = size || this.estimateSize(value)

    // If single entry is larger than max size, don't cache
    if (entrySize > this.maxSize) {
      console.warn('[LRUCache] Entry too large to cache:', entrySize, 'bytes')
      return
    }

    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.delete(key)
    }

    // Evict entries until we have space
    while (this.currentSize + entrySize > this.maxSize && this.cache.size > 0) {
      this.evictOldest()
    }

    // Add new entry
    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      size: entrySize
    }

    this.cache.set(key, entry)
    this.currentSize += entrySize
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) return false

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete entry from cache
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) return false

    this.cache.delete(key)
    this.currentSize -= entry.size

    return true
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      utilizationPercent: (this.currentSize / this.maxSize) * 100
    }
  }

  /**
   * Evict oldest (least recently used) entry
   */
  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value
    if (firstKey !== undefined) {
      this.delete(firstKey)
    }
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: V): number {
    if (value instanceof Uint8Array) {
      return value.byteLength
    }

    if (value instanceof Blob) {
      return value.size
    }

    if (typeof value === 'string') {
      // Rough estimate: 2 bytes per character (UTF-16)
      return value.length * 2
    }

    if (typeof value === 'object' && value !== null) {
      // Rough estimate for objects
      return JSON.stringify(value).length * 2
    }

    // Default: 1KB for unknown types
    return 1024
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: K[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.delete(key))
  }

  /**
   * Get all keys in cache (for debugging)
   */
  keys(): K[] {
    return Array.from(this.cache.keys())
  }
}

/**
 * Specialized cache for file blobs with automatic URL management
 */
export class BlobCache extends LRUCache<string, string> {
  private blobUrls = new Map<string, string>()

  /**
   * Set blob in cache and create object URL
   */
  setBlob(key: string, blob: Blob): string {
    // Revoke old URL if exists
    const oldUrl = this.blobUrls.get(key)
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl)
    }

    // Create new URL
    const url = URL.createObjectURL(blob)
    this.blobUrls.set(key, url)

    // Cache the URL
    this.set(key, url, blob.size)

    return url
  }

  /**
   * Delete blob and revoke URL
   */
  delete(key: string): boolean {
    const url = this.blobUrls.get(key)
    if (url) {
      URL.revokeObjectURL(url)
      this.blobUrls.delete(key)
    }

    return super.delete(key)
  }

  /**
   * Clear all blobs and revoke URLs
   */
  clear(): void {
    for (const url of this.blobUrls.values()) {
      URL.revokeObjectURL(url)
    }
    this.blobUrls.clear()
    super.clear()
  }
}
