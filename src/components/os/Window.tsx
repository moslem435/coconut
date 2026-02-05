'use client'

import React, { useRef, useState } from 'react'
import { motion, useDragControls } from 'framer-motion'
import { X, Minus, Square, Maximize2, Minimize2 } from 'lucide-react'
import { useWindowManager } from '@/lib/WindowManagerContext'

interface WindowProps {
  id: string
}

export default function Window({ id }: WindowProps) {
  const { windows, closeWindow, minimizeWindow, maximizeWindow, focusWindow, updateWindowPosition, updateWindowSize } = useWindowManager()
  const windowState = windows[id]
  const dragControls = useDragControls()
  const [isResizing, setIsResizing] = useState(false)

  if (!windowState || !windowState.isOpen || windowState.isMinimized) return null

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

  return (
    <motion.div
      drag={!windowState.isMaximized && !isResizing}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragConstraints={{ left: 0, top: 0, right: window.innerWidth - 100, bottom: window.innerHeight - 100 }}
      initial={{ 
        opacity: 0, 
        scale: 0.95, 
        x: windowState.position.x, 
        y: windowState.position.y 
      }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: windowState.isMaximized ? 0 : windowState.position.x,
        y: windowState.isMaximized ? 0 : windowState.position.y,
        width: windowState.isMaximized ? '100vw' : windowState.size.width,
        height: windowState.isMaximized ? '100vh' : windowState.size.height,
        zIndex: windowState.zIndex
      }}
      transition={{ duration: isResizing ? 0 : 0.2 }}
      onPointerDown={() => focusWindow(id)}
      onDragEnd={(_, info) => {
        if (!windowState.isMaximized) {
           updateWindowPosition(id, { 
             x: windowState.position.x + info.offset.x, 
             y: windowState.position.y + info.offset.y 
           })
        }
      }}
      className={`fixed bg-[#0a0a0a] border border-cyan-900/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ${windowState.isMaximized ? 'rounded-none border-0' : 'rounded-lg'}`}
      style={{
        top: 0,
        left: 0
      }}
    >
      {/* Title Bar */}
      <div 
        onPointerDown={(e) => {
          focusWindow(id)
          dragControls.start(e)
        }}
        className={`h-8 bg-white/5 border-b border-white/10 flex items-center justify-between px-2 select-none shrink-0 ${windowState.isMaximized ? '' : 'cursor-grab active:cursor-grabbing'}`}
      >
        <div className="flex items-center gap-2">
          {windowState.icon && (() => {
            const Icon = windowState.icon
            return <Icon size={14} className="text-cyan-400" />
          })()}
          <span className="text-xs font-mono text-cyan-100/80 tracking-wide">{windowState.title}</span>
        </div>

        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button 
            onClick={() => minimizeWindow(id)}
            className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
          >
            <Minus size={12} />
          </button>
          <button 
            onClick={() => maximizeWindow(id)}
            className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
          >
            {windowState.isMaximized ? <Minimize2 size={10} /> : <Square size={10} />}
          </button>
          <button 
            onClick={() => closeWindow(id)}
            className="w-6 h-6 flex items-center justify-center hover:bg-red-900/50 hover:text-red-200 rounded text-white/60 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {windowState.component}
        
        {/* Resize Handles */}
        {!windowState.isMaximized && (
           <>
              {/* Corners */}
              <div onPointerDown={(e) => handleResizeStart(e, 'nw')} className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50" />
              <div onPointerDown={(e) => handleResizeStart(e, 'ne')} className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-50" />
              <div onPointerDown={(e) => handleResizeStart(e, 'sw')} className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-50" />
              <div onPointerDown={(e) => handleResizeStart(e, 'se')} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50" />
              
              {/* Edges */}
              <div onPointerDown={(e) => handleResizeStart(e, 'n')} className="absolute top-0 left-4 right-4 h-2 cursor-n-resize z-40" />
              <div onPointerDown={(e) => handleResizeStart(e, 's')} className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize z-40" />
              <div onPointerDown={(e) => handleResizeStart(e, 'w')} className="absolute top-4 bottom-4 left-0 w-2 cursor-w-resize z-40" />
              <div onPointerDown={(e) => handleResizeStart(e, 'e')} className="absolute top-4 bottom-4 right-0 w-2 cursor-e-resize z-40" />
           </>
        )}
      </div>
    </motion.div>
  )
}
