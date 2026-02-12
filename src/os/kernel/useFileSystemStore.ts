import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'

export type FileType = 'file' | 'folder'

export interface FileNode {
  id: string
  parentId: string | null
  name: string
  type: FileType
  content?: string
  appId?: string // For shortcuts
  createdAt: number
  updatedAt: number
  originalParentId?: string | null // For trash restoration
  icon?: string // Custom icon (e.g. for mounted drives)
  isMount?: boolean
  needsPermission?: boolean
  size?: number
}

interface FileSystemState {
  files: Record<string, FileNode>
  rootId: string
  isLoading: boolean

  // Helpers
  resolvePath: (id: string) => string

  // Actions
  createItem: (parentId: string, name: string, type: FileType, content?: string, appId?: string) => Promise<string>
  deleteItem: (id: string) => Promise<void> // Hard delete
  renameItem: (id: string, newName: string) => Promise<void>
  getItem: (id: string) => FileNode | undefined
  getChildren: (parentId: string) => FileNode[]
  getPath: (id: string) => FileNode[]

  // New Actions
  updateFileContent: (id: string, content: string) => Promise<void>
  moveItem: (id: string, newParentId: string) => Promise<void>
  trashItems: (ids: string[]) => void
  restoreItems: (ids: string[]) => void
  emptyTrash: () => void

  // Sync
  syncToOPFS: () => Promise<void>
  initialize: () => Promise<void>

  // Clipboard
  clipboard: { items: string[], op: 'copy' | 'cut' | null }
  setClipboard: (items: string[], op: 'copy' | 'cut') => void
  pasteItems: (targetFolderId: string) => Promise<void>

  // New Actions
  mountLocalFolder: () => Promise<void>
  loadFolderContent: (folderId: string) => Promise<void>
  checkMountPermissions: () => Promise<void>
}

// Initial File System
const INITIAL_ROOT_ID = 'root'
const INITIAL_FILES: Record<string, FileNode> = {
  [INITIAL_ROOT_ID]: {
    id: INITIAL_ROOT_ID,
    parentId: null,
    name: 'Root',
    type: 'folder',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'trash': {
    id: 'trash',
    parentId: INITIAL_ROOT_ID,
    name: 'Trash',
    type: 'folder',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'desktop': {
    id: 'desktop',
    parentId: INITIAL_ROOT_ID,
    name: 'Desktop',
    type: 'folder',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'documents': {
    id: 'documents',
    parentId: INITIAL_ROOT_ID,
    name: 'Documents',
    type: 'folder',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'pictures': {
    id: 'pictures',
    parentId: INITIAL_ROOT_ID,
    name: 'Pictures',
    type: 'folder',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'downloads': {
    id: 'downloads',
    parentId: INITIAL_ROOT_ID,
    name: 'Downloads',
    type: 'folder',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  // Shortcuts
  'shortcut-portfolio': {
    id: 'shortcut-portfolio',
    parentId: 'desktop',
    name: 'Portfolio Hub',
    type: 'file',
    appId: 'portfolio-hub',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-settings': {
    id: 'shortcut-settings',
    parentId: 'desktop',
    name: 'Settings',
    type: 'file',
    appId: 'settings',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-files': {
    id: 'shortcut-files',
    parentId: 'desktop',
    name: 'File Explorer',
    type: 'file',
    appId: 'file-explorer',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-browser': {
    id: 'shortcut-browser',
    parentId: 'desktop',
    name: 'Browser',
    type: 'file',
    appId: 'browser',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-terminal': {
    id: 'shortcut-terminal',
    parentId: 'desktop',
    name: 'Terminal',
    type: 'file',
    appId: 'terminal',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-notepad': {
    id: 'shortcut-notepad',
    parentId: 'desktop',
    name: 'Notepad',
    type: 'file',
    appId: 'notepad',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-recycle-bin': {
    id: 'shortcut-recycle-bin',
    parentId: 'desktop',
    name: 'Recycle Bin',
    type: 'file',
    appId: 'recycle-bin',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-gallery': {
    id: 'shortcut-gallery',
    parentId: 'desktop',
    name: 'Gallery',
    type: 'file',
    appId: 'photo-gallery',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-music': {
    id: 'shortcut-music',
    parentId: 'desktop',
    name: 'Music Player',
    type: 'file',
    appId: 'music-player',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-vscode': {
    id: 'shortcut-vscode',
    parentId: 'desktop',
    name: 'VS Code',
    type: 'file',
    appId: 'vscode-lite',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-taskmanager': {
    id: 'shortcut-taskmanager',
    parentId: 'desktop',
    name: 'Task Manager',
    type: 'file',
    appId: 'task-manager',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-weather': {
    id: 'shortcut-weather',
    parentId: 'desktop',
    name: 'Weather',
    type: 'file',
    appId: 'weather',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  // Sample Folders
  'music': {
    id: 'music',
    parentId: INITIAL_ROOT_ID,
    name: 'Music',
    type: 'folder',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'code': {
    id: 'code',
    parentId: INITIAL_ROOT_ID,
    name: 'Code',
    type: 'folder',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  // Sample Code Files
  'code-1': {
    id: 'code-1',
    parentId: 'code',
    name: 'hello_world.ts',
    type: 'file',
    content: `// Hello World in TypeScript
function sayHello(name: string): void {
    console.log("Hello, " + name + "!");
}

const user = "Developer";
sayHello(user);

// TODO: Implement more features
interface Config {
    debug: boolean;
    version: number;
}
`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'code-2': {
    id: 'code-2',
    parentId: 'code',
    name: 'component.tsx',
    type: 'file',
    content: `import React, { useState } from 'react';

export const Counter = () => {
    const [count, setCount] = useState(0);

    return (
        <div className="p-4 border rounded">
            <h1>Count: {count}</h1>
            <button onClick={() => setCount(c => c + 1)}>
                Increment
            </button>
        </div>
    );
};
`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  // Sample Images
  'img-1': {
    id: 'img-1',
    parentId: 'pictures',
    name: 'Abstract_01.jpg',
    type: 'file',
    content: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'img-2': {
    id: 'img-2',
    parentId: 'pictures',
    name: 'Cyber_City.jpg',
    type: 'file',
    content: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'img-3': {
    id: 'img-3',
    parentId: 'pictures',
    name: 'Workspace.jpg',
    type: 'file',
    content: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  // Sample Files
  'welcome-txt': {
    id: 'welcome-txt',
    parentId: 'desktop',
    name: 'Welcome.txt',
    type: 'file',
    content: 'Welcome to Portfolio OS! This is a simulated file system.',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'about-md': {
    id: 'about-md',
    parentId: 'documents',
    name: 'About.md',
    type: 'file',
    content: '# About Me\n\nI am a full-stack developer...',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
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
            content: undefined,
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
          content,
          appId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        // 1. Optimistic UI Update
        set((state) => ({
          files: { ...state.files, [id]: newItem }
        }))

        // 2. Write to OPFS
        try {
          const fullPath = get().resolvePath(id)
          if (type === 'folder') {
            await fs.mkdir(fullPath)
          } else {
            await fs.writeFile(fullPath, content || '')
          }
        } catch (error) {
          console.error('Failed to sync createItem to OPFS:', error)
        }

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
          for (const name of childrenNames) {
            const childPath = fullPath.endsWith('/') ? `${fullPath}${name}` : `${fullPath}/${name}`
            const existingNode = currentChildrenMap.get(name)

            try {
              const stats = await fs.stat(childPath)

              if (existingNode) {
                // Update existing if changed (simple mtime check)
                if (existingNode.updatedAt !== stats.mtime) {
                  console.log(`[loadFolderContent] Updating metadata for: ${name}`)
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
                console.log(`[loadFolderContent] Found new item: ${name}, Path: ${childPath}`)
                newFiles[childId] = {
                  id: childId,
                  parentId: folderId,
                  name,
                  type: stats.isDirectory ? 'folder' : 'file',
                  createdAt: stats.ctime,
                  updatedAt: stats.mtime,
                  size: stats.size,
                  content: undefined,
                  // Mark children of mounts as inside a mount too (optional, but helpful for logic)
                  isMount: false // It's inside a mount, but not a mount point itself
                }
                hasChanges = true
              }

            } catch (err) {
              console.warn(`Failed to stat child ${childPath}`, err)
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
        // 1. Memory
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], content, updatedAt: Date.now() }
          }
        }))

        // 2. OPFS
        const path = get().resolvePath(id)
        if (path) {
          await fs.writeFile(path, content)
        }
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

      trashItems: (ids) => {
        set((state) => {
          const newFiles = { ...state.files }
          ids.forEach(id => {
            if (newFiles[id]) {
              newFiles[id] = {
                ...newFiles[id],
                parentId: 'trash',
                originalParentId: newFiles[id].parentId,
                updatedAt: Date.now()
              }
            }
          })
          return { files: newFiles }
        })
      },

      restoreItems: (ids) => {
        set((state) => {
          const newFiles = { ...state.files }
          ids.forEach(id => {
            if (newFiles[id]) {
              const originalParent = newFiles[id].originalParentId || 'desktop'
              // Check if original parent still exists, if not, move to desktop
              const targetParent = newFiles[originalParent] ? originalParent : 'desktop'

              newFiles[id] = {
                ...newFiles[id],
                parentId: targetParent,
                originalParentId: null,
                updatedAt: Date.now()
              }
            }
          })
          return { files: newFiles }
        })
      },

      emptyTrash: () => {
        set((state) => {
          const newFiles = { ...state.files }
          // Find all items in trash
          const trashItems = Object.values(newFiles).filter(f => f.parentId === 'trash')

          // Helper for recursive delete
          const deleteRecursive = (itemId: string) => {
            const children = Object.values(newFiles).filter(f => f.parentId === itemId)
            children.forEach(child => deleteRecursive(child.id))
            delete newFiles[itemId]
          }

          trashItems.forEach(item => deleteRecursive(item.id))
          return { files: newFiles }
        })
      },

      syncToOPFS: async () => {
        set({ isLoading: true })
        const state = get()
        const files = Object.values(state.files)

        console.log('Starting VFS -> OPFS Sync...')

        // Sort files to ensure folders are created before files
        const sortedFiles = files.sort((a, b) => {
          if (a.type === 'folder' && b.type !== 'folder') return -1
          if (a.type !== 'folder' && b.type === 'folder') return 1
          return 0
        })

        for (const node of sortedFiles) {
          if (node.id === 'root' || node.id === 'trash') continue;

          const path = state.resolvePath(node.id)
          if (!path) continue

          // Skip mounted paths - they are already persisted on the native FS
          // and we don't want to overwrite them with potentially empty content
          if (path.startsWith('/mnt/')) continue

          try {
            if (node.type === 'folder') {
              await fs.mkdir(path, true)
            } else {
              // Ensure parent directory exists for file
              const parentPath = path.substring(0, path.lastIndexOf('/'))
              if (parentPath && parentPath !== '/') {
                await fs.mkdir(parentPath, true)
              }

              await fs.writeFile(path, node.content || '')
            }
          } catch (err) {
            console.warn(`Sync failed for ${path}`, err)
          }
        }
        console.log('VFS -> OPFS Sync Complete')
        set({ isLoading: false })
      },

      // Clipboard Implementation
      clipboard: { items: [], op: null },
      setClipboard: (items, op) => set({ clipboard: { items, op } }),

      pasteItems: async (targetFolderId) => {
        const { clipboard, files, createItem, moveItem } = get()
        if (!clipboard.op || clipboard.items.length === 0) return

        const targetFolder = files[targetFolderId]
        if (!targetFolder || targetFolder.type !== 'folder') return

        for (const itemId of clipboard.items) {
          const item = files[itemId]
          if (!item) continue

          // Check for name collision and generate new name if needed
          let newName = item.name
          let counter = 1
          while (Object.values(files).some(f =>
            f.parentId === targetFolderId && f.name === newName && f.id !== itemId
          )) {
            const nameParts = item.name.split('.')
            if (nameParts.length > 1) {
              const ext = nameParts.pop()
              newName = `${nameParts.join('.')} (${counter}).${ext}`
            } else {
              newName = `${item.name} (${counter})`
            }
            counter++
          }

          if (clipboard.op === 'cut') {
            // For cut, we just move and rename if needed
            if (newName !== item.name) {
              await get().renameItem(itemId, newName)
            }
            await moveItem(itemId, targetFolderId)
          } else {
            // For copy, we create a new item
            // Note: Deep copy for folders is not implemented yet, simpler for files
            // For now, we only support copying files or empty folders
            await createItem(
              targetFolderId,
              newName,
              item.type,
              item.content,
              item.appId
            )
          }
        }

        // Clear clipboard after cut
        if (clipboard.op === 'cut') {
          set({ clipboard: { items: [], op: null } })
        }
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
