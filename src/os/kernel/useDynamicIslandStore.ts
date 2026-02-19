import { create } from 'zustand'
import { ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'

export type IslandMode = 'idle' | 'active' | 'expanded' | 'success' | 'error' | 'loading' | 'media' | 'call' | 'minimal'

export interface IslandActivity {
  id: string
  type: 'notification' | 'system' | 'media' | 'call' | 'file-transfer' | 'ai'
  priority: number // 10: Low, 20: Normal, 30: High, 40: Critical
  title: string
  description?: string
  icon?: ReactNode
  progress?: number // 0-100
  component?: ReactNode // Custom component for expanded view
  autoClose?: number // ms, if defined
  createdAt: number
}

export interface IslandState {
  mode: IslandMode
  isExpanded: boolean
  
  // Activity Management
  activities: IslandActivity[]
  activeActivityId: string | null
  
  // Actions
  addActivity: (activity: Omit<IslandActivity, 'id' | 'createdAt'> & { id?: string }) => string
  removeActivity: (id: string) => void
  updateActivity: (id: string, updates: Partial<IslandActivity>) => void
  setExpanded: (expanded: boolean) => void
  
  // Legacy/Convenience Actions
  setMode: (mode: IslandMode) => void
  showNotification: (title: string, description?: string, icon?: ReactNode) => void
  showLoading: (title: string, progress?: number) => void
  showSuccess: (title: string) => void
  showError: (title: string) => void
  reset: () => void
}

const DEFAULT_PRIORITY = 20

export const useDynamicIslandStore = create<IslandState>((set, get) => ({
  mode: 'idle',
  isExpanded: false,
  activities: [],
  activeActivityId: null,

  addActivity: (activity) => {
    const id = activity.id || uuidv4()
    const newActivity: IslandActivity = {
      ...activity,
      id,
      priority: activity.priority || DEFAULT_PRIORITY,
      createdAt: Date.now()
    }

    set((state) => {
      const newActivities = [...state.activities, newActivity]
        .sort((a, b) => b.priority - a.priority || b.createdAt - a.createdAt)
      
      // Auto-switch if higher priority
      const current = state.activities.find(a => a.id === state.activeActivityId)
      const shouldSwitch = !current || newActivity.priority >= current.priority

      return {
        activities: newActivities,
        activeActivityId: shouldSwitch ? id : state.activeActivityId,
        mode: shouldSwitch ? 'active' : state.mode
      }
    })

    if (newActivity.autoClose) {
      setTimeout(() => {
        get().removeActivity(id)
      }, newActivity.autoClose)
    }

    return id
  },

  removeActivity: (id) => {
    set((state) => {
      const newActivities = state.activities.filter(a => a.id !== id)
      
      // If we removed the active one, pick the next best
      let nextActiveId = state.activeActivityId
      let nextMode = state.mode

      if (state.activeActivityId === id) {
        if (newActivities.length > 0) {
          nextActiveId = newActivities[0].id
          nextMode = 'active'
        } else {
          nextActiveId = null
          nextMode = 'idle'
        }
      }

      return {
        activities: newActivities,
        activeActivityId: nextActiveId,
        mode: nextMode,
        isExpanded: nextActiveId ? state.isExpanded : false
      }
    })
  },

  updateActivity: (id, updates) => {
    set((state) => {
      const newActivities = state.activities.map(a => 
        a.id === id ? { ...a, ...updates } : a
      ).sort((a, b) => b.priority - a.priority || b.createdAt - a.createdAt)

      return { activities: newActivities }
    })
  },

  setExpanded: (expanded) => set({ isExpanded: expanded }),

  // Legacy Actions - Mapped to Activities
  setMode: (mode) => set({ mode }),
  
  showNotification: (title, description, icon) => {
    get().addActivity({
      type: 'notification',
      title,
      description,
      icon,
      priority: 20,
      autoClose: 3000
    })
  },

  showLoading: (title, progress) => {
    // Check if there's already a loading activity with this title to update it? 
    // For simplicity, we just add a new one. In real apps, callers should manage IDs.
    // But to match old behavior which was "global mode", we'll try to find an existing "system-loading" activity
    const existing = get().activities.find(a => a.id === 'system-loading')
    if (existing) {
      get().updateActivity('system-loading', { title, progress })
    } else {
      get().addActivity({
        id: 'system-loading',
        type: 'system',
        title,
        progress,
        priority: 25,
        // No autoClose for loading
      })
    }
  },

  showSuccess: (title) => {
    // Remove loading if exists
    get().removeActivity('system-loading')
    
    get().addActivity({
      type: 'notification', // Use notification type for success
      title,
      priority: 25,
      autoClose: 2000,
      // We'll rely on the UI to render the success state based on a 'success' prop or just use standard notification
      // Actually, let's add a specialized type or just map it in the component
    })
    // Force mode for compatibility if component relies on it, 
    // but we want to move towards data-driven.
    // However, the component reads 'mode'. 
    // We should make the component derive 'mode' from the active activity.
    set({ mode: 'success' }) // Temporary override for visual feedback
    setTimeout(() => {
        set((s) => s.mode === 'success' ? { mode: 'active' } : {})
    }, 2000)
  },

  showError: (title) => {
    get().removeActivity('system-loading')
    get().addActivity({
      type: 'notification',
      title,
      priority: 30, // Higher priority
      autoClose: 3000
    })
    set({ mode: 'error' })
    setTimeout(() => {
        set((s) => s.mode === 'error' ? { mode: 'active' } : {})
    }, 3000)
  },

  reset: () => set({ 
    mode: 'idle', 
    activities: [], 
    activeActivityId: null, 
    isExpanded: false 
  })
}))
