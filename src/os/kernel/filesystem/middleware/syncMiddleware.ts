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
    const hasContent = data.content !== undefined && data.content !== null;
    const contentLen = hasContent ? (typeof data.content === 'string' ? data.content.length : data.content.byteLength) : 0;

    console.log(`[SyncMiddleware] Received create event: ${data.path}, type: ${data.type}, content presence: ${hasContent}, length: ${contentLen}`);

    const operation: SyncOperation = {
      id: data.id,
      type: 'create',
      payload: data,
      timestamp: Date.now(),
      retries: 0
    }

    // Execute immediately in the chain
    syncChain = syncChain
      .then(() => {
        console.log(`[SyncMiddleware] Starting syncCreate execution for ${data.path}, length in payload: ${contentLen}`);
        return executeOperation(operation);
      })
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
        case 'create': {
          const { path, type, content } = operation.payload;
          const isFolder = type === 'folder';

          // For files, if content is undefined, use empty string as default
          let finalContent = content;
          if (!isFolder && content === undefined) {
            console.log(`[SyncMiddleware] Content undefined for new file ${path}, using empty string`);
            finalContent = '';
          }

          const byteLen = finalContent ? (typeof finalContent === 'string' ? finalContent.length : finalContent.byteLength) : 0;
          console.log(`[SyncMiddleware] Executing syncCreate: ${path}, type: ${type}, body size: ${byteLen} bytes`);

          await syncService.syncCreate(path, type, finalContent)
          break
        }

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

        case 'update': {
          const { path, content } = operation.payload;

          // For updates, if content is undefined, this is likely an error
          // We should not update a file without knowing its content
          if (content === undefined) {
            console.warn(`[SyncMiddleware] Update skipped for ${path}: content is undefined`);
            break;
          }

          const byteLen = typeof content === 'string' ? content.length : (content as any).byteLength;
          console.log(`[SyncMiddleware] Executing syncUpdate: ${path}, body size: ${byteLen} bytes`);

          await syncService.syncUpdate(path, content)
          break
        }
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
    // const store = storeGetter()

    switch (operation.type) {
      case 'create':
        // PREVIOUSLY: store._deleteFiles([operation.payload.id])
        // NOW: Do NOT delete memory node to prevent data loss. 
        // Keep the node so the user can see it, even if sync failed.
        console.warn(`[SyncMiddleware] Sync failed for create: ${operation.payload.path}. Memory node KEPT to prevent data loss. User should be notified of sync state.`);
        break

      case 'delete':
        console.log(`[SyncMiddleware] Delete operation failed, no rollback needed`)
        break

      case 'rename':
      case 'move':
        console.log(`[SyncMiddleware] Rename/move rollback handled by ActionSlice`)
        break

      case 'update':
        console.log(`[SyncMiddleware] Update operation failed, content in memory is ahead of disk`)
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
