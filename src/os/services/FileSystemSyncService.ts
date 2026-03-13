/**
 * 文件系统同步服务
 * 统一管理 OPFS、WebContainer、内存之间的同步逻辑
 */

import { ioService } from './FileSystemIOService'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { eventBus } from '@/os/kernel/EventBus'
import { SYSTEM_PATHS } from '@/os/config/paths'

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

    // WebContainer 同步 (Non-blocking context initiation)
    if (options.syncToWebContainer) {
      // 开启异步任务不阻塞主流程，确保终端能尽快同步
      (async () => {
        try {
          const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore')
          if (type === 'folder') {
            await useWebContainerStore.getState().syncMkdir(path)
          } else {
            const fileContent = content !== undefined ? content : '';
            await useWebContainerStore.getState().syncFile(path, fileContent)
          }
        } catch (error) {
          console.warn('[SyncService] WebContainer creation failed:', error)
        }
      })();
    }

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
      // 等待物理文件系统写入完成
      await this.executeTasks([opfsTask]);
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

    if (options.syncToWebContainer) {
      (async () => {
        try {
          const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore')
          await useWebContainerStore.getState().syncFile(path, content)
        } catch (error) {
          console.warn('[SyncService] Background WebContainer update failed:', error)
        }
      })();
    }

    if (options.syncToOPFS) {
      const opfsTask = async () => {
        await ioService.writeFile(path, content)
      };
      await this.executeTasks([opfsTask]);
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

    if (options.syncToWebContainer) {
      (async () => {
        try {
          const { SYSTEM_PATHS } = await import('@/os/config/paths')
          
          // Skip WebContainer sync if path is outside /home/user (e.g., Trash)
          if (!path.startsWith(SYSTEM_PATHS.USER)) {
            console.log(`[SyncService] WebContainer delete skipped: path outside user home (${path})`)
            return
          }
          
          const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore')
          await useWebContainerStore.getState().syncUnlink(path)
        } catch (error) {
          console.warn('[SyncService] Background WebContainer deletion failed:', error)
        }
      })();
    }

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

    if (options.syncToWebContainer) {
      (async () => {
        try {
          const { useWebContainerStore } = await import('@/os/kernel/useWebContainerStore')
          const { instance, isSyncingFromWC } = useWebContainerStore.getState()
          if (!instance || isSyncingFromWC) return
          
          // Import SYSTEM_PATHS to convert VFS paths to WebContainer paths
          const { SYSTEM_PATHS } = await import('@/os/config/paths')
          
          // Skip WebContainer sync if either path is outside /home/user
          // (e.g., moving to/from Trash which is at /Trash)
          if (!oldPath.startsWith(SYSTEM_PATHS.USER) || !newPath.startsWith(SYSTEM_PATHS.USER)) {
            console.log(`[SyncService] WebContainer rename skipped: path outside user home (${oldPath} -> ${newPath})`)
            
            // If moving FROM user home TO trash, delete from WebContainer
            if (oldPath.startsWith(SYSTEM_PATHS.USER) && !newPath.startsWith(SYSTEM_PATHS.USER)) {
              const wcOldPath = oldPath.replace(SYSTEM_PATHS.USER, '') || '/'
              try {
                await instance.fs.rm(wcOldPath, { recursive: true })
                console.log(`[SyncService] WebContainer deleted (moved to trash): ${wcOldPath}`)
              } catch (error: any) {
                if (error?.code !== 'ENOENT') {
                  console.warn(`[SyncService] WebContainer delete failed:`, error)
                }
              }
            }
            return
          }
          
          // Convert VFS paths to WebContainer paths
          // VFS: /home/user/apps/file -> WC: /apps/file
          const wcOldPath = oldPath.replace(SYSTEM_PATHS.USER, '') || '/'
          const wcNewPath = newPath.replace(SYSTEM_PATHS.USER, '') || '/'
          
          // Check if source exists in WebContainer
          try {
            await instance.fs.readFile(wcOldPath)
            await instance.fs.rename(wcOldPath, wcNewPath)
            console.log(`[SyncService] WebContainer rename: ${wcOldPath} -> ${wcNewPath}`)
          } catch (error: any) {
            // If source doesn't exist, this might be a move of a file that was never synced
            // Just skip the operation silently
            if (error?.code === 'ENOENT') {
              console.log(`[SyncService] WebContainer rename skipped: source doesn't exist: ${wcOldPath}`)
            } else {
              throw error
            }
          }
        } catch (error) {
          console.warn('[SyncService] Background WebContainer rename failed:', error)
        }
      })();
    }

    if (options.syncToOPFS) {
      const opfsTask = async () => {
        const sourceExists = await fs.exists(oldPath)
        if (!sourceExists) {
          console.log(`[SyncService] syncRename: source not in OPFS, skipping: ${oldPath}`)
          return
        }
        
        // Ensure target directory exists
        const targetDir = newPath.substring(0, newPath.lastIndexOf('/'))
        if (targetDir && targetDir !== '/') {
          try {
            await ioService.mkdir(targetDir)
          } catch (error) {
            // Directory might already exist, ignore
          }
        }

        try {
          await ioService.rename(oldPath, newPath)
        } catch (error: any) {
          const msg = String(error?.message || '')
          const isNotFound = error?.code === 'ENOENT' || msg.includes('ENOENT') || msg.includes('no such file or directory')
          const isTrashMove =
            newPath === SYSTEM_PATHS.TRASH ||
            newPath.startsWith(`${SYSTEM_PATHS.TRASH}/`) ||
            newPath.includes('/Trash/')
          if (isNotFound && isTrashMove) {
            return
          }
          throw error
        }
      };
      await this.executeTasks([opfsTask]);
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
