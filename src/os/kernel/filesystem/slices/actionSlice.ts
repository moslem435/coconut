/**
 * ActionSlice - 文件系统业务操作层
 * 职责：协调状态更新，触发副作用事件
 */

import type { StateCreator } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { CoreSlice } from './coreSlice'
import type { FileNode, FileType } from '../../initialFileTree'
import { eventBus } from '../../EventBus'
import { collectDescendants } from '../utils/indexManager'
import { syncService } from '@/os/services/FileSystemSyncService'

export interface ActionSlice {
  // 文件操作
  createItem: (
    parentId: string,
    name: string,
    type: FileType,
    content?: string,
    appId?: string
  ) => string
  
  deleteItem: (id: string) => void
  renameItem: (id: string, newName: string) => void
  moveItem: (id: string, newParentId: string) => void
  updateFileContent: (id: string, content: string) => void
  patchNode: (id: string, updates: Partial<FileNode>) => void
  
  // 内容访问
  readFileContent: (id: string) => Promise<string>
  getFileBlob: (id: string) => Promise<Blob | null>
}

export const createActionSlice: StateCreator<
  CoreSlice & ActionSlice,
  [],
  [],
  ActionSlice
> = (set, get) => ({
  createItem: (parentId, name, type, content, appId) => {
    const id = uuidv4()
    const newItem: FileNode = {
      id,
      parentId,
      name,
      type,
      appId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    // 1. 乐观更新状态
    get()._addFile(newItem)
    
    // 2. 发出事件（SyncMiddleware 监听并执行 IO）
    const path = get().resolvePath(id)
    eventBus.emit('fs:file:created', {
      id,
      path,
      type,
      content
    })
    
    return id
  },
  
  deleteItem: (id) => {
    const path = get().resolvePath(id)
    const itemsToDelete = collectDescendants(id, get().childrenIndex)
    
    // 1. 乐观删除
    get()._deleteFiles(Array.from(itemsToDelete))
    
    // 2. 发出事件（SyncMiddleware 监听并执行 IO）
    eventBus.emit('fs:file:deleted', {
      id,
      path,
      itemsToDelete: Array.from(itemsToDelete)
    })
  },
  
  renameItem: (id, newName) => {
    const oldPath = get().resolvePath(id)
    const node = get().files[id]
    if (!node) return
    
    // 1. 乐观更新
    get()._updateFile(id, { name: newName })
    
    // 2. 发出事件（SyncMiddleware 监听并执行 IO）
    const newPath = get().resolvePath(id)
    eventBus.emit('fs:file:renamed', {
      id,
      oldPath,
      newPath,
      oldName: node.name,
      newName
    })
  },
  
  moveItem: (id, newParentId) => {
    const oldPath = get().resolvePath(id)
    const node = get().files[id]
    if (!node) return
    
    // 1. 乐观更新
    const newFiles = { ...get().files }
    newFiles[id] = { ...node, parentId: newParentId, updatedAt: Date.now() }
    get()._setFiles(newFiles)
    
    // 2. 发出事件（SyncMiddleware 监听并执行 IO）
    const newPath = get().resolvePath(id)
    eventBus.emit('fs:file:moved', {
      id,
      oldPath,
      newPath,
      oldParentId: node.parentId,
      newParentId
    })
  },
  
  updateFileContent: (id, content) => {
    const node = get().files[id]
    if (!node) return
    
    // 1. 更新元数据
    get()._updateFile(id, { updatedAt: Date.now() })
    
    // 2. 发出事件（SyncMiddleware 监听并执行 IO）
    const path = get().resolvePath(id)
    eventBus.emit('fs:file:updated', {
      id,
      path,
      content
    })
  },
  
  patchNode: (id, updates) => {
    get()._updateFile(id, updates)
  },
  
  // 读取文件内容（委托给 syncService）
  readFileContent: async (id) => {
    const path = get().resolvePath(id)
    if (!path) return ''
    
    try {
      return await syncService.readContent(path)
    } catch (e) {
      console.warn(`Failed to read content for ${id}`, e)
      return ''
    }
  },

  // 获取文件 Blob（委托给 syncService）
  getFileBlob: async (id) => {
    const path = get().resolvePath(id)
    if (!path) return null
    
    try {
      return await syncService.getFileBlob(path)
    } catch (e) {
      console.warn(`Failed to get blob for ${id}`, e)
      return null
    }
  }
})
