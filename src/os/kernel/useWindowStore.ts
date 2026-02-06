import { create } from 'zustand'
import { ReactNode, ComponentType } from 'react'

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
    icon?: ComponentType<{ size?: number; className?: string }>
    component: ReactNode
}

interface WindowStore {
    windows: Record<string, WindowState>
    activeWindowId: string | null
    maxZIndex: number

    // Actions
    openWindow: (id: string, title: string, component: ReactNode, icon?: any, options?: { size?: { width: number; height: number }; isMaximized?: boolean }) => void
    closeWindow: (id: string) => void
    minimizeWindow: (id: string) => void
    maximizeWindow: (id: string) => void
    focusWindow: (id: string) => void
    updateWindowPosition: (id: string, position: { x: number; y: number }) => void
    updateWindowSize: (id: string, size: { width: number; height: number }) => void
    updateTaskbarPosition: (id: string, position: { x: number; y: number }) => void
    showDesktop: () => void
}

export const useWindowStore = create<WindowStore>((set, get) => ({
    windows: {},
    activeWindowId: null,
    maxZIndex: 100,

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
        const newWindow: WindowState = {
            id,
            title,
            isOpen: true,
            isMinimized: false,
            isMaximized: options?.isMaximized ?? false,
            position: { x: 50 + (Object.keys(windows).length % 10) * 30, y: 50 + (Object.keys(windows).length % 10) * 30 },
            size: options?.size ?? { width: 800, height: 600 },
            zIndex: newZ,
            component,
            icon
        }

        set(state => ({
            windows: { ...state.windows, [id]: newWindow },
            activeWindowId: id,
            maxZIndex: newZ
        }))
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
    }
}))
