'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { APPS_REGISTRY } from '@/os/registry/config'
import { AppManifest } from '@/os/registry/types'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useDesktopStore } from '@/os/kernel/useDesktopStore'
import { useShallow } from 'zustand/react/shallow'
import { Tooltip } from '@/os/ui/Tooltip'

// Grid settings
export const GRID_SIZE = 90
export const GRID_PADDING = 24

interface DesktopProps {
    onToggleMenu: () => void
}

// Store icon positions
interface IconPosition {
    x: number
    y: number
}

// Helper: snap position to grid
const snapToGridPos = (x: number, y: number, gridSize: number, padding: number) => {
    const col = Math.round((x - padding) / gridSize)
    const row = Math.round((y - padding) / gridSize)
    return {
        x: Math.max(padding, col * gridSize + padding),
        y: Math.max(padding, row * gridSize + padding)
    }
}

// Helper: check if position is occupied by another icon
const isPositionOccupied = (
    x: number,
    y: number,
    excludeId: string,
    positions: Record<string, IconPosition>,
    gridSize: number
) => {
    return Object.entries(positions).some(([id, pos]) =>
        id !== excludeId &&
        Math.abs(pos.x - x) < gridSize * 0.8 &&
        Math.abs(pos.y - y) < gridSize * 0.8
    )
}

// Helper: find nearest free grid position using spiral search
const findFreePosition = (
    x: number,
    y: number,
    excludeId: string,
    positions: Record<string, IconPosition>,
    gridSize: number,
    padding: number
): IconPosition => {
    const snapped = snapToGridPos(x, y, gridSize, padding)

    // First try the exact snapped position
    if (!isPositionOccupied(snapped.x, snapped.y, excludeId, positions, gridSize)) {
        return snapped
    }

    // Search in expanding spiral pattern
    for (let radius = 1; radius <= 15; radius++) {
        // Check all positions at this radius
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                // Only check perimeter positions
                if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue

                const testX = snapped.x + dx * gridSize
                const testY = snapped.y + dy * gridSize

                // Check bounds
                if (testX < padding || testY < padding) continue

                if (!isPositionOccupied(testX, testY, excludeId, positions, gridSize)) {
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
    const { snapToGrid, wallpaper, useAnimations, displayScale } = useSystemSettings()
    
    // Derived Grid Settings
    const scaleFactor = displayScale / 100
    const currentGridSize = GRID_SIZE * scaleFactor
    const currentGridPadding = GRID_PADDING * scaleFactor

    // Context Menu
    const showMenu = useContextMenuStore(state => state.showMenu)

    // Actions - stable
    const openWindow = useWindowStore(state => state.openWindow)
    const focusWindow = useWindowStore(state => state.focusWindow)
    // Granular subscription for window status checks
    const windows = useWindowStore(useShallow(state => state.windows))

    // Selection State
    const [selectedIcons, setSelectedIcons] = useState<string[]>([])

    // Desktop Store
    const { iconPositions, setIconPositions, updateIconPosition, organizeIcons } = useDesktopStore()
    const isDragging = useRef(false)

    // Splash screen state: which app is currently splashing
    const [splashingApp, setSplashingApp] = useState<AppManifest | null>(null)
    const [mounted, setMounted] = useState(false)

    // Initialize icon positions if empty
    useEffect(() => {
        setMounted(true)
        
        // Calculate max rows based on viewport
        const maxRows = typeof window !== 'undefined'
            ? Math.floor((window.innerHeight - 150) / currentGridSize)
            : 6

        // If no positions stored (first run), organize them
        if (Object.keys(iconPositions).length === 0) {
            organizeIcons(maxRows, currentGridSize, currentGridPadding)
        }
    }, []) // Run once on mount

    // Handle Scale Changes
    useEffect(() => {
        // Re-organize when scale changes to ensure everything fits
        // We could try to preserve positions, but simpler to just re-flow for now
        // consistent with previous behavior
        const maxRows = Math.floor((window.innerHeight - 150) / currentGridSize)
        organizeIcons(maxRows, currentGridSize, currentGridPadding)
    }, [displayScale, currentGridSize, currentGridPadding]) // Re-run when scale changes

    const handleIconClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        // Don't select if we just finished dragging
        if (isDragging.current) {
            isDragging.current = false
            return
        }
        
        // Multi-select modifiers
        if (e.ctrlKey || e.metaKey) {
            setSelectedIcons(prev => 
                prev.includes(id) 
                    ? prev.filter(i => i !== id)
                    : [...prev, id]
            )
        } else if (e.shiftKey) {
             setSelectedIcons(prev => 
                prev.includes(id) ? prev : [...prev, id]
            )
        } else {
            // Single select
            setSelectedIcons([id])
        }
    }

    const handleDoubleClick = (id: string) => {
        // Clear selection immediately
        setSelectedIcons([])

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
        // We need the current positions to check for collisions
        // Use local scope iconPositions to ensure we don't lose data if store is desynced
        const currentPositions = iconPositions
        
        let newPos: IconPosition
        if (snapToGrid) {
            // Find free position that doesn't overlap with others
            newPos = findFreePosition(x, y, id, currentPositions, currentGridSize, currentGridPadding)
        } else {
            // Free placement mode - just use the position directly
            newPos = { x: Math.max(0, x), y: Math.max(0, y) }
        }

        // Update with full state to avoid data loss
        setIconPositions({
            ...currentPositions,
            [id]: newPos
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
                onClick={() => setSelectedIcons([])}
                onContextMenu={(e) => {
                    e.preventDefault()
                    showMenu(e.clientX, e.clientY, 'desktop')
                }}
            >
                {/* Background Wallpaper */}
                {wallpaper?.type === 'video' ? (
                    <video
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-all duration-1000"
                        src={wallpaper.value}
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : wallpaper?.type === 'image' ? (
                    <div 
                        className="absolute inset-0 pointer-events-none transition-all duration-1000 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${wallpaper.value})` }}
                    />
                ) : (
                    <div 
                        className="absolute inset-0 pointer-events-none transition-all duration-1000 opacity-50"
                        style={{ background: wallpaper?.value || 'var(--os-bg-base)' }}
                    />
                )}
                
                {/* Ambient Overlay for depth if needed, can be optional based on wallpaper type */}
                <div className="absolute inset-0 pointer-events-none bg-black/10" />

                {/* Desktop Area */}
                <div className="absolute inset-0 top-6 bottom-24">
                    {Object.values(APPS_REGISTRY).map((app) => {
                        const pos = iconPositions[app.id] || { x: GRID_PADDING, y: GRID_PADDING }
                        const isSelected = selectedIcons.includes(app.id)
                        return (
                            <motion.div
                                key={app.id}
                                drag
                                dragMomentum={false}
                                dragElastic={0}
                                onDragStart={(e) => {
                                    isDragging.current = true
                                    // If not selected, select only this one
                                    if (!isSelected) {
                                        setSelectedIcons([app.id])
                                    }
                                }}
                                onDrag={(_, info) => {
                                    // Multi-drag support
                                    if (isSelected && selectedIcons.length > 1) {
                                        // We can't update store on every drag frame, it's too heavy?
                                        // Actually zustand is fast. Let's try.
                                        // But we need 'prev' state.
                                        // For multi-drag visual, we might want to use local state or just let framer motion handle the 'visual' drag
                                        // and only update store onDragEnd.
                                        
                                        // Current implementation in Desktop.tsx used setIconPositions(prev => ...)
                                        // which updates the state driving the 'animate' prop.
                                        
                                        // If we want real-time drag of all icons, we need to update their target positions.
                                        // But 'onDrag' is driven by the gesture.
                                        
                                        // The original code was:
                                        /*
                                        setIconPositions(prev => {
                                            const next = { ...prev }
                                            selectedIcons.forEach(selectedId => {
                                                 if (selectedId !== app.id) {
                                                     const p = next[selectedId] || { x: 0, y: 0 }
                                                     next[selectedId] = {
                                                         x: p.x + info.delta.x,
                                                         y: p.y + info.delta.y
                                                     }
                                                }
                                            })
                                            return next
                                        })
                                        */
                                        
                                        // We can replicate this with setIconPositions from store
                                        const currentPos = useDesktopStore.getState().iconPositions
                                        const next = { ...currentPos }
                                        let changed = false
                                        
                                        selectedIcons.forEach(selectedId => {
                                            if (selectedId !== app.id) {
                                                const p = next[selectedId] || { x: 0, y: 0 }
                                                next[selectedId] = {
                                                    x: p.x + info.delta.x,
                                                    y: p.y + info.delta.y
                                                }
                                                changed = true
                                            }
                                        })
                                        
                                        if (changed) setIconPositions(next)
                                    }
                                }}
                                onDragEnd={(_, info) => {
                                    // Handle snap for all selected
                                    if (isSelected && selectedIcons.length > 1) {
                                        const currentPos = useDesktopStore.getState().iconPositions
                                        const next = { ...currentPos }
                                        
                                        selectedIcons.forEach(id => {
                                            let x, y
                                            if (id === app.id) {
                                                // For the leader (dragged item), info.offset includes the total drag distance
                                                // But wait, the leader's position in 'next' hasn't been updated by onDrag?
                                                // No, onDrag only updated OTHERS.
                                                // So for the leader, we take its ORIGINAL pos + offset.
                                                
                                                // But wait, 'pos' variable in render is from store.
                                                // If we didn't update leader in store during drag, 'pos' is start pos.
                                                // So yes:
                                                x = pos.x + info.offset.x
                                                y = pos.y + info.offset.y
                                            } else {
                                                // For others, they were updated in 'next' via onDrag
                                                x = next[id].x
                                                y = next[id].y
                                            }
                                            
                                            if (snapToGrid) {
                                                // We need to pass 'next' to findFreePosition so they don't overlap EACH OTHER
                                                // But 'next' is being built.
                                                next[id] = findFreePosition(x, y, id, next, currentGridSize, currentGridPadding)
                                            } else {
                                                next[id] = { x: Math.max(0, x), y: Math.max(0, y) }
                                            }
                                        })
                                        setIconPositions(next)
                                    } else {
                                        handleDragEnd(app.id, pos.x + info.offset.x, pos.y + info.offset.y)
                                    }
                                }}
                                initial={false}
                                animate={{
                                    x: pos.x,
                                    y: pos.y
                                }}
                                transition={useAnimations ? {
                                    type: 'spring',
                                    stiffness: 400,
                                    damping: 30
                                } : { duration: 0 }}
                                className="absolute group flex flex-col items-center gap-2 w-20 cursor-pointer"
                                onClick={(e) => handleIconClick(app.id, e)}
                                onDoubleClick={() => handleDoubleClick(app.id)}
                                whileHover={useAnimations ? { scale: 1.05 } : {}}
                                whileTap={useAnimations ? { scale: 0.95 } : {}}
                                style={{ touchAction: 'none' }}
                            >
                                <Tooltip content={app.title} side="bottom" offset={8} className="flex flex-col items-center gap-2 w-full">
                                <div
                                    className="relative p-3 rounded-xl transition-all duration-200 shadow-sm"
                                    style={{
                                        backgroundColor: isSelected ? 'var(--os-accent)' : 'var(--os-bg-panel)',
                                        border: `1px solid ${isSelected ? 'var(--os-accent)' : 'var(--os-border)'}`,
                                    }}
                                >
                                    <app.icon
                                        className="w-7 h-7 transition-colors"
                                        style={{
                                            color: isSelected ? 'var(--os-accent-contrast)' : 'var(--os-accent)'
                                        }}
                                    />
                                </div>
                                <span
                                    className="text-[0.6875rem] font-medium tracking-wide px-2 py-0.5 rounded shadow-sm backdrop-blur-sm transition-colors text-center truncate max-w-[80px]"
                                    style={{
                                        backgroundColor: isSelected ? 'var(--os-accent)' : 'rgba(var(--os-bg-panel-rgb), 0.8)',
                                        color: isSelected ? 'var(--os-accent-contrast)' : 'var(--os-text-secondary)'
                                    }}
                                >
                                    {app.title}
                                </span>
                                </Tooltip>
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
