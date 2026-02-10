import { useEffect, useRef } from 'react'
import { useSystemStore } from '@/os/kernel/useSystemStore'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useShortcuts } from '@/os/kernel/useShortcuts'

export default function GlobalShortcuts() {
    const { toggleStartMenu, setStartMenuOpen } = useSystemStore()
    const { minimizeAll, closeWindow, activeWindowId, openWindow } = useWindowStore()
    
    // Meta Key Logic State
    const metaPressedRef = useRef(false)
    const otherKeyPressedRef = useRef(false)

    // Standard Shortcuts using the hook
    useShortcuts({
        'Meta + D': (e) => {
            e.preventDefault()
            minimizeAll()
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
            openWindow('system/file-explorer')
        },
        'Meta + I': (e) => {
            e.preventDefault()
            openWindow('system/settings')
        },
        'Meta + R': (e) => {
            e.preventDefault()
            openWindow('system/terminal')
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
