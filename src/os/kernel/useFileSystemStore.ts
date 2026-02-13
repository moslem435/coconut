import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { FileType, FileNode, INITIAL_FILES, INITIAL_ROOT_ID } from './initialFileTree'
import { syncService } from './syncService'

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
  deleteItem: (id: string) => Promise<void> // Hard delete
  renameItem: (id: string, newName: string) => Promise<void>
  getItem: (id: string) => FileNode | undefined
  getChildren: (parentId: string) => FileNode[]
  getPath: (id: string) => FileNode[]

  // Content Access (New)
  readFileContent: (id: string) => Promise<string>

  // New Actions
  updateFileContent: (id: string, content: string) => Promise<void>
  moveItem: (id: string, newParentId: string) => Promise<void>

  // Generic Update (for derived stores)
  patchNode: (id: string, updates: Partial<FileNode>) => void

  // Deprecated (Moved to independent stores)
  // trashItems: (ids: string[]) => void
  // restoreItems: (ids: string[]) => void
  // emptyTrash: () => void

  // Sync
  syncToOPFS: () => Promise<void>
  initialize: () => Promise<void>

  // Clipboard (Moved to useClipboardStore)
  // clipboard: { items: string[], op: 'copy' | 'cut' | null }
  // setClipboard: (items: string[], op: 'copy' | 'cut') => void
  // pasteItems: (targetFolderId: string) => Promise<void>

  // New Actions
  mountLocalFolder: () => Promise<void>
  loadFolderContent: (folderId: string) => Promise<void>
  checkMountPermissions: () => Promise<void>
}

// Initial File System moved to ./initialFileTree

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
            // content removed
            createdAt: Date.now(),
            updatedAt: Date.now(),
            appId: undefined,
            // Mark as external mount for UI differentiation
            icon: 'hard-drive',
            isMount: true
          }

          set(state => {
            const newFiles = { ...state.files }
            // Add mount node
            newFiles[mountId] = mountNode
            // No need to update parent 'children' array as we use a flat list with parentId pointers
            return { files: newFiles }
          })

        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('Failed to mount folder:', error)
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
              return {
                files: { ...state.files, [id]: newNode }
              }
            })

            // Check permissions after restore (async)
            get().checkMountPermissions()
          })

          // Ensure System Shortcuts exist (for updates)
          set(state => {
            const newFiles = { ...state.files }
            let hasChanges = false

            Object.entries(INITIAL_FILES).forEach(([id, node]) => {
              // Check if shortcut exists, if not add it
              // We also check if it's a shortcut to avoid overwriting user files
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
          // content removed
          appId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        // 1. Optimistic UI Update
        set((state) => ({
          files: { ...state.files, [id]: newItem }
        }))

        const fullPath = get().resolvePath(id)

        // 2. Write to OPFS
        try {
          if (type === 'folder') {
            await fs.mkdir(fullPath)
          } else {
            await fs.writeFile(fullPath, content || '')
          }
        } catch (error) {
          console.error('Failed to sync createItem to OPFS:', error)
        }

        // 3. Sync to WebContainer (Optimized)
        import('@/os/kernel/useWebContainerStore').then(({ useWebContainerStore }) => {
          if (type === 'folder') {
            useWebContainerStore.getState().syncMkdir(fullPath)
          } else {
            useWebContainerStore.getState().syncFile(fullPath, content || '')
          }
        })

        return id
      },

      deleteItem: async (id) => {
        const path = get().resolvePath(id)

        set((state) => {
          const newFiles = { ...state.files }

          // Recursive delete helper
          const deleteRecursive = (itemId: string) => {
            // Find children
            const children = Object.values(newFiles).filter(f => f.parentId === itemId)
            children.forEach(child => deleteRecursive(child.id))
            delete newFiles[itemId]
          }

          deleteRecursive(id)
          return { files: newFiles }
        })

        // OPFS Delete
        try {
          if (path && path !== '/') {
            await fs.unlink(path, true)
          }
        } catch (e) {
          console.error('OPFS Delete Failed', e)
        }

        // Sync to WebContainer
        import('@/os/kernel/useWebContainerStore').then(({ useWebContainerStore }) => {
          useWebContainerStore.getState().syncUnlink(path)
        })
      },

      renameItem: async (id, newName) => {
        const oldPath = get().resolvePath(id)

        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], name: newName, updatedAt: Date.now() }
          }
        }))

        // OPFS Rename
        const newPath = get().resolvePath(id)

        try {
          if (oldPath && newPath) {
            await fs.rename(oldPath, newPath)
          }
        } catch (e) {
          console.error('OPFS Rename Failed', e)
        }

        // WebContainer Sync
        // WC does not have simple rename? It has fs.rename.
        // We need to implement syncRename in store.
        // For now, let's implement a simple move (rename is move)
        // Or just let full sync handle it? No, we disabled full sync.
        import('@/os/kernel/useWebContainerStore').then(({ useWebContainerStore }) => {
          const { instance, isSyncingFromWC } = useWebContainerStore.getState()
          if (!instance || isSyncingFromWC) return

          const wcOld = `/home/guest${oldPath}`
          const wcNew = `/home/guest${newPath}`

          instance.fs.rename(wcOld, wcNew).catch(e => console.warn('WC rename failed', e))
        })
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
          const buffer = await fs.readFile(path)
          return new TextDecoder().decode(buffer)
        } catch (e) {
          console.warn(`Failed to read content for ${id}`, e)
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
        console.log(`[loadFolderContent] Loading content for ${folderId}, path: ${fullPath}`)
        if (!fullPath || !fullPath.startsWith('/mnt/')) {
          console.log(`[loadFolderContent] Skipping non-mount path: ${fullPath}`)
          return
        }

        try {
          // Only set loading if empty? Or always? Let's avoid flicker if populated.
          if (state.getChildren(folderId).length === 0) {
            set({ isLoading: true })
          }

          console.log(`[loadFolderContent] Calling fs.readdir(${fullPath})`)
          const childrenNames = await fs.readdir(fullPath)
          console.log(`[loadFolderContent] fs.readdir returned:`, childrenNames)

          // Check current children in state
          const currentChildren = Object.values(get().files).filter(f => f.parentId === folderId)
          const currentChildrenMap = new Map(currentChildren.map(c => [c.name, c]))
          const fsNamesSet = new Set(childrenNames)

          const newFiles = { ...get().files }
          let hasChanges = false

          // 1. Identify Phantom Files (In State but not in FS)
          for (const child of currentChildren) {
            if (!fsNamesSet.has(child.name)) {
              console.log(`[loadFolderContent] Removing phantom file: ${child.name} (${child.id})`)
              delete newFiles[child.id]
              hasChanges = true
            }
          }

          // 2. Add New Files & 3. Update Existing Metadata
          // Optimization: Run stat checks in parallel
          const statPromises = childrenNames.map(async (name) => {
            const childPath = fullPath.endsWith('/') ? `${fullPath}${name}` : `${fullPath}/${name}`
            try {
              const stats = await fs.stat(childPath)
              return { name, stats, childPath }
            } catch (e) {
              console.warn(`Failed to stat ${childPath}`, e)
              return null
            }
          })

          const results = await Promise.all(statPromises)

          for (const res of results) {
            if (!res) continue
            const { name, stats, childPath } = res
            const existingNode = currentChildrenMap.get(name)

            if (existingNode) {
              // Update existing if changed
              if (existingNode.updatedAt !== stats.mtime) {
                // ...
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
                // content removed
                isMount: false
              }
              hasChanges = true
            }
          }

          if (hasChanges) {
            console.log(`[loadFolderContent] Updating state with changes`)
            set({ files: newFiles })
          } else {
            console.log(`[loadFolderContent] No changes detected`)
          }
        } catch (e) {
          console.error("Failed to load folder content:", e)
        } finally {
          set({ isLoading: false })
        }
      },

      updateFileContent: async (id, content) => {
        // 1. Memory - Just update metadata if needed (e.g. updatedAt), NOT content
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], updatedAt: Date.now() } // Content removed
          }
        }))

        const path = get().resolvePath(id)

        // 2. OPFS
        if (path) {
          await fs.writeFile(path, content)
        }

        // 3. WebContainer
        import('@/os/kernel/useWebContainerStore').then(({ useWebContainerStore }) => {
          useWebContainerStore.getState().syncFile(path, content)
        })
      },

      moveItem: async (id, newParentId) => {
        const oldPath = get().resolvePath(id)

        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], parentId: newParentId, updatedAt: Date.now() }
          }
        }))

        const newPath = get().resolvePath(id)

        if (oldPath && newPath) {
          await fs.rename(oldPath, newPath)
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
        await syncService.syncToOPFS(get(), set)
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
      skipHydration: true, // Handle hydration manually if needed, or rely on persist
    }
  )
)
