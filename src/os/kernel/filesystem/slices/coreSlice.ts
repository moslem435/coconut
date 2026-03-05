/**
 * CoreSlice - 文件系统核心状态层
 * 职责：纯状态管理，无副作用
 */

import type { StateCreator } from 'zustand'
import type { FileNode, FileType } from '../../initialFileTree'
import { INITIAL_FILES, INITIAL_ROOT_ID } from '../../initialFileTree'
import * as indexManager from '../utils/indexManager'
import type { ChildrenIndex } from '../utils/indexManager'
import { SYSTEM_PATHS, FILE_IDS } from '@/os/config/paths'

export interface CoreSlice {
  // 状态
  files: Record<string, FileNode>
  rootId: string
  isLoading: boolean
  childrenIndex: ChildrenIndex
  tombstoneEntries: Record<string, number> // path -> expiry timestamp

  // 纯状态更新方法（内部使用，前缀 _）
  _setFiles: (files: Record<string, FileNode>) => void
  _addFile: (file: FileNode) => void
  _updateFile: (id: string, updates: Partial<FileNode>) => void
  _deleteFiles: (ids: string[]) => void
  _addTombstone: (path: string, duration?: number) => void
  _setLoading: (loading: boolean) => void
  _rebuildIndex: () => void

  // 查询方法（无副作用）
  getItem: (id: string) => FileNode | undefined
  getChildren: (parentId: string) => FileNode[]
  getPath: (id: string) => FileNode[]
  resolvePath: (id: string) => string
  getNodeByPath: (path: string) => FileNode | undefined
}

export const createCoreSlice: StateCreator<CoreSlice> = (set, get) => ({
  // 初始状态
  files: INITIAL_FILES,
  rootId: INITIAL_ROOT_ID,
  isLoading: true,
  childrenIndex: indexManager.buildIndex(INITIAL_FILES),
  tombstoneEntries: {},

  // 纯状态更新方法
  _setFiles: (files) => set({
    files,
    childrenIndex: indexManager.buildIndex(files)
  }),

  _addFile: (file) => set((state) => ({
    files: { ...state.files, [file.id]: file },
    childrenIndex: indexManager.updateIndex(
      state.childrenIndex,
      { type: 'ADD', nodeId: file.id, parentId: file.parentId || state.rootId }
    )
  })),

  _updateFile: (id, updates) => set((state) => {
    const node = state.files[id]
    if (!node) return state

    return {
      files: {
        ...state.files,
        [id]: { ...node, ...updates, updatedAt: Date.now() }
      }
    }
  }),

  _deleteFiles: (ids) => set((state) => {
    const newFiles = { ...state.files }
    let newIndex = state.childrenIndex

    ids.forEach(id => {
      const node = newFiles[id]
      if (node?.parentId) {
        newIndex = indexManager.updateIndex(
          newIndex,
          { type: 'REMOVE', nodeId: id, parentId: node.parentId }
        )
      }
      delete newFiles[id]
      delete newIndex[id]
    })

    return { files: newFiles, childrenIndex: newIndex }
  }),

  _addTombstone: (path, duration = 15000) => set((state) => {
    const now = Date.now()
    const cleanedEntries: Record<string, number> = {}

    // Clean up expired entries while adding new one
    Object.entries(state.tombstoneEntries).forEach(([p, expiry]) => {
      if (expiry > now) {
        cleanedEntries[p] = expiry
      }
    })

    return {
      tombstoneEntries: {
        ...cleanedEntries,
        [path]: now + duration
      }
    }
  }),

  _setLoading: (loading) => set({ isLoading: loading }),

  _rebuildIndex: () => set((state) => ({
    childrenIndex: indexManager.buildIndex(state.files)
  })),

  // 查询方法
  getItem: (id) => get().files[id],

  getChildren: (parentId) => {
    const state = get()
    return indexManager.getChildrenFromIndex(
      state.files,
      state.childrenIndex,
      parentId
    )
  },

  getPath: (id) => {
    const files = get().files
    const path: FileNode[] = []
    let current = files[id]

    while (current) {
      path.unshift(current)
      if (!current.parentId) break
      current = files[current.parentId]
    }

    return path
  },

  resolvePath: (id: string) => {
    const state = get()
    const node = state.files[id]
    if (!node) return ''
    if (id === state.rootId) return SYSTEM_PATHS.ROOT

    // Build path from parent chain
    const pathNodes: FileNode[] = []
    let current: FileNode | undefined = node

    while (current) {
      pathNodes.unshift(current)
      if (!current.parentId || current.id === state.rootId) break
      current = state.files[current.parentId]
    }

    // If the path starts with a mount point (e.g. rom, virtual folders, or user mounts)
    // We need to handle them specially because they are not physical paths in OPFS
    // But wait, the previous logic was a bit confused.
    // Let's simplify:
    // 1. If it's a mount point root (isMount=true), we return its mount path
    // 2. If it's inside a mount point, we append the relative path

    // Find the mount point in the chain
    const mountIndex = pathNodes.findIndex(n => n.isMount)

    if (mountIndex !== -1) {
      const mountNode = pathNodes[mountIndex]
      const relativePath = pathNodes.slice(mountIndex + 1).map(n => n.name).join('/')

      if (mountNode.id === FILE_IDS.ROM) {
        return `${SYSTEM_PATHS.ROM}${relativePath ? '/' + relativePath : ''}`
      } else if (mountNode.id === FILE_IDS.VIRTUAL_ALL_PICTURES) {
        return `${SYSTEM_PATHS.VIRTUAL_ALL_PICTURES}${relativePath ? '/' + relativePath : ''}`
      } else {
        // User mounts or other virtual folders
        // Assuming user mounts are at /mnt/{id} (though currently we mount at root in UI?)
        // Wait, mountSlice mounts them at root in the file tree (parentId: 'root')
        // But physically they are handles.
        // If we want to represent them as paths, we can use /mnt/{id} or /{name}
        // In mountSlice: mountPath = fs.mount(handle) -> returns "/mnt/{uuid}"
        // So physically they are at /mnt/{uuid}.
        // But in VFS they are at /MountName.
        // resolvePath should return the PHYSICAL path for IO operations?
        // Yes, resolvePath is used by syncService/IO to talk to underlying FS.

        // If it is a user mount (isMount=true but not system/rom/virtual),
        // The ID IS the mount ID (uuid) from fs.mount() usually?
        // In mountSlice.mountLocalFolder: mountId = mountPath.split('/').pop()! (which is uuid)
        // So constructing /mnt/{id} is correct for physical access.
        return `/mnt/${mountNode.id}${relativePath ? '/' + relativePath : ''}`
      }
    }

    // Standard OPFS path (VFS mirrors OPFS structure for non-mounts)
    // pathNodes[0] is Root.
    // pathNodes[1...] are the segments.
    return '/' + pathNodes.slice(1).map(n => n.name).join('/')
  },

  getNodeByPath: (path: string) => {
    const state = get()
    if (!path || path === SYSTEM_PATHS.ROOT) return state.files[state.rootId]

    // Normalize path
    const normalizedPath = path.replace(/^\/+/, '')
    if (!normalizedPath) return state.files[state.rootId]

    const parts = normalizedPath.split('/')
    let currentId = state.rootId

    // Handle absolute paths that might start with system roots (like /rom, /mnt)
    // But here we are traversing VFS tree which matches path structure mostly.
    // Exception: /mnt/{uuid} in physical FS corresponds to a node in VFS with id={uuid} and name={HandleName}
    // But VFS tree structure is: Root -> [MountNode(id=uuid, name=HandleName)]
    // So if we ask for /mnt/uuid/file, we might not find it by name "mnt".
    // We need to map path prefixes to VFS roots if they diverge.

    // However, getNodeByPath is usually used for VFS navigation (cd, ls).
    // If the user types "cd /rom", we look for "rom" under root.
    // If the user types "cd /home/user", we look for "home" then "user".
    // This seems correct for the standard tree.

    for (const part of parts) {
      const children = state.getChildren(currentId)
      const found = children.find(c => c.name === part)
      if (found) {
        currentId = found.id
      } else {
        return undefined
      }
    }
    return state.files[currentId]
  }
})
