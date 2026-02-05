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
  showDesktop: () => void
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined)

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<Record<string, WindowState>>({})
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null)
  const [maxZIndex, setMaxZIndex] = useState(100)

  const focusWindow = useCallback((id: string) => {
    // If window is already active and not minimized, do nothing (optional optimization)
    // But if we want to bring to front even if active (e.g. if we have multiple windows), 
    // we should always increment Z-index if it's not the absolute top.
    // For simplicity, always bring to front.
    
    setWindows(prev => {
      if (!prev[id]) return prev
      
      // If already top and active, skip state update to prevent rerenders
      if (activeWindowId === id && !prev[id].isMinimized && prev[id].zIndex === maxZIndex) {
          return prev
      }

      const newZ = maxZIndex + 1
      // We need to update maxZIndex state, but we can't do it inside setWindows callback if we want to use the new value immediately.
      // However, we can just use the functional update pattern for everything or update them separately.
      
      return {
        ...prev,
        [id]: { ...prev[id], zIndex: newZ, isMinimized: false }
      }
    })
    
    // We update maxZIndex and activeWindowId outside the setWindows callback
    // But we need to ensure they are consistent. 
    // Since setWindows (functional) runs asynchronously, we might have a race condition if we rely on 'maxZIndex' variable from closure.
    // But 'maxZIndex' in dependency array ensures this callback is recreated when it changes.
    // So 'maxZIndex' here is current.
    
    setMaxZIndex(prev => prev + 1)
    setActiveWindowId(id)
  }, [activeWindowId, maxZIndex])

  const openWindow = useCallback((id: string, title: string, component: React.ReactNode, icon?: any, options?: { size?: { width: number; height: number }; isMaximized?: boolean }) => {
    // Calculate new Z Index
    const newZ = maxZIndex + 1
    setMaxZIndex(prev => prev + 1)
    setActiveWindowId(id)

    setWindows(prev => {
      if (prev[id]) {
        // Window exists, just update Z-index and restore if minimized
        return {
           ...prev,
           [id]: { ...prev[id], isMinimized: false, zIndex: newZ }
        }
      }
      
      // New Window
      return {
        ...prev,
        [id]: {
          id,
          title,
          isOpen: true,
          isMinimized: false,
          isMaximized: options?.isMaximized ?? false,
          position: { x: 50 + Object.keys(prev).length * 20, y: 50 + Object.keys(prev).length * 20 },
          size: options?.size ?? { width: 800, height: 600 },
          zIndex: newZ,
          component,
          icon
        }
      }
    })
  }, [maxZIndex])

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
    setWindows(prev => ({
      ...prev,
      [id]: { ...prev[id], isMaximized: !prev[id].isMaximized }
    }))
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