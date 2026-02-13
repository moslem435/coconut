/**
 * 性能监控工具
 * 用于开发环境下监控应用性能
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  category: 'render' | 'network' | 'memory' | 'custom'
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 1000
  private enabled = process.env.NODE_ENV === 'development'

  /**
   * 记录性能指标
   */
  record(
    name: string,
    value: number,
    category: PerformanceMetric['category'] = 'custom'
  ): void {
    if (!this.enabled) return

    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      category
    })

    // 限制指标数量
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }
  }

  /**
   * 测量函数执行时间
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>,
    category: PerformanceMetric['category'] = 'custom'
  ): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      this.record(name, duration, category)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.record(`${name} (error)`, duration, category)
      throw error
    }
  }

  /**
   * 测量组件渲染时间
   */
  measureRender(componentName: string, renderTime: number): void {
    this.record(`${componentName} render`, renderTime, 'render')
  }

  /**
   * 获取指标统计
   */
  getStats(name?: string) {
    const filtered = name
      ? this.metrics.filter(m => m.name === name)
      : this.metrics

    if (filtered.length === 0) {
      return null
    }

    const values = filtered.map(m => m.value)
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    const sorted = [...values].sort((a, b) => a - b)
    const p50 = sorted[Math.floor(sorted.length * 0.5)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]

    return {
      count: filtered.length,
      avg,
      min,
      max,
      p50,
      p95,
      p99
    }
  }

  /**
   * 获取所有指标
   */
  getMetrics(category?: PerformanceMetric['category']): PerformanceMetric[] {
    return category
      ? this.metrics.filter(m => m.category === category)
      : this.metrics
  }

  /**
   * 清空指标
   */
  clear(): void {
    this.metrics = []
  }

  /**
   * 监控内存使用
   */
  recordMemory(): void {
    if (!this.enabled || typeof performance === 'undefined') return

    // @ts-ignore - memory API 可能不存在
    const memory = performance.memory
    if (memory) {
      this.record('memory.used', memory.usedJSHeapSize / 1024 / 1024, 'memory')
      this.record('memory.total', memory.totalJSHeapSize / 1024 / 1024, 'memory')
      this.record('memory.limit', memory.jsHeapSizeLimit / 1024 / 1024, 'memory')
    }
  }

  /**
   * 监控 FPS
   */
  startFPSMonitor(): () => void {
    if (!this.enabled) return () => {}

    let frameCount = 0
    let lastTime = performance.now()
    let rafId: number

    const measure = () => {
      frameCount++
      const currentTime = performance.now()
      const elapsed = currentTime - lastTime

      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed)
        this.record('fps', fps, 'render')
        frameCount = 0
        lastTime = currentTime
      }

      rafId = requestAnimationFrame(measure)
    }

    rafId = requestAnimationFrame(measure)

    return () => cancelAnimationFrame(rafId)
  }

  /**
   * 打印性能报告
   */
  printReport(): void {
    if (!this.enabled) return

    console.group('📊 Performance Report')

    const categories: PerformanceMetric['category'][] = ['render', 'network', 'memory', 'custom']
    
    for (const category of categories) {
      const metrics = this.getMetrics(category)
      if (metrics.length === 0) continue

      console.group(`${category.toUpperCase()}`)
      
      const uniqueNames = [...new Set(metrics.map(m => m.name))]
      for (const name of uniqueNames) {
        const stats = this.getStats(name)
        if (stats) {
          console.log(`${name}:`, {
            count: stats.count,
            avg: `${stats.avg.toFixed(2)}ms`,
            p50: `${stats.p50.toFixed(2)}ms`,
            p95: `${stats.p95.toFixed(2)}ms`,
            min: `${stats.min.toFixed(2)}ms`,
            max: `${stats.max.toFixed(2)}ms`
          })
        }
      }
      
      console.groupEnd()
    }

    console.groupEnd()
  }

  /**
   * 导出指标数据
   */
  export(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics: this.metrics,
      stats: this.getStats()
    }, null, 2)
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor()

// 开发环境下暴露到 window
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as any).__perfMonitor = performanceMonitor
  
  // 定期记录内存使用
  setInterval(() => {
    performanceMonitor.recordMemory()
  }, 5000)
  
  // 启动 FPS 监控
  performanceMonitor.startFPSMonitor()
  
  // 添加快捷键打印报告
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      performanceMonitor.printReport()
    }
  })
}
