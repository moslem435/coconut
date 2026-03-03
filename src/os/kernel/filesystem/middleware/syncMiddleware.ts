/**
 * SyncMiddleware - 文件系统同步中间件
 * 职责：监听操作事件，执行 IO 同步，失败自动回滚
 */

import { eventBus } from '../../EventBus'
import { syncService } from '@/os/services/FileSystemSyncService'
import type { FileSystemStore } from '../../useFileSystemStore'

interface SyncOperation {
  id: string
  type: 'create' | 'delete' | 'rename' | 'move' | 'update'
  payload: any
  timestamp: number
  retries: number
}

interface SyncMiddlewareConfig {
  maxRetries: number
  retryDelay: number
  queueSize: number
}

const DEFAULT_CONFIG: SyncMiddlewareConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  queueSize: 100
}

/**
 * 创建同步中间件
 */
export function createSyncMiddleware(
  storeGetter: () => FileSystemStore,
  config: Partial<SyncMiddlewareConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const operationQueue: SyncOperation[] = []
  const inFlightOps = new Map<string, SyncOperation>()

  // Serial Queue to prevent race conditions
  let syncChain = Promise.resolve()

  const queueOperation = (op: SyncOperation) => {
    syncChain = syncChain
      .then(() => executeOperation(op))
      .catch(err => {
        console.error(`[SyncMiddleware] Op ${op.type}:${op.id} failed:`, err)
      })
  }

  // 监听文件系统操作事件
  eventBus.on('fs:file:created', (data: any) => {
    // console.log('[SyncMiddleware] Received create event:', data)
    const operation: SyncOperation = {
      id: data.id,
      type: 'create',
      payload: data,
      timestamp: Date.now(),
      retries: 0
    }
    
    // Execute immediately in the chain
    syncChain = syncChain
      .then(() => executeOperation(operation))
      .catch(err => {
        console.error(`[SyncMiddleware] Op ${operation.type}:${operation.id} failed:`, err)
      })
  })

  eventBus.on('fs:file:deleted', (data: any) => {
    const operation: SyncOperation = {
      id: data.id,
      type: 'delete',
      payload: data,
      timestamp: Date.now(),
      retries: 0
    }
    queueOperation(operation)
  })

  eventBus.on('fs:file:renamed', (data: any) => {
    const operation: SyncOperation = {
      id: data.id,
      type: 'rename',
      payload: data,
      timestamp: Date.now(),
      retries: 0
    }
    queueOperation(operation)
  })

  eventBus.on('fs:file:moved', (data: any) => {
    const operation: SyncOperation = {
      id: data.id,
      type: 'move',
      payload: data,
      timestamp: Date.now(),
      retries: 0
    }
    queueOperation(operation)
  })

  eventBus.on('fs:file:updated', (data: any) => {
    const operation: SyncOperation = {
      id: data.id,
      type: 'update',
      payload: data,
      timestamp: Date.now(),
      retries: 0
    }
    queueOperation(operation)
  })

  /**
   * 执行同步操作
   */
  async function executeOperation(operation: SyncOperation) {
    try {
      inFlightOps.set(operation.id, operation)

      switch (operation.type) {
        case 'create':
          // console.log('[SyncMiddleware] Executing syncCreate:', operation.payload.path)
          await syncService.syncCreate(
            operation.payload.path,
            operation.payload.type,
            operation.payload.content
          )
          break

        case 'delete':
          await syncService.syncDelete(operation.payload.path)
          break

        case 'rename':
        case 'move':
          await syncService.syncRename(
            operation.payload.oldPath,
            operation.payload.newPath
          )
          break

        case 'update':
          await syncService.syncUpdate(
            operation.payload.path,
            operation.payload.content
          )
          break
      }

      inFlightOps.delete(operation.id)
      // console.log(`[SyncMiddleware] Operation ${operation.type} succeeded for ${operation.id}`)

    } catch (error) {
      console.error(`[SyncMiddleware] Operation ${operation.type} failed:`, error)

      // 重试逻辑
      if (operation.retries < finalConfig.maxRetries) {
        operation.retries++
        const delay = finalConfig.retryDelay * Math.pow(2, operation.retries - 1)

        console.log(`[SyncMiddleware] Retrying operation ${operation.type} in ${delay}ms (attempt ${operation.retries}/${finalConfig.maxRetries})`)

        setTimeout(() => {
          executeOperation(operation)
        }, delay)
      } else {
        // 达到最大重试次数，回滚
        console.warn(`[SyncMiddleware] Max retries reached for ${operation.type}, rolling back`)
        rollbackOperation(operation)
        inFlightOps.delete(operation.id)
      }
    }
  }

  /**
   * 回滚操作
   */
  function rollbackOperation(operation: SyncOperation) {
    const store = storeGetter()

    switch (operation.type) {
      case 'create':
        // 删除创建的文件
        store._deleteFiles([operation.payload.id])
        console.log(`[SyncMiddleware] Rolled back create: deleted ${operation.payload.id}`)
        break

      case 'delete':
        // 删除操作失败，文件可能已经不存在，无需回滚
        console.log(`[SyncMiddleware] Delete operation failed, no rollback needed`)
        break

      case 'rename':
      case 'move':
        // 恢复操作已在 ActionSlice 中处理
        console.log(`[SyncMiddleware] Rename/move rollback handled by ActionSlice`)
        break

      case 'update':
        // 更新失败，元数据已更新但内容未同步
        console.log(`[SyncMiddleware] Update operation failed, metadata may be inconsistent`)
        break
    }
  }

  /**
   * 获取队列状态
   */
  function getQueueStatus() {
    return {
      queueSize: operationQueue.length,
      inFlightCount: inFlightOps.size,
      operations: Array.from(inFlightOps.values())
    }
  }

  return {
    getQueueStatus,
  }
}
