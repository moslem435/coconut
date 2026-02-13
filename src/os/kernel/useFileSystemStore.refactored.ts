import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { FileType, FileNode, INITIAL_FILES, INITIAL_ROOT_ID } from './initialFileTree'
import { syncService } from '@/os/services/FileSystemSyncService'
import { ioService } from '@/os/services/FileSystemIOService'

export type { FileType, FileNode } from './initialFileTree'
export { INITIAL_FILES, INITIAL_ROOT_ID } from './initialFileTree'

export interface FileSystemState {
  files: Record<string, FileNode>
  rootId: string
  isLoading: boolean

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
  syncToOPFS: () => Promise<void>
  initialize: () => Promise<void>

  // Mount Operations
  mountLocalFolder: () => Promise<void>
  loadFolderContent: (folderId: string) => Promise<void>
  checkMountPermissions: () => Promise<void>
}

export const useFileSystemStore = create<FileSystemState>()(
  persist(
    (set, get) => ({
      files: INITIAL_FILES,
      rootId: INITIAL_ROOT_ID,
      isLoading: true,

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
          const relativePath = pathNodes.slice(mountIndex + 1).map(n => n.name).join('/')
          return `/mnt/${mountNode.id}${relativePath ? '/' + relativePath : ''}`
        }

        return '/' + pathNodes.slice(1).map(n => n.name).join('/')
      },

      getNodeByPath: (path: string) => {
        const state = get()
        if (!path || path === '/') return state.files[state.rootId]

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

      mountLocalFolder: async () => {
        try {
          const handle = await window.showDirectoryPicker()

          // 使用 IOService 挂载
          const { fs } = await import('@/os/kernel/filesystem/FileSystemClient')
          const mountPath = fs.mount(handle)
          const mountId = mountPath.split('/').pop()!

          // 持久化句柄
          const { NativeDriver } = await import('@/os/kernel/filesystem/NativeDriver')
          await NativeDriver.persistMount(mountId, handle)

          // 更新状态
          const mountNode: FileNode = {
            id: mountId,
            parentId: 'root',
            name: handle.name,
            type: 'folder',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            appId: undefined,
            icon: 'hard-drive',
            isMount: true
          }

          set(state => ({
            files: { ...state.files, [mountId]: mountNode }
          }))

        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('Failed to mount folder:', error)
          }
        }
      },

      initialize: async () => {
        try {
          const { NativeDriver } = await import('@/os/kernel/filesystem/NativeDriver')
          const { fs } = await import('@/os/kernel/filesystem/FileSystemClient')
          const mounts = await NativeDriver.restoreMounts()

          mounts.forEach((handle, id) => {
            fs.mount(handle, id)

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
              if (state.files[id]) return state
              return {
                files: { ...state.files, [id]: newNode }
              }
            })

            get().checkMountPermissions()
          })

          // 确保系统快捷方式存在
          set(state => {
            const newFiles = { ...state.files }
            let hasChanges = false

            Object.entries(INITIAL_FILES).forEach(([id, node]) => {
              if (id.startsWith('shortcut-') && !newFiles[id]) {
                newFiles[id] = node
                hasChanges = true
              }
            })

            if (!hasChanges) return state
            return { files: newFiles }
          })

        } catch (e) {
          console.error('Failed to restore mounts:', e)
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

        // 1. 乐观更新 UI
        set((state) => ({
          files: { ...state.files, [id]: newItem }
        }))

        // 2. 使用 SyncService 同步
        const fullPath = get().resolvePath(id)
        try {
          await syncService.syncCreate(fullPath, type, content)
        } catch (error) {
          // 回滚
          set((state) => {
            const { [id]: removed, ...remaining } = state.files
            return { files: remaining }
          })
          throw error
        }

        return id
      },

      deleteItem: async (id) => {
        const path = get().resolvePath(id)
        const itemsToDelete = new Set<string>()

        // 收集所有要删除的项
        const collectItems = (itemId: string) => {
          itemsToDelete.add(itemId)
          const children = Object.values(get().files).filter(f => f.parentId === itemId)
          children.forEach(child => collectItems(child.id))
        }
        collectItems(id)

        // 备份以便回滚
        const backup = { ...get().files }

        // 乐观删除
        set((state) => {
          const newFiles = { ...state.files }
          itemsToDelete.forEach(itemId => delete newFiles[itemId])
          return { files: newFiles }
        })

        // 使用 SyncService 同步
        try {
          await syncService.syncDelete(path)
        } catch (error) {
          // 回滚
          set({ files: backup })
          throw error
        }
      },

      renameItem: async (id, newName) => {
        const oldPath = get().resolvePath(id)
        const oldName = get().files[id]?.name

        // 乐观更新
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], name: newName, updatedAt: Date.now() }
          }
        }))

        const newPath = get().resolvePath(id)

        // 使用 SyncService 同步
        try {
          await syncService.syncRename(oldPath, newPath)
        } catch (error) {
          // 回滚
          if (oldName) {
            set((state) => ({
              files: {
                ...state.files,
                [id]: { ...state.files[id], name: oldName }
              }
            }))
          }
          throw error
        }
      },

      getItem: (id) => get().files[id],

      getChildren: (parentId) => {
        return Object.values(get().files).filter(f => f.parentId === parentId)
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
          console.warn(`Failed to read content for ${id}`, e)
          return ''
        }
      },

      loadFolderContent: async (folderId: string) => {
        const folder = get().files[folderId]
        if (!folder || folder.type !== 'folder') return

        const state = get()
        const fullPath = state.resolvePath(folderId)
        
        if (!fullPath || !fullPath.startsWith('/mnt/')) {
          return
        }

        try {
          if (state.getChildren(folderId).length === 0) {
            set({ isLoading: true })
          }

          // 使用 SyncService 读取目录
          const childrenNames = await syncService.readDirectory(fullPath)

          const currentChildren = Object.values(get().files).filter(f => f.parentId === folderId)
          const currentChildrenMap = new Map(currentChildren.map(c => [c.name, c]))
          const fsNamesSet = new Set(childrenNames)

          const newFiles = { ...get().files }
          let hasChanges = false

          // 移除幽灵文件
          for (const child of currentChildren) {
            if (!fsNamesSet.has(child.name)) {
              delete newFiles[child.id]
              hasChanges = true
            }
          }

          // 并行获取文件信息
          const statPromises = childrenNames.map(async (name) => {
            const childPath = fullPath.endsWith('/') ? `${fullPath}${name}` : `${fullPath}/${name}`
            try {
              const stats = await syncService.getStats(childPath)
              return { name, stats, childPath }
            } catch (e) {
              console.warn(`Failed to stat ${childPath}`, e)
              return null
            }
          })

          const results = await Promise.all(statPromises)

          for (const res of results) {
            if (!res || !res.stats) continue
            const { name, stats } = res
            const existingNode = currentChildrenMap.get(name)

            if (existingNode) {
              if (existingNode.updatedAt !== stats.mtime) {
                newFiles[existingNode.id] = {
                  ...existingNode,
                  updatedAt: stats.mtime,
                  size: stats.size
                }
                hasChanges = true
              }
            } else {
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
            set({ files: newFiles })
          }
        } catch (e) {
          console.error("Failed to load folder content:", e)
        } finally {
          set({ isLoading: false })
        }
      },

      updateFileContent: async (id, content) => {
        // 更新元数据
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], updatedAt: Date.now() }
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
        const oldParentId = get().files[id]?.parentId

        // 乐观更新
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], parentId: newParentId, updatedAt: Date.now() }
          }
        }))

        const newPath = get().resolvePath(id)

        // 使用 SyncService 同步
        try {
          await syncService.syncRename(oldPath, newPath)
        } catch (error) {
          // 回滚
          if (oldParentId) {
            set((state) => ({
              files: {
                ...state.files,
                [id]: { ...state.files[id], parentId: oldParentId }
              }
            }))
          }
          throw error
        }
      },

      patchNode: (id, updates) => {
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], ...updates, updatedAt: Date.now() }
          }
        }))
      },

      syncToOPFS: async () => {
        // 已废弃，使用 SyncService
        console.warn('syncToOPFS is deprecated, use SyncService directly')
      },

      checkMountPermissions: async () => {
        const state = get()
        const mounts = Object.values(state.files).filter(f => f.isMount)
        const { fs } = await import('@/os/kernel/filesystem/FileSystemClient')

        for (const mount of mounts) {
          const path = state.resolvePath(mount.id)
          try {
            const hasPerm = await fs.verifyPermission(path)

            if (mount.needsPermission === hasPerm) {
              set(s => ({
                files: {
                  ...s.files,
                  [mount.id]: { ...s.files[mount.id], needsPermission: !hasPerm }
                }
              }))
            }
          } catch (e) {
            console.warn('Failed to check permission for mount:', mount.id)
          }
        }
      }
    }),
    {
      name: 'filesystem-storage',
      skipHydration: true,
    }
  )
)
