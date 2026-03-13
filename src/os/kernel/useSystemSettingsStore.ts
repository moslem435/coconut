'use client'

/**
 * @fileoverview 系统设置 Store - 外观、主题、声音、壁纸等全局设置管理
 * 
 * 架构亮点：
 * - 使用 subscribeWithSelector 中间件：支持对具体字段订阅，适用于 DOM 副作用
 * - DOM 副作用在 Store 外部处理：避免在 React 组件内添加 useEffect，使应用弹性更强
 * - 副作用包括：应用主题类、主题色、显示缩放、亮度遮罩层
 * 
 * @author yume
 * @created 2026-02-13
 * @lastModified 2026-03-12
 * @module src/os/kernel/useSystemSettingsStore
 */

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

/** 主题模式类型 */
export type ThemeMode = 'dark' | 'light'

/** 壁纸配置类型 */
export interface Wallpaper {
    type: 'preset' | 'image' | 'solid' | 'video' | 'daily' | 'dynamic-time'
    value: string
}

/**
 * 全局系统设置字段定义
 */
export interface SystemSettings {
    theme: ThemeMode
    accentColor: string
    useTransparency: boolean
    transparencyLevel: number
    blurLevel: number
    useAnimations: boolean
    useTaskbarPreviews: boolean
    skipBootSequence: boolean
    iconTheme: 'filled' | 'line'
    displayScale: number
    volume: number
    brightness: number
    isMuted: boolean
    snapToGrid: boolean
    showWeatherWidget: boolean
    pinnedAppIds: string[]
    wallpaper: Wallpaper
    devMode: boolean
    useDependencyCache: boolean
    warmupWebContainer: boolean
    isOOBECompleted: boolean
}

interface SystemSettingsActions {
    setTheme: (theme: ThemeMode) => void
    setAccentColor: (color: string) => void
    setUseTransparency: (enable: boolean) => void
    setTransparencyLevel: (level: number) => void
    setBlurLevel: (level: number) => void
    setUseAnimations: (enable: boolean) => void
    setUseTaskbarPreviews: (enable: boolean) => void
    setSkipBootSequence: (enable: boolean) => void
    setIconTheme: (theme: 'filled' | 'line') => void
    setDisplayScale: (scale: number) => void
    setVolume: (volume: number) => void
    setBrightness: (brightness: number) => void
    setMuted: (muted: boolean) => void
    toggleMute: () => void
    setSnapToGrid: (enable: boolean) => void
    setShowWeatherWidget: (enable: boolean) => void
    pinApp: (appId: string) => void
    unpinApp: (appId: string) => void
    setWallpaper: (wallpaper: Wallpaper) => void
    setDevMode: (enable: boolean) => void
    setUseDependencyCache: (enable: boolean) => void
    setWarmupWebContainer: (enable: boolean) => void
    completeOOBE: () => void
    isSettingsLoaded: boolean
}

type SystemSettingsState = SystemSettings & SystemSettingsActions

/** 默认系统设置，新用户首次加载将使用这些值 */
const DEFAULT_SETTINGS: SystemSettings = {
    theme: 'dark',
    accentColor: '#06b6d4',
    useTransparency: true,
    transparencyLevel: 0.65,
    blurLevel: 40,
    useAnimations: true,
    useTaskbarPreviews: true,
    skipBootSequence: false,
    iconTheme: 'filled',
    displayScale: 100,
    volume: 75,
    brightness: 100,
    isMuted: false,
    snapToGrid: true,
    showWeatherWidget: true,
    pinnedAppIds: ['portfolio-hub', 'vscode-lite'],
    wallpaper: {
        type: 'preset',
        value: 'linear-gradient(to bottom right, var(--os-bg-base), var(--os-accent-dim))'
    },
    devMode: false,
    useDependencyCache: false,
    warmupWebContainer: false,
    isOOBECompleted: false
}

export const useSystemSettingsStore = create<SystemSettingsState>()(
    subscribeWithSelector(
        persist(
            (set) => ({
                ...DEFAULT_SETTINGS,
                isSettingsLoaded: false,

                setTheme: (theme) => set({ theme }),
                setAccentColor: (color) => set({ accentColor: color }),
                setUseTransparency: (enable) => set({ useTransparency: enable }),
                setTransparencyLevel: (level) => set({ transparencyLevel: level }),
                setBlurLevel: (level) => set({ blurLevel: level }),
                setUseAnimations: (enable) => set({ useAnimations: enable }),
                setUseTaskbarPreviews: (enable) => set({ useTaskbarPreviews: enable }),
                setSkipBootSequence: (enable) => set({ skipBootSequence: enable }),
                setIconTheme: (theme) => set({ iconTheme: theme }),
                setDisplayScale: (scale) => set({ displayScale: scale }),
                setVolume: (volume) => set({ volume }),
                setBrightness: (brightness) => set({ brightness }),
                setMuted: (muted) => set({ isMuted: muted }),
                toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
                setSnapToGrid: (enable) => set({ snapToGrid: enable }),
                setShowWeatherWidget: (enable) => set({ showWeatherWidget: enable }),
                pinApp: (appId) => set((state) => {
                    if (state.pinnedAppIds.includes(appId)) return state
                    return { pinnedAppIds: [...state.pinnedAppIds, appId] }
                }),
                unpinApp: (appId) => set((state) => ({
                    pinnedAppIds: state.pinnedAppIds.filter(id => id !== appId)
                })),
                setWallpaper: (wallpaper) => set({ wallpaper }),
                setDevMode: (enable) => set({ devMode: enable }),
                setUseDependencyCache: (enable) => set({ useDependencyCache: enable }),
                setWarmupWebContainer: (enable) => set({ warmupWebContainer: enable }),
                completeOOBE: () => set({ isOOBECompleted: true }),
            }),
            {
                name: 'cloud-os-settings',
                partialize: (state) => {
                    // Exclude actions and isSettingsLoaded from persistence
                    const { isSettingsLoaded, setTheme, setAccentColor, setUseTransparency,
                        setTransparencyLevel, setBlurLevel, setUseAnimations, setUseTaskbarPreviews, setSkipBootSequence,
                        setIconTheme, setDisplayScale, setVolume, setBrightness, setMuted, toggleMute,
                        setSnapToGrid, setShowWeatherWidget, pinApp, unpinApp, setWallpaper, setDevMode,
                        setUseDependencyCache, setWarmupWebContainer, completeOOBE,
                        ...settings } = state
                    return settings
                },
                onRehydrateStorage: () => {
                    return (_state, error) => {
                        if (!error) {
                            useSystemSettingsStore.setState({ isSettingsLoaded: true })
                        }
                    }
                },
            }
        )
    )
)

// ============================================================================
// DOM 副作用（替代 React 组件中的 useEffect）
// 为什么在 Store 外部处理而非 React 组件内部：
// - 避免每次设置变化时都需要组件已挂载
// - Store 订阅在应用启动时立即生效，即使没有任何组件渲染
// ============================================================================

/**
 * 将十六进制颜色转换为 RGB 分量
 * 用于 CSS 变量设置 rgba()时提取颜色分量
 */
function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16)
    } : null
}

/**
 * 应用主题和透明度设置到 DOM
 * 为什么用 data attribute：方便 CSS 选择器匹配，如 [data-theme='dark']
 */
function applyTheme(theme: ThemeMode, useTransparency: boolean) {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.transparency = useTransparency.toString()
    if (theme === 'dark') {
        root.classList.add('dark')
        root.classList.remove('light')
    } else {
        root.classList.add('light')
        root.classList.remove('dark')
    }
}

/**
 * 将主题色应用到 CSS 变量
 * 为什么需要三个变川：实体色、半透明背景、极小发光三种场景不同
 */
function applyAccentColor(color: string) {
    const root = document.documentElement
    const rgb = hexToRgb(color)
    if (rgb) {
        root.style.setProperty('--os-accent', color)
        root.style.setProperty('--os-accent-dim', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`)
        root.style.setProperty('--os-accent-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`)
        root.style.setProperty('--os-border-active', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`)
    }
}

/**
 * 应用显示缩放到 HTML 元素字体大小
 * 为什么用 rem 单位：所有使用 rem 的元素水平缩放，无需修改每个元素
 */
function applyDisplayScale(scale: number) {
    document.documentElement.style.fontSize = `${16 * scale / 100}px`
}

/**
 * 通过黑色遮罩层模拟亮度调节
 * 为什么不用 CSS filter brightness：
 * - filter 会影响子元素的 position: fixed 定位
 * - 遮罩层方案不影响子元素，安全性更高
 */
function applyBrightness(brightness: number) {
    // 方案: 使用遮罩层模拟
    // 计算遮罩透明度: 100% 亮度 = 0 透明度, 0% 亮度 = 0.8 透明度 (避免全黑)
    const opacity = (100 - brightness) / 100 * 0.8;
    let overlay = document.getElementById('brightness-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'brightness-overlay';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.zIndex = '99999'; // 确保在最顶层
        overlay.style.pointerEvents = 'none'; // 点击穿透
        overlay.style.backgroundColor = 'black';
        overlay.style.transition = 'opacity 0.2s ease';
        document.body.appendChild(overlay);
    }
    overlay.style.opacity = opacity.toString();
}

// 应用初始设置并订阅属属变化，实时更新 DOM
if (typeof window !== 'undefined') {
    // 页面加载时立即应用当前设置，避免闪烁
    const initialState = useSystemSettingsStore.getState()
    applyTheme(initialState.theme, initialState.useTransparency)
    applyAccentColor(initialState.accentColor)
    applyDisplayScale(initialState.displayScale)
    applyBrightness(initialState.brightness)

    // Subscribe to future changes
    useSystemSettingsStore.subscribe(
        (state) => ({ theme: state.theme, useTransparency: state.useTransparency }),
        ({ theme, useTransparency }) => applyTheme(theme, useTransparency),
        { equalityFn: (a, b) => a.theme === b.theme && a.useTransparency === b.useTransparency }
    )

    useSystemSettingsStore.subscribe(
        (state) => state.accentColor,
        (color) => applyAccentColor(color)
    )

    useSystemSettingsStore.subscribe(
        (state) => state.displayScale,
        (scale) => applyDisplayScale(scale)
    )

    useSystemSettingsStore.subscribe(
        (state) => state.brightness,
        (brightness) => applyBrightness(brightness)
    )
}
