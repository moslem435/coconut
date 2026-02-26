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

  /**
   * 关闭文件
   * 
   * 从打开列表中移除文件，清理缓存和元数据。
   * 如果关闭的是当前激活文件，则切换到最后一个打开的文件。
   * 
   * @param fileId - 文件 ID
   */
  closeFile: (fileId) => set((state) => {
    const newOpenFiles = state.openFiles.filter(id => id !== fileId)
    const { [fileId]: removed, ...remainingMetadata } = state.fileMetadata

    // 从缓存中移除
    fileContentCache.delete(fileId)

    let newActiveId = state.activeFileId
    if (state.activeFileId === fileId) {
      newActiveId = newOpenFiles.length > 0
        ? (newOpenFiles[newOpenFiles.length - 1] || null)
        : null
    }

    return {
      openFiles: newOpenFiles,
      activeFileId: newActiveId,
      fileMetadata: remainingMetadata
    }
  }),

  /**
   * 设置激活文件
   * 
   * @param fileId - 文件 ID
   */
  setActiveFile: (fileId) => set({ activeFileId: fileId }),

  /**
   * 更新文件内容
   * 
   * 更新 LRU 缓存中的内容，并标记文件为 dirty（如果内容与保存的内容不同）。
   * 
   * @param fileId - 文件 ID
   * @param content - 新内容
   */
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

  /**
   * 保存文件
   * 
   * 将当前内容标记为已保存，清除 dirty 标记。
   * 
   * @param fileId - 文件 ID
   */
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

  /**
   * 获取文件内容
   * 
   * 从 LRU 缓存中读取文件内容
   * 
   * @param fileId - 文件 ID
   * @returns 文件内容或 undefined
   */
  getFileContent: (fileId) => fileContentCache.get(fileId),

  /**
   * 检查文件是否有未保存的修改
   * 
   * @param fileId - 文件 ID
   * @returns 是否 dirty
   */
  isDirty: (fileId) => get().fileMetadata[fileId]?.isDirty ?? false,

  /**
   * 获取所有有未保存修改的文件
   * 
   * @returns 文件 ID 列表
   */
  getDirtyFiles: () => {
    const { fileMetadata } = get()
    return Object.keys(fileMetadata).filter(id => fileMetadata[id]?.isDirty)
  },

  /**
   * 设置光标位置
   * 
   * @param ln - 行号
   * @param col - 列号
   */
  setCursorPosition: (ln, col) => set({ cursorPosition: { ln, col } })
}))
