import { create } from 'zustand'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  title?: string
  message: string
  type: NotificationType
  duration?: number
  timestamp?: number
}

interface NotificationState {
  notifications: Notification[]
  history: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearHistory: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  history: [],
  addNotification: (notification) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newNotification = { ...notification, id, timestamp: Date.now() }
    
    set((state) => ({
      notifications: [...state.notifications, newNotification],
      history: [newNotification, ...state.history].slice(0, 50) // Keep last 50
    }))
    
    // Auto remove if duration is provided (handled in component for cleanup, 
    // but store can also handle it. Component is better for pausing on hover)
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }))
  },
  clearHistory: () => set({ history: [] })
}))
