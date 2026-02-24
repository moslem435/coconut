import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useShallow } from 'zustand/react/shallow'
import { useFileSelection } from '@/os/hooks/useFileSelection'
import { useDesktopGrid } from '@/os/hooks/useDesktopGrid'
import { useDesktopInteraction } from '@/os/hooks/useDesktopInteraction'
import { useWallpaper } from '@/os/hooks/useWallpaper'
import { getImageBrightness, getColorBrightness, isDarkBrightness } from '@/os/utils/color'
import { eventBus } from '@/os/kernel/EventBus'

// Sub-components
import { DesktopBackground } from './desktop/DesktopBackground'
import { DesktopIcons } from './desktop/DesktopIcons'
import { DesktopWidgets } from './desktop/DesktopWidgets'
import { SplashScreenPortal } from './desktop/SplashScreenPortal'

export default function Desktop() {
    // System settings
    const {
        snapToGrid, wallpaper, showWeatherWidget
    } = useSystemSettings()

    // Wallpaper Hook
    const {
        activeWallpaper,
        loadedWallpaper,
        isLoading: isWallpaperLoading,
        getTransitionStyle
    } = useWallpaper(wallpaper)

    // Background Brightness State
    const [isDarkBackground, setIsDarkBackground] = useState(true)

    // Calculate background brightness
    useEffect(() => {
        if (!activeWallpaper) return

        const checkBrightness = async () => {
            try {
                let brightness = 128
                
                // For images, we need to load and analyze
                if (['image', 'daily', 'dynamic-time'].includes(wallpaper?.type || '')) {
                    brightness = await getImageBrightness(activeWallpaper)
                } 
                // For CSS values (solid, gradient, preset)
                else {
                    // For gradients, this is tricky. We might just default to dark for now or parse.
                    // getColorBrightness handles solid colors well.
                    // For gradients, it might fail or return default.
                    // Let's assume most gradients are somewhat dark or colorful enough for white text.
                    // Or we can try to sample if possible.
                    // For now, let's just try getColorBrightness.
                    brightness = getColorBrightness(activeWallpaper)
                }
                
                setIsDarkBackground(isDarkBrightness(brightness))
            } catch (e) {
                console.warn('Failed to calculate brightness', e)
                setIsDarkBackground(true) // Default to dark background (white text)
            }
        }

        checkBrightness()
    }, [activeWallpaper, wallpaper?.type])

    // Context Menu
    const showMenu = useContextMenuStore(useShallow(state => state.showMenu))

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

    const {
        splashingApp,
        handleDoubleClick: handleIconDoubleClick,
        handleSplashComplete
    } = useDesktopInteraction()

    // Local State
    const [dragPreview, setDragPreview] = useState<{ x: number, y: number } | null>(null)
    const [mounted, setMounted] = useState(false)
    const [isDesktopVisible, setIsDesktopVisible] = useState(false)
    const desktopRef = useRef<HTMLDivElement | null>(null)

    // Initialization - 合并初始化逻辑
    useEffect(() => {
        setMounted(true)
        setIsDesktopVisible(true)
    }, [])

    // Interaction Handlers - 使用 useCallback 优化
    const handleIconClick = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        handleSelect(id, e)
    }, [handleSelect])

    const handleDoubleClick = useCallback((id: string) => {
        setSelectedIcons([])
        const item = desktopItems.find(i => i.id === id)
        if (!item) return
        handleIconDoubleClick(item, readFileContent)
    }, [desktopItems, setSelectedIcons, handleIconDoubleClick, readFileContent])

    // Global Error Handling
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            eventBus.emit('sys:error', {
                source: 'window',
                message: event.message,
                stack: event.error?.stack,
                error: event.error
            })
        }
        
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            eventBus.emit('sys:error', {
                source: 'promise',
                message: String(event.reason),
                error: event.reason
            })
        }

        window.addEventListener('error', handleError)
        window.addEventListener('unhandledrejection', handleUnhandledRejection)

        return () => {
            window.removeEventListener('error', handleError)
            window.removeEventListener('unhandledrejection', handleUnhandledRejection)
        }
    }, [])

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
                {/* Background */}
                <DesktopBackground 
                    wallpaper={wallpaper} 
                    isVisible={isDesktopVisible}
                    activeWallpaper={activeWallpaper}
                    loadedWallpaper={loadedWallpaper}
                    isLoading={isWallpaperLoading}
                    getTransitionStyle={getTransitionStyle}
                />

                {/* Widgets */}
                <DesktopWidgets
                    showWeatherWidget={showWeatherWidget}
                    dragConstraintsRef={desktopRef}
                />

                {/* Icons */}
                <div className="absolute inset-0 top-6 bottom-24">
                    {!isLoading && (
                        <DesktopIcons
                            items={desktopItems}
                            textColor={isDarkBackground ? 'text-white' : 'text-black'}
                            iconPositions={iconPositions}
                            selectedIds={selectedIcons}
                            isLayoutReady={isLayoutReady}
                            scaleFactor={scaleFactor}
                            currentGridSize={currentGridSize}
                            currentGridPadding={currentGridPadding}
                            snapToGrid={snapToGrid}
                            dragPreview={dragPreview}
                            onSelect={handleSelect}
                            onDragEnd={handleDragEnd}
                            onDragPreview={setDragPreview}
                            onClick={handleIconClick}
                            onDoubleClick={handleDoubleClick}
                        />
                    )}
                </div>
            </div>

            {/* Splash Screen */}
            <SplashScreenPortal
                splashingApp={splashingApp}
                mounted={mounted}
                onComplete={handleSplashComplete}
            />
        </>
    )
}