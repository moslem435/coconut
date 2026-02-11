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
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useShallow } from 'zustand/react/shallow'
import { Tooltip } from '@/os/ui/Tooltip'
import { Folder, FileText, Image as ImageIcon, StickyNote } from 'lucide-react'
import Notepad from '@/apps/notepad'
import ImageViewer from '@/apps/file-explorer/components/ImageViewer'
import WeatherWidget from '@/os/system/WeatherWidget'
import { AppIcon } from '@/os/ui/AppIcon'
import { GRID_SIZE, GRID_PADDING, IconPosition, snapToGridPos, findFreePosition } from '@/os/utils/grid'

interface DesktopProps {
    onToggleMenu: () => void
}

export default function Desktop({ onToggleMenu }: DesktopProps) {
    // System settings
    const { snapToGrid, wallpaper, useAnimations, displayScale, showWeatherWidget } = useSystemSettings()

    // Derived Grid Settings
    const scaleFactor = displayScale / 100
    const currentGridSize = GRID_SIZE * scaleFactor
    const currentGridPadding = GRID_PADDING * scaleFactor

    // Context Menu
    const showMenu = useContextMenuStore(useShallow(state => state.showMenu))
    const { t } = useLanguage()

    // Actions - stable
    const openWindow = useWindowStore(useShallow(state => state.openWindow))
    const launchApp = useWindowStore(useShallow(state => state.launchApp))
    const focusWindow = useWindowStore(useShallow(state => state.focusWindow))
    
    // Selection State
    const [selectedIcons, setSelectedIcons] = useState<string[]>([])

    // Desktop Store
    const { iconPositions, setIconPositions, updateIconPosition, organizeIcons } = useDesktopStore(
        useShallow(state => ({
            iconPositions: state.iconPositions,
            setIconPositions: state.setIconPositions,
            updateIconPosition: state.updateIconPosition,
            organizeIcons: state.organizeIcons
        }))
    )
    
    // Optimized: Only subscribe to files on the desktop
    const desktopItems = useFileSystemStore(
        useShallow(state => Object.values(state.files).filter(f => f.parentId === 'desktop'))
    )

    const getDisplayName = (item: FileNode) => {
        // 1. App Shortcut
        if (item.appId) return t(`app.${item.appId}`)
        
        // 2. System Folders / Special IDs
        if (item.id === 'recycle-bin' || item.id === 'trash') return t('app.recycle-bin')
        if (['root', 'desktop', 'documents', 'pictures', 'downloads'].includes(item.id)) {
            return t(`explorer.${item.id}`)
        }

        // 3. Specific Files/Folders (mapped to translation keys)
        const idToKeyMap: Record<string, string> = {
            'welcome-txt': 'file.welcome',
            'about-md': 'file.about',
            'code-1': 'file.code.hello',
            'code-2': 'file.code.component',
            'music': 'folder.music',
            'code': 'folder.code'
        }
        
        if (idToKeyMap[item.id]) {
            return t(idToKeyMap[item.id])
        }

        return item.name
    }

    const isDragging = useRef(false)
    const [dragPreview, setDragPreview] = useState<{ x: number, y: number } | null>(null)

    // Splash screen state: which app is currently splashing
    const [splashingApp, setSplashingApp] = useState<AppManifest | null>(null)
    const [mounted, setMounted] = useState(false)
    const [isLayoutReady, setIsLayoutReady] = useState(false)
    const desktopRef = useRef<HTMLDivElement>(null)

    // Helper to get transition styles
    const getTransitionStyle = (type: string, isVisible: boolean) => {
        const base = {
            transition: 'all 1000ms cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isVisible ? 1 : 0,
        }
        
        if (isVisible) {
            return { ...base, transform: 'none', filter: 'none' }
        }
        
        switch (type) {
            case 'zoom-in': return { ...base, transform: 'scale(1.1)' }
            case 'zoom-out': return { ...base, transform: 'scale(0.95)' }
            case 'blur': return { ...base, filter: 'blur(10px)', transform: 'scale(1.05)' }
            default: return base // fade
        }
    }

    // Wallpaper Loading State
    const [loadedWallpaper, setLoadedWallpaper] = useState<string | null>(null)
    const [activeWallpaper, setActiveWallpaper] = useState<string | null>(null)
    const [isWallpaperLoading, setIsWallpaperLoading] = useState(false)
    const [transitionType, setTransitionType] = useState('fade')
    
    // Track current wallpaper request to handle race conditions
    const currentWallpaperRef = useRef<string | null>(null)
    const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Handle Wallpaper Preloading and Transition
    useEffect(() => {
        if (!wallpaper) return

        // Update ref immediately
        currentWallpaperRef.current = wallpaper.value

        // Clear any pending transition timeout
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current)
            transitionTimeoutRef.current = null
        }

        if (wallpaper.type === 'image') {
            // If we are already displaying this wallpaper as the loaded one, 
            // and it's not loading, we might just need to ensure active is synced eventually.
            // But if user switches back and forth, we should respect the new request.
            // Only skip if both loaded and active are already this wallpaper.
            if (loadedWallpaper === wallpaper.value && activeWallpaper === wallpaper.value) return

            // Randomize transition effect
            const transitions = ['fade', 'zoom-in', 'zoom-out', 'blur']
            setTransitionType(transitions[Math.floor(Math.random() * transitions.length)])

            setIsWallpaperLoading(true)
            const img = new Image()
            img.src = wallpaper.value
            
            img.onload = () => {
                // Check if this is still the requested wallpaper
                if (currentWallpaperRef.current !== wallpaper.value) return

                setLoadedWallpaper(wallpaper.value)
                setIsWallpaperLoading(false)
                
                // Update active wallpaper after a short delay to allow fade transition
                transitionTimeoutRef.current = setTimeout(() => {
                    if (currentWallpaperRef.current === wallpaper.value) {
                        setActiveWallpaper(wallpaper.value)
                    }
                }, 1000)
            }
            
            img.onerror = () => {
                if (currentWallpaperRef.current === wallpaper.value) {
                    setIsWallpaperLoading(false)
                }
            }
        } else {
            // For presets/video/colors, update immediately
            setLoadedWallpaper(null)
            setActiveWallpaper(wallpaper.value)
            setIsWallpaperLoading(false)
        }
    }, [wallpaper]) // Run when wallpaper changes

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
        
        setIsLayoutReady(true)
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

        // 1. App Shortcut
        if (item.appId) {
            // Check if window already exists and is open
            const isWindowOpen = useWindowStore.getState().windows[item.appId]?.isOpen
            if (isWindowOpen) {
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
                    { ...app.defaultWindowOptions, isDefaultTitle: true }
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
                { ...splashingApp.defaultWindowOptions, isDefaultTitle: true }
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
                ref={desktopRef}
                className="fixed inset-0 font-sans overflow-hidden select-none cursor-default z-0"
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
                    <>
                        {/* Previous Wallpaper (Background Layer) */}
                        <div 
                            className="absolute inset-0 transition-all duration-1000 bg-cover bg-center bg-no-repeat"
                            style={{ 
                                backgroundImage: `url(${activeWallpaper})`,
                                opacity: 1,
                                backgroundColor: !activeWallpaper ? 'var(--os-bg-base)' : undefined
                            }} 
                        />
                        
                        {/* New Wallpaper (Foreground Layer - Fades In) */}
                        <div
                            className="absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat"
                            style={{ 
                                backgroundImage: `url(${loadedWallpaper})`,
                                ...getTransitionStyle(transitionType, !isWallpaperLoading && loadedWallpaper === wallpaper.value)
                            }}
                        />
                    </>
                ) : (
                    <div
                        className="absolute inset-0 pointer-events-none transition-all duration-1000 opacity-50"
                        style={{ background: wallpaper?.value || 'var(--os-bg-base)' }}
                    />
                )}

                {/* Ambient Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-black/10" />

                {/* Weather Widget */}
                {showWeatherWidget && <WeatherWidget dragConstraintsRef={desktopRef} />}

                {/* Desktop Area */}
                <div className="absolute inset-0 top-6 bottom-24">
                    {isLayoutReady && desktopItems.map((item) => {
                        const pos = iconPositions[item.id] || { x: GRID_PADDING, y: GRID_PADDING }
                        const isSelected = selectedIcons.includes(item.id)

                        // Determine Icon Properties
                        const manifest = item.appId ? APPS_REGISTRY[item.appId] : undefined
                        let Icon = FileText
                        let backgroundColor = '#3b82f6' // Default blue

                        if (manifest) {
                            Icon = manifest.icon
                            backgroundColor = manifest.theme?.backgroundColor || '#3b82f6'
                        } else if (item.type === 'folder') {
                            Icon = Folder
                            backgroundColor = '#facc15' // yellow-400
                        } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)) {
                            Icon = ImageIcon
                            backgroundColor = '#a855f7' // purple-500
                        } else if (/\.(txt|md|json)$/i.test(item.name)) {
                            Icon = StickyNote
                            backgroundColor = '#eab308' // yellow-500
                        } else {
                            // Default file
                            backgroundColor = '#94a3b8' // slate-400
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
                                <AppIcon 
                                    manifest={manifest}
                                    icon={Icon}
                                    size={48 * scaleFactor}
                                    backgroundColor={backgroundColor}
                                    className={`drop-shadow-md transition-transform duration-200 ${isSelected ? 'scale-105' : ''}`}
                                />

                                <span className={`
                                    text-[11px] text-center leading-tight break-words px-1 rounded
                                    ${isSelected ? 'text-white font-medium' : 'text-gray-100/90'}
                                    ${scaleFactor > 1.2 ? 'text-sm' : ''}
                                `} style={{
                                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                    }}>
                                    {getDisplayName(item)}
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
