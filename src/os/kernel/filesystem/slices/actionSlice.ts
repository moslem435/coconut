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
import { toast } from '@/os/components/Toast'

export interface ActionSlice {
  // 文件操作
  createItem: (
    parentId: string,
    name: string,
    type: FileType,
    content?: string | Uint8Array,
    appId?: string
  ) => Promise<string>

  deleteItem: (id: string) => Promise<void>
  renameItem: (id: string, newName: string) => void
  moveItem: (id: string, newParentId: string) => void
  updateFileContent: (id: string, content: string | Uint8Array) => void
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
  createItem: async (parentId, name, type, content, appId) => {
    const id = uuidv4()
    const newItem: FileNode = {
      id,
      parentId,
      name,
      type,
      appId,
      content: typeof content === 'string' ? content : undefined, // Only store string content in memory
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    // 1. 乐观更新状态
    get()._addFile(newItem)

    // 2. 发出事件（SyncMiddleware 监听并执行 IO）
    const path = get().resolvePath(id)

    // Use a Promise to track the sync operation if needed, but here we just emit
    // However, to satisfy the interface change to Promise, we wrap it.
    // In a real implementation, we might wait for syncService acknowledgment

    eventBus.emit('fs:file:created', {
      id,
      path,
      type,
      content // Pass original content (string or Uint8Array) to sync service
    } as any)

    return id
  },

  deleteItem: async (id) => {
    const node = get().files[id]
    if (!node) return

    // Protection: Check if system folder/file
    if (node.isSystem) {
      console.warn(`Cannot delete system item: ${node.name}`)
      toast.error(
        'Cannot Delete System Folder',
        `"${node.name}" is a system folder and cannot be deleted.`
      )
      eventBus.emit('sys:error', {
        source: 'filesystem',
        message: `Cannot delete system folder "${node.name}"`,
        severity: 'warning'
      })
      return
    }

    const path = get().resolvePath(id)
    const itemsToDelete = collectDescendants(id, get().childrenIndex)

    // Check if any descendant is a system item
    for (const descendantId of itemsToDelete) {
      const descendant = get().files[descendantId]
      if (descendant?.isSystem) {
        console.warn(`Cannot delete: contains system item ${descendant.name}`)
        toast.error(
          'Cannot Delete',
          `Folder contains system item "${descendant.name}".`
        )
        eventBus.emit('sys:error', {
          source: 'filesystem',
          message: `Cannot delete: folder contains system item "${descendant.name}"`,
          severity: 'warning'
        })
        return
      }
    }

    // 1. 乐观删除
    get()._deleteFiles(Array.from(itemsToDelete))

    // 2. 登记墓碑（防止物理删除延迟导致的扫描回吞）
    if (path) {
      get()._addTombstone(path)
    }

    // 3. 发出事件（SyncMiddleware 监听并执行 IO）
    eventBus.emit('fs:file:deleted', {
      id,
      path,
      itemsToDelete: Array.from(itemsToDelete)
    } as any)
  },

  renameItem: (id, newName) => {
    const node = get().files[id]
    if (!node) return

    // Protection: Check if system folder/file
    if (node.isSystem) {
      console.warn(`Cannot rename system item: ${node.name}`)
      toast.warning(
        'Cannot Rename',
        `"${node.name}" is a system folder and cannot be renamed.`
      )
      eventBus.emit('sys:error', {
        source: 'filesystem',
        message: `Cannot rename system folder "${node.name}"`,
        severity: 'warning'
      })
      return
    }

    // Protection: Check if read-only
    if (node.isReadOnly) {
      console.warn(`Cannot rename read-only item: ${node.name}`)
      toast.warning(
        'Read-Only',
        `"${node.name}" is read-only and cannot be renamed.`
      )
      eventBus.emit('sys:error', {
        source: 'filesystem',
        message: `Cannot rename read-only item "${node.name}"`,
        severity: 'warning'
      })
      return
    }

    const oldPath = get().resolvePath(id)

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
    } as any)
  },

  moveItem: (id, newParentId) => {
    const node = get().files[id]
    if (!node) return

    // Protection: Check if system folder/file
    if (node.isSystem) {
      console.warn(`Cannot move system item: ${node.name}`)
      toast.warning(
        'Cannot Move',
        `"${node.name}" is a system folder and cannot be moved.`
      )
      eventBus.emit('sys:error', {
        source: 'filesystem',
        message: `Cannot move system folder "${node.name}"`,
        severity: 'warning'
      })
      return
    }

    const oldPath = get().resolvePath(id)

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
    } as any)
  },

  updateFileContent: (id, content) => {
    const node = get().files[id]
    if (!node) return

    // Protection: Check if read-only
    if (node.isReadOnly) {
      console.warn(`Cannot modify read-only file: ${node.name}`)
      toast.warning(
        'Read-Only File',
        `"${node.name}" is read-only and cannot be modified.`
      )
      eventBus.emit('sys:error', {
        source: 'filesystem',
        message: `Cannot modify read-only file "${node.name}"`
      })
      return
    }

    // 1. 更新元数据和内容
    get()._updateFile(id, {
      updatedAt: Date.now(),
      content: typeof content === 'string' ? content : undefined // Only store string content in memory
    })

    // 2. 发出事件（SyncMiddleware 监听并执行 IO）
    const path = get().resolvePath(id)
    eventBus.emit('fs:file:updated', {
      id,
      path,
      content
    } as any)
  },

  patchNode: (id, updates) => {
    get()._updateFile(id, updates)
  },

  // 读取文件内容（委托给 syncService）
  readFileContent: async (id) => {
    // 1. Try to read from memory first (Optimistic)
    const node = get().files[id]
    if (node && node.content !== undefined) {
      return node.content
    }

    const path = get().resolvePath(id)
    if (!path) return ''

    try {
      const content = await syncService.readContent(path)

      // OPTIMIZATION & Fix: Cache the content back into memory for immediate subsequent reads
      // only if it's not a huge binary
      if (typeof content === 'string' && content.length > 0) {
        get()._updateFile(id, { content: content })
      }

      return content
    } catch (e) {
      console.warn(`Failed to read content for ${id}`, e)
      return ''
    }
  },

  // 获取文件 Blob（委托给 syncService）
  getFileBlob: async (id) => {
    // 1. Try to create Blob from memory content first
    const node = get().files[id]
    if (node && typeof node.content === 'string') {
      return new Blob([node.content], { type: 'application/octet-stream' })
    }

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
