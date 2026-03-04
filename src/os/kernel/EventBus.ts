/**
 * 事件总线 - 解耦 Store 之间的直接依赖
 * 使用发布-订阅模式实现跨模块通信
 */

type EventCallback<T = any> = (data: T) => void | Promise<void>

interface EventSubscription {
  unsubscribe: () => void
}

// 定义系统事件类型
export interface SystemEvents {
  // 文件系统事件
  'fs:file:created': { id: string; path: string; type: 'file' | 'folder' }
  'fs:file:updated': { id: string; path: string; content?: string }
  'fs:file:deleted': { id: string; path: string }
  'fs:file:renamed': { id: string; oldPath: string; newPath: string }
  'fs:file:moved': { id: string; oldPath: string; newPath: string }
  
  // 窗口事件
  'window:opened': { id: string; appId?: string }
  'window:closed': { id: string; appId?: string }
  'window:focused': { id: string }
  'window:minimized': { id: string }
  'window:maximized': { id: string }
  
  // 进程事件
  'process:created': { pid: number; appId: string; name: string }
  'process:killed': { pid: number; appId: string; windowId?: string }
  'process:status:changed': { pid: number; status: string }
  
  // 应用事件
  'app:launched': { appId: string; windowId: string }
  'app:closed': { appId: string; windowId: string }
  
  // 系统事件
  'system:theme:changed': { theme: 'light' | 'dark' }
  'system:language:changed': { language: string }
  'system:shutdown': {}
  
  // 错误与调试
  'sys:error': { source: string; message: string; stack?: string; error?: any }
  'sys:warn': { source: string; message: string }
  
  // 网络
  'sys:network': { method: string; url: string; status: number; duration: number; type: 'xhr' | 'fetch' }
  
  // 性能
  'sys:perf': { metric: string; value: number; unit?: string }
  
  // 应用日志
  'app:log': { appId: string; level: 'info' | 'warn' | 'error'; message: string; data?: any }
}

class EventBus {
  private listeners = new Map<keyof SystemEvents, Set<EventCallback>>()
  private onceListeners = new Map<keyof SystemEvents, Set<EventCallback>>()
  private globalListeners = new Set<(event: keyof SystemEvents, data: any) => void>()
  
  // Event deduplication
  private recentEvents = new Map<string, number>()
  private deduplicationWindow = 100 // ms

  /**
   * Generate event fingerprint for deduplication
   */
  private getEventFingerprint<K extends keyof SystemEvents>(
    event: K,
    data: SystemEvents[K]
  ): string {
    // Create a simple fingerprint based on event type and key data
    const keyData = JSON.stringify(data)
    return `${event}:${keyData}`
  }

  /**
   * Check if event should be deduplicated
   */
  private shouldDeduplicate<K extends keyof SystemEvents>(
    event: K,
    data: SystemEvents[K]
  ): boolean {
    const fingerprint = this.getEventFingerprint(event, data)
    const lastEmit = this.recentEvents.get(fingerprint)
    const now = Date.now()

    if (lastEmit && now - lastEmit < this.deduplicationWindow) {
      return true // Duplicate, skip
    }

    this.recentEvents.set(fingerprint, now)
    
    // Clean up old entries
    if (this.recentEvents.size > 1000) {
      const cutoff = now - this.deduplicationWindow * 2
      for (const [key, timestamp] of this.recentEvents.entries()) {
        if (timestamp < cutoff) {
          this.recentEvents.delete(key)
        }
      }
    }

    return false
  }

  /**
   * 订阅所有事件（用于调试/日志）
   */
  onAny(callback: (event: keyof SystemEvents, data: any) => void): EventSubscription {
    this.globalListeners.add(callback)
    return {
      unsubscribe: () => this.globalListeners.delete(callback)
    }
  }

  /**
   * 订阅事件
   */
  on<K extends keyof SystemEvents>(
    event: K,
    callback: EventCallback<SystemEvents[K]>
  ): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    return {
      unsubscribe: () => this.off(event, callback)
    }
  }

  /**
   * 订阅事件（仅触发一次）
   */
  once<K extends keyof SystemEvents>(
    event: K,
    callback: EventCallback<SystemEvents[K]>
  ): EventSubscription {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set())
    }
    this.onceListeners.get(event)!.add(callback)

    return {
      unsubscribe: () => {
        const listeners = this.onceListeners.get(event)
        if (listeners) {
          listeners.delete(callback)
        }
      }
    }
  }

  /**
   * 取消订阅
   */
  off<K extends keyof SystemEvents>(
    event: K,
    callback: EventCallback<SystemEvents[K]>
  ): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  /**
   * 发布事件（带去重）
   */
  emit<K extends keyof SystemEvents>(
    event: K,
    data: SystemEvents[K]
  ): void {
    // Check for duplicates
    if (this.shouldDeduplicate(event, data)) {
      // console.debug(`[EventBus] Deduplicated event: ${event}`)
      return
    }

    // 执行全局监听器
    this.globalListeners.forEach(callback => {
      try {
        callback(event, data)
      } catch (error) {
        console.error(`[EventBus] Error in global listener for ${event}:`, error)
      }
    })

    // 执行普通监听器
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[EventBus] Error in listener for ${event}:`, error)
        }
      })
    }

    // 执行一次性监听器
    const onceListeners = this.onceListeners.get(event)
    if (onceListeners) {
      onceListeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[EventBus] Error in once listener for ${event}:`, error)
        }
      })
      this.onceListeners.delete(event)
    }
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this.listeners.clear()
    this.onceListeners.clear()
  }

  /**
   * 清除特定事件的所有监听器
   */
  clearEvent<K extends keyof SystemEvents>(event: K): void {
    this.listeners.delete(event)
    this.onceListeners.delete(event)
  }

  /**
   * 获取事件的监听器数量
   */
  listenerCount<K extends keyof SystemEvents>(event: K): number {
    const regular = this.listeners.get(event)?.size ?? 0
    const once = this.onceListeners.get(event)?.size ?? 0
    return regular + once
  }
}

// 导出单例
export const eventBus = new EventBus()

// 开发环境下暴露到 window 用于调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as any).__eventBus = eventBus
}
