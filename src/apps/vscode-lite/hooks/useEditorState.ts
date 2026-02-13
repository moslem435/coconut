import { create } from 'zustand'

interface EditorState {
    openFiles: string[]
    activeFileId: string | null

    openFile: (fileId: string) => void
    closeFile: (fileId: string) => void
    setActiveFile: (fileId: string) => void
    closeAllFiles: () => void

    cursorPosition: { ln: number, col: number }
    setCursorPosition: (ln: number, col: number) => void
}

export const useEditorState = create<EditorState>((set) => ({
    openFiles: [],
    activeFileId: null,

    openFile: (fileId) => set((state) => {
        if (state.openFiles.includes(fileId)) {
            return { activeFileId: fileId }
        }
        return {
            openFiles: [...state.openFiles, fileId],
            activeFileId: fileId
        }
    }),

    closeFile: (fileId) => set((state) => {
        const newOpenFiles = state.openFiles.filter(id => id !== fileId)
        // If closing active file, switch to next available or null
        let newActiveId = state.activeFileId
        if (state.activeFileId === fileId) {
            newActiveId = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null
        }
        return {
            openFiles: newOpenFiles,
            activeFileId: newActiveId
        }
    }),

    setActiveFile: (fileId) => set({ activeFileId: fileId }),

    closeAllFiles: () => set({ openFiles: [], activeFileId: null }),

    cursorPosition: { ln: 1, col: 1 },
    setCursorPosition: (ln, col) => set({ cursorPosition: { ln, col } })
}))
