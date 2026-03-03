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

export { useFileSystem } from './hooks/useFileSystem'
export { useProcess } from './hooks/useProcess'

// ============================================================================
// Imperative API
// ============================================================================
export { System } from './system'

/**
 * Access system-wide settings like theme, volume, and accent color.
 */
export function useSystem() {
    const settings = useSystemSettings()
    const { language, setLanguage, toggleLanguage } = useLanguage()

    return {
        // State
        isLoaded: settings.isSettingsLoaded,
        theme: settings.theme,
        accentColor: settings.accentColor,
        useTransparency: settings.useTransparency,
        transparencyLevel: settings.transparencyLevel,
        blurLevel: settings.blurLevel,
        useAnimations: settings.useAnimations,
        useTaskbarPreviews: settings.useTaskbarPreviews,
        iconTheme: settings.iconTheme,
        displayScale: settings.displayScale,
        skipBootSequence: settings.skipBootSequence,
        wallpaper: settings.wallpaper,

        isMuted: settings.isMuted,
        volume: settings.volume,
        brightness: settings.brightness,
        language: language,

        // Actions
        setTheme: settings.setTheme,
        setAccentColor: settings.setAccentColor,
        setUseTransparency: settings.setUseTransparency,
        setTransparencyLevel: settings.setTransparencyLevel,
        setBlurLevel: settings.setBlurLevel,
        setUseAnimations: settings.setUseAnimations,
        setUseTaskbarPreviews: settings.setUseTaskbarPreviews,
        setSkipBootSequence: settings.setSkipBootSequence,
        setIconTheme: settings.setIconTheme,
        setDisplayScale: settings.setDisplayScale,
        setWallpaper: settings.setWallpaper,

        setVolume: settings.setVolume,
        setBrightness: settings.setBrightness,
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
    const updateWindow = useWindowStore(state => state.updateWindow)
    const launchApp = useWindowStore(state => state.launchApp)

    // Safe helper to check if a window is open
    const isWindowOpen = useCallback((id: string) => {
        return useWindowStore.getState().windows[id]?.isOpen ?? false
    }, [])

    return {
        open: openWindow,
        close: closeWindow,
        minimize: minimizeWindow,
        maximize: maximizeWindow,
        update: updateWindow,
        launch: launchApp,
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

/**
 * Hook for internationalization.
 */
export function useTranslation() {
    const { t, language } = useLanguage()
    return { t, language }
}
