'use client'

import { useRef, useState, useLayoutEffect } from 'react'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { APPS_REGISTRY } from '@/os/registry/config'
import { AppIcon } from '@/os/ui/AppIcon'
import { Tooltip } from '@/os/ui/Tooltip'
import { WindowPreview } from './WindowPreview'
import { AnimatePresence } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'

interface TaskbarItemProps {
    id: string // windowId or appId
    appId: string
}

export function TaskbarItem({ id, appId }: TaskbarItemProps) {
    const { t } = useLanguage()
    const { useTaskbarPreviews } = useSystemSettings()
    const buttonRef = useRef<HTMLButtonElement>(null)
    const peekTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    
    // Select specific window state - specific fields to avoid re-renders on position change
    const windowState = useWindowStore(useShallow(state => {
        const win = state.windows[id]
        return {
            isOpen: !!win && win.isOpen,
            isMinimized: !!win && win.isMinimized,
            title: win?.title, // fallback to app title later
            icon: win?.icon,   // fallback to app icon later
            isDefaultTitle: win?.isDefaultTitle
        }
    }))
    
    const isActive = useWindowStore(state => state.activeWindowId === id)
    const isLoading = useWindowStore(state => state.launchingAppIds.includes(appId) && !windowState.isOpen)
    const snapshot = useWindowStore(state => state.getSnapshot(id))
    
    // Actions
    const focusWindow = useWindowStore(state => state.focusWindow)
    const minimizeWindow = useWindowStore(state => state.minimizeWindow)
    const launchApp = useWindowStore(state => state.launchApp)
    const updateTaskbarPosition = useWindowStore(state => state.updateTaskbarPosition)
    const setPeekWindowId = useWindowStore(state => state.setPeekWindowId)

    const [hovered, setHovered] = useState(false)
    const hoveredRef = useRef(false)

    const updateHovered = (value: boolean) => {
        setHovered(value)
        hoveredRef.current = value
    }

    // Derived Data
    const app = APPS_REGISTRY[appId]
    const title = windowState.isOpen 
        ? (windowState.isDefaultTitle ? t(`app.${appId}`) : windowState.title)
        : t(`app.${appId}`)
    const icon = windowState.icon || app?.icon

    // Report Position
    useLayoutEffect(() => {
        if (!buttonRef.current || !windowState.isOpen) return
        
        const updatePos = () => {
            const el = buttonRef.current
            if (el) {
                const rect = el.getBoundingClientRect()
                updateTaskbarPosition(id, { x: rect.left + rect.width / 2, y: rect.top })
            }
        }
        
        // Update initially and on resize
        updatePos()
        window.addEventListener('resize', updatePos)
        return () => window.removeEventListener('resize', updatePos)
    }, [id, windowState.isOpen, updateTaskbarPosition])

    const handleClick = (e: React.MouseEvent) => {
        // Clear peek
        updateHovered(false)
        setPeekWindowId(null)
        if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current)

        const isShiftClick = e.shiftKey
        const shouldOpenNew = isShiftClick || (app.multiInstance && !windowState.isOpen)

        if (windowState.isOpen && !isShiftClick) {
            if (isActive && !windowState.isMinimized) {
                minimizeWindow(id)
            } else {
                focusWindow(id)
            }
        } else {
            if (isLoading) return
            if (app) {
                const rect = buttonRef.current?.getBoundingClientRect()
                const taskbarPos = rect ? { x: rect.left + rect.width / 2, y: rect.top } : undefined
                
                // If multiInstance and shift-click (or forced), generate new ID
                // BUT keep original ID for the first instance to match pinned item
                const targetId = (isShiftClick && app.multiInstance) 
                    ? `${app.id}-${Date.now()}` 
                    : app.id

                launchApp(targetId, t(`app.${appId}`), app.id, app.icon, {
                    ...app.defaultWindowOptions,
                    taskbarPosition: taskbarPos,
                    isDefaultTitle: true,
                    multiInstance: app.multiInstance
                })
            }
        }
    }

    const handleAuxClick = (e: React.MouseEvent) => {
        // Middle click to open new instance
        if (e.button === 1 && app?.multiInstance) {
            e.preventDefault()
            const rect = buttonRef.current?.getBoundingClientRect()
            const taskbarPos = rect ? { x: rect.left + rect.width / 2, y: rect.top } : undefined
            
            launchApp(`${app.id}-${Date.now()}`, t(`app.${appId}`), app.id, app.icon, {
                ...app.defaultWindowOptions,
                taskbarPosition: taskbarPos,
                isDefaultTitle: true,
                multiInstance: true
            })
        }
    }

    if (!app) return null

    return (
        <div
            className="relative flex flex-col items-center justify-center"
            onMouseEnter={() => updateHovered(true)}
            onMouseLeave={() => {
                updateHovered(false)
                if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current)
                setPeekWindowId(null)
            }}
        >
            <Tooltip
                content={(!useTaskbarPreviews || !windowState.isOpen) ? title : null}
                side="top"
                offset={20}
            >
                <button
                    ref={buttonRef}
                    onClick={handleClick}
                    onAuxClick={handleAuxClick}
                    onContextMenu={(e) => {
                        e.preventDefault()
                        useContextMenuStore.getState().showMenu(e.clientX, e.clientY, 'taskbar-icon', {
                            windowId: windowState.isOpen ? id : undefined,
                            appId: appId
                        })
                    }}
                    className={`flex items-center justify-center rounded-xl cursor-pointer transition-all duration-200 active:scale-95 relative group ${isLoading ? 'animate-pulse cursor-wait' : ''}`}
                    style={{
                        backgroundColor: isActive && !windowState.isMinimized
                            ? 'var(--os-accent-dim)' 
                            : undefined
                    }}
                >
                    <AppIcon
                        manifest={app}
                        icon={icon}
                        size={32}
                        className="drop-shadow-sm"
                    />

                    {/* Indicator Dot */}
                    {windowState.isOpen && (
                        <div className={`absolute -bottom-1.5 w-1 h-1 rounded-full ${isActive && !windowState.isMinimized ? 'bg-[var(--os-accent)]' : 'bg-[var(--os-text-secondary)]'}`} />
                    )}
                </button>
            </Tooltip>

            {/* Window Preview */}
            <AnimatePresence>
                {useTaskbarPreviews && windowState.isOpen && hovered && (
                    <WindowPreview
                        windowId={id}
                        appId={appId}
                        title={title || ''}
                        icon={icon}
                        isActive={isActive}
                        snapshot={snapshot}
                        onPeek={(shouldPeek) => {
                            if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current)
                            
                            // Prevent peeking if we're not hovered anymore (even if component is exiting)
                            if (shouldPeek && !hoveredRef.current) return

                            if (shouldPeek) {
                                peekTimeoutRef.current = setTimeout(() => {
                                    // Double check before setting state
                                    if (hoveredRef.current) {
                                        setPeekWindowId(id)
                                    }
                                }, 200)
                            } else {
                                setPeekWindowId(null)
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
