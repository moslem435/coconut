'use client'

import { useRef, useEffect, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CalendarWidget from './CalendarWidget'
import { useLanguage } from '@/os/kernel/LanguageContext'

interface ActionCenterProps {
  isOpen: boolean
  onClose: () => void
  toggleRef: React.RefObject<HTMLDivElement>
}

export default function ActionCenter({ isOpen, onClose, toggleRef }: ActionCenterProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        toggleRef.current &&
        !toggleRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, toggleRef])

  const [position, setPosition] = useState<{ x: number, y: number } | null>(null)

  useLayoutEffect(() => {
    if (isOpen && toggleRef.current && menuRef.current) {
      const triggerRect = toggleRef.current.getBoundingClientRect()
      const menuRect = menuRef.current.getBoundingClientRect()
      const taskbar = toggleRef.current.closest('[data-taskbar]')
      const taskbarRect = taskbar?.getBoundingClientRect()

      // Center align relative to trigger
      let x = triggerRect.left + triggerRect.width / 2 - menuRect.width / 2

      // Clamp to screen edges with padding
      const padding = 16
      const maxX = window.innerWidth - menuRect.width - padding
      x = Math.min(Math.max(padding, x), maxX)

      // Baseline positioning: Use taskbar top instead of individual button top
      const baselineY = taskbarRect ? taskbarRect.top : triggerRect.top

      // Calculate dynamic gap based on REM to support scaling
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const gap = 0.75 * rootFontSize // 0.75rem gap

      const y = window.innerHeight - baselineY + gap

      setPosition({ x, y })
    }
  }, [isOpen, toggleRef])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            position: 'fixed',
            left: position?.x ?? 0,
            bottom: position?.y ?? '5rem', // Fallback in REM
            visibility: position ? 'visible' : 'hidden',
            backgroundColor: 'rgba(var(--os-bg-panel-rgb), 0.65)',
            backdropFilter: 'blur(40px) saturate(150%)',
            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px var(--os-border), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            isolation: 'isolate',
            transform: 'translateZ(0)'
          }}
          className="w-96 flex flex-col rounded-2xl overflow-hidden z-[5000]"
        >
          {/* Calendar Section - Now the only content */}
          <div className="shrink-0 p-2">
            <CalendarWidget />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
