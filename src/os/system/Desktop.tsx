/**
 * 桌面组件
 * 
 * 功能：
 * - 显示桌面背景（壁纸、渐变、纯色）
 * - 管理桌面图标的布局和交互
 * - 支持图标拖拽、选择、双击打开
 * - 显示桌面小部件（天气等）
 * - 处理右键菜单
 * - 应用启动动画（Splash Screen）
 * 
 * 架构：
 * - DesktopBackground：背景层（壁纸、动态壁纸）
 * - DesktopIcons：图标层（文件、文件夹、应用快捷方式）
 * - DesktopWidgets：小部件层（天气、时钟等）
 * - SplashScreenPortal：启动动画层
 * 
 * 性能优化：
 * - 使用 useMemo 缓存桌面项目列表
 * - 使用 useCallback 优化事件处理函数
 * - 图标位置计算采用网格布局算法
 * - 背景亮度分析用于自适应文字颜色
 * 
 * @author System
 * @created 2024
 */

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

// 子组件
import { DesktopBackground } from './desktop/DesktopBackground'
import { DesktopIcons } from './desktop/DesktopIcons'
import { DesktopWidgets } from './desktop/DesktopWidgets'
import { SplashScreenPortal } from './desktop/SplashScreenPortal'


/**
 * 桌面主组件
 * 
 * 负责协调背景、图标、小部件和启动动画的显示
 */
export default function Desktop() {
    // 系统设置
    const {
        snapToGrid,           // 是否启用网格对齐
        wallpaper,            // 壁纸配置
        showWeatherWidget     // 是否显示天气小部件
    } = useSystemSettings()

    // 壁纸管理
    const {
        activeWallpaper,        // 当前激活的壁纸 URL
        activeType,             // 当前激活的壁纸类型
        loadedWallpaper,        // 已加载的壁纸 URL
        isLoading: isWallpaperLoading,  // 壁纸加载状态
        getTransitionStyle      // 获取过渡动画样式
    } = useWallpaper(wallpaper)

    // 背景亮度状态（用于自适应文字颜色）
    const [isDarkBackground, setIsDarkBackground] = useState(true)
    const [isDesktopLoaded, setIsDesktopLoaded] = useState(false)

    /**
     * 计算背景亮度
     * 
     * 根据壁纸类型（图片、纯色、渐变）分析亮度，
     * 自动调整图标文字颜色（深色背景用白字，浅色背景用黑字）
     */
    useEffect(() => {
        if (!activeWallpaper) return

        const checkBrightness = async () => {
            try {
                let brightness = 128

                // For images, we need to load and analyze
                // Use activeType to ensure we treat the current wallpaper correctly
                // Fallback to wallpaper.type if activeType is not ready (though activeWallpaper check above handles most cases)
                const type = activeType || wallpaper?.type || ''
                if (['image', 'daily', 'dynamic-time'].includes(type)) {
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
    }, [activeWallpaper, activeType, wallpaper?.type])

    // 右键菜单
    const showMenu = useContextMenuStore(useShallow(state => state.showMenu))

    // 文件系统
    const { isLoading, files, readFileContent, loadFolderContent } = useFileSystemStore(
        useShallow(state => ({
            isLoading: state.isLoading,
            files: state.files,
            readFileContent: state.readFileContent,
            loadFolderContent: state.loadFolderContent
        }))
    )

    // 自动加载桌面内容
    useEffect(() => {
        // 'desktop' 是系统的虚拟根路径之一，通常对应文件系统的某个位置
        // 这里我们主动触发加载，确保持久化的文件能同步到内存
        // Wait for FS initialization to avoid race condition with migration
        if (!isLoading) {
            loadFolderContent('desktop').then(() => setIsDesktopLoaded(true))
        }
    }, [loadFolderContent, isLoading])

    /**
     * 桌面项目列表
     * 筛选出 parentId 为 'desktop' 的文件和文件夹
     */
    const desktopItems = useMemo(() =>
        Object.values(files).filter(f => f.parentId === 'desktop'),
        [files]
    )

    // 图标选择状态
    const { selectedIds: selectedIcons, handleSelect, clearSelection, setSelectedIds: setSelectedIcons } = useFileSelection(desktopItems)

    // 桌面网格布局
    const {
        iconPositions,        // 图标位置映射表
        isLayoutReady,        // 布局是否就绪
        handleDragEnd,        // 拖拽结束处理
        currentGridSize,      // 当前网格大小
        currentGridPadding,   // 当前网格间距
        scaleFactor           // 缩放因子
    } = useDesktopGrid({ desktopItems, selectedIcons })

    // 桌面交互（双击打开、启动动画）
    const {
        splashingApp,                     // 正在启动的应用
        handleDoubleClick: handleIconDoubleClick,  // 双击处理
        handleSplashComplete              // 启动动画完成
    } = useDesktopInteraction()

    // 本地状态
    const [dragPreview, setDragPreview] = useState<{ x: number, y: number } | null>(null)
    const [mounted, setMounted] = useState(false)
    const [isDesktopVisible, setIsDesktopVisible] = useState(false)
    const desktopRef = useRef<HTMLDivElement | null>(null)

    /**
     * 初始化：设置挂载状态和可见性
     */
    useEffect(() => {
        setMounted(true)
        setIsDesktopVisible(true)
    }, [])

    /**
     * 图标点击处理（支持多选）
     * 使用 useCallback 避免不必要的重新渲染
     */
    const handleIconClick = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        handleSelect(id, e)
    }, [handleSelect])

    /**
     * 图标双击处理（打开文件或应用）
     * 
     * @param id - 图标 ID
     */
    const handleDoubleClick = useCallback((id: string) => {
        setSelectedIcons([])
        const item = desktopItems.find(i => i.id === id)
        if (!item) return
        handleIconDoubleClick(item, readFileContent)
    }, [desktopItems, setSelectedIcons, handleIconDoubleClick, readFileContent])

    /**
     * 全局错误处理
     * 捕获未处理的异常和 Promise 拒绝，发送到事件总线
     */
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

    // 桌面选择框状态
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null)
    const selectionStartRef = useRef<{ x: number, y: number } | null>(null)

    /**
     * 处理桌面鼠标按下事件 - 开始框选
     */
    const handleDesktopMouseDown = useCallback((e: React.MouseEvent) => {
        // 如果点击的是图标、任务栏或右键，不触发框选
        if (e.button !== 0 || (e.target as HTMLElement).closest('.desktop-icon') || (e.target as HTMLElement).closest('.os-taskbar')) {
            return
        }

        // 清除当前选择
        if (!e.ctrlKey && !e.shiftKey) {
            clearSelection()
        }

        const rect = desktopRef.current?.getBoundingClientRect()
        if (!rect) return

        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        selectionStartRef.current = { x, y }
        setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y })
    }, [clearSelection])

    /**
     * 处理桌面鼠标移动事件 - 更新框选范围
     */
    const handleDesktopMouseMove = useCallback((e: MouseEvent) => {
        if (!selectionStartRef.current || !selectionBox) return

        const rect = desktopRef.current?.getBoundingClientRect()
        if (!rect) return

        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        setSelectionBox(prev => prev ? ({ ...prev, currentX: x, currentY: y }) : null)

        // 计算框选区域
        const startX = Math.min(selectionStartRef.current.x, x)
        const startY = Math.min(selectionStartRef.current.y, y)
        const endX = Math.max(selectionStartRef.current.x, x)
        const endY = Math.max(selectionStartRef.current.y, y)

        // 查找在区域内的图标
        const newSelectedIds: string[] = []

        desktopItems.forEach(item => {
            const pos = iconPositions[item.id]
            if (!pos) return

            // 简单的碰撞检测：图标中心点在框选区域内
            // 假设图标大小约为 64x64 (加上 padding 可能更大，这里用 grid 尺寸估算)
            const iconSize = currentGridSize
            const iconCenterX = pos.x * scaleFactor + (iconSize * scaleFactor) / 2
            const iconCenterY = pos.y * scaleFactor + (iconSize * scaleFactor) / 2

            if (
                iconCenterX >= startX &&
                iconCenterX <= endX &&
                iconCenterY >= startY &&
                iconCenterY <= endY
            ) {
                newSelectedIds.push(item.id)
            }
        })

        // 更新选中项
        // 注意：这里简单的实现是直接替换选中项。如果要支持 Ctrl+框选（追加），逻辑会更复杂
        if (newSelectedIds.length > 0 || (newSelectedIds.length === 0 && selectedIcons.length > 0)) {
            // 只有当选中项发生变化时才更新，避免频繁渲染
            // 这里为了简化，直接设置。优化方案是可以比较数组是否相同。
            const isSame = newSelectedIds.length === selectedIcons.length &&
                newSelectedIds.every(id => selectedIcons.includes(id))

            if (!isSame) {
                setSelectedIcons(newSelectedIds)
            }
        }

    }, [selectionBox, desktopItems, iconPositions, currentGridSize, scaleFactor, selectedIcons, setSelectedIcons])

    /**
     * 处理桌面鼠标松开事件 - 结束框选
     */
    const handleDesktopMouseUp = useCallback(() => {
        if (selectionStartRef.current) {
            selectionStartRef.current = null
            setSelectionBox(null)
        }
    }, [])

    // 绑定全局鼠标事件用于拖拽框选
    useEffect(() => {
        if (selectionBox) {
            window.addEventListener('mousemove', handleDesktopMouseMove)
            window.addEventListener('mouseup', handleDesktopMouseUp)
        }
        return () => {
            window.removeEventListener('mousemove', handleDesktopMouseMove)
            window.removeEventListener('mouseup', handleDesktopMouseUp)
        }
    }, [selectionBox, handleDesktopMouseMove, handleDesktopMouseUp])

    return (
        <>
            <div
                ref={desktopRef}
                className="fixed inset-0 font-sans overflow-hidden select-none cursor-default z-0"
                style={{ backgroundColor: 'var(--os-bg-base)', color: 'var(--os-text-primary)' }}
                onMouseDown={handleDesktopMouseDown}
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
                    activeType={activeType}
                    loadedWallpaper={loadedWallpaper}
                    isLoading={isWallpaperLoading}
                    getTransitionStyle={getTransitionStyle}
                />

                {/* Widgets */}
                <DesktopWidgets
                    showWeatherWidget={showWeatherWidget}
                    dragConstraintsRef={desktopRef}
                />

                {/* Selection Box */}
                {selectionBox && (
                    <div
                        className="absolute bg-blue-500/20 border border-blue-500/50 z-10 pointer-events-none"
                        style={{
                            left: Math.min(selectionBox.startX, selectionBox.currentX),
                            top: Math.min(selectionBox.startY, selectionBox.currentY),
                            width: Math.abs(selectionBox.currentX - selectionBox.startX),
                            height: Math.abs(selectionBox.currentY - selectionBox.startY)
                        }}
                    />
                )}

                {/* Icons */}
                <div className="absolute inset-0 top-6 bottom-24">
                    {!isLoading && isDesktopLoaded && (
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
                            onContextMenu={(id, e) => {
                                e.stopPropagation()
                                // 如果右键点击的图标不在已选列表中，则只选中该图标
                                // 否则保持当前选中状态（支持批量操作）
                                if (!selectedIcons.includes(id)) {
                                    setSelectedIcons([id])
                                }
                                showMenu(e.clientX, e.clientY, 'desktop-item', { id, selectedIds: selectedIcons.includes(id) ? selectedIcons : [id] })
                            }}
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