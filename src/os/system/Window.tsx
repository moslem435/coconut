'use client'

import { useDragControls, motion } from 'framer-motion'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useShallow } from 'zustand/react/shallow'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { WindowTitleBar } from '@/os/ui/WindowTitleBar'
import { AppErrorBoundary } from '@/os/system/AppErrorBoundary'
import { useWindowResize } from '@/os/hooks/useWindowResize'
import { useWindowSnapshot } from '@/os/hooks/useWindowSnapshot'
import { useWindowDrag } from '@/os/hooks/useWindowDrag'
import { WindowContext } from '@/os/kernel/WindowContext'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { APPS_REGISTRY } from '@/os/registry/config'
import { useMemo, useCallback } from 'react'

import { WindowGhostDrag } from './window/WindowGhostDrag'
import { WindowSnapPreview } from './window/WindowSnapPreview'
import { WindowRestorePreview } from './window/WindowRestorePreview'
import { WindowResizeHandles } from './window/WindowResizeHandles'

interface WindowProps {
  id: string
}

export default function Window({ id }: WindowProps) {
  const windowState = useWindowStore(useShallow(state => state.windows[id]))
  const { useAnimations, theme, useTransparency } = useSystemSettings()
  const { t } = useLanguage()
  const isActive = useWindowStore(state => state.activeWindowId === id)
  const peekWindowId = useWindowStore(state => state.peekWindowId)

  const closeWindow = useWindowStore(state => state.closeWindow)
  const minimizeWindow = useWindowStore(state => state.minimizeWindow)
  const maximizeWindow = useWindowStore(state => state.maximizeWindow)
  const focusWindow = useWindowStore(state => state.focusWindow)
  const updateWindowPosition = useWindowStore(state => state.updateWindowPosition)

  const { isResizing, handleResizeStart, windowRef } = useWindowResize(
    id,
    (show) => setShowSnapPreview(show),
    () => maximizeWindow(id)
  )

  const { captureSnapshot } = useWindowSnapshot(id)

  const {
    isDragging,
    isGhostDragging,
    showSnapPreview,
    restorePreview,
    setShowSnapPreview,
    handleGhostDragStart,
    handleGhostDrag,
    handleGhostDragEnd,
    handleMainDragStart,
    handleMainDrag,
    handleMainDragEnd
  } = useWindowDrag()

  const dragControls = useDragControls()
  const ghostDragControls = useDragControls()

  // Optimization: Memoize App Component lookup
  const AppComp = useMemo(() => {
    if (!windowState?.appId) return null
    return APPS_REGISTRY[windowState.appId]?.component || null
  }, [windowState?.appId])

  // Optimization: Memoize Icon lookup
  const appIcon = useMemo(() => {
    if (windowState?.icon) return windowState.icon
    if (windowState?.appId) return APPS_REGISTRY[windowState.appId]?.icon
    return undefined
  }, [windowState?.icon, windowState?.appId])

  // Optimization: Memoize Handlers
  const handleMinimize = useCallback(() => {
    captureSnapshot()
    minimizeWindow(id)
  }, [captureSnapshot, minimizeWindow, id])

  const handleMaximize = useCallback(() => maximizeWindow(id), [maximizeWindow, id])
  const handleClose = useCallback(() => closeWindow(id), [closeWindow, id])

  const handleTitleBarPointerDown = useCallback((e: React.PointerEvent) => {
    focusWindow(id)
    if (windowState?.isMaximized) {
      dragControls.start(e)
    } else {
      ghostDragControls.start(e)
    }
  }, [focusWindow, id, windowState?.isMaximized, dragControls, ghostDragControls])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    useContextMenuStore.getState().showMenu(e.clientX, e.clientY, 'window-titlebar', { windowId: id })
  }, [id])

  // Optimization: Memoize Labels
  const labels = useMemo(() => ({
    minimize: t('menu.minimize'),
    maximize: t('menu.maximize'),
    restore: t('menu.restore'),
    close: t('menu.close')
  }), [t])

  // Optimization: Memoize App Content to avoid re-renders on zIndex change
  const appContent = useMemo(() => {
    if (!AppComp) return null
    return (
      <AppErrorBoundary appId={id}>
        <AppComp {...(windowState?.componentProps || {})} />
      </AppErrorBoundary>
    )
  }, [AppComp, id, windowState?.componentProps])

  if (!windowState || !windowState.isOpen) return null

  // Special handling for Sidebar mode
  if (windowState.isSidebar) {
    return (
      <motion.div
        id={`window-${id}`}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 right-0 h-full w-[400px] z-[5000] bg-[var(--os-bg-window)]/80 backdrop-blur-2xl border-l border-[var(--os-border)] shadow-2xl overflow-hidden flex flex-col"
        onPointerDown={() => focusWindow(id)}
      >
        <WindowContext.Provider value={{
          windowId: id,
          dragControls: dragControls // Not draggable, but needed for context
        }}>
          {appContent || (
            <div className="flex items-center justify-center h-full text-red-400">
              App Component Not Found (ID: {windowState.appId})
            </div>
          )}
        </WindowContext.Provider>
      </motion.div>
    )
  }

  const isPeeking = peekWindowId === id
  const isOtherPeeking = peekWindowId !== null && peekWindowId !== id

  const effectiveWidth = windowState.isMaximized
    ? (typeof window !== 'undefined' ? window.innerWidth : windowState.size.width)
    : windowState.size.width
  const effectiveHeight = windowState.isMaximized
    ? (typeof window !== 'undefined' ? window.innerHeight : windowState.size.height)
    : windowState.size.height

  const targetOpacity = isOtherPeeking ? 0 : (windowState.isMinimized && !isPeeking ? 0 : 1)
  const targetScale = isOtherPeeking ? 1 : (windowState.isMinimized && !isPeeking ? 0 : 1)

  const fallbackTaskbarX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400
  const fallbackTaskbarY = typeof window !== 'undefined' ? window.innerHeight - 20 : 800

  const targetX = (windowState.isMinimized && !isPeeking)
    ? (windowState.taskbarPosition?.x ? windowState.taskbarPosition.x - (effectiveWidth / 2) : fallbackTaskbarX - (effectiveWidth / 2))
    : windowState.isMaximized ? 0 : windowState.position.x

  const targetY = (windowState.isMinimized && !isPeeking)
    ? (windowState.taskbarPosition?.y ? (windowState.taskbarPosition.y + 24) - (effectiveHeight / 2) : fallbackTaskbarY)
    : windowState.isMaximized ? 0 : windowState.position.y

  return (
    <>
      <WindowSnapPreview show={showSnapPreview} />
      <WindowRestorePreview preview={restorePreview} />

      <WindowGhostDrag
        isGhostDragging={isGhostDragging}
        dragControls={ghostDragControls}
        targetX={targetX}
        targetY={targetY}
        width={windowState.size.width}
        height={windowState.size.height}
        onDragStart={handleGhostDragStart}
        onDrag={(offset) => {
          const currentY = windowState.position.y + offset.y
          handleGhostDrag(currentY, setShowSnapPreview)
        }}
        onDragEnd={(offset) => {
          handleGhostDragEnd(
            offset,
            windowState.position,
            () => maximizeWindow(id),
            (pos) => updateWindowPosition(id, pos)
          )
        }}
      />

      <motion.div
        id={`window-${id}`}
        ref={windowRef}
        drag={windowState.isMaximized}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={windowState.isMaximized ? 0 : 0.05}
        dragConstraints={windowState.isMaximized
          ? { left: 0, top: 0, right: 0, bottom: 0 }
          : { left: -Infinity, top: -20, right: Infinity, bottom: Infinity }
        }
        onPointerDown={() => focusWindow(id)}
        initial={{
          opacity: 0,
          scale: 0.95,
          x: windowState.taskbarPosition?.x
            ? windowState.taskbarPosition.x - (effectiveWidth / 2)
            : (typeof window !== 'undefined' ? (window.innerWidth / 2) - (effectiveWidth / 2) : windowState.position.x),
          y: windowState.taskbarPosition?.y
            ? (windowState.taskbarPosition.y + 24) - (effectiveHeight / 2)
            : fallbackTaskbarY + 100,
        }}
        animate={{
          opacity: targetOpacity,
          scale: targetScale,
          x: targetX,
          y: targetY,
          width: windowState.isMaximized ? '100vw' : windowState.size.width,
          height: windowState.isMaximized ? '100vh' : windowState.size.height,
          zIndex: isPeeking ? 5000 : windowState.zIndex,
          pointerEvents: (windowState.isMinimized && !isPeeking) ? 'none' as const : 'auto' as const,
          transitionEnd: {
            zIndex: (windowState.isMinimized && !isPeeking) ? -1 : windowState.zIndex
          }
        }}
        transition={
          !useAnimations || isResizing || peekWindowId !== null
            ? { duration: 0 }
            : {
              type: "spring",
              stiffness: 300,
              damping: 30
            }
        }
        className={`fixed flex flex-col overflow-hidden transition-[background-color,border-radius] duration-300
          ${windowState.isMaximized ? 'rounded-none' : 'rounded-2xl'}
        `}
        style={{
          top: 0,
          left: 0,
          backgroundColor: useTransparency 
            ? 'rgba(var(--os-bg-window-rgb), 0.65)' 
            : 'var(--os-bg-window)',
          backdropFilter: useTransparency
            ? (isActive ? 'blur(40px) saturate(150%)' : 'blur(10px) saturate(100%)')
            : 'none',
          WebkitBackdropFilter: useTransparency
            ? (isActive ? 'blur(40px) saturate(150%)' : 'blur(10px) saturate(100%)')
            : 'none',
          boxShadow: isActive
            ? '0 0 0 1px var(--os-border-active), var(--os-shadow-window-active)'
            : '0 0 0 1px var(--os-border), var(--os-shadow-window)',
          isolation: 'isolate',
        }}
        onDragStart={(_, info) => handleMainDragStart(info.point.y)}
        onDrag={(_, info) => handleMainDrag(info, windowState)}
        onDragEnd={(_, info) => {
          handleMainDragEnd(
            info,
            windowState,
            () => maximizeWindow(id),
            (pos) => updateWindowPosition(id, pos)
          )
        }}
      >
        <div className="absolute top-0 left-0 right-0 z-[200]">
          {!windowState.hideTitleBar && (
            <WindowTitleBar
              title={windowState.title}
              icon={appIcon}
              appId={windowState.appId}
              isDefaultTitle={windowState.isDefaultTitle}
              isActive={isActive}
              isMaximized={windowState.isMaximized}
              isResizable={windowState.isResizable !== false}
              colorMode={windowState.titleBarColor === 'auto' ? (theme === 'light' ? 'dark' : 'light') : windowState.titleBarColor}
              onMinimize={handleMinimize}
              onMaximize={handleMaximize}
              onClose={handleClose}
              dragControls={undefined}
              onPointerDown={handleTitleBarPointerDown}
              onHoverMinimize={captureSnapshot}
              onContextMenu={handleContextMenu}
              labels={labels}
            />
          )}
        </div>

        <div className="flex-1 relative overflow-hidden w-full h-full z-0">
          <WindowContext.Provider value={{
            windowId: id,
            dragControls: windowState.isMaximized ? dragControls : ghostDragControls
          }}>
            {appContent || (
              <div className="flex items-center justify-center h-full text-red-400">
                App Component Not Found (ID: {windowState.appId})
              </div>
            )}
          </WindowContext.Provider>


          {(isResizing || isDragging) && (
            <div className="absolute inset-0 z-[100] bg-transparent" />
          )}

          {!windowState.isMaximized && windowState.isResizable !== false && (
            <WindowResizeHandles onResizeStart={handleResizeStart} />
          )}
        </div>
      </motion.div>
    </>
  )
}