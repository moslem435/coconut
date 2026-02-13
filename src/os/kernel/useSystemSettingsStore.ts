'use client'

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

export type ThemeMode = 'dark' | 'light'

export interface Wallpaper {
    type: 'preset' | 'image' | 'solid' | 'video'
    value: string
}

export interface SystemSettings {
    theme: ThemeMode
    accentColor: string
    useTransparency: boolean
    useAnimations: boolean
    useTaskbarPreviews: boolean
    skipBootSequence: boolean
    iconTheme: 'filled' | 'line'
    displayScale: number
    volume: number
    isMuted: boolean
    snapToGrid: boolean
    showWeatherWidget: boolean
    pinnedAppIds: string[]
    wallpaper: Wallpaper
}

interface SystemSettingsActions {
    setTheme: (theme: ThemeMode) => void
    setAccentColor: (color: string) => void
    setUseTransparency: (enable: boolean) => void
    setUseAnimations: (enable: boolean) => void
    setUseTaskbarPreviews: (enable: boolean) => void
    setSkipBootSequence: (enable: boolean) => void
    setIconTheme: (theme: 'filled' | 'line') => void
    setDisplayScale: (scale: number) => void
    setVolume: (volume: number) => void
    setMuted: (muted: boolean) => void
    toggleMute: () => void
    setSnapToGrid: (enable: boolean) => void
    setShowWeatherWidget: (enable: boolean) => void
    pinApp: (appId: string) => void
    unpinApp: (appId: string) => void
    setWallpaper: (wallpaper: Wallpaper) => void
    isSettingsLoaded: boolean
}

type SystemSettingsState = SystemSettings & SystemSettingsActions

const DEFAULT_SETTINGS: SystemSettings = {
    theme: 'dark',
    accentColor: '#06b6d4',
    useTransparency: true,
    useAnimations: true,
    useTaskbarPreviews: true,
    skipBootSequence: false,
    iconTheme: 'filled',
    displayScale: 100,
    volume: 75,
    isMuted: false,
    snapToGrid: true,
    showWeatherWidget: true,
    pinnedAppIds: ['portfolio-hub', 'vscode-lite'],
    wallpaper: {
        type: 'preset',
        value: 'linear-gradient(to bottom right, var(--os-bg-base), var(--os-accent-dim))'
    }
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
                setUseAnimations: (enable) => set({ useAnimations: enable }),
                setUseTaskbarPreviews: (enable) => set({ useTaskbarPreviews: enable }),
                setSkipBootSequence: (enable) => set({ skipBootSequence: enable }),
                setIconTheme: (theme) => set({ iconTheme: theme }),
                setDisplayScale: (scale) => set({ displayScale: scale }),
                setVolume: (volume) => set({ volume }),
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
            }),
            {
                name: 'cloud-os-settings',
                partialize: (state) => {
                    // Exclude actions and isSettingsLoaded from persistence
                    const { isSettingsLoaded, setTheme, setAccentColor, setUseTransparency,
                        setUseAnimations, setUseTaskbarPreviews, setSkipBootSequence,
                        setIconTheme, setDisplayScale, setVolume, setMuted, toggleMute,
                        setSnapToGrid, setShowWeatherWidget, pinApp, unpinApp, setWallpaper,
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
// DOM Side Effects (replaces the 4 useEffects from SystemSettingsContext)
// These run outside React, triggered by Zustand subscribe.
// ============================================================================

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

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

function applyDisplayScale(scale: number) {
    document.documentElement.style.fontSize = `${16 * scale / 100}px`
}

// Subscribe to state changes and apply DOM side effects
if (typeof window !== 'undefined') {
    // Apply initial state on load
    const initialState = useSystemSettingsStore.getState()
    applyTheme(initialState.theme, initialState.useTransparency)
    applyAccentColor(initialState.accentColor)
    applyDisplayScale(initialState.displayScale)

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
}
