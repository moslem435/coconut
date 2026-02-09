'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { APPS_REGISTRY } from '@/os/registry/config'
import { AppManifest } from '@/os/registry/types'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import { useDesktopStore } from '@/os/kernel/useDesktopStore'
import { useShallow } from 'zustand/react/shallow'
import { Tooltip } from '@/os/ui/Tooltip'
import { Folder, FileText, Image as ImageIcon, StickyNote } from 'lucide-react'
import Notepad from '@/apps/notepad'
import ImageViewer from '@/apps/file-explorer/components/ImageViewer'
import { GRID_SIZE, GRID_PADDING, IconPosition, snapToGridPos, findFreePosition } from '@/os/utils/grid'

interface DesktopProps {
    onToggleMenu: () => void
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
    const launchApp = useWindowStore(state => state.launchApp)
    const focusWindow = useWindowStore(state => state.focusWindow)
    // Granular subscription for window status checks
    const windows = useWindowStore(useShallow(state => state.windows))

    // Selection State
    const [selectedIcons, setSelectedIcons] = useState<string[]>([])

    // Desktop Store
    const { iconPositions, setIconPositions, updateIconPosition, organizeIcons } = useDesktopStore()
    const { getChildren } = useFileSystemStore()
    const desktopItems = getChildren('desktop')

    const isDragging = useRef(false)
    const [dragPreview, setDragPreview] = useState<{ x: number, y: number } | null>(null)

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

        // If no positions stored (first run), or some items are missing positions, organize them
        const itemIds = desktopItems.map(i => i.id)
        const hasMissingPositions = itemIds.some(id => !iconPositions[id])

        if (Object.keys(iconPositions).length === 0 || hasMissingPositions) {
            organizeIcons(itemIds, maxRows, currentGridSize, currentGridPadding)
        }
    }, []) // Run once on mount

    // Handle Scale Changes
    useEffect(() => {
        if (!mounted) return
        // Re-organize when scale changes to ensure everything fits
        const maxRows = Math.floor((window.innerHeight - 150) / currentGridSize)
        const itemIds = desktopItems.map(i => i.id)
        organizeIcons(itemIds, maxRows, currentGridSize, currentGridPadding)
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

        // Find the item in VFS
        const item = desktopItems.find(i => i.id === id)
        if (!item) return

        // 1. If it's an app shortcut
        if (item.appId) {
            // Check if window already exists and is open
            if (windows[item.appId]?.isOpen) {
                focusWindow(item.appId)
                return
            }

            const app = APPS_REGISTRY[item.appId]
            if (!app) return

            // If app has a splash screen, show it first
            if (app.splashScreen) {
                setSplashingApp(app)
            } else {
                launchApp(
                    app.id,
                    app.title,
                    <app.component />,
                    app.icon,
                    app.defaultWindowOptions
                )
            }
            return
        }

        // 2. If it's a folder
        if (item.type === 'folder') {
            const fileExplorer = APPS_REGISTRY['file-explorer']
            if (fileExplorer) {
                launchApp(
                    'file-explorer-' + item.id,
                    item.name,
                    <fileExplorer.component initialPath={item.id} />,
                    fileExplorer.icon,
                    fileExplorer.defaultWindowOptions
                )
            }
            return
        }

        // 3. If it's a file
        if (item.type === 'file') {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)

            if (isImage) {
                launchApp(
                    'preview-' + item.id,
                    item.name,
                    <ImageViewer src={item.content || ''} />,
                    ImageIcon,
                    { size: { width: 600, height: 400 } }
                )
            } else {
                launchApp(
                    'notepad-' + item.id,
                    item.name,
                    <Notepad fileId={item.id} />,
                    StickyNote,
                    { size: { width: 600, height: 450 } }
                )
            }
            return
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

                {/* Ambient Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-black/10" />

                {/* Desktop Area */}
                <div className="absolute inset-0 top-6 bottom-24">
                    {desktopItems.map((item) => {
                        const pos = iconPositions[item.id] || { x: GRID_PADDING, y: GRID_PADDING }
                        const isSelected = selectedIcons.includes(item.id)

                        // Determine Icon
                        let Icon = FileText
                        if (item.appId && APPS_REGISTRY[item.appId]) {
                            Icon = APPS_REGISTRY[item.appId].icon
                        } else if (item.type === 'folder') {
                            Icon = Folder
                        } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)) {
                            Icon = ImageIcon
                        }

                        return (
                            <motion.div
                                key={item.id}
                                drag
                                dragMomentum={false}
                                dragElastic={0}
                                onDragStart={(e) => {
                                    isDragging.current = true
                                    if (!isSelected) {
                                        setSelectedIcons([item.id])
                                    }
                                }}
                                onDrag={(_, info) => {
                                    if (!isSelected || selectedIcons.length <= 1) {
                                        if (snapToGrid) {
                                            const currentX = pos.x + info.offset.x
                                            const currentY = pos.y + info.offset.y
                                            const preview = snapToGridPos(currentX, currentY, currentGridSize, currentGridPadding)
                                            setDragPreview(preview)
                                        }
                                    }
                                    // Multi-drag support logic could go here
                                }}
                                onDragEnd={(e, info) => {
                                    // Small delay to prevent click event triggering
                                    setTimeout(() => {
                                        isDragging.current = false
                                        setDragPreview(null)
                                    }, 50)

                                    const finalX = pos.x + info.offset.x
                                    const finalY = pos.y + info.offset.y
                                    handleDragEnd(item.id, finalX, finalY)
                                }}
                                initial={{ x: pos.x, y: pos.y }}
                                animate={{ x: pos.x, y: pos.y }}
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                    // Disable animation when dragging to feel responsive
                                    x: { duration: isDragging.current ? 0 : undefined },
                                    y: { duration: isDragging.current ? 0 : undefined }
                                }}
                                className={`absolute flex flex-col items-center justify-center gap-1 p-2 rounded w-[90px] group
                                    ${isSelected ? 'bg-white/10 ring-1 ring-white/20 backdrop-blur-sm' : 'hover:bg-white/5'}
                                `}
                                style={{
                                    width: currentGridSize,
                                    height: currentGridSize,
                                    zIndex: isDragging.current ? 50 : 1
                                }}
                                onClick={(e) => handleIconClick(item.id, e)}
                                onDoubleClick={() => handleDoubleClick(item.id)}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    showMenu(e.clientX, e.clientY, 'desktop-item', { id: item.id, appId: item.appId })
                                }}
                            >
                                <div className={`
                                    relative flex items-center justify-center rounded-xl p-2 transition-transform duration-200
                                    ${isSelected ? 'scale-105' : ''}
                                `}>
                                    <Icon
                                        size={32 * scaleFactor}
                                        strokeWidth={1.5}
                                        className={item.type === 'folder' ? 'text-yellow-400 fill-yellow-400/20' : ''}
                                    />
                                </div>

                                <span className={`
                                    text-[11px] text-center leading-tight break-words px-1 rounded
                                    ${isSelected ? 'text-white font-medium' : 'text-gray-100/90'}
                                    ${scaleFactor > 1.2 ? 'text-sm' : ''}
                                `} style={{
                                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                    }}>
                                    {item.name}
                                </span>

                                {/* Selection Indicator */}
                                {isSelected && (
                                    <div className="absolute inset-0 rounded border border-white/20 pointer-events-none" />
                                )}
                            </motion.div>
                        )
                    })}

                    {/* Drag Preview Ghost */}
                    {dragPreview && snapToGrid && (
                        <div
                            className="absolute border-2 border-white/30 rounded bg-white/5 pointer-events-none z-0 transition-all duration-150"
                            style={{
                                left: dragPreview.x,
                                top: dragPreview.y,
                                width: currentGridSize,
                                height: currentGridSize
                            }}
                        />
                    )}
                </div>
            </div>
            {splashPortal}
        </>
    )
}
