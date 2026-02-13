/**
 * 文件内容缓存服务
 * 使用 LRU 策略管理内存中的文件内容
 */

interface CacheEntry {
  content: string
  lastAccessed: number
  size: number
}

class FileContentCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize: number // 最大缓存大小（字节）
  private maxEntries: number // 最大缓存条目数
  private currentSize = 0

  constructor(
    maxSize: number = 50 * 1024 * 1024, // 默认 50MB
    maxEntries: number = 100 // 默认 100 个文件
  ) {
    this.maxSize = maxSize
    this.maxEntries = maxEntries
  }

  /**
   * 获取缓存内容
   */
  get(fileId: string): string | undefined {
    const entry = this.cache.get(fileId)
    if (entry) {
      entry.lastAccessed = Date.now()
      return entry.content
    }
    return undefined
  }

  /**
   * 设置缓存内容
   */
  set(fileId: string, content: string): void {
    const size = new Blob([content]).size

    // 如果单个文件超过最大缓存大小，不缓存
    if (size > this.maxSize) {
      console.warn(`[FileCache] File ${fileId} too large to cache (${size} bytes)`)
      return
    }

    // 如果已存在，先移除旧的
    if (this.cache.has(fileId)) {
      const oldEntry = this.cache.get(fileId)!
      this.currentSize -= oldEntry.size
    }

    // 检查是否需要清理
    while (
      (this.currentSize + size > this.maxSize || this.cache.size >= this.maxEntries) &&
      this.cache.size > 0
    ) {
      this.evictLRU()
    }

    // 添加新条目
    this.cache.set(fileId, {
      content,
      lastAccessed: Date.now(),
      size
    })
    this.currentSize += size
  }

  /**
   * 删除缓存
   */
  delete(fileId: string): boolean {
    const entry = this.cache.get(fileId)
    if (entry) {
      this.currentSize -= entry.size
      return this.cache.delete(fileId)
    }
    return false
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }

  /**
   * 检查是否存在
   */
  has(fileId: string): boolean {
    return this.cache.has(fileId)
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      entries: this.cache.size,
      size: this.currentSize,
      maxSize: this.maxSize,
      maxEntries: this.maxEntries,
      utilization: (this.currentSize / this.maxSize) * 100
    }
  }

  /**
   * 驱逐最少使用的条目
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!
      this.currentSize -= entry.size
      this.cache.delete(oldestKey)
      console.log(`[FileCache] Evicted ${oldestKey} (LRU)`)
    }
  }

  /**
   * 预加载文件
   */
  async preload(fileId: string, loader: () => Promise<string>): Promise<string> {
    const cached = this.get(fileId)
    if (cached !== undefined) {
      return cached
    }

    const content = await loader()
    this.set(fileId, content)
    return content
  }
}

// 导出单例
export const fileContentCache = new FileContentCache()

// 开发环境下暴露到 window 用于调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as any).__fileCache = fileContentCache
}
