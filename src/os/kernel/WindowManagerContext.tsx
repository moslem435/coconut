'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface WindowState {
  id: string
  title: string
  isOpen: boolean
  isMinimized: boolean
  isMaximized: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  preMaximizeState?: {
    position: { x: number; y: number }
    size: { width: number; height: number }
  }
  taskbarPosition?: { x: number; y: number }
  icon?: React.ComponentType<{ size?: number; className?: string }>
  component: React.ReactNode
}

interface WindowManagerContextType {
  windows: Record<string, WindowState>
  activeWindowId: string | null
  openWindow: (id: string, title: string, component: React.ReactNode, icon?: any, options?: { size?: { width: number; height: number }; isMaximized?: boolean }) => void
  closeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  maximizeWindow: (id: string) => void
  focusWindow: (id: string) => void
  updateWindowPosition: (id: string, position: { x: number; y: number }) => void
  updateWindowSize: (id: string, size: { width: number; height: number }) => void
  updateTaskbarPosition: (id: string, position: { x: number; y: number }) => void
  showDesktop: () => void
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined)

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<Record<string, WindowState>>({})
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null)
  const [maxZIndex, setMaxZIndex] = useState(100)

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => {
      if (!prev[id]) return prev

      // If already top and active and NOT minimized, do nothing
      if (activeWindowId === id && !prev[id].isMinimized && prev[id].zIndex === maxZIndex) {
        return prev
      }

      const newZ = maxZIndex + 1

      return {
        ...prev,
        [id]: { ...prev[id], zIndex: newZ, isMinimized: false }
      }
    })

    // We increment maxZIndex externally to ensure subsequent calls get a higher index
    setMaxZIndex(prev => prev + 1)
    setActiveWindowId(id)
  }, [activeWindowId, maxZIndex])

  const openWindow = useCallback((id: string, title: string, component: React.ReactNode, icon?: any, options?: { size?: { width: number; height: number }; isMaximized?: boolean }) => {
    // Calculate new Z Index outside to capture current max
    // Note: In a high-frequency event, this might need a ref, but for UI clicks it's fine

    setMaxZIndex(prev => {
      const newZ = prev + 1

      setWindows(currentWindows => {
        if (currentWindows[id]) {
          // Window exists, restore and focus
          return {
            ...currentWindows,
            [id]: { ...currentWindows[id], isMinimized: false, zIndex: newZ }
          }
        }

        // New Window
        return {
          ...currentWindows,
          [id]: {
            id,
            title,
            isOpen: true,
            isMinimized: false,
            isMaximized: options?.isMaximized ?? false,
            // Simple cascade positioning
            position: { x: 50 + (Object.keys(currentWindows).length % 10) * 30, y: 50 + (Object.keys(currentWindows).length % 10) * 30 },
            size: options?.size ?? { width: 800, height: 600 },
            zIndex: newZ,
            component,
            icon
          }
        }
      })

      setActiveWindowId(id)
      return newZ
    })

  }, [])

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => {
      const newWindows = { ...prev }
      delete newWindows[id]
      return newWindows
    })
    if (activeWindowId === id) {
      setActiveWindowId(null)
    }
  }, [activeWindowId])

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => ({
      ...prev,
      [id]: { ...prev[id], isMinimized: true }
    }))
    if (activeWindowId === id) {
      setActiveWindowId(null)
    }
  }, [activeWindowId])

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev => {
      const win = prev[id]
      if (!win) return prev

      if (win.isMaximized) {
        // Restore
        return {
          ...prev,
          [id]: {
            ...win,
            isMaximized: false,
            // Restore position and size if they exist, otherwise keep current (fallback)
            position: win.preMaximizeState?.position ?? win.position,
            size: win.preMaximizeState?.size ?? win.size,
            preMaximizeState: undefined
          }
        }
      } else {
        // Maximize
        return {
          ...prev,
          [id]: {
            ...win,
            isMaximized: true,
            preMaximizeState: {
              position: win.position,
              size: win.size
            }
          }
        }
      }
    })
    focusWindow(id)
  }, [focusWindow])

  const updateWindowPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setWindows(prev => ({
      ...prev,
      [id]: { ...prev[id], position }
    }))
  }, [])

  const updateWindowSize = useCallback((id: string, size: { width: number; height: number }) => {
    setWindows(prev => ({
      ...prev,
      [id]: { ...prev[id], size }
    }))
  }, [])

  const updateTaskbarPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setWindows(prev => {
      if (!prev[id]) return prev
      // Only update if position actually changed to prevent unnecessary rerenders
      if (prev[id].taskbarPosition?.x === position.x && prev[id].taskbarPosition?.y === position.y) {
        return prev
      }
      return {
        ...prev,
        [id]: { ...prev[id], taskbarPosition: position }
      }
    })
  }, [])

  const showDesktop = useCallback(() => {
    setWindows(prev => {
      const newWindows = { ...prev }
      Object.keys(newWindows).forEach(key => {
        newWindows[key].isMinimized = true
      })
      return newWindows
    })
    setActiveWindowId(null)
  }, [])

  return (
    <WindowManagerContext.Provider value={{
      windows,
      activeWindowId,
      openWindow,
      closeWindow,
      minimizeWindow,
      maximizeWindow,
      focusWindow,
      updateWindowPosition,
      updateWindowSize,
      updateTaskbarPosition,
      showDesktop
    }}>
      {children}
    </WindowManagerContext.Provider>
  )
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext)
  if (context === undefined) {
    throw new Error('useWindowManager must be used within a WindowManagerProvider')
  }
  return context
}