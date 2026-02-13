import { create } from 'zustand'
import { fileContentCache } from '@/os/services/FileContentCache'

interface FileMetadata {
  isDirty: boolean
  savedContent: string
  lastModified: number
}

interface EditorStateV2 {
  // 打开的文件
  openFiles: string[]
  activeFileId: string | null
  
  // 文件元数据（不存储内容）
  fileMetadata: Record<string, FileMetadata>
  
  // 操作方法
  openFile: (fileId: string, initialContent: string) => void
  closeFile: (fileId: string) => void
  setActiveFile: (fileId: string) => void
  updateContent: (fileId: string, content: string) => void
  saveFile: (fileId: string) => void
  
  // 查询方法
  getFileContent: (fileId: string) => string | undefined
  isDirty: (fileId: string) => boolean
  getDirtyFiles: () => string[]
  
  // 光标位置
  cursorPosition: { ln: number, col: number }
  setCursorPosition: (ln: number, col: number) => void
}

export const useEditorStateV2 = create<EditorStateV2>((set, get) => ({
  openFiles: [],
  activeFileId: null,
  fileMetadata: {},
  cursorPosition: { ln: 1, col: 1 },

  openFile: (fileId, initialContent) => set((state) => {
    if (state.openFiles.includes(fileId)) {
      return { activeFileId: fileId }
    }
    
    // 缓存内容到 LRU cache
    fileContentCache.set(fileId, initialContent)
    
    return {
      openFiles: [...state.openFiles, fileId],
      activeFileId: fileId,
      fileMetadata: {
        ...state.fileMetadata,
        [fileId]: {
          isDirty: false,
          savedContent: initialContent,
          lastModified: Date.now()
        }
      }
    }
  }),

  closeFile: (fileId) => set((state) => {
    const newOpenFiles = state.openFiles.filter(id => id !== fileId)
    const { [fileId]: removed, ...remainingMetadata } = state.fileMetadata
    
    // 从缓存中移除
    fileContentCache.delete(fileId)
    
    let newActiveId = state.activeFileId
    if (state.activeFileId === fileId) {
      newActiveId = newOpenFiles.length > 0 
        ? newOpenFiles[newOpenFiles.length - 1] 
        : null
    }
    
    return {
      openFiles: newOpenFiles,
      activeFileId: newActiveId,
      fileMetadata: remainingMetadata
    }
  }),

  setActiveFile: (fileId) => set({ activeFileId: fileId }),

  updateContent: (fileId, content) => set((state) => {
    const existing = state.fileMetadata[fileId]
    if (!existing) return state
    
    // 更新缓存
    fileContentCache.set(fileId, content)
    
    return {
      fileMetadata: {
        ...state.fileMetadata,
        [fileId]: {
          ...existing,
          isDirty: content !== existing.savedContent,
          lastModified: Date.now()
        }
      }
    }
  }),

  saveFile: (fileId) => set((state) => {
    const existing = state.fileMetadata[fileId]
    const content = fileContentCache.get(fileId)
    if (!existing || !content) return state
    
    return {
      fileMetadata: {
        ...state.fileMetadata,
        [fileId]: {
          ...existing,
          isDirty: false,
          savedContent: content
        }
      }
    }
  }),

  getFileContent: (fileId) => fileContentCache.get(fileId),
  
  isDirty: (fileId) => get().fileMetadata[fileId]?.isDirty ?? false,
  
  getDirtyFiles: () => {
    const { fileMetadata } = get()
    return Object.keys(fileMetadata).filter(id => fileMetadata[id]?.isDirty)
  },

  setCursorPosition: (ln, col) => set({ cursorPosition: { ln, col } })
}))
