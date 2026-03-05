/**
 * 文件系统同步服务
 * 统一管理 OPFS、WebContainer、内存之间的同步逻辑
 */

import { ioService } from './FileSystemIOService'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
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
    content?: string | Uint8Array,
    options: SyncOptions = { syncToOPFS: true, syncToWebContainer: true }
  ): Promise<void> {
    const tasks: Array<() => Promise<void>> = []

    // OPFS 同步 (Critical, await)
    if (options.syncToOPFS) {
      const opfsTask = async () => {
        if (type === 'folder') {
          await ioService.mkdir(path)
        } else {
          const fileContent = content !== undefined ? content : '';
          await ioService.writeFile(path, fileContent)
        }
      };
      await this.executeTasks([opfsTask]);
    }

    // WebContainer 同步 (Non-critical, background)
    if (options.syncToWebContainer) {
      (async () => {
        try {
          const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore')
          if (type === 'folder') {
            useWebContainerStore.getState().syncMkdir(path)
          } else {
            const fileContent = content !== undefined ? content : '';
            useWebContainerStore.getState().syncFile(path, fileContent)
          }
        } catch (error) {
          console.warn('[SyncService] Background WebContainer creation failed (non-fatal):', error)
        }
      })();
    }

    // Publish event
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
    content: string | Uint8Array,
    options: SyncOptions = { syncToOPFS: true, syncToWebContainer: true }
  ): Promise<void> {
    if (options.syncToOPFS) {
      const opfsTask = async () => {
        await ioService.writeFile(path, content)
      };
      await this.executeTasks([opfsTask]);
    }

    if (options.syncToWebContainer) {
      (async () => {
        try {
          const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore')
          useWebContainerStore.getState().syncFile(path, content)
        } catch (error) {
          console.warn('[SyncService] Background WebContainer update failed:', error)
        }
      })();
    }

    // Publish event
    eventBus.emit('fs:file:updated', {
      id: path.split('/').pop() || '',
      path,
      content: typeof content === 'string' ? content : undefined
    })
  }

  /**
   * 同步文件删除
   */
  async syncDelete(
    path: string,
    options: SyncOptions = { syncToOPFS: true, syncToWebContainer: true }
  ): Promise<void> {
    if (options.syncToOPFS) {
      const opfsTask = async () => {
        if (path && path !== '/') {
          const exists = await fs.exists(path)
          if (exists) {
            await ioService.unlink(path, true)
          }
        }
      };
      await this.executeTasks([opfsTask]);
    }

    if (options.syncToWebContainer) {
      (async () => {
        try {
          const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore')
          useWebContainerStore.getState().syncUnlink(path)
        } catch (error) {
          console.warn('[SyncService] Background WebContainer deletion failed:', error)
        }
      })();
    }

    // Publish event
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
    if (options.syncToOPFS) {
      const opfsTask = async () => {
        const sourceExists = await fs.exists(oldPath)
        if (!sourceExists) {
          console.warn(`[SyncService] syncRename: source not in OPFS, skipping: ${oldPath}`)
          return
        }
        await ioService.rename(oldPath, newPath)
      };
      await this.executeTasks([opfsTask]);
    }

    if (options.syncToWebContainer) {
      (async () => {
        try {
          const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore')
          const { instance, isSyncingFromWC } = useWebContainerStore.getState()
          if (!instance || isSyncingFromWC) return
          await instance.fs.rename(oldPath, newPath)
        } catch (error) {
          console.warn('[SyncService] Background WebContainer rename failed:', error)
        }
      })();
    }

    // Publish event
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
   * 获取文件 Blob
   */
  async getFileBlob(path: string): Promise<Blob | null> {
    try {
      return await ioService.getFileBlob(path)
    } catch (error) {
      console.warn(`[SyncService] Failed to get blob for ${path}:`, error)
      return null
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
    // Execute all tasks sequentially to prevent race conditions in OPFS handles
    for (const task of tasks) {
      await task();
    }
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
