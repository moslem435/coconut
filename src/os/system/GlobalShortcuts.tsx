import { useEffect, useRef } from 'react'
import { useSystemStore } from '@/os/kernel/useSystemStore'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useShortcuts } from '@/os/kernel/useShortcuts'
import { APPS_REGISTRY } from '@/os/registry/config'

export default function GlobalShortcuts() {
    const { toggleStartMenu, setStartMenuOpen } = useSystemStore()
    const { showDesktop, closeWindow, activeWindowId, launchApp } = useWindowStore()

    // Meta Key Logic State
    const metaPressedRef = useRef(false)
    const otherKeyPressedRef = useRef(false)

    // Helper to launch by ID
    const launchById = (appId: string) => {
        const app = APPS_REGISTRY[appId]
        if (app) {
            launchApp(
                app.id,
                app.title,
                <app.component />,
                app.icon,
                { ...app.defaultWindowOptions, isDefaultTitle: true }
            )
        }
    }

    // Standard Shortcuts using the hook
    useShortcuts({
        'Meta + D': (e) => {
            e.preventDefault()
            showDesktop()
            // Also close start menu if open
            setStartMenuOpen(false)
        },
        'Alt + F4': (e) => {
            e.preventDefault()
            if (activeWindowId) {
                closeWindow(activeWindowId)
            }
        },
        'Meta + E': (e) => {
            e.preventDefault()
            launchById('file-explorer')
        },
        'Meta + I': (e) => {
            e.preventDefault()
            launchById('settings')
        },
        'Meta + R': (e) => {
            e.preventDefault()
            launchById('terminal')
        }
    })

    // Specialized Meta Key Handler (for Start Menu toggle)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Meta') {
                metaPressedRef.current = true
                otherKeyPressedRef.current = false
            } else {
                if (metaPressedRef.current) {
                    otherKeyPressedRef.current = true
                }
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Meta') {
                // Only toggle if no other key was pressed while Meta was held
                if (metaPressedRef.current && !otherKeyPressedRef.current) {
                    toggleStartMenu()
                }
                metaPressedRef.current = false
            }
        }

        // Use capture to ensure we get these events early
        window.addEventListener('keydown', handleKeyDown, { capture: true })
        window.addEventListener('keyup', handleKeyUp, { capture: true })

        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true })
            window.removeEventListener('keyup', handleKeyUp, { capture: true })
        }
    }, [toggleStartMenu])

    return null
}
