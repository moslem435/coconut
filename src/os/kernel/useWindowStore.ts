/**
 * 窗口管理 Store
 * 
 * 功能：
 * - 窗口生命周期管理（打开、关闭、最小化、最大化）
 * - 窗口层级控制（z-index 虚拟化）
 * - 窗口状态持久化（位置、大小、最大化状态）
 * - 窗口快照缓存（用于最小化预览）
 * - 窗口预览（Peek 模式）
 * - 侧边栏模式（AI Chat 等应用）
 * 
 * 架构设计：
 * - 虚拟化 z-index：只有前 3 个窗口参与层级计算，减少不必要的更新
 * - LRU 快照缓存：最多缓存 10 个窗口快照，自动清理旧快照
 * - 事件驱动：通过 EventBus 与进程管理器解耦
 * - 序列化优化：持久化时排除不可序列化的 React 组件（icon）
 * 
 * 性能优化：
 * - 使用 partialize 只持久化必要字段
 * - 使用 skipHydration 延迟水合
 * - 窗口聚焦时跳过不必要的 z-index 更新
 * 
 * @author System
 * @created 2024
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppIcon } from '@/os/ui/AppIcon'
import { eventBus } from '@/os/kernel/EventBus'

// Define the AppLauncher interface
export interface AppLauncher {
    launch: (file: any) => Promise<boolean>;
}

/**
 * 窗口状态接口
 */
export interface WindowState {
    /** 窗口唯一标识符 */
    id: string
    /** 窗口标题 */
    title: string
    /** 是否打开 */
    isOpen: boolean
    /** 是否最小化 */
    isMinimized: boolean
    /** 是否最大化 */
    isMaximized: boolean
    /** 窗口位置 */
    position: { x: number; y: number }
    /** 窗口大小 */
    size: { width: number; height: number }
    /** 层级索引 */
    zIndex: number
    /** 最大化前的状态（用于恢复） */
    preMaximizeState?: {
        position: { x: number; y: number }
        size: { width: number; height: number }
    }
    /** 任务栏图标位置（用于最小化动画） */
    taskbarPosition?: { x: number; y: number }
    /** 窗口图标 */
    icon?: AppIcon
    /** 应用 ID（必填，用于序列化优化） */
    appId: string
    /** 传递给组件的 props */
    componentProps?: Record<string, unknown>
    /** 标题栏颜色模式 */
    titleBarColor?: 'light' | 'dark' | 'auto'
    /** 是否使用默认标题 */
    isDefaultTitle?: boolean
    /** 是否可调整大小 */
    isResizable?: boolean
    /** 是否隐藏标题栏 */
    hideTitleBar?: boolean
    /** 是否为侧边栏模式 */
    isSidebar?: boolean
}

/**
 * 窗口管理 Store 接口
 */
interface WindowStore {
    /** 所有窗口状态映射表 */
    windows: Record<string, WindowState>
    /** 当前激活的窗口 ID */
    activeWindowId: string | null
    /** 最大 z-index 值 */
    maxZIndex: number
    /** 窗口快照缓存（用于最小化预览） */
    snapshotCache: Map<string, string>
    /** 预览窗口 ID（Peek 模式） */
    peekWindowId: string | null
    /** 正在启动的应用 ID 列表 */
    launchingAppIds: string[]
    /** 全局应用启动器服务（单例模式） */
    appLauncher: AppLauncher | null

    // 操作方法
    /** 注册应用启动器 */
    registerAppLauncher: (launcher: AppLauncher) => void
    /** 打开窗口 */
    openWindow: (id: string, title: string, appId: string, icon?: AppIcon, options?: { size?: { width: number; height: number }; width?: number; height?: number; isMaximized?: boolean; isResizable?: boolean; isSidebar?: boolean; taskbarPosition?: { x: number; y: number }; titleBarColor?: 'light' | 'dark' | 'auto'; isDefaultTitle?: boolean; hideTitleBar?: boolean;[key: string]: unknown }) => void
    /** 启动应用（支持多实例） */
    launchApp: (id: string, title: string, appId: string, icon?: AppIcon, options?: any) => void
    /** 关闭窗口 */
    closeWindow: (id: string) => void
    /** 关闭所有窗口 */
    closeAllWindows: () => void
    /** 最小化窗口 */
    minimizeWindow: (id: string) => void
    /** 最大化/还原窗口 */
    maximizeWindow: (id: string) => void
    /** 聚焦窗口 */
    focusWindow: (id: string) => void
    /** 更新窗口位置 */
    updateWindowPosition: (id: string, position: { x: number; y: number }) => void
    /** 更新窗口大小 */
    updateWindowSize: (id: string, size: { width: number; height: number }) => void
    /** 更新任务栏位置 */
    updateTaskbarPosition: (id: string, position: { x: number; y: number }) => void
    /** 更新窗口状态（批量更新） */
    updateWindow: (id: string, updates: Partial<WindowState>) => void
    /** 显示桌面（最小化所有窗口） */
    showDesktop: () => void
    /** 设置窗口快照 */
    setSnapshot: (id: string, dataUrl: string) => void
    /** 获取窗口快照 */
    getSnapshot: (id: string) => string | undefined
    /** 清除窗口快照 */
    clearSnapshot: (id: string) => void
    /** 设置预览窗口 ID */
    setPeekWindowId: (id: string | null) => void
}

/** 虚拟化窗口层级阈值 - 只有前 3 个窗口参与 z-index 计算 */
const VIRTUAL_Z_INDEX_THRESHOLD = 3
/** 最大快照缓存数量 */
const MAX_SNAPSHOTS = 10

/**
 * 创建窗口管理 Store
 * 
 * 使用 Zustand 的 persist 中间件实现状态持久化
 */
export const useWindowStore = create<WindowStore>()(
    persist(
        (set, get) => ({
            windows: {},
            activeWindowId: null,
            maxZIndex: 100,
            snapshotCache: new Map(),
            peekWindowId: null,
            launchingAppIds: [],
            appLauncher: null,

            registerAppLauncher: (launcher) => set({ appLauncher: launcher }),

            /**
             * 打开窗口
             * 
             * 如果窗口已存在，则恢复并聚焦；否则创建新窗口。
             * 窗口默认居中显示，支持自定义大小、位置、最大化状态等。
             * 
             * @param id - 窗口 ID
             * @param title - 窗口标题
             * @param appId - 应用 ID
             * @param icon - 窗口图标
             * @param options - 窗口配置选项
             */
            openWindow: (id, title, appId, icon, options) => {
                const { windows, maxZIndex } = get()

                // 如果窗口已存在，恢复并聚焦
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

                // 发布应用启动事件，让进程管理器创建进程
                eventBus.emit('app:launched', { appId, windowId: id })

                // 计算居中位置
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
                    componentProps,
                    icon,
                    appId,
                    taskbarPosition,
                    titleBarColor,
                    isDefaultTitle,
                    isResizable,
                    hideTitleBar,
                    isSidebar
                }

                set(state => ({
                    windows: { ...state.windows, [id]: newWindow },
                    activeWindowId: id,
                    maxZIndex: newZ
                }))

                eventBus.emit('window:opened', { id, appId })
            },

            /**
             * 启动应用
             * 
             * 支持多实例模式，如果应用已打开且不支持多实例，则聚焦现有窗口。
             * 
             * @param id - 窗口 ID
             * @param title - 窗口标题
             * @param appId - 应用 ID
             * @param icon - 窗口图标
             * @param options - 窗口配置选项
             */
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
                
                // Remove from launching list after a delay
                setTimeout(() => {
                    set(state => ({ launchingAppIds: state.launchingAppIds.filter(appId => appId !== id) }))
                }, 1000)
            },

            /**
             * 关闭窗口
             * 
             * 清理窗口状态、快照缓存，并发布关闭事件。
             * 
             * @param id - 窗口 ID
             */
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

                // 发布关闭事件，让进程管理器处理
                eventBus.emit('window:closed', { id, appId: window?.appId })
                if (window?.appId) {
                    eventBus.emit('app:closed', { appId: window.appId, windowId: id })
                }
            },

            /**
             * 关闭所有窗口
             * 
             * 用于系统关机或重启
             */
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

            /**
             * 聚焦窗口
             * 
             * 性能优化：
             * - 如果窗口已经是顶层且活跃，跳过更新
             * - 只要窗口不是最顶层，就强制提升 z-index，确保点击任务栏时置顶
             * 
             * @param id - 窗口 ID
             */
            focusWindow: (id) => {
                const { activeWindowId, maxZIndex, windows } = get()
                const targetWindow = windows[id]
                if (!targetWindow) return

                // 优化：如果已经是顶层且活跃，跳过更新
                if (activeWindowId === id && !targetWindow.isMinimized && targetWindow.zIndex === maxZIndex) {
                    return
                }

                // 强制提升 z-index
                // 之前的虚拟化逻辑会导致点击任务栏时，如果窗口处于第4层及以下，只更新 activeId 但不提升 zIndex
                // 从而导致窗口虽然被激活了，但依然被上面的窗口遮挡
                const newZ = maxZIndex + 1
                set(state => ({
                    activeWindowId: id,
                    maxZIndex: newZ,
                    windows: {
                        ...state.windows,
                        [id]: { ...targetWindow, zIndex: newZ, isMinimized: false }
                    }
                }))

                eventBus.emit('window:focused', { id })
            },

            /**
             * 最小化窗口
             * 
             * @param id - 窗口 ID
             */
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

            /**
             * 最大化/还原窗口
             * 
             * 保存最大化前的位置和大小，用于还原。
             * 
             * @param id - 窗口 ID
             */
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

            /**
             * 设置窗口快照
             * 
             * 使用 LRU 策略，超过最大数量时删除最旧的快照。
             * 
             * @param id - 窗口 ID
             * @param dataUrl - 快照 Data URL
             */
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

            /**
             * 获取窗口快照
             * 
             * @param id - 窗口 ID
             * @returns 快照 Data URL
             */
            getSnapshot: (id) => {
                return get().snapshotCache.get(id)
            },

            /**
             * 清除窗口快照
             * 
             * @param id - 窗口 ID
             */
            clearSnapshot: (id) => {
                get().snapshotCache.delete(id)
            },

            /**
             * 设置预览窗口 ID（Peek 模式）
             * 
             * @param id - 窗口 ID 或 null
             */
            setPeekWindowId: (id) => {
                set({ peekWindowId: id })
            }
        }),
        {
            name: 'window-storage',
            version: 1,
            /**
             * 迁移函数：清理持久化状态中的不可序列化字段
             */
            migrate: (persistedState: any) => {
                // 清理 icon 字段（React 组件无法序列化）
                if (persistedState && typeof persistedState === 'object' && persistedState.windows) {
                    Object.keys(persistedState.windows).forEach((key) => {
                        const win = persistedState.windows[key]
                        if (win && win.icon) {
                            delete win.icon
                        }
                    })
                }
                return persistedState
            },
            /**
             * 部分持久化：排除不可序列化的字段
             */
            partialize: (state) => {
                // 排除 icon 字段
                const windowsWithoutIcons = Object.fromEntries(
                    Object.entries(state.windows).map(([id, win]) => {
                        const { icon, ...rest } = win
                        return [id, rest]
                    })
                )
                return {
                    windows: windowsWithoutIcons,
                    activeWindowId: state.activeWindowId,
                    maxZIndex: state.maxZIndex,
                    launchingAppIds: state.launchingAppIds
                }
            },
            /**
             * 水合后回调：重置非持久化状态
             */
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // 重置快照缓存和预览状态
                    state.snapshotCache = new Map()
                    state.peekWindowId = null
                }
            }
        }
    )
)

// --- 系统集成 ---

/**
 * 监听进程终止事件，确保窗口在进程死亡时关闭
 */
eventBus.on('process:killed', ({ windowId }) => {
    if (windowId) {
        useWindowStore.getState().closeWindow(windowId)
    }
})
