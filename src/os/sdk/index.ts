import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useShallow } from 'zustand/react/shallow'
import { useCallback } from 'react'

// ============================================================================
// Types
// ============================================================================

export type { WindowState } from '@/os/kernel/useWindowStore'
export type { ThemeMode, SystemSettings } from '@/os/kernel/SystemSettingsContext'

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access system-wide settings like theme, volume, and accent color.
 */
export function useSystem() {
    const settings = useSystemSettings()
    const { language, setLanguage, toggleLanguage } = useLanguage()

    return {
        // State
        theme: settings.theme,
        accentColor: settings.accentColor,
        useTransparency: settings.useTransparency,
        useAnimations: settings.useAnimations,
        useTaskbarPreviews: settings.useTaskbarPreviews,
        iconTheme: settings.iconTheme,
        displayScale: settings.displayScale,
        wallpaper: settings.wallpaper,

        isMuted: settings.isMuted,
        volume: settings.volume,
        language: language,

        // Actions
        setTheme: settings.setTheme,
        setAccentColor: settings.setAccentColor,
        setUseTransparency: settings.setUseTransparency,
        setUseAnimations: settings.setUseAnimations,
        setUseTaskbarPreviews: settings.setUseTaskbarPreviews,
        setIconTheme: settings.setIconTheme,
        setDisplayScale: settings.setDisplayScale,
        setWallpaper: settings.setWallpaper,

        setVolume: settings.setVolume,
        toggleMute: settings.toggleMute,
        setLanguage: setLanguage,
        toggleLanguage: toggleLanguage,
    }
}

/**
 * Window Management Hook.
 * Provides controls to open, close, and manipulate windows.
 */
export function useWindow() {
    const openWindow = useWindowStore(state => state.openWindow)
    const closeWindow = useWindowStore(state => state.closeWindow)
    const minimizeWindow = useWindowStore(state => state.minimizeWindow)
    const maximizeWindow = useWindowStore(state => state.maximizeWindow)

    // Safe helper to check if a window is open
    const isWindowOpen = useCallback((id: string) => {
        return useWindowStore.getState().windows[id]?.isOpen ?? false
    }, [])

    return {
        open: openWindow,
        close: closeWindow,
        minimize: minimizeWindow,
        maximize: maximizeWindow,
        isOpen: isWindowOpen,
    }
}

/**
 * Hook to access specific window state.
 * Recommended for use inside an App component.
 */
export function useWindowState(id: string) {
    return useWindowStore(useShallow(state => state.windows[id]))
}
