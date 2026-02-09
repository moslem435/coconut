'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { APPS_REGISTRY } from '@/os/registry/config'
import { AppManifest } from '@/os/registry/types'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
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
    const [selectionBox, setSelectionBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null)
    const isSelecting = useRef(false)
    const selectionStart = useRef({ x: 0, y: 0 })

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
            ? Math.floor((window.innerHeight - 150) / currentGridSize)
            : 6

        apps.forEach((app, index) => {
            const col = Math.floor(index / maxRows)
            const row = index % maxRows
            initialPositions[app.id] = {
                x: currentGridPadding + col * currentGridSize,
                y: currentGridPadding + row * currentGridSize
            }
        })

        setIconPositions(initialPositions)
    }, []) // Run once on mount, but we need to handle scale changes separately

    // Handle Scale Changes
    useEffect(() => {
        // When scale changes, we should ideally re-snap all icons to the new grid
        // But since we don't store "grid coordinates", we can try to map them proportionally
        // Simple approach: Re-initialize layout (reset) OR try to scale current positions
        // Let's re-snap existing positions to the new grid
        
        setIconPositions(prev => {
            const next: Record<string, IconPosition> = {}
            Object.entries(prev).forEach(([id, pos]) => {
                // Find nearest grid slot in new grid
                // This might cause collisions if shrinking, but finding free pos handles it
                // We need a way to know the "logical" grid position from the old physical position
                // But we don't know the old grid size here easily without tracking it
                
                // Better strategy: Just re-calculate default layout for simplicity to avoid mess
                // Or: assume they are roughly on a grid
                
                // Let's try to preserve relative position
                // We can't easily do it without previous scale.
                // Fallback: Re-snap to new grid
                
                // Use findFreePosition to place them one by one to avoid overlap
                // But starting from where? 
                
                // Simplest robust solution for this bug fix:
                // Re-run the initial layout logic. 
                // It resets user customization but ensures clean layout.
                // Ideally we'd store (col, row) instead of (x, y).
                
                // Let's stick to the initial layout logic for now to ensure consistency.
            })
            
            // Re-run layout logic
            const apps = Object.values(APPS_REGISTRY)
            const newPositions: Record<string, IconPosition> = {}
            const maxRows = Math.floor((window.innerHeight - 150) / currentGridSize)
            
            apps.forEach((app, index) => {
                // Try to find if we have a stored position?
                // If we want to persist user moves, we need to map old pos to new pos.
                // map: x_new = x_old * (newScale / oldScale)
                // But we don't know oldScale.
                
                // Standard default layout:
                const col = Math.floor(index / maxRows)
                const row = index % maxRows
                newPositions[app.id] = {
                    x: currentGridPadding + col * currentGridSize,
                    y: currentGridPadding + row * currentGridSize
                }
            })
            return newPositions
        })
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
        setIconPositions(prev => {
            if (snapToGrid) {
                // Find free position that doesn't overlap with others
                const freePos = findFreePosition(x, y, id, prev, currentGridSize, currentGridPadding)
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

    // Selection Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        // Only left click on background
        if (e.button !== 0) return
        
        isSelecting.current = true
        selectionStart.current = { x: e.clientX, y: e.clientY }
        setSelectionBox({ x: e.clientX, y: e.clientY, width: 0, height: 0 })
        
        // Clear selection if not holding modifier
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            setSelectedIcons([])
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isSelecting.current) return

        const currentX = e.clientX
        const currentY = e.clientY
        const startX = selectionStart.current.x
        const startY = selectionStart.current.y

        const x = Math.min(startX, currentX)
        const y = Math.min(startY, currentY)
        const width = Math.abs(currentX - startX)
        const height = Math.abs(currentY - startY)

        setSelectionBox({ x, y, width, height })

        // Check intersections
        const newSelection: string[] = []
        Object.entries(iconPositions).forEach(([id, pos]) => {
            // Icon rect (approximate 80x100)
            const iconRect = {
                left: pos.x,
                right: pos.x + 80,
                top: pos.y,
                bottom: pos.y + 100
            }
            
            const selRect = {
                left: x,
                right: x + width,
                top: y,
                bottom: y + height
            }

            if (!(iconRect.left > selRect.right || 
                  iconRect.right < selRect.left || 
                  iconRect.top > selRect.bottom || 
                  iconRect.bottom < selRect.top)) {
                newSelection.push(id)
            }
        })
        
        // Merge with existing if modifier? For now just replace during drag selection for simplicity
        // or support additive. Standard behavior is replace unless modifier held.
        // Let's implement replace for now as we cleared in MouseDown.
        setSelectedIcons(newSelection)
    }

    const handleMouseUp = () => {
        isSelecting.current = false
        setSelectionBox(null)
    }

    return (
        <>
            <div
                className="fixed inset-0 font-mono overflow-hidden select-none cursor-default z-0"
                style={{
                    backgroundColor: 'var(--os-bg-base)',
                    color: 'var(--os-text-primary)'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={() => {
                    // Handled by MouseDown/Up logic mostly, but to be safe:
                    if (!isSelecting.current) setSelectedIcons([])
                }}
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

                {/* Selection Box */}
                {selectionBox && (
                    <div
                        className="absolute border border-[var(--os-accent)] bg-[var(--os-accent)]/20 z-10 pointer-events-none"
                        style={{
                            left: selectionBox.x,
                            top: selectionBox.y,
                            width: selectionBox.width,
                            height: selectionBox.height
                        }}
                    />
                )}

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
                                    }
                                }}
                                onDragEnd={(_, info) => {
                                    // Handle snap for all selected
                                    if (isSelected && selectedIcons.length > 1) {
                                        setIconPositions(prev => {
                                            const next = { ...prev }
                                            
                                            // First pass: Calculate approximate final positions for all
                                            // For dragged icon: start pos + total offset
                                            // For others: they are already updated in 'prev' via onDrag
                                            
                                            selectedIcons.forEach(id => {
                                                let x, y
                                                if (id === app.id) {
                                                    x = pos.x + info.offset.x
                                                    y = pos.y + info.offset.y
                                                } else {
                                                    x = next[id].x
                                                    y = next[id].y
                                                }
                                                
                                                if (snapToGrid) {
                                                    next[id] = findFreePosition(x, y, id, next, currentGridSize, currentGridPadding)
                                                } else {
                                                    next[id] = { x: Math.max(0, x), y: Math.max(0, y) }
                                                }
                                            })
                                            return next
                                        })
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
