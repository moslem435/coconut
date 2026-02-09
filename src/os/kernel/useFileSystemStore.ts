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
  'shortcut-gallery': {
    id: 'shortcut-gallery',
    parentId: 'desktop',
    name: 'Gallery',
    type: 'file',
    appId: 'photo-gallery',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-resume': {
    id: 'shortcut-resume',
    parentId: 'desktop',
    name: 'Resume',
    type: 'file',
    appId: 'resume',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  'shortcut-contact': {
    id: 'shortcut-contact',
    parentId: 'desktop',
    name: 'Contact Me',
    type: 'file',
    appId: 'contact',
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
