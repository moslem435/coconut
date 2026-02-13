/**
 * 桌面组件（重构版）
 * 拆分为多个子组件，使用自定义 Hooks
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useShallow } from 'zustand/react/shallow'
import { useFileSelection } from '@/os/hooks/useFileSelection'
import { useDesktopGrid } from '@/os/hooks/useDesktopGrid'
import { useDesktopInteraction } from '@/os/hooks/useDesktopInteraction'

// 子组件
import { DesktopBackground } from './desktop/DesktopBackground'
import { DesktopIcons } from './desktop/DesktopIcons'
import { DesktopWidgets } from './desktop/DesktopWidgets'
import { SplashScreenPortal } from './desktop/SplashScreenPortal'

interface DesktopProps {
  onToggleMenu: () => void
}

export default function Desktop({ onToggleMenu }: DesktopProps) {
  // 系统设置
  const {
    snapToGrid,
    wallpaper,
    showWeatherWidget,
    isSettingsLoaded
  } = useSystemSettings()

  // 上下文和语言
  const showMenu = useContextMenuStore(useShallow(state => state.showMenu))
  const { t } = useLanguage()

  // 文件系统
  const { isLoading, files, readFileContent } = useFileSystemStore(
    useShallow(state => ({
      isLoading: state.isLoading,
      files: state.files,
      readFileContent: state.readFileContent
    }))
  )

  // 桌面项目
  const desktopItems = useMemo(() =>
    Object.values(files).filter(f => f.parentId === 'desktop'),
    [files]
  )

  // 选择状态
  const {
    selectedIds: selectedIcons,
    handleSelect,
    clearSelection,
    setSelectedIds: setSelectedIcons
  } = useFileSelection(desktopItems)

  // 网格布局
  const {
    iconPositions,
    isLayoutReady,
    handleDragEnd,
    currentGridSize,
    currentGridPadding,
    scaleFactor
  } = useDesktopGrid({ desktopItems, selectedIcons })

  // 交互逻辑
  const {
    splashingApp,
    handleDoubleClick,
    handleSplashComplete
  } = useDesktopInteraction()

  // 本地状态
  const [dragPreview, setDragPreview] = useState<{ x: number, y: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isDesktopVisible, setIsDesktopVisible] = useState(false)
  const desktopRef = useRef<HTMLDivElement>(null)

  // 初始化
  useEffect(() => {
    setMounted(true)
    setIsDesktopVisible(true)
  }, [])

  // 图标点击处理
  const handleIconClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    handleSelect(id, e)
  }

  // 图标双击处理
  const handleIconDoubleClick = (id: string) => {
    setSelectedIcons([])
    const item = desktopItems.find(i => i.id === id)
    if (item) {
      handleDoubleClick(item, readFileContent)
    }
  }

  return (
    <>
      <div
        ref={desktopRef}
        className="fixed inset-0 font-sans overflow-hidden select-none cursor-default z-0"
        style={{
          backgroundColor: 'var(--os-bg-base)',
          color: 'var(--os-text-primary)'
        }}
        onClick={clearSelection}
        onContextMenu={(e) => {
          e.preventDefault()
          showMenu(e.clientX, e.clientY, 'desktop')
        }}
      >
        {/* 背景壁纸 */}
        <DesktopBackground
          wallpaper={wallpaper}
          isVisible={isDesktopVisible}
        />

        {/* 小部件 */}
        <DesktopWidgets
          showWeatherWidget={showWeatherWidget}
          dragConstraintsRef={desktopRef}
        />

        {/* 图标区域 */}
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
              onDoubleClick={handleIconDoubleClick}
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
