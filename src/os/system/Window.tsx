'use client'

import React, { useRef, useState } from 'react'
import { motion, useDragControls } from 'framer-motion'
import { X, Minus, Square, Maximize2, Minimize2 } from 'lucide-react'
import { useWindowManager } from '@/os/kernel/WindowManagerContext'
import { WindowFrame } from '@/os/ui/WindowFrame'
import { WindowTitleBar } from '@/os/ui/WindowTitleBar'

interface WindowProps {
  id: string
}

// Snap zone threshold (pixels from top edge)
const SNAP_THRESHOLD = 10
const RESTORE_DRAG_THRESHOLD = 20

export default function Window({ id }: WindowProps) {
  const { activeWindowId, windows, closeWindow, minimizeWindow, maximizeWindow, focusWindow, updateWindowPosition, updateWindowSize } = useWindowManager()
  const windowState = windows[id]
  const isActive = activeWindowId === id
  const dragControls = useDragControls()
  const [isResizing, setIsResizing] = useState(false)
  const [showSnapPreview, setShowSnapPreview] = useState(false)
  const [restorePreview, setRestorePreview] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  if (!windowState || !windowState.isOpen) return null

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

    const onPointerMove = (moveEvent: PointerEvent) => {
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

      if (newWidth !== startWidth || newHeight !== startHeight) {
        updateWindowSize(id, { width: newWidth, height: newHeight })
      }
      if (newX !== startPosX || newY !== startPosY) {
        updateWindowPosition(id, { x: newX, y: newY })
      }
    }

    const onPointerUp = () => {
      setIsResizing(false)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
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
          className="fixed inset-0 z-[9998] pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(6, 182, 212, 0.15) 0%, transparent 30%)',
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
          className="fixed z-[9997] pointer-events-none rounded-xl"
          style={{
            left: restorePreview.x,
            top: restorePreview.y,
            width: restorePreview.width,
            height: restorePreview.height,
            backgroundColor: 'rgba(6, 182, 212, 0.08)',
            border: '2px dashed var(--os-accent)',
            boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)'
          }}
        />
      )}

      <motion.div
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
          scale: 0.9,
          x: windowState.taskbarPosition?.x
            ? windowState.taskbarPosition.x - (windowState.size.width / 2)
            : windowState.position.x,
          y: windowState.taskbarPosition?.y ?? taskbarY,
        }}
        animate={{
          opacity: windowState.isMinimized ? 0 : 1,
          scale: windowState.isMinimized ? 0.9 : 1,
          x: windowState.isMinimized
            ? (windowState.taskbarPosition?.x ?? 100) - (windowState.size.width / 2)
            : windowState.isMaximized ? 0 : windowState.position.x,
          y: windowState.isMinimized
            ? (windowState.taskbarPosition?.y ?? taskbarY)
            : windowState.isMaximized ? 0 : windowState.position.y,
          width: windowState.isMaximized ? '100vw' : windowState.size.width,
          height: windowState.isMaximized ? '100vh' : windowState.size.height,
          zIndex: windowState.isMinimized ? -1 : windowState.zIndex,
          pointerEvents: windowState.isMinimized ? 'none' as const : 'auto' as const
        }}
        transition={
          isResizing
            ? { duration: 0 }
            : {
              duration: 0.35,
              ease: [0.25, 0.1, 0.25, 1], // CSS ease equivalent
            }
        }
        style={{ position: 'fixed', top: 0, left: 0 }}
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
            onMinimize={() => minimizeWindow(id)}
            onMaximize={() => maximizeWindow(id)}
            onClose={() => closeWindow(id)}
            dragControls={dragControls}
            onPointerDown={() => focusWindow(id)}
          />

          <div className="flex-1 relative overflow-hidden bg-black">
            {windowState.component}

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

