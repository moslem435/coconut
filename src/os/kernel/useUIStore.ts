import { create } from 'zustand'

interface UIStore {
  renamingId: string | null
  setRenamingId: (id: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  renamingId: null,
  setRenamingId: (id) => set({ renamingId: id }),
}))
