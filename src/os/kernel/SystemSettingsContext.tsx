'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export type ThemeMode = 'dark' | 'light'

export interface Wallpaper {
    type: 'preset' | 'image' | 'solid' | 'video'
    value: string // css background value, image url, or video url
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

interface SystemSettingsContextType extends SystemSettings {
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
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined)

const DEFAULT_SETTINGS: SystemSettings = {
    theme: 'dark',
    accentColor: '#06b6d4', // Cyan-500
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
    pinnedAppIds: ['portfolio-hub', 'browser'], // Default pinned apps
    wallpaper: {
        type: 'preset',
        value: 'linear-gradient(to bottom right, var(--os-bg-base), var(--os-accent-dim))'
    }
}

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
    // Initialize state from localStorage if available, otherwise defaults
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)

    // Load settings on mount
    useEffect(() => {
        const saved = localStorage.getItem('cloud-os-settings')
        if (saved) {
            try {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
            } catch (e) {
                console.error('Failed to parse settings', e)
            }
        }
    }, [])

    // Save settings on change
    useEffect(() => {
        localStorage.setItem('cloud-os-settings', JSON.stringify(settings))
    }, [settings])

    // Apply Theme
    useEffect(() => {
        const root = document.documentElement
        root.dataset.theme = settings.theme
        root.dataset.transparency = settings.useTransparency.toString()
        
        // Remove class manipulation as we now use data-theme
        if (settings.theme === 'dark') {
            root.classList.add('dark')
            root.classList.remove('light')
        } else {
            root.classList.add('light')
            root.classList.remove('dark')
        }
    }, [settings.theme, settings.useTransparency])

    // Apply CSS Variables for Accent Color Only
    useEffect(() => {
        const root = document.documentElement

        // Helper to convert hex to rgb
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null
        }

        const rgb = hexToRgb(settings.accentColor)
        if (rgb) {
            // Set accent color variables
            root.style.setProperty('--os-accent', settings.accentColor)
            root.style.setProperty('--os-accent-dim', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`)
            root.style.setProperty('--os-accent-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`)
            root.style.setProperty('--os-border-active', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`)
        }

        // Removed: Hardcoded theme color injections (moved to globals.css)
        
    }, [settings.accentColor])

    // Apply Display Scale
    useEffect(() => {
        // We'll use zoom for scale, or font-size on root
        // Zoom is non-standard but works well for this "OS" simulation feeling
        // Alternatively, we can scale specific root container
        const scale = settings.displayScale / 100
        document.documentElement.style.fontSize = `${16 * scale}px`
        // Or allow body zoom
        // document.body.style.zoom = `${settings.displayScale}%` 
        // Stick to font-size for rem-based scaling which is safer for layout
    }, [settings.displayScale])


    // Setters
    const setTheme = (theme: ThemeMode) => setSettings(p => ({ ...p, theme }))
    const setAccentColor = (color: string) => setSettings(p => ({ ...p, accentColor: color }))
    const setUseTransparency = (enable: boolean) => setSettings(p => ({ ...p, useTransparency: enable }))
    const setUseAnimations = (enable: boolean) => setSettings(p => ({ ...p, useAnimations: enable }))
    const setUseTaskbarPreviews = (enable: boolean) => setSettings(p => ({ ...p, useTaskbarPreviews: enable }))
    const setSkipBootSequence = (enable: boolean) => setSettings(p => ({ ...p, skipBootSequence: enable }))
    const setIconTheme = (theme: 'filled' | 'line') => setSettings(p => ({ ...p, iconTheme: theme }))
    const setDisplayScale = (scale: number) => setSettings(p => ({ ...p, displayScale: scale }))
    const setVolume = (volume: number) => setSettings(p => ({ ...p, volume }))
    const setMuted = (muted: boolean) => setSettings(p => ({ ...p, isMuted: muted }))
    const toggleMute = () => setSettings(p => ({ ...p, isMuted: !p.isMuted }))
    const setSnapToGrid = (enable: boolean) => setSettings(p => ({ ...p, snapToGrid: enable }))
    const setShowWeatherWidget = (enable: boolean) => setSettings(p => ({ ...p, showWeatherWidget: enable }))
    
    const pinApp = (appId: string) => setSettings(p => {
        if (p.pinnedAppIds.includes(appId)) return p
        return { ...p, pinnedAppIds: [...p.pinnedAppIds, appId] }
    })

    const unpinApp = (appId: string) => setSettings(p => ({
        ...p,
        pinnedAppIds: p.pinnedAppIds.filter(id => id !== appId)
    }))

    const setWallpaper = (wallpaper: Wallpaper) => setSettings(p => ({ ...p, wallpaper }))

    return (
        <SystemSettingsContext.Provider value={{
            ...settings,
            setTheme,
            setAccentColor,
            setUseTransparency,
            setUseAnimations,
            setUseTaskbarPreviews,
            setSkipBootSequence,
            setIconTheme,
            setDisplayScale,
            setVolume,
            setMuted,
            toggleMute,
            setSnapToGrid,
        setShowWeatherWidget,
        pinApp,
        unpinApp,
            setWallpaper
        }}>
            {children}
        </SystemSettingsContext.Provider>
    )
}

export function useSystemSettings() {
    const context = useContext(SystemSettingsContext)
    if (context === undefined) {
        throw new Error('useSystemSettings must be used within a SystemSettingsProvider')
    }
    return context
}
