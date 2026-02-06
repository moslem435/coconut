'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { APPS_REGISTRY } from '@/os/registry/config'
import { AppManifest } from '@/os/registry/types'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useShallow } from 'zustand/react/shallow'

// Grid settings
const GRID_SIZE = 90
const GRID_PADDING = 24

interface DesktopProps {
    onToggleMenu: () => void
}

// Store icon positions
interface IconPosition {
    x: number
    y: number
}

// Helper: snap position to grid
const snapToGridPos = (x: number, y: number) => {
    const col = Math.round((x - GRID_PADDING) / GRID_SIZE)
    const row = Math.round((y - GRID_PADDING) / GRID_SIZE)
    return {
        x: Math.max(GRID_PADDING, col * GRID_SIZE + GRID_PADDING),
        y: Math.max(GRID_PADDING, row * GRID_SIZE + GRID_PADDING)
    }
}

// Helper: check if position is occupied by another icon
const isPositionOccupied = (
    x: number,
    y: number,
    excludeId: string,
    positions: Record<string, IconPosition>
) => {
    return Object.entries(positions).some(([id, pos]) =>
        id !== excludeId &&
        Math.abs(pos.x - x) < GRID_SIZE * 0.8 &&
        Math.abs(pos.y - y) < GRID_SIZE * 0.8
    )
}

// Helper: find nearest free grid position using spiral search
const findFreePosition = (
    x: number,
    y: number,
    excludeId: string,
    positions: Record<string, IconPosition>
): IconPosition => {
    const snapped = snapToGridPos(x, y)

    // First try the exact snapped position
    if (!isPositionOccupied(snapped.x, snapped.y, excludeId, positions)) {
        return snapped
    }

    // Search in expanding spiral pattern
    for (let radius = 1; radius <= 15; radius++) {
        // Check all positions at this radius
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                // Only check perimeter positions
                if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue

                const testX = snapped.x + dx * GRID_SIZE
                const testY = snapped.y + dy * GRID_SIZE

                // Check bounds
                if (testX < GRID_PADDING || testY < GRID_PADDING) continue

                if (!isPositionOccupied(testX, testY, excludeId, positions)) {
                    return { x: testX, y: testY }
                }
            }
        }
    }

    // Fallback: return original snapped position
    return snapped
}

export default function Desktop({ onToggleMenu }: DesktopProps) {
    // System settings
    const { snapToGrid } = useSystemSettings()
    
    // Context Menu
    const showMenu = useContextMenuStore(state => state.showMenu)

    // Actions - stable
    const openWindow = useWindowStore(state => state.openWindow)
    const focusWindow = useWindowStore(state => state.focusWindow)
    // Granular subscription for window status checks
    const windows = useWindowStore(useShallow(state => state.windows))

    const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
    const [iconPositions, setIconPositions] = useState<Record<string, IconPosition>>({})
    const isDragging = useRef(false)

    // Splash screen state: which app is currently splashing
    const [splashingApp, setSplashingApp] = useState<AppManifest | null>(null)
    const [mounted, setMounted] = useState(false)

    // Initialize icon positions in a grid layout (column-first)
    useEffect(() => {
        setMounted(true)
        const apps = Object.values(APPS_REGISTRY)
        const initialPositions: Record<string, IconPosition> = {}

        // Calculate max rows based on viewport
        const maxRows = typeof window !== 'undefined'
            ? Math.floor((window.innerHeight - 150) / GRID_SIZE)
            : 6

        apps.forEach((app, index) => {
            const col = Math.floor(index / maxRows)
            const row = index % maxRows
            initialPositions[app.id] = {
                x: GRID_PADDING + col * GRID_SIZE,
                y: GRID_PADDING + row * GRID_SIZE
            }
        })

        setIconPositions(initialPositions)
    }, [])

    const handleIconClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        // Don't select if we just finished dragging
        if (isDragging.current) {
            isDragging.current = false
            return
        }
        setSelectedIcon(id)
    }

    const handleDoubleClick = (id: string) => {
        // Clear selection immediately
        setSelectedIcon(null)

        // Check if window already exists and is open
        if (windows[id]?.isOpen) {
            focusWindow(id)
            return
        }

        const app = APPS_REGISTRY[id]
        if (!app) return

        // If app has a splash screen, show it first
        if (app.splashScreen) {
            setSplashingApp(app)
        } else {
            // No splash screen, open window directly
            openWindow(
                app.id,
                app.title,
                <app.component />,
                app.icon,
                app.defaultWindowOptions
            )
        }
    }

    // Called when splash screen completes
    const handleSplashComplete = () => {
        if (splashingApp) {
            openWindow(
                splashingApp.id,
                splashingApp.title,
                <splashingApp.component />,
                splashingApp.icon,
                splashingApp.defaultWindowOptions
            )
            setSplashingApp(null)
        }
    }

    const handleDragEnd = (id: string, x: number, y: number) => {
        setIconPositions(prev => {
            if (snapToGrid) {
                // Find free position that doesn't overlap with others
                const freePos = findFreePosition(x, y, id, prev)
                return { ...prev, [id]: freePos }
            } else {
                // Free placement mode - just use the position directly
                return { ...prev, [id]: { x: Math.max(0, x), y: Math.max(0, y) } }
            }
        })
    }

    // Render splash screen via portal
    const SplashComponent = splashingApp?.splashScreen
    const splashPortal = mounted && SplashComponent && createPortal(
        <AnimatePresence>
            <SplashComponent onComplete={handleSplashComplete} />
        </AnimatePresence>,
        document.body
    )

    return (
        <>
            <div
                className="fixed inset-0 font-mono overflow-hidden select-none cursor-default z-0"
                style={{
                    backgroundColor: 'var(--os-bg-base)',
                    color: 'var(--os-text-primary)'
                }}
                onClick={() => {
                    setSelectedIcon(null)
                }}
                onContextMenu={(e) => {
                    e.preventDefault()
                    showMenu(e.clientX, e.clientY, 'desktop')
                }}
            >
                {/* Background Gradient - Ambient Light */}
                <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000 bg-gradient-to-br from-[var(--os-bg-base)] via-[var(--os-bg-base)] to-[var(--os-accent-dim)] opacity-50" />

                {/* Desktop Area */}
                <div className="absolute inset-0 top-6 bottom-24">
                    {Object.values(APPS_REGISTRY).map((app) => {
                        const pos = iconPositions[app.id] || { x: GRID_PADDING, y: GRID_PADDING }
                        return (
                            <motion.div
                                key={app.id}
                                drag
                                dragMomentum={false}
                                dragElastic={0}
                                onDragStart={() => {
                                    setSelectedIcon(null)
                                    isDragging.current = true
                                }}
                                onDragEnd={(_, info) => {
                                    handleDragEnd(app.id, pos.x + info.offset.x, pos.y + info.offset.y)
                                }}
                                initial={false}
                                animate={{
                                    x: pos.x,
                                    y: pos.y
                                }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 400,
                                    damping: 30
                                }}
                                className="absolute group flex flex-col items-center gap-2 w-20 cursor-pointer"
                                onClick={(e) => handleIconClick(app.id, e)}
                                onDoubleClick={() => handleDoubleClick(app.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                style={{ touchAction: 'none' }}
                            >
                                <div
                                    className="relative p-3 rounded-xl transition-all duration-200 shadow-sm"
                                    style={{
                                        backgroundColor: selectedIcon === app.id ? 'var(--os-accent)' : 'var(--os-bg-panel)',
                                        border: `1px solid ${selectedIcon === app.id ? 'var(--os-accent)' : 'var(--os-border)'}`,
                                    }}
                                >
                                    <app.icon
                                        size={28}
                                        className="transition-colors"
                                        style={{
                                            color: selectedIcon === app.id ? 'var(--os-accent-contrast)' : 'var(--os-accent)'
                                        }}
                                    />
                                </div>
                                <span
                                    className="text-[11px] font-medium tracking-wide px-2 py-0.5 rounded shadow-sm backdrop-blur-sm transition-colors text-center truncate max-w-[80px]"
                                    style={{
                                        backgroundColor: selectedIcon === app.id ? 'var(--os-accent)' : 'rgba(var(--os-bg-panel-rgb), 0.8)',
                                        color: selectedIcon === app.id ? 'var(--os-accent-contrast)' : 'var(--os-text-secondary)'
                                    }}
                                >
                                    {app.title}
                                </span>
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {/* Splash Screen Portal */}
            {splashPortal}
        </>
    )
}
