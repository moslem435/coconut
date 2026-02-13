/**
 * 文件系统同步服务
 * 统一管理 OPFS、WebContainer、内存之间的同步逻辑
 */

import { ioService } from './FileSystemIOService'
import { eventBus } from '@/os/kernel/EventBus'

export interface SyncOptions {
  syncToOPFS?: boolean
  syncToWebContainer?: boolean
  syncToMemory?: boolean
}

class FileSystemSyncService {
  private syncQueue: Array<() => Promise<void>> = []
  private isSyncing = false

  /**
   * 同步文件创建
   */
  async syncCreate(
    path: string,
    type: 'file' | 'folder',
    content?: string,
    options: SyncOptions = { syncToOPFS: true, syncToWebContainer: true }
  ): Promise<void> {
    const tasks: Array<() => Promise<void>> = []

    // OPFS 同步
    if (options.syncToOPFS) {
      tasks.push(async () => {
        try {
          if (type === 'folder') {
            await ioService.mkdir(path)
          } else {
            await ioService.writeFile(path, content || '')
          }
        } catch (error) {
          console.error('[SyncService] OPFS create failed:', error)
        }
      })
    }

    // WebContainer 同步
    if (options.syncToWebContainer) {
      tasks.push(async () => {
        try {
          const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore')
          if (type === 'folder') {
            useWebContainerStore.getState().syncMkdir(path)
          } else {
            useWebContainerStore.getState().syncFile(path, content || '')
          }
        } catch (error) {
          console.error('[SyncService] WebContainer create failed:', error)
        }
      })
    }

    await this.executeTasks(tasks)
    
    // 发布事件
    eventBus.emit('fs:file:created', {
      id: path.split('/').pop() || '',
      path,
      type
    })
  }

  /**
   * 同步文件更新
   */
  async syncUpdate(
    path: string,
    content: string,
    options: SyncOptions = { syncToOPFS: true, syncToWebContainer: true }
  ): Promise<void> {
    const tasks: Array<() => Promise<void>> = []

    if (options.syncToOPFS) {
      tasks.push(async () => {
        try {
          await ioService.writeFile(path, content)
        } catch (error) {
          console.error('[SyncService] OPFS update failed:', error)
        }
      })
    }

    if (options.syncToWebContainer) {
      tasks.push(async () => {
        try {
          const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore')
          useWebContainerStore.getState().syncFile(path, content)
        } catch (error) {
          console.error('[SyncService] WebContainer update failed:', error)
        }
      })
    }

    await this.executeTasks(tasks)
    
    // 发布事件
    eventBus.emit('fs:file:updated', {
      id: path.split('/').pop() || '',
      path,
      content
    })
  }

  /**
   * 同步文件删除
   */
  async syncDelete(
    path: string,
    options: SyncOptions = { syncToOPFS: true, syncToWebContainer: true }
  ): Promise<void> {
    const tasks: Array<() => Promise<void>> = []

    if (options.syncToOPFS) {
      tasks.push(async () => {
        try {
          if (path && path !== '/') {
            await ioService.unlink(path, true)
          }
        } catch (error) {
          console.error('[SyncService] OPFS delete failed:', error)
        }
      })
    }

    if (options.syncToWebContainer) {
      tasks.push(async () => {
        try {
          const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore')
          useWebContainerStore.getState().syncUnlink(path)
        } catch (error) {
          console.error('[SyncService] WebContainer delete failed:', error)
        }
      })
    }

    await this.executeTasks(tasks)
    
    // 发布事件
    eventBus.emit('fs:file:deleted', {
      id: path.split('/').pop() || '',
      path
    })
  }

  /**
   * 同步文件重命名/移动
   */
  async syncRename(
    oldPath: string,
    newPath: string,
    options: SyncOptions = { syncToOPFS: true, syncToWebContainer: true }
  ): Promise<void> {
    const tasks: Array<() => Promise<void>> = []

    if (options.syncToOPFS) {
      tasks.push(async () => {
        try {
          await ioService.rename(oldPath, newPath)
        } catch (error) {
          console.error('[SyncService] OPFS rename failed:', error)
        }
      })
    }

    if (options.syncToWebContainer) {
      tasks.push(async () => {
        try {
          const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore')
          const { instance, isSyncingFromWC } = useWebContainerStore.getState()
          if (!instance || isSyncingFromWC) return

          const wcOld = `/home/guest${oldPath}`
          const wcNew = `/home/guest${newPath}`
          await instance.fs.rename(wcOld, wcNew)
        } catch (error) {
          console.error('[SyncService] WebContainer rename failed:', error)
        }
      })
    }

    await this.executeTasks(tasks)
    
    // 发布事件
    eventBus.emit('fs:file:renamed', {
      id: newPath.split('/').pop() || '',
      oldPath,
      newPath
    })
  }

  /**
   * 读取文件内容（使用 IOService）
   */
  async readContent(path: string): Promise<string> {
    try {
      return await ioService.readFile(path)
    } catch (error) {
      console.warn(`[SyncService] Failed to read ${path}:`, error)
      return ''
    }
  }

  /**
   * 读取目录内容
   */
  async readDirectory(path: string): Promise<string[]> {
    try {
      return await ioService.readdir(path)
    } catch (error) {
      console.warn(`[SyncService] Failed to read directory ${path}:`, error)
      return []
    }
  }

  /**
   * 获取文件统计信息
   */
  async getStats(path: string) {
    try {
      return await ioService.stat(path)
    } catch (error) {
      console.warn(`[SyncService] Failed to stat ${path}:`, error)
      return null
    }
  }

  /**
   * 批量执行同步任务
   */
  private async executeTasks(tasks: Array<() => Promise<void>>): Promise<void> {
    // 并行执行所有任务
    await Promise.allSettled(tasks.map(task => task()))
  }

  /**
   * 添加任务到队列
   */
  private enqueue(task: () => Promise<void>): void {
    this.syncQueue.push(task)
    this.processQueue()
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return

    this.isSyncing = true
    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift()
      if (task) {
        try {
          await task()
        } catch (error) {
          console.error('[SyncService] Queue task failed:', error)
        }
      }
    }
    this.isSyncing = false
  }
}

export const syncService = new FileSystemSyncService()
