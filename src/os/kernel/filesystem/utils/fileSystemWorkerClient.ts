/**
 * FileSystem Worker Client - Worker 通信封装
 */

import type { FileNode } from '../../initialFileTree'

interface DiffRequest {
  currentFiles: FileNode[]
  fsSnapshot: Array<{
    name: string
    isDirectory: boolean
    mtime: number
    size?: number
  }>
  folderId: string
  fullPath: string
}

interface DiffPatch {
  toAdd: FileNode[]
  toRemove: string[]
  toUpdate: Array<{ id: string; updates: Partial<FileNode> }>
}

/**
 * FileSystem Worker 客户端
 */
class FileSystemWorkerClient {
  private worker: Worker | null = null
  private pendingRequests = new Map<string, {
    resolve: (value: DiffPatch) => void
    reject: (error: Error) => void
  }>()
  private isInitialized = false
  
  /**
   * 初始化 Worker
   */
  private initWorker() {
    if (this.isInitialized) return
    
    try {
      // 使用统一的 Worker
      this.worker = new Worker(
        new URL('../worker/fs.worker.ts', import.meta.url),
        { type: 'module' }
      )
      
      this.worker.onmessage = (event) => {
        const { type, id, result, error } = event.data
        const pending = this.pendingRequests.get(id)
        
        if (pending) {
          if (error) {
            pending.reject(new Error(error))
          } else if (type === 'computeDiff') {
            pending.resolve(result)
          }
          this.pendingRequests.delete(id)
        }
      }
      
      this.worker.onerror = (error) => {
        console.error('[FileSystemWorker] Worker error:', error)
        // 拒绝所有待处理的请求
        this.pendingRequests.forEach(({ reject }) => {
          reject(new Error('Worker error'))
        })
        this.pendingRequests.clear()
      }
      
      this.isInitialized = true
    } catch (error) {
      console.error('[FileSystemWorker] Failed to initialize worker:', error)
      this.isInitialized = false
    }
  }
  
  /**
   * 计算文件夹 Diff
   */
  async computeDiff(request: DiffRequest): Promise<DiffPatch> {
    // 懒加载 Worker
    if (!this.isInitialized) {
      this.initWorker()
    }
    
    // 如果 Worker 初始化失败，回退到同步计算
    if (!this.worker) {
      return this.computeDiffSync(request)
    }
    
    const id = `diff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })
      
      this.worker!.postMessage({
        type: 'computeDiff',
        id,
        ...request
      })
      
      // 超时处理（5秒）
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('Worker timeout'))
        }
      }, 5000)
    })
  }
  
  /**
   * 同步计算 Diff（回退方案）
   */
  private computeDiffSync(request: DiffRequest): DiffPatch {
    const { currentFiles, fsSnapshot, folderId } = request
    
    const currentMap = new Map(currentFiles.map(f => [f.name, f]))
    const fsMap = new Map(fsSnapshot.map(f => [f.name, f]))
    
    const patch: DiffPatch = {
      toAdd: [],
      toRemove: [],
      toUpdate: []
    }
    
    // 找出需要删除的
    for (const [name, file] of currentMap) {
      if (!fsMap.has(name)) {
        patch.toRemove.push(file.id)
      }
    }
    
    // 找出需要添加和更新的
    for (const [name, fsEntry] of fsMap) {
      const existing = currentMap.get(name)
      
      if (!existing) {
        patch.toAdd.push({
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          parentId: folderId,
          name,
          type: fsEntry.isDirectory ? 'folder' : 'file',
          createdAt: Date.now(),
          updatedAt: fsEntry.mtime,
          size: fsEntry.size,
          isMount: false
        })
      } else if (existing.updatedAt !== fsEntry.mtime || existing.size !== fsEntry.size) {
        patch.toUpdate.push({
          id: existing.id,
          updates: {
            updatedAt: fsEntry.mtime,
            size: fsEntry.size
          }
        })
      }
    }
    
    return patch
  }
  
  /**
   * 终止 Worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.isInitialized = false
    }
    this.pendingRequests.clear()
  }
}

// 单例导出
export const fileSystemWorker = new FileSystemWorkerClient()
