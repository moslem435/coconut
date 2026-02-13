import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FileContent {
  content: string
  isDirty: boolean
  savedContent: string
  lastModified: number
}

interface EditorStateV2 {
  // 打开的文件
  openFiles: string[]
  activeFileId: string | null
  
  // 文件内容缓存
  fileContents: Record<string, FileContent>
  
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

export const useEditorStateV2 = create<EditorStateV2>()(
  persist(
    (set, get) => ({
      openFiles: [],
      activeFileId: null,
      fileContents: {},
      cursorPosition: { ln: 1, col: 1 },

      openFile: (fileId, initialContent) => set((state) => {
        if (state.openFiles.includes(fileId)) {
          return { activeFileId: fileId }
        }
        
        return {
          openFiles: [...state.openFiles, fileId],
          activeFileId: fileId,
          fileContents: {
            ...state.fileContents,
            [fileId]: {
              content: initialContent,
              isDirty: false,
              savedContent: initialContent,
              lastModified: Date.now()
            }
          }
        }
      }),

      closeFile: (fileId) => set((state) => {
        const newOpenFiles = state.openFiles.filter(id => id !== fileId)
        const { [fileId]: removed, ...remainingContents } = state.fileContents
        
        let newActiveId = state.activeFileId
        if (state.activeFileId === fileId) {
          newActiveId = newOpenFiles.length > 0 
            ? newOpenFiles[newOpenFiles.length - 1] 
            : null
        }
        
        return {
          openFiles: newOpenFiles,
          activeFileId: newActiveId,
          fileContents: remainingContents
        }
      }),

      setActiveFile: (fileId) => set({ activeFileId: fileId }),

      updateContent: (fileId, content) => set((state) => {
        const existing = state.fileContents[fileId]
        if (!existing) return state
        
        return {
          fileContents: {
            ...state.fileContents,
            [fileId]: {
              ...existing,
              content,
              isDirty: content !== existing.savedContent,
              lastModified: Date.now()
            }
          }
        }
      }),

      saveFile: (fileId) => set((state) => {
        const existing = state.fileContents[fileId]
        if (!existing) return state
        
        return {
          fileContents: {
            ...state.fileContents,
            [fileId]: {
              ...existing,
              isDirty: false,
              savedContent: existing.content
            }
          }
        }
      }),

      getFileContent: (fileId) => get().fileContents[fileId]?.content,
      
      isDirty: (fileId) => get().fileContents[fileId]?.isDirty ?? false,
      
      getDirtyFiles: () => {
        const { fileContents } = get()
        return Object.keys(fileContents).filter(id => fileContents[id].isDirty)
      },

      setCursorPosition: (ln, col) => set({ cursorPosition: { ln, col } })
    }),
    {
      name: 'vscode-editor-state-v2',
      partialize: (state) => ({
        openFiles: state.openFiles,
        activeFileId: state.activeFileId,
        // 不持久化 fileContents，避免数据过大
      })
    }
  )
)
