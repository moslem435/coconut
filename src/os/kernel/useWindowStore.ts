import { create } from 'zustand'
import { ReactNode, ComponentType } from 'react'
import { AppIcon } from '@/os/registry/types'

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
    icon?: AppIcon
    component: ReactNode
    titleBarColor?: 'light' | 'dark' | 'auto'
}

interface WindowStore {
    windows: Record<string, WindowState>
    activeWindowId: string | null
    maxZIndex: number
    snapshots: Record<string, string>
    peekWindowId: string | null
    launchingAppIds: string[]

    // Actions
    openWindow: (id: string, title: string, component: ReactNode, icon?: AppIcon, options?: { size?: { width: number; height: number }; isMaximized?: boolean; taskbarPosition?: { x: number; y: number }; titleBarColor?: 'light' | 'dark' | 'auto' }) => void
    launchApp: (id: string, title: string, component: ReactNode, icon?: AppIcon, options?: any) => void
    closeWindow: (id: string) => void
    closeAllWindows: () => void
    minimizeWindow: (id: string) => void
    maximizeWindow: (id: string) => void
    focusWindow: (id: string) => void
    updateWindowPosition: (id: string, position: { x: number; y: number }) => void
    updateWindowSize: (id: string, size: { width: number; height: number }) => void
    updateTaskbarPosition: (id: string, position: { x: number; y: number }) => void
    showDesktop: () => void
    setSnapshot: (id: string, dataUrl: string) => void
    setPeekWindowId: (id: string | null) => void
}

export const useWindowStore = create<WindowStore>((set, get) => ({
    windows: {},
    activeWindowId: null,
    maxZIndex: 100,
    snapshots: {},
    peekWindowId: null,
    launchingAppIds: [],

    openWindow: (id, title, component, icon, options) => {
        const { windows, maxZIndex, focusWindow } = get()

        if (windows[id]) {
            // Restore and focus
            // We manually update state first to ensure minimized flag is cleared BEFORE focus logic runs if needed,
            // though focusWindow also handles it. Doing it here ensures strict compliance with old logic.
            set(state => ({
                windows: {
                    ...state.windows,
                    [id]: { ...state.windows[id], isMinimized: false }
                }
            }))
            get().focusWindow(id)
            return
        }

        const newZ = maxZIndex + 1

        // Calculate centered position
        const windowWidth = options?.size?.width ?? 800
        const windowHeight = options?.size?.height ?? 600
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
        const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080
        const centeredX = Math.max(0, (screenWidth - windowWidth) / 2)
        const centeredY = Math.max(0, (screenHeight - windowHeight) / 2 - 40) // -40 for taskbar

        const newWindow: WindowState = {
            id,
            title,
            isOpen: true,
            isMinimized: false,
            isMaximized: options?.isMaximized ?? false,
            position: { x: centeredX, y: centeredY },
            size: options?.size ?? { width: 800, height: 600 },
            zIndex: newZ,
            component,
            icon,
            taskbarPosition: options?.taskbarPosition,
            titleBarColor: options?.titleBarColor
        }

        set(state => ({
            windows: { ...state.windows, [id]: newWindow },
            activeWindowId: id,
            maxZIndex: newZ
        }))
    },


    launchApp: (id, title, component, icon, options) => {
        const { windows, openWindow } = get()

        // If already open, just focus it immediately
        if (windows[id]) {
            openWindow(id, title, component, icon, options)
            return
        }

        // If already launching, ignore
        if (get().launchingAppIds.includes(id)) return

        // Set launching state
        set(state => ({ launchingAppIds: [...state.launchingAppIds, id] }))

        // Simulate boot delay
        setTimeout(() => {
            openWindow(id, title, component, icon, options)
            set(state => ({ launchingAppIds: state.launchingAppIds.filter(appId => appId !== id) }))
        }, 500)
    },

    closeWindow: (id) => {
        set(state => {
            const newWindows = { ...state.windows }
            delete newWindows[id]
            return {
                windows: newWindows,
                activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
            }
        })
    },

    closeAllWindows: () => {
        set({ windows: {}, activeWindowId: null, maxZIndex: 100 })
    },

    focusWindow: (id) => {
        const { activeWindowId, maxZIndex, windows } = get()
        // Optimization: Don't trigger update if already top and active
        if (activeWindowId === id && !windows[id]?.isMinimized && windows[id]?.zIndex === maxZIndex) return

        set(state => {
            const newZ = state.maxZIndex + 1
            return {
                activeWindowId: id,
                maxZIndex: newZ,
                windows: {
                    ...state.windows,
                    [id]: { ...state.windows[id], zIndex: newZ, isMinimized: false }
                }
            }
        })
    },

    minimizeWindow: (id) => {
        set(state => ({
            windows: {
                ...state.windows,
                [id]: { ...state.windows[id], isMinimized: true }
            },
            activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
        }))
    },

    maximizeWindow: (id) => {
        const { windows, focusWindow } = get()
        const win = windows[id]
        if (!win) return

        if (win.isMaximized) {
            set(state => ({
                windows: {
                    ...state.windows,
                    [id]: {
                        ...win,
                        isMaximized: false,
                        position: win.preMaximizeState?.position ?? win.position,
                        size: win.preMaximizeState?.size ?? win.size,
                        preMaximizeState: undefined
                    }
                }
            }))
        } else {
            set(state => ({
                windows: {
                    ...state.windows,
                    [id]: {
                        ...win,
                        isMaximized: true,
                        preMaximizeState: {
                            position: win.position,
                            size: win.size
                        }
                    }
                }
            }))
        }
        focusWindow(id)
    },

    updateWindowPosition: (id, position) => {
        set(state => ({
            windows: {
                ...state.windows,
                [id]: { ...state.windows[id], position }
            }
        }))
    },

    updateWindowSize: (id, size) => {
        set(state => ({
            windows: {
                ...state.windows,
                [id]: { ...state.windows[id], size }
            }
        }))
    },

    updateTaskbarPosition: (id, position) => {
        set(state => {
            const win = state.windows[id]
            if (!win) return state
            if (win.taskbarPosition?.x === position.x && win.taskbarPosition?.y === position.y) return state

            return {
                windows: {
                    ...state.windows,
                    [id]: { ...state.windows[id], taskbarPosition: position }
                }
            }
        })
    },

    showDesktop: () => {
        set(state => {
            const newWindows = { ...state.windows }
            Object.keys(newWindows).forEach(key => {
                newWindows[key].isMinimized = true
            })
            return {
                windows: newWindows,
                activeWindowId: null
            }
        })
    },

    setSnapshot: (id, dataUrl) => {
        set(state => ({
            snapshots: { ...state.snapshots, [id]: dataUrl }
        }))
    },

    setPeekWindowId: (id) => {
        set({ peekWindowId: id })
    }
}))
