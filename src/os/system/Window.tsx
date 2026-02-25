'use client'

import { useDragControls, motion, AnimatePresence } from 'framer-motion'
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
import { useMemo, useCallback, useState, useEffect } from 'react'

import { WindowGhostDrag } from './window/WindowGhostDrag'
import { WindowSnapPreview } from './window/WindowSnapPreview'
import { WindowRestorePreview } from './window/WindowRestorePreview'
import { WindowResizeHandles } from './window/WindowResizeHandles'

interface WindowProps {
  id: string
}

export default function Window({ id }: WindowProps) {
  const storeWindowState = useWindowStore(useShallow(state => state.windows[id]))
  const [cachedWindowState, setCachedWindowState] = useState(storeWindowState)

  useEffect(() => {
    if (storeWindowState) {
      setCachedWindowState(storeWindowState)
    }
  }, [storeWindowState])

  const windowState = storeWindowState || cachedWindowState

  const { useAnimations, theme, useTransparency } = useSystemSettings()
  const { t } = useLanguage()
  const isActive = useWindowStore(state => state.activeWindowId === id)
  const peekWindowId = useWindowStore(state => state.peekWindowId)

  const closeWindow = useWindowStore(state => state.closeWindow)
  const minimizeWindow = useWindowStore(state => state.minimizeWindow)
  const maximizeWindow = useWindowStore(state => state.maximizeWindow)
  const focusWindow = useWindowStore(state => state.focusWindow)
  const updateWindow = useWindowStore(state => state.updateWindow)

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

  // New state for sidebar preview
  const [showSidebarPreview, setShowSidebarPreview] = useState(false)
  const [isSidebarDragging, setIsSidebarDragging] = useState(false)
  const [isFreshlyDetached, setIsFreshlyDetached] = useState(false)

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
  const [width, setWidth] = useState(400)
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)

  // Initialize width to max available space when entering sidebar mode
  useEffect(() => {
    if (windowState.isSidebar) {
      const aiButton = document.getElementById('taskbar-ai-button')
      let maxWidth = 800
      
      if (aiButton) {
        const rect = aiButton.getBoundingClientRect()
        // Ensure sidebar doesn't overlap with AI button (plus some padding)
        maxWidth = window.innerWidth - rect.right - 24
      }
      setWidth(maxWidth)
    }
  }, [windowState.isSidebar])

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isResizingSidebar) return
      e.preventDefault()
      
      // Calculate max width based on AI button position
      const aiButton = document.getElementById('taskbar-ai-button')
      let maxWidth = 800
      
      if (aiButton) {
        const rect = aiButton.getBoundingClientRect()
        // Ensure sidebar doesn't overlap with AI button (plus some padding)
        maxWidth = window.innerWidth - rect.right - 24
      }

      // Calculate new width: window.innerWidth - e.clientX
      // Clamp it between 500 and calculated maxWidth to ensure chat area remains usable
      const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 500), maxWidth)
      setWidth(newWidth)
    }

    const handlePointerUp = () => {
      setIsResizingSidebar(false)
      document.body.style.cursor = 'default'
    }

    if (isResizingSidebar) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      document.body.style.cursor = 'ew-resize'
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      document.body.style.cursor = 'default' // Reset cursor on cleanup just in case
    }
  }, [isResizingSidebar])

  if (windowState.isSidebar) {
    return (
      <>
        <WindowGhostDrag
          isGhostDragging={isSidebarDragging}
          dragControls={dragControls}
          targetX={window.innerWidth - width} // Start from current sidebar position
          targetY={0}
          width={width}
          height={window.innerHeight}
          onDragStart={() => {
            setIsSidebarDragging(true)
          }}
          onDrag={(offset) => {
            // No-op, just visual feedback
          }}
          onDragEnd={(offset) => {
             setIsSidebarDragging(false)
             // Only detach if dragged far enough left
             if (offset.x < -100) {
                const newX = Math.max(0, window.innerWidth - width - 100 + offset.x)
                const newY = 50 + offset.y
                
                setIsFreshlyDetached(true)
                updateWindow(id, {
                  isSidebar: false,
                  position: { x: newX, y: newY },
                  size: { width: width, height: window.innerHeight - 100 },
                  isMaximized: false,
                  isMinimized: false
                })
                setTimeout(() => setIsFreshlyDetached(false), 500)
             }
          }}
        />

        <motion.div
          id={`window-${id}`}
          initial={{ x: '100%' }}
          animate={{ 
            x: windowState.isMinimized ? '100%' : 0, 
            width 
          }}
          exit={{ x: '100%' }}
          transition={
            isResizingSidebar 
              ? { duration: 0 } 
              : { type: "spring", stiffness: 300, damping: 40 }
          }
          className="fixed top-0 right-0 h-full z-[5000] border-l border-[var(--os-border)] shadow-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: useTransparency 
              ? 'rgba(var(--os-bg-window-rgb), 0.65)' 
              : 'var(--os-bg-window)',
            backdropFilter: useTransparency
              ? 'blur(40px) saturate(150%)'
              : 'none',
            WebkitBackdropFilter: useTransparency
              ? 'blur(40px) saturate(150%)'
              : 'none',
          }}
          onPointerDown={() => focusWindow(id)}
        >
          {/* Resize Handle Area - wider hit area for easier grabbing */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-4 -translate-x-2 cursor-ew-resize z-[5001] group flex justify-center"
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsResizingSidebar(true)
            }}
          >
              {/* Visual indicator line */}
              <div className="w-1 h-full group-hover:bg-[var(--os-accent)] transition-colors opacity-0 group-hover:opacity-100" />
          </div>

          <WindowContext.Provider value={{
            windowId: id,
            dragControls: dragControls
          }}>
            {appContent || (
              <div className="flex items-center justify-center h-full text-red-400">
                App Component Not Found (ID: {windowState.appId})
              </div>
            )}
          </WindowContext.Provider>
        </motion.div>
      </>
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

      {/* Sidebar Snap Preview */}
      <AnimatePresence>
        {showSidebarPreview && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }} // Increased damping to prevent bounce
            className="fixed top-0 right-0 w-[400px] h-full z-[4000] bg-[var(--os-accent-dim)] backdrop-blur-md border-l border-[var(--os-accent)] shadow-2xl pointer-events-none"
          />
        )}
      </AnimatePresence>

      <WindowGhostDrag
        isGhostDragging={isGhostDragging && !isFreshlyDetached}
        dragControls={ghostDragControls}
        targetX={targetX}
        targetY={targetY}
        width={windowState.size.width}
        height={windowState.size.height}
        onDragStart={handleGhostDragStart}
        onDrag={(offset) => {
          const currentX = windowState.position.x + offset.x
          const currentY = windowState.position.y + offset.y
          
          // Check for right edge snap (Sidebar)
          // Only for AI Chat window or specifically supported apps
          if (windowState.appId === 'ai-chat' && currentX + windowState.size.width > window.innerWidth - 50) {
            setShowSidebarPreview(true)
            setShowSnapPreview(null) // Disable regular snap preview if showing sidebar preview
          } else {
            setShowSidebarPreview(false)
            handleGhostDrag(currentY, setShowSnapPreview)
          }
        }}
        onDragEnd={(offset) => {
           if (showSidebarPreview) {
              updateWindow(id, { isSidebar: true })
              setShowSidebarPreview(false)
              // Force ghost dragging state to false immediately
              handleGhostDragEnd(offset, windowState.position, () => {}, () => {}) 
           } else {
              handleGhostDragEnd(
                offset,
                windowState.position,
                () => maximizeWindow(id),
                (pos) => updateWindow(id, { position: pos })
              )
           }
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
        initial={isFreshlyDetached ? false : {
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
            (pos) => updateWindow(id, { position: pos })
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