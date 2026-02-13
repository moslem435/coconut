import { create } from 'zustand'
import { ComponentType } from 'react'
import { AppIcon } from '@/os/registry/types'
import { useProcessStore } from '@/os/kernel/useProcessStore'
import { eventBus } from '@/os/kernel/EventBus'

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
    appId?: string
    component: ComponentType<any>
    titleBarColor?: 'light' | 'dark' | 'auto'
    isDefaultTitle?: boolean
    isResizable?: boolean
    hideTitleBar?: boolean
}

interface WindowStore {
    windows: Record<string, WindowState>
    activeWindowId: string | null
    maxZIndex: number
    snapshots: Record<string, string>
    peekWindowId: string | null
    launchingAppIds: string[]

    // Actions
    openWindow: (id: string, title: string, component: ComponentType<any>, icon?: AppIcon, options?: { size?: { width: number; height: number }; width?: number; height?: number; isMaximized?: boolean; isResizable?: boolean; taskbarPosition?: { x: number; y: number }; titleBarColor?: 'light' | 'dark' | 'auto'; appId?: string; isDefaultTitle?: boolean; hideTitleBar?: boolean }) => void
    launchApp: (id: string, title: string, component: ComponentType<any>, icon?: AppIcon, options?: any) => void
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

// 虚拟化窗口层级 - 只有前 3 个窗口参与 z-index 计算
const VIRTUAL_Z_INDEX_THRESHOLD = 3

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
            set(state => ({
                windows: {
                    ...state.windows,
                    [id]: { ...state.windows[id], isMinimized: false }
                }
            }))
            get().focusWindow(id)
            eventBus.emit('window:opened', { id, appId: options?.appId })
            return
        }

        const newZ = maxZIndex + 1

        // Create Process (If App ID is present)
        if (options?.appId) {
            useProcessStore.getState().createProcess(options.appId, title, id)
            eventBus.emit('app:launched', { appId: options.appId, windowId: id })
        }

        // Calculate centered position
        const windowWidth = options?.width ?? options?.size?.width ?? 800
        const windowHeight = options?.height ?? options?.size?.height ?? 600
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
        const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080
        const centeredX = Math.max(0, (screenWidth - windowWidth) / 2)
        const centeredY = Math.max(0, (screenHeight - windowHeight) / 2 - 40)

        const newWindow: WindowState = {
            id,
            title,
            isOpen: true,
            isMinimized: false,
            isMaximized: options?.isMaximized ?? false,
            position: { x: centeredX, y: centeredY },
            size: options?.size ?? { width: windowWidth, height: windowHeight },
            zIndex: newZ,
            component,
            icon,
            appId: options?.appId,
            taskbarPosition: options?.taskbarPosition,
            titleBarColor: options?.titleBarColor,
            isDefaultTitle: options?.isDefaultTitle,
            isResizable: options?.isResizable,
            hideTitleBar: options?.hideTitleBar
        }

        set(state => ({
            windows: { ...state.windows, [id]: newWindow },
            activeWindowId: id,
            maxZIndex: newZ
        }))

        eventBus.emit('window:opened', { id, appId: options?.appId })
    },

    launchApp: (id, title, component, icon, options) => {
        const { windows, openWindow } = get()

        if (windows[id]) {
            openWindow(id, title, component, icon, options)
            return
        }

        if (get().launchingAppIds.includes(id)) return

        set(state => ({ launchingAppIds: [...state.launchingAppIds, id] }))

        openWindow(id, title, component, icon, { ...options, appId: id })
        set(state => ({ launchingAppIds: state.launchingAppIds.filter(appId => appId !== id) }))
    },

    closeWindow: (id) => {
        const window = get().windows[id]
        
        set(state => {
            const { [id]: removed, ...remaining } = state.windows
            const nextActive = state.activeWindowId === id ? null : state.activeWindowId

            // Kill Process
            const process = useProcessStore.getState().getProcessByWindowId(id)
            if (process) {
                useProcessStore.getState().killProcess(process.pid)
            }

            return {
                windows: remaining,
                activeWindowId: nextActive
            }
        })

        eventBus.emit('window:closed', { id, appId: window?.appId })
        if (window?.appId) {
            eventBus.emit('app:closed', { appId: window.appId, windowId: id })
        }
    },

    closeAllWindows: () => {
        const windows = get().windows
        Object.keys(windows).forEach(id => {
            const window = windows[id]
            if (window?.appId) {
                eventBus.emit('app:closed', { appId: window.appId, windowId: id })
            }
        })
        set({ windows: {}, activeWindowId: null, maxZIndex: 100 })
    },

    focusWindow: (id) => {
        const { activeWindowId, maxZIndex, windows } = get()
        
        // 优化：如果已经是顶层且活跃，跳过更新
        if (activeWindowId === id && !windows[id]?.isMinimized && windows[id]?.zIndex === maxZIndex) {
            return
        }

        // 虚拟化 z-index：只更新必要的窗口
        const sortedWindows = Object.values(windows)
            .filter(w => !w.isMinimized)
            .sort((a, b) => b.zIndex - a.zIndex)
        
        const needsUpdate = sortedWindows.slice(0, VIRTUAL_Z_INDEX_THRESHOLD).some(w => w.id === id)
        
        if (needsUpdate || sortedWindows.length <= VIRTUAL_Z_INDEX_THRESHOLD) {
            const newZ = maxZIndex + 1
            set(state => ({
                activeWindowId: id,
                maxZIndex: newZ,
                windows: {
                    ...state.windows,
                    [id]: { ...state.windows[id], zIndex: newZ, isMinimized: false }
                }
            }))
        } else {
            // 只更新活跃状态，不改变 z-index
            set(state => ({
                activeWindowId: id,
                windows: {
                    ...state.windows,
                    [id]: { ...state.windows[id], isMinimized: false }
                }
            }))
        }

        eventBus.emit('window:focused', { id })
    },

    minimizeWindow: (id) => {
        set(state => ({
            windows: {
                ...state.windows,
                [id]: { ...state.windows[id], isMinimized: true }
            },
            activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
        }))
        eventBus.emit('window:minimized', { id })
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
        eventBus.emit('window:maximized', { id })
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
                newWindows[key] = { ...newWindows[key], isMinimized: true }
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
