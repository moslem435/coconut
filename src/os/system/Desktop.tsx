import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { APPS_REGISTRY } from '@/os/registry/config'
import { AppManifest } from '@/os/registry/types'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useShallow } from 'zustand/react/shallow'
import { Image as ImageIcon, StickyNote } from 'lucide-react'
import Notepad from '@/apps/notepad'
import ImageViewer from '@/apps/file-explorer/components/ImageViewer'
import WeatherWidget from '@/os/system/WeatherWidget'
import { useFileSelection } from '@/os/hooks/useFileSelection'
import { useDesktopGrid } from '@/os/hooks/useDesktopGrid'
import { DesktopIcon } from '@/os/system/DesktopIcon'
import { GRID_PADDING } from '@/os/utils/grid'

interface DesktopProps {
    onToggleMenu: () => void
}

export default function Desktop({ onToggleMenu }: DesktopProps) {
    // System settings
    const {
        snapToGrid, wallpaper, useAnimations,
        showWeatherWidget, isSettingsLoaded
    } = useSystemSettings()

    // Context Menu & Language
    const showMenu = useContextMenuStore(useShallow(state => state.showMenu))
    const { t } = useLanguage()

    // Window Actions
    const { openWindow, launchApp, focusWindow } = useWindowStore(
        useShallow(state => ({
            openWindow: state.openWindow,
            launchApp: state.launchApp,
            focusWindow: state.focusWindow
        }))
    )

    // File System
    const { isLoading, files, readFileContent } = useFileSystemStore(
        useShallow(state => ({
            isLoading: state.isLoading,
            files: state.files,
            readFileContent: state.readFileContent
        }))
    )

    const desktopItems = useMemo(() =>
        Object.values(files).filter(f => f.parentId === 'desktop'),
        [files]
    )

    // Selection State
    const { selectedIds: selectedIcons, handleSelect, clearSelection, setSelectedIds: setSelectedIcons } = useFileSelection(desktopItems)

    // Custom Hooks
    const {
        iconPositions, isLayoutReady, handleDragEnd,
        currentGridSize, currentGridPadding, scaleFactor
    } = useDesktopGrid({ desktopItems, selectedIcons })

    // Local State
    const [dragPreview, setDragPreview] = useState<{ x: number, y: number } | null>(null)
    const [splashingApp, setSplashingApp] = useState<AppManifest | null>(null)
    const [mounted, setMounted] = useState(false)
    const desktopRef = useRef<HTMLDivElement>(null)

    // Initialization
    useEffect(() => {
        setMounted(true)
    }, [])

    // Wallpaper Logic (Simplified for brevity, core logic preserved in hook if extracted later, sticking to simplifying render for now)
    // ... Keeping wallpaper logic inline or extracting? 
    // The prompt asked to split Desktop.tsx (550 lines). Wallpaper logic is about 100 lines. 
    // Let's keep it for now as it wasn't explicitly targeted, but we can clean it up.

    // Initial Fade In
    const [isDesktopVisible, setIsDesktopVisible] = useState(false)
    useEffect(() => {
        setIsDesktopVisible(true)
    }, [])

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
    const [activeWallpaper, setActiveWallpaper] = useState<string | null>(wallpaper?.value || null)
    const [isWallpaperLoading, setIsWallpaperLoading] = useState(false)
    const [transitionType, setTransitionType] = useState('fade')

    const currentWallpaperRef = useRef<string | null>(wallpaper?.value || null)
    const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isFirstImageLoad = useRef(true)

    // Handle Wallpaper Preloading and Transition
    useEffect(() => {
        if (!wallpaper) return
        currentWallpaperRef.current = wallpaper.value

        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current)
            transitionTimeoutRef.current = null
        }

        if (wallpaper.type === 'image') {
            if (isFirstImageLoad.current) {
                isFirstImageLoad.current = false
                setActiveWallpaper(wallpaper.value)
                setLoadedWallpaper(null)
                setIsWallpaperLoading(false)
                return
            }

            if (loadedWallpaper === wallpaper.value && activeWallpaper === wallpaper.value) return

            const transitions = ['fade', 'zoom-in', 'zoom-out', 'blur']
            setTransitionType(transitions[Math.floor(Math.random() * transitions.length)])

            setIsWallpaperLoading(true)
            const img = new Image()
            img.src = wallpaper.value

            img.onload = () => {
                if (currentWallpaperRef.current !== wallpaper.value) return
                setLoadedWallpaper(wallpaper.value)
                setIsWallpaperLoading(false)

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
            setLoadedWallpaper(null)
            setActiveWallpaper(wallpaper.value)
            setIsWallpaperLoading(false)
        }
    }, [wallpaper, isSettingsLoaded, activeWallpaper])

    // Interaction Handlers
    const handleIconClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        handleSelect(id, e)
    }

    const handleDoubleClick = (id: string) => {
        setSelectedIcons([])
        const item = desktopItems.find(i => i.id === id)
        if (!item) return

        if (item.appId) {
            const isWindowOpen = useWindowStore.getState().windows[item.appId]?.isOpen
            if (isWindowOpen) {
                focusWindow(item.appId)
                return
            }

            const app = APPS_REGISTRY[item.appId]
            if (!app) return

            if (app.splashScreen) {
                setSplashingApp(app)
            } else {
                launchApp(app.id, app.title, <app.component />, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
            }
            return
        }

        if (item.type === 'folder') {
            const fileExplorer = APPS_REGISTRY['file-explorer']
            if (fileExplorer) {
                launchApp('file-explorer-' + item.id, item.name, <fileExplorer.component initialPath={item.id} />, fileExplorer.icon, fileExplorer.defaultWindowOptions)
            }
            return
        }

        if (item.type === 'file') {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)
            if (isImage) {
                readFileContent(item.id).then(content => {
                    launchApp('preview-' + item.id, item.name, <ImageViewer src={content} />, ImageIcon, { size: { width: 600, height: 400 } })
                })
            } else {
                launchApp('notepad-' + item.id, item.name, <Notepad fileId={item.id} />, StickyNote, { size: { width: 600, height: 450 } })
            }
            return
        }
    }

    const handleSplashComplete = () => {
        if (splashingApp) {
            openWindow(splashingApp.id, splashingApp.title, <splashingApp.component />, splashingApp.icon, { ...splashingApp.defaultWindowOptions, isDefaultTitle: true })
            setSplashingApp(null)
        }
    }

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
                style={{ backgroundColor: 'var(--os-bg-base)', color: 'var(--os-text-primary)' }}
                onClick={clearSelection}
                onContextMenu={(e) => {
                    e.preventDefault()
                    showMenu(e.clientX, e.clientY, 'desktop')
                }}
            >
                <div
                    className="absolute inset-0 transition-opacity duration-1000 ease-out"
                    style={{ opacity: isDesktopVisible ? 1 : 0 }}
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
                            <div
                                className="absolute inset-0 transition-all duration-1000 bg-cover bg-center bg-no-repeat"
                                style={{
                                    backgroundImage: activeWallpaper ? `url(${activeWallpaper})` : undefined,
                                    opacity: 1,
                                    backgroundColor: !activeWallpaper ? 'var(--os-bg-base)' : undefined
                                }}
                            />
                            <div
                                className="absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat"
                                style={{
                                    backgroundImage: loadedWallpaper ? `url(${loadedWallpaper})` : undefined,
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

                    <div className="absolute inset-0 pointer-events-none bg-black/10" />

                    {showWeatherWidget && <WeatherWidget dragConstraintsRef={desktopRef} />}

                    <div className="absolute inset-0 top-6 bottom-24">
                        {!isLoading && isLayoutReady && desktopItems.map((item) => {
                            const pos = iconPositions[item.id] || { x: GRID_PADDING, y: GRID_PADDING } // Default fallback
                            const isSelected = selectedIcons.includes(item.id)

                            return (
                                <DesktopIcon
                                    key={item.id}
                                    item={item}
                                    pos={pos}
                                    isSelected={isSelected}
                                    scaleFactor={scaleFactor}
                                    currentGridSize={currentGridSize}
                                    currentGridPadding={currentGridPadding}
                                    snapToGrid={snapToGrid}
                                    onSelect={(id) => {
                                        if (!isSelected) handleSelect(id)
                                    }}
                                    onDragEnd={handleDragEnd}
                                    onDragPreview={setDragPreview}
                                    onClick={handleIconClick}
                                    onDoubleClick={handleDoubleClick}
                                />
                            )
                        })}

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
            </div>
            {splashPortal}
        </>
    )
}