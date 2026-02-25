import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ComponentType } from 'react'
import { AppIcon } from '@/os/registry/types'
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
    appId: string // Made required for serialization optimization
    componentProps?: Record<string, unknown> // 存储传递给组件的 props
    titleBarColor?: 'light' | 'dark' | 'auto'
    isDefaultTitle?: boolean
    isResizable?: boolean
    hideTitleBar?: boolean
    isSidebar?: boolean // New property for sidebar mode
}

interface WindowStore {
    windows: Record<string, WindowState>
    activeWindowId: string | null
    maxZIndex: number
    snapshotCache: Map<string, string> // 使用 Map 便于管理
    peekWindowId: string | null
    launchingAppIds: string[]

    // Actions
    openWindow: (id: string, title: string, appId: string, icon?: AppIcon, options?: { size?: { width: number; height: number }; width?: number; height?: number; isMaximized?: boolean; isResizable?: boolean; taskbarPosition?: { x: number; y: number }; titleBarColor?: 'light' | 'dark' | 'auto'; isDefaultTitle?: boolean; hideTitleBar?: boolean; [key: string]: unknown }) => void
    launchApp: (id: string, title: string, appId: string, icon?: AppIcon, options?: unknown) => void
    closeWindow: (id: string) => void
    closeAllWindows: () => void
    minimizeWindow: (id: string) => void
    maximizeWindow: (id: string) => void
    focusWindow: (id: string) => void
    updateWindowPosition: (id: string, position: { x: number; y: number }) => void
    updateWindowSize: (id: string, size: { width: number; height: number }) => void
    updateTaskbarPosition: (id: string, position: { x: number; y: number }) => void
    updateWindow: (id: string, updates: Partial<WindowState>) => void
    showDesktop: () => void
    setSnapshot: (id: string, dataUrl: string) => void
    getSnapshot: (id: string) => string | undefined
    clearSnapshot: (id: string) => void
    setPeekWindowId: (id: string | null) => void
}

// 虚拟化窗口层级 - 只有前 3 个窗口参与 z-index 计算
const VIRTUAL_Z_INDEX_THRESHOLD = 3
const MAX_SNAPSHOTS = 10 // 最多缓存 10 个快照

export const useWindowStore = create<WindowStore>()(
    persist(
        (set, get) => ({
            windows: {},
            activeWindowId: null,
            maxZIndex: 100,
            snapshotCache: new Map(),
            peekWindowId: null,
            launchingAppIds: [],

            openWindow: (id, title, appId, icon, options) => {
                const { windows, maxZIndex, focusWindow } = get()

                if (windows[id]) {
                    const existingWindow = windows[id]
                    if (!existingWindow) return

                    set(state => ({
                        windows: {
                            ...state.windows,
                            [id]: { ...existingWindow, isMinimized: false }
                        }
                    }))
                    get().focusWindow(id)
                    eventBus.emit('window:opened', { id, appId })
                    return
                }

                const newZ = maxZIndex + 1

                // 发布事件，让 ProcessStore 监听并创建进程
                eventBus.emit('app:launched', { appId, windowId: id })

                // Calculate centered position
                const windowWidth = options?.width ?? options?.size?.width ?? 800
                const windowHeight = options?.height ?? options?.size?.height ?? 600
                const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
                const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080
                const centeredX = Math.max(0, (screenWidth - windowWidth) / 2)
                const centeredY = Math.max(0, (screenHeight - windowHeight) / 2 - 40)

                // 提取组件 props（排除窗口配置属性）
                const { 
                    size, width, height, isMaximized, isResizable, 
                    taskbarPosition, titleBarColor, isDefaultTitle, hideTitleBar, isSidebar,
                    ...componentProps 
                } = options || {}

                const newWindow: WindowState = {
                    id,
                    title,
                    isOpen: true,
                    isMinimized: false,
                    isMaximized: isMaximized ?? false,
                    position: { x: centeredX, y: centeredY },
                    size: size ?? { width: windowWidth, height: windowHeight },
                    zIndex: newZ,
                    componentProps, // 存储组件 props
                    icon,
                    appId,
                    taskbarPosition,
                    titleBarColor,
                    isDefaultTitle,
                    isResizable,
                    hideTitleBar,
                    isSidebar // Store the sidebar property
                }

                set(state => ({
                    windows: { ...state.windows, [id]: newWindow },
                    activeWindowId: id,
                    maxZIndex: newZ
                }))

                eventBus.emit('window:opened', { id, appId })
            },

            launchApp: (id, title, appId, icon, options) => {
                const { windows, openWindow } = get()
                const opts = options as { multiInstance?: boolean } | undefined

                if (windows[id]) {
                    if (opts?.multiInstance) {
                        const newId = `${id}-${Date.now()}`
                        openWindow(newId, title, appId, icon, options)
                        return
                    }
                    openWindow(id, title, appId, icon, options)
                    return
                }

                if (get().launchingAppIds.includes(id)) return

                set(state => ({ launchingAppIds: [...state.launchingAppIds, id] }))

                openWindow(id, title, appId, icon, options)
                set(state => ({ launchingAppIds: state.launchingAppIds.filter(appId => appId !== id) }))
            },

            closeWindow: (id) => {
                const window = get().windows[id]
                
                set(state => {
                    const { [id]: removed, ...remaining } = state.windows
                    const nextActive = state.activeWindowId === id ? null : state.activeWindowId

                    return {
                        windows: remaining,
                        activeWindowId: nextActive
                    }
                })

                // 清理快照
                get().clearSnapshot(id)

                // 发布事件，让 ProcessStore 监听并处理
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
                
                // 清理所有快照
                get().snapshotCache.clear()
                
                set({ windows: {}, activeWindowId: null, maxZIndex: 100 })
            },

            focusWindow: (id) => {
                const { activeWindowId, maxZIndex, windows } = get()
                const targetWindow = windows[id]
                if (!targetWindow) return
                
                // 优化：如果已经是顶层且活跃，跳过更新
                if (activeWindowId === id && !targetWindow.isMinimized && targetWindow.zIndex === maxZIndex) {
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
                            [id]: { ...targetWindow, zIndex: newZ, isMinimized: false }
                        }
                    }))
                } else {
                    // 只更新活跃状态，不改变 z-index
                    set(state => ({
                        activeWindowId: id,
                        windows: {
                            ...state.windows,
                            [id]: { ...targetWindow, isMinimized: false }
                        }
                    }))
                }

                eventBus.emit('window:focused', { id })
            },

            minimizeWindow: (id) => {
                const targetWindow = get().windows[id]
                if (!targetWindow) return

                set(state => ({
                    windows: {
                        ...state.windows,
                        [id]: { ...targetWindow, isMinimized: true }
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
                const targetWindow = get().windows[id]
                if (!targetWindow) return

                set(state => ({
                    windows: {
                        ...state.windows,
                        [id]: { ...targetWindow, position }
                    }
                }))
            },

            updateWindowSize: (id, size) => {
                const targetWindow = get().windows[id]
                if (!targetWindow) return

                set(state => ({
                    windows: {
                        ...state.windows,
                        [id]: { ...targetWindow, size }
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
                            [id]: { ...win, taskbarPosition: position }
                        }
                    }
                })
            },

            updateWindow: (id, updates) => {
                set(state => {
                    const win = state.windows[id]
                    if (!win) return state

                    return {
                        windows: {
                            ...state.windows,
                            [id]: { ...win, ...updates }
                        }
                    }
                })
            },

            showDesktop: () => {
                set(state => {
                    const newWindows = { ...state.windows }
                    Object.keys(newWindows).forEach(key => {
                        const win = newWindows[key]
                        if (win) {
                            newWindows[key] = { ...win, isMinimized: true }
                        }
                    })
                    return {
                        windows: newWindows,
                        activeWindowId: null
                    }
                })
            },

            setSnapshot: (id, dataUrl) => {
                const cache = get().snapshotCache
                
                // LRU 策略：如果超过最大数量，删除最旧的
                if (cache.size >= MAX_SNAPSHOTS && !cache.has(id)) {
                    const firstKey = cache.keys().next().value
                    if (firstKey) {
                        cache.delete(firstKey)
                    }
                }
                
                cache.set(id, dataUrl)
            },

            getSnapshot: (id) => {
                return get().snapshotCache.get(id)
            },

            clearSnapshot: (id) => {
                get().snapshotCache.delete(id)
            },

            setPeekWindowId: (id) => {
                set({ peekWindowId: id })
            }
        }),
        {
            name: 'window-storage',
            partialize: (state) => ({
                windows: state.windows,
                activeWindowId: state.activeWindowId,
                maxZIndex: state.maxZIndex,
                launchingAppIds: state.launchingAppIds
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Reset non-persisted state
                    state.snapshotCache = new Map()
                    state.peekWindowId = null
                }
            }
        }
    )
)

// --- System Integration ---

// Listen for process kill events to ensure windows are closed when their process dies
eventBus.on('process:killed', ({ windowId }) => {
    if (windowId) {
        useWindowStore.getState().closeWindow(windowId)
    }
})
