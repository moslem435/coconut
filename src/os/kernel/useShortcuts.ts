import { useEffect, useRef } from 'react'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useWindowId } from '@/os/kernel/WindowContext'

type ShortcutHandler = (e: KeyboardEvent) => void
type Shortcuts = Record<string, ShortcutHandler>

/**
 * Hook to handle keyboard shortcuts.
 * Shortcuts are only triggered when the component's window is active.
 * 
 * @param shortcuts Object mapping key combos to handlers.
 * Example: { 'Ctrl+S': (e) => { e.preventDefault(); save(); } }
 * Supported modifiers: Ctrl, Alt, Shift, Meta
 */
export function useShortcuts(shortcuts: Shortcuts) {
    const windowId = useWindowId()
    const activeWindowId = useWindowStore(state => state.activeWindowId)
    
    // Use ref to avoid re-binding event listener when shortcuts object reference changes
    const shortcutsRef = useRef(shortcuts)
    useEffect(() => {
        shortcutsRef.current = shortcuts
    }, [shortcuts])

    useEffect(() => {
        // If we are inside a window, only trigger if it's active
        if (windowId && windowId !== activeWindowId) return

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toUpperCase()
            // Ignore isolated modifier presses
            if (['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key)) return

            // Iterate over registered shortcuts
            for (const [combo, handler] of Object.entries(shortcutsRef.current)) {
                const parts = combo.split('+').map(p => p.trim())
                const targetKey = parts.pop()?.toUpperCase()
                
                if (targetKey !== key) continue

                // Check modifiers
                const requiresCtrl = parts.includes('Ctrl')
                const requiresAlt = parts.includes('Alt')
                const requiresShift = parts.includes('Shift')
                const requiresMeta = parts.includes('Meta')

                // Strict check: Exact match of modifiers
                if (
                    e.ctrlKey === requiresCtrl &&
                    e.altKey === requiresAlt &&
                    e.shiftKey === requiresShift &&
                    e.metaKey === requiresMeta
                ) {
                    handler(e)
                    // Stop after first match to prevent double firing if multiple shortcuts match (unlikely with strict check)
                    return 
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [windowId, activeWindowId])
}
