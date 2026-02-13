'use client'

import React, { ReactNode } from 'react'
import { useSystemSettingsStore } from './useSystemSettingsStore'

// Re-export types for backward compatibility
export type { ThemeMode, SystemSettings, Wallpaper } from './useSystemSettingsStore'

/**
 * Compatibility shim: The actual state is now managed by useSystemSettingsStore (Zustand).
 * This hook preserves the original interface so existing consumers need no changes.
 */
export function useSystemSettings() {
    return useSystemSettingsStore()
}

/**
 * Compatibility shim: SystemSettingsProvider is now a passthrough.
 * Zustand stores don't need a Provider wrapper.
 * DOM side effects are handled by Zustand subscriptions in useSystemSettingsStore.ts.
 */
export function SystemSettingsProvider({ children }: { children: ReactNode }) {
    return <>{children}</>
}
