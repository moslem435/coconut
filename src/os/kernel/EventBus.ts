/**
 * @fileoverview 内核事件总线 - 模块间解耦通信核心
 * 
 * 架构设计：
 * - 发布/订阅模式：解耦事件生产者和消费者
 * - 类型安全：使用TypeScript泛型确保事件数据类型正确
 * - 事件去重：防止短时间内重复触发相同事件
 * 
 * 为什么使用事件总线而非直接调用：
 * - Store之间如果直接导入会形成循环依赖
 * - 事件总线允许任意方向的通信
 * 
 * @author yume
 * @created 2026-02-13
 * @lastModified 2026-03-04
 * @module src/os/kernel/EventBus
 */

/**
 * 事件回调函数类型
 * 
 * 支持同步和异步回调，异步回调错误将被捕获记录
 */
type EventCallback<T = any> = (data: T) => void | Promise<void>

/**
 * 订阅返回对象
 * 
 * 为什么返回对象而非直接提供取消方法：
 * - 封装订阅关系，避免需要保存回调引用
 * - 简化清理逻辑，直接调用unsubscribe()
 */
interface EventSubscription {
  /** 取消订阅 */
  unsubscribe: () => void
}

/**
 * 系统事件类型定义
 * 
 * 为什么使用接口词典而非单独类型：
 * - TypeScript可以从键推断对应的payload类型
 * - 新增事件只需在此一处添加，实现集中管理
 */
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
  /** 持久性订阅者存储 */
  private listeners = new Map<keyof SystemEvents, Set<EventCallback>>()
  /** 一次性订阅者存储 */
  private onceListeners = new Map<keyof SystemEvents, Set<EventCallback>>()
  /** 全局监听器(用于调试/日志) */
  private globalListeners = new Set<(event: keyof SystemEvents, data: any) => void>()
  
  // 事件去重算法相关
  /** 近期事件记录，用于去重检查 */
  private recentEvents = new Map<string, number>()
  /** 去重时间窗口(ms)，此时间内的相同事件不重复触发 */
  private deduplicationWindow = 100

  /**
   * 生成事件指纹用于去重
   * 
   * 指纹算法：事件名 + JSON序列化的数据
   * 为什么用JSON.stringify：简单有效，事件数据通常小且可序列化
   * 
   * @param event - 事件类型
   * @param data - 事件数据
   * @returns 事件指纹字符串
   */
  private getEventFingerprint<K extends keyof SystemEvents>(
    event: K,
    data: SystemEvents[K]
  ): string {
    // 用事件名和关键数据生成简单指纹
    const keyData = JSON.stringify(data)
    return `${event}:${keyData}`
  }

  /**
   * 检查事件是否应该去重
   * 
   * 去重策略：
   * - 在deduplicationWindow时间内发生相同事件则跳过
   * - 进行定期清理，防止recentEvents无限增长
   * 
   * @param event - 事件类型
   * @param data - 事件数据
   * @returns true表示应该去重（跳过）
   */
  private shouldDeduplicate<K extends keyof SystemEvents>(
    event: K,
    data: SystemEvents[K]
  ): boolean {
    const fingerprint = this.getEventFingerprint(event, data)
    const lastEmit = this.recentEvents.get(fingerprint)
    const now = Date.now()

    if (lastEmit && now - lastEmit < this.deduplicationWindow) {
      return true // 近期重复事件，应跳过
    }

    this.recentEvents.set(fingerprint, now)
    
    // 定期清理旧记录，防止内存泄漏
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
   * 
   * 为什么有全局监听器：
   * - 允许日志模块监听所有事件
   * - 便于调试时追踪事件流
   * 
   * @param callback - 接收事件名和数据的回调
   * @returns 订阅对象
   */
  onAny(callback: (event: keyof SystemEvents, data: any) => void): EventSubscription {
    this.globalListeners.add(callback)
    return {
      unsubscribe: () => this.globalListeners.delete(callback)
    }
  }

  /**
   * 订阅指定事件
   * 
   * @param event - 事件类型
   * @param callback - 事件回调
   * @returns 订阅对象，调用unsubscribe()可取消
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
   * 
   * 自动清理：触发后自动移除订阅
   * 
   * @param event - 事件类型
   * @param callback - 事件回调
   * @returns 订阅对象
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
   * 取消订阅指定事件的回调
   * 
   * 为什么需要独立的off方法（而非只用EventSubscription.unsubscribe）：
   * - 允许在没有保存订阅对象的场景下取消（如类成员方法直接作为回调）
   * 
   * @param event - 事件类型
   * @param callback - 要移除的回调引用，必须与on时传入的引用完全一致
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
   * 
   * 执行顺序：全局监听器 → 普通监听器 → 一次性监听器
   * 为什么全局监听器最先执行：日志/调试模块需要在业务逻辑处理前记录事件
   * 为什么一次性监听器最后执行：确保普通监听器先处理完毕，一次性监听器只做收尾
   * 错误隔离：每个回调的异常独立捕获，不影响其他监听器
   * 
   * @param event - 事件类型
   * @param data - 事件载荷，类型由SystemEvents定义
   */
  emit<K extends keyof SystemEvents>(
    event: K,
    data: SystemEvents[K]
  ): void {
    // 去重检查：100ms内相同事件（事件名+数据完全相同）只触发一次
    if (this.shouldDeduplicate(event, data)) {
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
   * 
   * 用于组件卸载或系统重置时彻底清理，防止内存泄漏
   * 注意：不清除globalListeners，调试模块的监听需手动管理
   */
  clear(): void {
    this.listeners.clear()
    this.onceListeners.clear()
  }

  /**
   * 清除特定事件的所有监听器
   * 
   * 用于应用卸载时只清理自身相关的事件订阅，不影响其他事件
   * 
   * @param event - 要清除的事件类型
   */
  clearEvent<K extends keyof SystemEvents>(event: K): void {
    this.listeners.delete(event)
    this.onceListeners.delete(event)
  }

  /**
   * 获取事件的监听器总数量（普通+一次性）
   * 
   * 用于调试和测试，验证订阅/取消订阅是否正确
   * 
   * @param event - 事件类型
   * @returns 该事件的监听器总数
   */
  listenerCount<K extends keyof SystemEvents>(event: K): number {
    const regular = this.listeners.get(event)?.size ?? 0
    const once = this.onceListeners.get(event)?.size ?? 0
    return regular + once
  }
}

/** 全局单例事件总线 - 系统内所有模块共享同一实例 */
export const eventBus = new EventBus()

// 开发环境下暴露到 window 方便浏览器控制台调试事件流
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as any).__eventBus = eventBus
}
