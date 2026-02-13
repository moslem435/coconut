/**
 * FileSystem Worker - 大文件夹 Diffing 计算
 * 在 Worker 线程中执行，避免阻塞主线程
 */

import type { FileNode } from '../kernel/initialFileTree'

interface DiffRequest {
  type: 'COMPUTE_DIFF'
  id: string
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

interface DiffResponse {
  type: 'DIFF_RESULT'
  id: string
  patch: {
    toAdd: FileNode[]
    toRemove: string[]
    toUpdate: Array<{ id: string; updates: Partial<FileNode> }>
  }
}

interface ErrorResponse {
  type: 'ERROR'
  id: string
  error: string
}

/**
 * Worker 消息处理
 */
self.onmessage = async (event: MessageEvent<DiffRequest>) => {
  const { id, currentFiles, fsSnapshot, folderId, fullPath } = event.data
  
  try {
    // 构建映射表
    const currentMap = new Map(currentFiles.map(f => [f.name, f]))
    const fsMap = new Map(fsSnapshot.map(f => [f.name, f]))
    
    const patch: DiffResponse['patch'] = {
      toAdd: [],
      toRemove: [],
      toUpdate: []
    }
    
    // 1. 找出需要删除的（在 current 但不在 fs）
    for (const [name, file] of currentMap) {
      if (!fsMap.has(name)) {
        patch.toRemove.push(file.id)
      }
    }
    
    // 2. 找出需要添加和更新的
    for (const [name, fsEntry] of fsMap) {
      const existing = currentMap.get(name)
      
      if (!existing) {
        // 新文件 - 生成临时 ID（主线程会替换）
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
        // 文件已修改
        patch.toUpdate.push({
          id: existing.id,
          updates: {
            updatedAt: fsEntry.mtime,
            size: fsEntry.size
          }
        })
      }
    }
    
    const response: DiffResponse = {
      type: 'DIFF_RESULT',
      id,
      patch
    }
    
    self.postMessage(response)
  } catch (error: any) {
    const errorResponse: ErrorResponse = {
      type: 'ERROR',
      id,
      error: error.message || 'Unknown error'
    }
    self.postMessage(errorResponse)
  }
}

// 导出类型供客户端使用
export type { DiffRequest, DiffResponse, ErrorResponse }
