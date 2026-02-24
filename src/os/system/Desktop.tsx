import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useShallow } from 'zustand/react/shallow'
import { useFileSelection } from '@/os/hooks/useFileSelection'
import { useDesktopGrid } from '@/os/hooks/useDesktopGrid'
import { useDesktopInteraction } from '@/os/hooks/useDesktopInteraction'
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
                <DesktopBackground wallpaper={wallpaper} isVisible={isDesktopVisible} />

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