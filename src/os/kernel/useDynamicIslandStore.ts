import { create } from 'zustand'
import { ReactNode } from 'react'

export type IslandMode = 'idle' | 'active' | 'expanded' | 'success' | 'error' | 'loading'

export interface IslandState {
  mode: IslandMode
  title: string
  description?: string
  icon?: ReactNode
  progress?: number
  
  // Actions
  setMode: (mode: IslandMode) => void
  showNotification: (title: string, description?: string, icon?: ReactNode) => void
  showLoading: (title: string, progress?: number) => void
  showSuccess: (title: string) => void
  showError: (title: string) => void
  reset: () => void
}

export const useDynamicIslandStore = create<IslandState>((set) => ({
  mode: 'idle',
  title: '',
  description: '',
  icon: undefined,
  progress: undefined,

  setMode: (mode) => set({ mode }),
  
  showNotification: (title, description, icon) => {
    set({ mode: 'active', title, description, icon })
    // Auto reset after 3s
    setTimeout(() => {
      set((state) => state.mode === 'active' && state.title === title ? { mode: 'idle' } : {})
    }, 3000)
  },

  showLoading: (title, progress) => {
    set({ mode: 'loading', title, progress })
  },

  showSuccess: (title) => {
    set({ mode: 'success', title })
    setTimeout(() => {
      set((state) => state.mode === 'success' ? { mode: 'idle' } : {})
    }, 2000)
  },

  showError: (title) => {
    set({ mode: 'error', title })
    setTimeout(() => {
      set((state) => state.mode === 'error' ? { mode: 'idle' } : {})
    }, 3000)
  },

  reset: () => set({ mode: 'idle', title: '', description: '', icon: undefined, progress: undefined })
}))
