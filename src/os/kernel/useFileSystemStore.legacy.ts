import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { FileType, FileNode, INITIAL_FILES, INITIAL_ROOT_ID } from './initialFileTree'
import { syncService } from '@/os/services/FileSystemSyncService'
import { fs } from './filesystem/FileSystemClient'
import { logger } from '@/os/utils/logger'

export type { FileType, FileNode } from './initialFileTree'
export { INITIAL_FILES, INITIAL_ROOT_ID } from './initialFileTree'

export interface FileSystemState {
  files: Record<string, FileNode>
  rootId: string
  isLoading: boolean
  childrenIndex: Record<string, Set<string>> // 父子关系索引

  // Helpers
  resolvePath: (id: string) => string
  getNodeByPath: (path: string) => FileNode | undefined

  // Actions
  createItem: (parentId: string, name: string, type: FileType, content?: string, appId?: string) => Promise<string>
  deleteItem: (id: string) => Promise<void>
  renameItem: (id: string, newName: string) => Promise<void>
  getItem: (id: string) => FileNode | undefined
  getChildren: (parentId: string) => FileNode[]
  getPath: (id: string) => FileNode[]

  // Content Access
  readFileContent: (id: string) => Promise<string>
  updateFileContent: (id: string, content: string) => Promise<void>
  moveItem: (id: string, newParentId: string) => Promise<void>

  // Generic Update
  patchNode: (id: string, updates: Partial<FileNode>) => void

  // Sync
  initialize: () => Promise<void>

  // Mount Operations
  mountLocalFolder: () => Promise<void>
  loadFolderContent: (folderId: string) => Promise<void>
  checkMountPermissions: () => Promise<void>
}

// Initial File System moved to ./initialFileTree

// 构建初始索引
const buildChildrenIndex = (files: Record<string, FileNode>): Record<string, Set<string>> => {
  const index: Record<string, Set<string>> = {}
  Object.values(files).forEach(node => {
    if (node && node.parentId) {
      if (!index[node.parentId]) {
        index[node.parentId] = new Set()
      }
      index[node.parentId]!.add(node.id)
    }
  })
  return index
}

export const useFileSystemStore = create<FileSystemState>()(
  persist(
    (set, get) => ({
      files: INITIAL_FILES,
      rootId: INITIAL_ROOT_ID,
      isLoading: true,
      childrenIndex: buildChildrenIndex(INITIAL_FILES),

      resolvePath: (id: string) => {
        const state = get()
        const node = state.files[id]
        if (!node) return ''
        if (id === state.rootId) return '/'

        const pathNodes = state.getPath(id)

        // Check if path contains a mount point
        const mountIndex = pathNodes.findIndex(n => n.isMount)
        if (mountIndex !== -1) {
          const mountNode = pathNodes[mountIndex]
          if (mountNode) {
            const relativePath = pathNodes.slice(mountIndex + 1).map(n => n.name).join('/')
            return `/mnt/${mountNode.id}${relativePath ? '/' + relativePath : ''}`
          }
        }

        return '/' + pathNodes.slice(1).map(n => n.name).join('/')
      },

      getNodeByPath: (path: string) => {
        const state = get()
        if (!path || path === '/') return state.files[state.rootId]

        // Remove leading slash and split
        const parts = path.replace(/^\/+/, '').split('/')
        let currentId = state.rootId

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
      },
      // --- Mount Operations ---
      // @deprecated 建议使用 useMountFolder Hook 代替
      mountLocalFolder: async () => {
        try {
          // @ts-ignore - showDirectoryPicker missing in TS
          const handle = await window.showDirectoryPicker()

          // 1. Mount in FS Client
          const mountPath = fs.mount(handle)
          const mountId = mountPath.split('/').pop()!

          // 2. Persist Handle
          const { NativeDriver } = await import('@/os/kernel/filesystem/NativeDriver')
          await NativeDriver.persistMount(mountId, handle)

          // 3. Add to Store State
          const mountNode: FileNode = {
            id: mountId,
            parentId: 'root',
            name: handle.name,
            type: 'folder',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            icon: 'hard-drive',
            isMount: true
          }

          set(state => {
            const newFiles = { ...state.files }
            newFiles[mountId] = mountNode
            return { files: newFiles }
          })

        } catch (error: any) {
          if (error.name !== 'AbortError') {
            logger.error('Failed to mount folder:', error)
          }
        }
      },

      initialize: async () => {
        try {
          const { NativeDriver } = await import('@/os/kernel/filesystem/NativeDriver')
          const mounts = await NativeDriver.restoreMounts()

          // Mount each restored handle
          mounts.forEach((handle, id) => {
            fs.mount(handle, id)

            // Add to State
            const newNode: FileNode = {
              id: id,
              parentId: 'root',
              name: handle.name,
              type: 'folder',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              icon: 'hard-drive',
              isMount: true
            }

            set(state => {
              if (state.files[id]) return state // Already exists
              
              const newIndex = { ...state.childrenIndex }
              if (!newIndex['root']) {
                newIndex['root'] = new Set()
              }
              newIndex['root'].add(id)
              
              return {
                files: { ...state.files, [id]: newNode },
                childrenIndex: newIndex
              }
            })

            // Check permissions after restore (async)
            get().checkMountPermissions()
          })

          // Ensure System Shortcuts exist (for updates)
          set(state => {
            const newFiles = { ...state.files }
            const newIndex = { ...state.childrenIndex }
            let hasChanges = false

            Object.entries(INITIAL_FILES).forEach(([id, node]) => {
              // Add all desktop items and shortcuts if they don't exist
              if ((id.startsWith('shortcut-') || node.parentId === 'desktop') && !newFiles[id]) {
                newFiles[id] = node
                
                // 更新索引
                if (node && node.parentId) {
                  if (!newIndex[node.parentId]) {
                    newIndex[node.parentId] = new Set()
                  }
                  newIndex[node.parentId]!.add(id)
                }
                
                hasChanges = true
              }
            })

            if (!hasChanges) return state
            return { 
              files: newFiles, 
              childrenIndex: newIndex,
              isLoading: false 
            }
          })

        } catch (e) {
          logger.error('Failed to restore mounts:', e)
        } finally {
          // 确保 isLoading 被设置为 false
          set({ isLoading: false })
        }
      },

      createItem: async (parentId, name, type, content, appId) => {
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

        // 乐观更新 UI（包括索引）
        set((state) => {
          const newIndex = { ...state.childrenIndex }
          const parentIndex = newIndex[parentId]
          if (parentIndex) {
            parentIndex.add(id)
          } else {
            newIndex[parentId] = new Set([id])
          }
          
          return {
            files: { ...state.files, [id]: newItem },
            childrenIndex: newIndex
          }
        })

        const fullPath = get().resolvePath(id)
        
        // 使用 SyncService 同步
        try {
          await syncService.syncCreate(fullPath, type, content)
        } catch (error) {
          // 回滚（包括索引）
          set((state) => {
            const { [id]: removed, ...remaining } = state.files
            const newIndex = { ...state.childrenIndex }
            const parentIndex = newIndex[parentId]
            if (parentIndex) {
              parentIndex.delete(id)
            }
            return { 
              files: remaining,
              childrenIndex: newIndex
            }
          })
          logger.error('Failed to create item:', error)
          throw error
        }

        return id
      },

      deleteItem: async (id) => {
        const path = get().resolvePath(id)
        const itemsToDelete = new Set<string>()

        // 收集所有要删除的项（使用索引）
        const collectItems = (itemId: string) => {
          itemsToDelete.add(itemId)
          const childIds = get().childrenIndex[itemId]
          if (childIds && childIds.size > 0) {
            childIds.forEach(childId => collectItems(childId))
          }
        }
        collectItems(id)

        // 备份以便回滚
        const backup = { 
          files: { ...get().files },
          childrenIndex: { ...get().childrenIndex }
        }

        // 乐观删除（包括索引）
        set((state) => {
          const newFiles = { ...state.files }
          const newIndex = { ...state.childrenIndex }
          
          itemsToDelete.forEach(itemId => {
            const item = newFiles[itemId]
            if (item?.parentId) {
              const parentIndex = newIndex[item.parentId]
              if (parentIndex) {
                parentIndex.delete(itemId)
              }
            }
            delete newFiles[itemId]
            delete newIndex[itemId]
          })
          
          return { 
            files: newFiles,
            childrenIndex: newIndex
          }
        })

        // 使用 SyncService 同步
        try {
          await syncService.syncDelete(path)
        } catch (error) {
          // 回滚
          set(backup)
          logger.error('Failed to delete item:', error)
          throw error
        }
      },

      renameItem: async (id, newName) => {
        const oldPath = get().resolvePath(id)
        const node = get().files[id]
        if (!node) return
        const oldName = node.name

        // 乐观更新
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...node, name: newName, updatedAt: Date.now() }
          }
        }))

        const newPath = get().resolvePath(id)

        // 使用 SyncService 同步
        try {
          await syncService.syncRename(oldPath, newPath)
        } catch (error) {
          // 回滚
          set((state) => ({
            files: {
              ...state.files,
              [id]: { ...node, name: oldName }
            }
          }))
          logger.error('Failed to rename item:', error)
          throw error
        }
      },

      getItem: (id) => get().files[id],

      getChildren: (parentId) => {
        const state = get()
        const childIds = state.childrenIndex[parentId]
        if (!childIds) return []
        return Array.from(childIds)
          .map(id => state.files[id])
          .filter((node): node is FileNode => node !== undefined)
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

      readFileContent: async (id: string) => {
        const path = get().resolvePath(id)
        if (!path) return ''
        
        try {
          return await syncService.readContent(path)
        } catch (e) {
          logger.warn(`Failed to read content for ${id}`, e)
          return ''
        }
      },

      // Load children for a folder (especially mounted ones)
      loadFolderContent: async (folderId: string) => {
        const folder = get().files[folderId]
        if (!folder || folder.type !== 'folder') return

        // Only process mounted folders (or folders inside mounts)
        const state = get()
        const fullPath = state.resolvePath(folderId)
        logger.debug(`[loadFolderContent] Loading content for ${folderId}, path: ${fullPath}`)
        if (!fullPath || !fullPath.startsWith('/mnt/')) {
          logger.debug(`[loadFolderContent] Skipping non-mount path: ${fullPath}`)
          return
        }

        try {
          // Only set loading if empty? Or always? Let's avoid flicker if populated.
          if (state.getChildren(folderId).length === 0) {
            set({ isLoading: true })
          }

          logger.debug(`[loadFolderContent] Calling syncService.readDirectory(${fullPath})`)
          const childrenNames = await syncService.readDirectory(fullPath)
          logger.debug(`[loadFolderContent] readDirectory returned:`, childrenNames)

          // Check current children in state
          const currentChildren = Object.values(get().files).filter(f => f.parentId === folderId)
          const currentChildrenMap = new Map(currentChildren.map(c => [c.name, c]))
          const fsNamesSet = new Set(childrenNames)

          const newFiles = { ...get().files }
          let hasChanges = false

          // 1. Identify Phantom Files (In State but not in FS)
          for (const child of currentChildren) {
            if (!fsNamesSet.has(child.name)) {
              logger.debug(`[loadFolderContent] Removing phantom file: ${child.name} (${child.id})`)
              delete newFiles[child.id]
              hasChanges = true
            }
          }

          // 2. Add New Files & 3. Update Existing Metadata
          // Optimization: Run stat checks in parallel
          const statPromises = childrenNames.map(async (name) => {
            const childPath = fullPath.endsWith('/') ? `${fullPath}${name}` : `${fullPath}/${name}`
            try {
              const stats = await syncService.getStats(childPath)
              return { name, stats, childPath }
            } catch (e) {
              logger.warn(`Failed to stat ${childPath}`, e)
              return null
            }
          })

          const results = await Promise.all(statPromises)

          for (const res of results) {
            if (!res || !res.stats) continue
            const { name, stats } = res
            const existingNode = currentChildrenMap.get(name)

            if (existingNode) {
              // Update existing if changed
              if (existingNode.updatedAt !== stats.mtime) {
                newFiles[existingNode.id] = {
                  ...existingNode,
                  updatedAt: stats.mtime,
                  size: stats.size
                }
                hasChanges = true
              }
            } else {
              // Create new node
              const childId = uuidv4()
              newFiles[childId] = {
                id: childId,
                parentId: folderId,
                name,
                type: stats.isDirectory ? 'folder' : 'file',
                createdAt: stats.ctime,
                updatedAt: stats.mtime,
                size: stats.size,
                isMount: false
              }
              hasChanges = true
            }
          }

          if (hasChanges) {
            logger.debug(`[loadFolderContent] Updating state with changes`)
            set({ files: newFiles })
          } else {
            logger.debug(`[loadFolderContent] No changes detected`)
          }
        } catch (e) {
          logger.error("Failed to load folder content:", e)
        } finally {
          set({ isLoading: false })
        }
      },

      updateFileContent: async (id, content) => {
        const node = get().files[id]
        if (!node) return

        // 更新元数据
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...node, updatedAt: Date.now() }
          }
        }))

        const path = get().resolvePath(id)

        // 使用 SyncService 同步
        if (path) {
          await syncService.syncUpdate(path, content)
        }
      },

      moveItem: async (id, newParentId) => {
        const oldPath = get().resolvePath(id)
        const node = get().files[id]
        if (!node) return
        const oldParentId = node.parentId

        // 乐观更新
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...node, parentId: newParentId, updatedAt: Date.now() }
          }
        }))

        const newPath = get().resolvePath(id)

        // 使用 SyncService 同步
        try {
          await syncService.syncRename(oldPath, newPath)
        } catch (error) {
          // 回滚
          set((state) => ({
            files: {
              ...state.files,
              [id]: { ...node, parentId: oldParentId }
            }
          }))
          logger.error('Failed to move item:', error)
          throw error
        }
      },



      patchNode: (id, updates) => {
        const node = get().files[id]
        if (!node) return

        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...node, ...updates, updatedAt: Date.now() }
          }
        }))
      },

      checkMountPermissions: async () => {
        const state = get()
        const mounts = Object.values(state.files).filter(f => f.isMount)

        for (const mount of mounts) {
          const path = state.resolvePath(mount.id)
          try {
            // We use verifyPermission which calls queryPermission (non-blocking)
            const hasPerm = await fs.verifyPermission(path)

            // Only update if status changed
            if (mount.needsPermission === hasPerm) {
              const mountNode = get().files[mount.id]
              if (mountNode) {
                set(s => ({
                  files: {
                    ...s.files,
                    [mount.id]: { ...mountNode, needsPermission: !hasPerm }
                  }
                }))
              }
            }
          } catch (e) {
            logger.warn('Failed to check permission for mount:', mount.id)
          }
        }
      }
    }),
    {
      name: 'filesystem-storage',
      skipHydration: true, // Handle hydration manually if needed, or rely on persist
    }
  )
)
