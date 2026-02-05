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
    if (!windows[id]) return

    if (activeWindowId === id && !windows[id].isMinimized) return

    setWindows(prev => ({
      ...prev,
      [id]: { ...prev[id], zIndex: maxZIndex + 1, isMinimized: false }
    }))
    setMaxZIndex(prev => prev + 1)
    setActiveWindowId(id)
  }, [activeWindowId, maxZIndex, windows])

  const openWindow = useCallback((id: string, title: string, component: React.ReactNode, icon?: any, options?: { size?: { width: number; height: number }; isMaximized?: boolean }) => {
    setWindows(prev => {
      if (prev[id]) {
        // If window exists, just focus it (handled by effect or subsequent call, but let's do it here too)
        return prev
      }
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
          zIndex: maxZIndex + 1,
          component,
          icon
        }
      }
    })
    
    // If it was already open, we still want to focus it. 
    // If it's new, we also focus it.
    // The state update above is async, so we can't rely on 'windows' state immediately.
    // We'll increment z-index blindly here for the new window logic.
    setMaxZIndex(prev => prev + 1)
    setActiveWindowId(id)
    
    // If window existed but was minimized, we need to un-minimize it.
    setWindows(prev => {
      if (prev[id]) {
         return {
            ...prev,
            [id]: { ...prev[id], isMinimized: false, zIndex: maxZIndex + 2 }
         }
      }
      return prev
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