'use client'

import React, { useRef, useState } from 'react'
import { motion, useDragControls } from 'framer-motion'
import { X, Minus, Square, Maximize2, Minimize2 } from 'lucide-react'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useShallow } from 'zustand/react/shallow'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { WindowFrame } from '@/os/ui/WindowFrame'
import { WindowTitleBar } from '@/os/ui/WindowTitleBar'
import { AppErrorBoundary } from '@/os/system/AppErrorBoundary'
import { toPng } from 'html-to-image'

interface WindowProps {
  id: string
}

// Snap zone threshold (pixels from top edge)
const SNAP_THRESHOLD = 10
const RESTORE_DRAG_THRESHOLD = 20

import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'

export default function Window({ id }: WindowProps) {
  // Granular subscription: Only re-render if THIS window changes.
  // This is the key optimization of using Zustand.
  const windowState = useWindowStore(useShallow(state => state.windows[id]))
  const { useAnimations } = useSystemSettings()
  const { t } = useLanguage()
  const isActive = useWindowStore(state => state.activeWindowId === id)
  const peekWindowId = useWindowStore(state => state.peekWindowId)

  // Actions (stable references)
  const closeWindow = useWindowStore(state => state.closeWindow)
  const minimizeWindow = useWindowStore(state => state.minimizeWindow)
  const maximizeWindow = useWindowStore(state => state.maximizeWindow)
  const focusWindow = useWindowStore(state => state.focusWindow)
  const updateWindowPosition = useWindowStore(state => state.updateWindowPosition)
  const updateWindowSize = useWindowStore(state => state.updateWindowSize)
  const setSnapshot = useWindowStore(state => state.setSnapshot)

  const dragControls = useDragControls()
  const [isResizing, setIsResizing] = useState(false)
  const [showSnapPreview, setShowSnapPreview] = useState(false)
  const [restorePreview, setRestorePreview] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  // Ref for local visual updates during resize without triggering React renders
  const windowRef = useRef<HTMLDivElement>(null)

  if (!windowState || !windowState.isOpen) return null

  // Aero Peek Logic
  const isPeeking = peekWindowId === id
  const isOtherPeeking = peekWindowId !== null && peekWindowId !== id
  
  // Calculate effective dimensions for animation targets
  // Maximized windows have 100vw/100vh size, which differs from their 'restored' size in windowState.
  // This ensures minimize/maximize animations start/end from the correct center point.
  const effectiveWidth = windowState.isMaximized ? (typeof window !== 'undefined' ? window.innerWidth : windowState.size.width) : windowState.size.width
  const effectiveHeight = windowState.isMaximized ? (typeof window !== 'undefined' ? window.innerHeight : windowState.size.height) : windowState.size.height

  // If peeking, we want to show it even if minimized
  // If minimized, restore to last position or center
  const targetOpacity = isOtherPeeking ? 0 : (windowState.isMinimized && !isPeeking ? 0 : 1)
  const targetScale = isOtherPeeking ? 1 : (windowState.isMinimized && !isPeeking ? 0 : 1)
  
  // Calculate target position based on peek state
  // If minimized and peeking -> Restore to pre-minimized position (or current position if it wasn't moved)
  // Logic: windowState.position tracks the "restored" position even when minimized
  const targetX = (windowState.isMinimized && !isPeeking)
    ? (windowState.taskbarPosition?.x ? windowState.taskbarPosition.x - (effectiveWidth / 2) : (typeof window !== 'undefined' ? (window.innerWidth / 2) - (effectiveWidth / 2) : 100))
    : windowState.isMaximized ? 0 : windowState.position.x

  const targetY = (windowState.isMinimized && !isPeeking)
    ? (windowState.taskbarPosition?.y ? (windowState.taskbarPosition.y + 24) - (effectiveHeight / 2) : (typeof window !== 'undefined' ? window.innerHeight : 800))
    : windowState.isMaximized ? 0 : windowState.position.y

  const captureSnapshot = () => {
    const el = document.getElementById(`window-${id}`)
    if (el) {
        toPng(el, { 
             cacheBust: true, 
             pixelRatio: 0.5,
             skipAutoScale: true,
             style: {
                 transform: 'none', 
                 transition: 'none' 
             }
         })
         .then(dataUrl => setSnapshot(id, dataUrl))
         .catch(err => console.error('Snapshot failed', err))
    }
  }

  const handleMinimize = () => {
    // Minimize immediately for best responsiveness.
    // Snapshot is captured on hover of minimize button or taskbar icon.
    minimizeWindow(id)
  }

  const handleResizeStart = (e: React.PointerEvent, direction: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = windowState.size.width
    const startHeight = windowState.size.height
    const startPosX = windowState.position.x
    const startPosY = windowState.position.y

    // Use Refs to track current state during drag to avoid stale closures in event listeners
    // without needing to add/remove listeners on every render
    const currentGeo = {
      w: startWidth,
      h: startHeight,
      x: startPosX,
      y: startPosY
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      // Optimized: Uses requestAnimationFrame would be even better, but direct DOM manipulation 
      // is already much faster than React Context updates.

      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      let newWidth = startWidth
      let newHeight = startHeight
      let newX = startPosX
      let newY = startPosY

      // Horizontal Resize
      if (direction.includes('e')) {
        newWidth = Math.max(300, startWidth + deltaX)
      } else if (direction.includes('w')) {
        const proposedWidth = Math.max(300, startWidth - deltaX)
        newX = startPosX + (startWidth - proposedWidth)
        newWidth = proposedWidth
      }

      // Vertical Resize
      if (direction.includes('s')) {
        newHeight = Math.max(200, startHeight + deltaY)
      } else if (direction.includes('n')) {
        const proposedHeight = Math.max(200, startHeight - deltaY)
        newY = startPosY + (startHeight - proposedHeight)
        newHeight = proposedHeight
      }

      // Update Local Visuals Directly
      if (windowRef.current) {
        windowRef.current.style.width = `${newWidth}px`
        windowRef.current.style.height = `${newHeight}px`
        // Handle position changes for Left/Top resizing
        // Note: transform is controlled by framer motion, so we might fight it if we aren't careful.
        // However, we disabled framer motion layout animations during resize via isResizing prop usually.
        // For simpler approach with Framer Motion, we can use a MotionValue or just set style.left/top if we weren't using transform.
        // Since we use x/y props in motion.div, updating those via context was the issue.
        // We need to bypass React for position too.
        windowRef.current.style.transform = `translateX(${newX}px) translateY(${newY}px)`
      }

      // Store for commit
      currentGeo.w = newWidth
      currentGeo.h = newHeight
      currentGeo.x = newX
      currentGeo.y = newY
    }

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)

      // Commit changes to global state ONCE
      if (currentGeo.w !== startWidth || currentGeo.h !== startHeight) {
        updateWindowSize(id, { width: currentGeo.w, height: currentGeo.h })
      }
      if (currentGeo.x !== startPosX || currentGeo.y !== startPosY) {
        updateWindowPosition(id, { x: currentGeo.x, y: currentGeo.y })
      }

      // Cleanup manual styles so React takes over again
      if (windowRef.current) {
        windowRef.current.style.width = ''
        windowRef.current.style.height = ''
        windowRef.current.style.transform = ''
      }

      // CRITICAL FIX: We must wait for the state update to propagate and React to re-render 
      // with the new size/position BEFORE we disable the "no-animation" mode.
      // If we set isResizing(false) immediately, Framer Motion sees the new props vs old props
      // and tries to animate the transition because duration is back to 0.35s.
      requestAnimationFrame(() => {
        // Double RAF ensures we are in the next frame after DOM updates
        requestAnimationFrame(() => {
          setIsResizing(false)
        })
      })
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  // Calculate taskbar position for minimize animation target
  const taskbarY = typeof window !== 'undefined' ? window.innerHeight - 40 : 800

  return (
    <>
      {/* Snap Preview Overlay */}
      {showSnapPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[6000] pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, var(--os-accent-dim) 0%, transparent 30%)',
            borderTop: '2px solid var(--os-accent)'
          }}
        />
      )}

      {/* Restore Preview Box */}
      {restorePreview && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="fixed z-[6000] pointer-events-none rounded-xl"
          style={{
            left: restorePreview.x,
            top: restorePreview.y,
            width: restorePreview.width,
            height: restorePreview.height,
            backgroundColor: 'var(--os-accent-glow)',
            border: '2px dashed var(--os-accent)',
            boxShadow: '0 0 30px var(--os-accent-dim)'
          }}
        />
      )}

      <motion.div
        id={`window-${id}`}
        ref={windowRef}
        drag={!isResizing && !windowState.isMinimized}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={windowState.isMaximized ? 0 : 0.05}
        dragConstraints={windowState.isMaximized
          ? { left: 0, top: 0, right: 0, bottom: 0 }
          : { left: -Infinity, top: -20, right: Infinity, bottom: Infinity }
        }
        initial={{
          opacity: 0,
          scale: 0,
          // Start from taskbar position (bottom center of screen)
          x: windowState.taskbarPosition?.x
            ? windowState.taskbarPosition.x - (effectiveWidth / 2)
            : (typeof window !== 'undefined' ? (window.innerWidth / 2) - (effectiveWidth / 2) : windowState.position.x),
          y: windowState.taskbarPosition?.y
            ? (windowState.taskbarPosition.y + 24) - (effectiveHeight / 2)
            : taskbarY + 100,
        }}
        animate={{
          opacity: targetOpacity,
          scale: targetScale,
          x: targetX,
          y: targetY,
          width: windowState.isMaximized ? '100vw' : windowState.size.width,
          height: windowState.isMaximized ? '100vh' : windowState.size.height,
          zIndex: isPeeking ? 5000 : windowState.zIndex, // Bring to front when peeking (below Taskbar)
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
              stiffness: 260,
              damping: 20
            }
        }
        style={{ position: 'fixed', top: 0, left: 0, willChange: 'transform, width, height' }}
        onDrag={(_, info) => {
          // Handle maximized window drag-to-restore preview
          if (windowState.isMaximized && info.offset.y > RESTORE_DRAG_THRESHOLD) {
            const mouseX = info.point.x
            const restoredWidth = windowState.preMaximizeState?.size.width ?? 800
            const restoredHeight = windowState.preMaximizeState?.size.height ?? 600

            // Calculate preview position (centered under cursor)
            const previewX = Math.max(0, mouseX - restoredWidth / 2)
            const previewY = Math.max(0, info.point.y - 20)

            setRestorePreview({
              x: previewX,
              y: previewY,
              width: restoredWidth,
              height: restoredHeight
            })
            setShowSnapPreview(false)
            return
          } else if (windowState.isMaximized) {
            setRestorePreview(null)
            return
          }

          // Detect if near top edge for snap preview (normal window)
          const currentY = windowState.position.y + info.offset.y
          if (currentY <= SNAP_THRESHOLD && !windowState.isMaximized) {
            setShowSnapPreview(true)
          } else {
            setShowSnapPreview(false)
          }
        }}
        onDragEnd={(_, info) => {
          setShowSnapPreview(false)
          setRestorePreview(null)

          // Handle maximized window: drag down to restore
          if (windowState.isMaximized) {
            if (info.offset.y > RESTORE_DRAG_THRESHOLD) {
              // Restore window and position it at the drag release point
              const mouseX = info.point.x
              const restoredWidth = windowState.preMaximizeState?.size.width ?? 800

              // Center the window horizontally under the cursor
              const newX = Math.max(0, mouseX - restoredWidth / 2)
              const newY = Math.max(0, info.point.y - 20) // 20px offset for title bar

              maximizeWindow(id) // This toggles to restore
              // Update position after restore
              setTimeout(() => {
                updateWindowPosition(id, { x: newX, y: newY })
              }, 0)
            }
            return
          }

          // Normal window logic
          const newY = windowState.position.y + info.offset.y

          // If dropped near top edge, maximize instead of positioning
          if (newY <= SNAP_THRESHOLD) {
            maximizeWindow(id)
          } else {
            updateWindowPosition(id, {
              x: windowState.position.x + info.offset.x,
              y: Math.max(0, newY) // Prevent going above screen
            })
          }
        }}
      >
        <WindowFrame
          isActive={isActive}
          isMaximized={windowState.isMaximized}
          onPointerDown={() => focusWindow(id)}
          className="h-full w-full"
        >
          <WindowTitleBar
            title={windowState.title}
            icon={windowState.icon}
            isActive={isActive}
            isMaximized={windowState.isMaximized}
            onMinimize={handleMinimize}
            onMaximize={() => maximizeWindow(id)}
            onClose={() => closeWindow(id)}
            dragControls={dragControls}
            onPointerDown={() => focusWindow(id)}
            onHoverMinimize={captureSnapshot}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              useContextMenuStore.getState().showMenu(e.clientX, e.clientY, 'window-titlebar', { windowId: id })
            }}
            labels={{
                minimize: t('menu.minimize'),
                maximize: t('menu.maximize'),
                restore: t('menu.restore'),
                close: t('menu.close')
            }}
          />

          <div className="flex-1 relative overflow-hidden bg-black">
            <AppErrorBoundary appId={id}>
              {windowState.component}
            </AppErrorBoundary>

            {!windowState.isMaximized && (
              <>
                {/* Resize Handles */}
                <div onPointerDown={(e) => handleResizeStart(e, 'nw')} className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50" />
                <div onPointerDown={(e) => handleResizeStart(e, 'ne')} className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-50" />
                <div onPointerDown={(e) => handleResizeStart(e, 'sw')} className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-50" />
                <div onPointerDown={(e) => handleResizeStart(e, 'se')} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50" />

                <div onPointerDown={(e) => handleResizeStart(e, 'n')} className="absolute top-0 left-4 right-4 h-2 cursor-n-resize z-40" />
                <div onPointerDown={(e) => handleResizeStart(e, 's')} className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize z-40" />
                <div onPointerDown={(e) => handleResizeStart(e, 'w')} className="absolute top-4 bottom-4 left-0 w-2 cursor-w-resize z-40" />
                <div onPointerDown={(e) => handleResizeStart(e, 'e')} className="absolute top-4 bottom-4 right-0 w-2 cursor-e-resize z-40" />
              </>
            )}
          </div>
        </WindowFrame>
      </motion.div>
    </>
  )
}

