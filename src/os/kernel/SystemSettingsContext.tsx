'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export type ThemeMode = 'dark' | 'light'

export interface SystemSettings {
    theme: ThemeMode
    accentColor: string
    useTransparency: boolean
    useAnimations: boolean
    displayScale: number
    volume: number
    isMuted: boolean
}

interface SystemSettingsContextType extends SystemSettings {
    setTheme: (theme: ThemeMode) => void
    setAccentColor: (color: string) => void
    setUseTransparency: (enable: boolean) => void
    setUseAnimations: (enable: boolean) => void
    setDisplayScale: (scale: number) => void
    setVolume: (volume: number) => void
    setMuted: (muted: boolean) => void
    toggleMute: () => void
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined)

const DEFAULT_SETTINGS: SystemSettings = {
    theme: 'dark',
    accentColor: '#06b6d4', // Cyan-500
    useTransparency: true,
    useAnimations: true,
    displayScale: 100,
    volume: 75,
    isMuted: false,
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
        if (settings.theme === 'dark') {
            root.classList.add('dark')
            root.classList.remove('light')
        } else {
            root.classList.add('light')
            root.classList.remove('dark')
        }
    }, [settings.theme])

    // Apply CSS Variables for Appearance
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

        // Set transparency and Theme Colors
        if (settings.useTransparency) {
            if (settings.theme === 'dark') {
                // Dark Mode: Deep gray instead of pitch black, subtle frosted glass
                root.style.setProperty('--os-bg-window', 'rgba(30, 30, 30, 0.75)')
                root.style.setProperty('--os-bg-base', '#1a1a1a') // Softer textured dark background base
                root.style.setProperty('--os-bg-panel', 'rgba(40, 40, 40, 0.65)')

                root.style.setProperty('--os-text-primary', 'rgba(255, 255, 255, 0.92)')
                root.style.setProperty('--os-text-secondary', 'rgba(255, 255, 255, 0.65)')
                root.style.setProperty('--os-text-muted', 'rgba(255, 255, 255, 0.45)')

                root.style.setProperty('--os-border', 'rgba(255, 255, 255, 0.08)')
                root.style.setProperty('--os-hover-bg', 'rgba(255, 255, 255, 0.1)')
            } else {
                // Light Mode: Airy, clean, paper-like
                root.style.setProperty('--os-bg-window', 'rgba(255, 255, 255, 0.85)')
                root.style.setProperty('--os-bg-base', '#f5f5f7') // Apple-like light gray
                root.style.setProperty('--os-bg-panel', 'rgba(255, 255, 255, 0.65)')

                root.style.setProperty('--os-text-primary', '#1d1d1f')
                root.style.setProperty('--os-text-secondary', '#86868b')
                root.style.setProperty('--os-text-muted', '#aeaeb2')

                root.style.setProperty('--os-border', 'rgba(0, 0, 0, 0.04)') // Very subtle separation
                root.style.setProperty('--os-hover-bg', 'rgba(0, 0, 0, 0.05)')
            }
            root.style.setProperty('--os-backdrop-blur', 'blur(25px)') // Heavy blur for "Frosted Film" look
        } else {
            // Solid Colors (Transparency Off)
            if (settings.theme === 'dark') {
                root.style.setProperty('--os-bg-window', '#1e1e1e')
                root.style.setProperty('--os-bg-base', '#121212')
                root.style.setProperty('--os-bg-panel', '#252525')

                root.style.setProperty('--os-text-primary', 'rgba(255, 255, 255, 0.95)')
                root.style.setProperty('--os-text-secondary', 'rgba(255, 255, 255, 0.7)')
                root.style.setProperty('--os-text-muted', 'rgba(255, 255, 255, 0.4)')

                root.style.setProperty('--os-border', 'rgba(255, 255, 255, 0.1)')
                root.style.setProperty('--os-hover-bg', 'rgba(255, 255, 255, 0.1)')
            } else {
                root.style.setProperty('--os-bg-window', '#ffffff')
                root.style.setProperty('--os-bg-base', '#f5f5f7')
                root.style.setProperty('--os-bg-panel', '#ffffff')

                root.style.setProperty('--os-text-primary', '#1d1d1f')
                root.style.setProperty('--os-text-secondary', '#86868b')
                root.style.setProperty('--os-text-muted', '#aeaeb2')

                root.style.setProperty('--os-border', 'rgba(0, 0, 0, 0.08)')
                root.style.setProperty('--os-hover-bg', 'rgba(0, 0, 0, 0.05)')
            }
            root.style.setProperty('--os-backdrop-blur', 'none')
        }

        // Update global CSS variable for other components to use
        // Note: We're manipulating specific variables defined in globals.css
    }, [settings.accentColor, settings.useTransparency, settings.theme])

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
    const setDisplayScale = (scale: number) => setSettings(p => ({ ...p, displayScale: scale }))
    const setVolume = (volume: number) => setSettings(p => ({ ...p, volume }))
    const setMuted = (muted: boolean) => setSettings(p => ({ ...p, isMuted: muted }))
    const toggleMute = () => setSettings(p => ({ ...p, isMuted: !p.isMuted }))

    return (
        <SystemSettingsContext.Provider value={{
            ...settings,
            setTheme,
            setAccentColor,
            setUseTransparency,
            setUseAnimations,
            setDisplayScale,
            setVolume,
            setMuted,
            toggleMute
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
