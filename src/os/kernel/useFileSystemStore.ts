import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

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
}

interface FileSystemState {
  files: Record<string, FileNode>
  rootId: string
  
  // Actions
  createItem: (parentId: string, name: string, type: FileType, content?: string, appId?: string) => string
  deleteItem: (id: string) => void // Hard delete
  renameItem: (id: string, newName: string) => void
  getItem: (id: string) => FileNode | undefined
  getChildren: (parentId: string) => FileNode[]
  getPath: (id: string) => FileNode[]
  
  // New Actions
  updateFileContent: (id: string, content: string) => void
  moveItem: (id: string, newParentId: string) => void
  trashItems: (ids: string[]) => void
  restoreItems: (ids: string[]) => void
  emptyTrash: () => void
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
  'shortcut-calculator': {
    id: 'shortcut-calculator',
    parentId: 'desktop',
    name: 'Calculator',
    type: 'file',
    appId: 'calculator',
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

      createItem: (parentId, name, type, content, appId) => {
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
        
        set((state) => ({
          files: { ...state.files, [id]: newItem }
        }))
        
        return id
      },

      deleteItem: (id) => {
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
      },

      renameItem: (id, newName) => {
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], name: newName, updatedAt: Date.now() }
          }
        }))
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

      updateFileContent: (id, content) => {
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], content, updatedAt: Date.now() }
          }
        }))
      },

      moveItem: (id, newParentId) => {
        set((state) => ({
          files: {
            ...state.files,
            [id]: { ...state.files[id], parentId: newParentId, updatedAt: Date.now() }
          }
        }))
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
      }
    }),
    {
      name: 'filesystem-storage',
      skipHydration: true, // Handle hydration manually if needed, or rely on persist
    }
  )
)
