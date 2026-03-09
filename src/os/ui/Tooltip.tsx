'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  offset?: number
  delay?: number
  className?: string
}

export function Tooltip({
  content,
  children,
  side = 'top',
  offset = 8,
  delay = 300,
  className = ''
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      let x = 0
      let y = 0

      switch (side) {
        case 'top':
          x = rect.left + rect.width / 2
          y = rect.top - offset
          break
        case 'bottom':
          x = rect.left + rect.width / 2
          y = rect.bottom + offset
          break
        case 'left':
          x = rect.left - offset
          y = rect.top + rect.height / 2
          break
        case 'right':
          x = rect.right + offset
          y = rect.top + rect.height / 2
          break
      }

      setCoords({ x, y })
    }
  }

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      updatePosition()
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const handleClick = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  // Update position on scroll or resize if visible
  useEffect(() => {
    if (!isVisible) return undefined

    window.addEventListener('scroll', updatePosition)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isVisible])

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClickCapture={handleClick}
        className={`inline-flex ${className}`} // inline-flex to not break layout
      >
        {children}
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isVisible && content && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed z-[99999] pointer-events-none px-2 py-1 rounded-md text-xs font-medium tracking-wide shadow-lg border backdrop-blur-md select-none"
              style={{
                left: coords.x,
                top: coords.y,
                transform: `translate(${side === 'left' || side === 'right' ? (side === 'left' ? '-100%' : '0') : '-50%'}, ${side === 'top' || side === 'bottom' ? (side === 'top' ? '-100%' : '0') : '-50%'})`,
                backgroundColor: 'rgba(var(--os-bg-panel-rgb), 0.9)',
                borderColor: 'var(--os-border)',
                color: 'var(--os-text-primary)',
                whiteSpace: 'nowrap'
              }}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
