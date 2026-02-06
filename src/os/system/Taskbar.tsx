'use client'

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { Wifi, Battery, Volume2, Command } from 'lucide-react'
import { motion } from 'framer-motion'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useShallow } from 'zustand/react/shallow'

interface TaskbarProps {
  onStartClick?: () => void
}

import SystemClock from './SystemClock'

export default function Taskbar({
  onStartClick
}: TaskbarProps) {
  // Taskbar needs list of all open windows
  const openWindows = useWindowStore(useShallow(state =>
    Object.values(state.windows).filter(w => w.isOpen)
  ))
  const activeWindowId = useWindowStore(state => state.activeWindowId)

  // Actions
  const focusWindow = useWindowStore(state => state.focusWindow)
  const minimizeWindow = useWindowStore(state => state.minimizeWindow)
  const updateTaskbarPosition = useWindowStore(state => state.updateTaskbarPosition)

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Sort windows by creation order (or just object keys for now)
  // const openWindows = Object.values(windows).filter(w => w.isOpen)

  // Update taskbar positions after render
  useLayoutEffect(() => {
    openWindows.forEach(win => {
      const el = itemRefs.current[win.id]
      if (el) {
        const rect = el.getBoundingClientRect()
        updateTaskbarPosition(win.id, { x: rect.left + rect.width / 2, y: rect.top })
      }
    })
  }, [openWindows, updateTaskbarPosition])

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 h-16 z-[200] flex items-center justify-between select-none shadow-2xl backdrop-blur-2xl rounded-2xl px-2 transition-all duration-300"
      style={{
        backgroundColor: 'var(--os-bg-panel)',
        border: '1px solid var(--os-border)',
        width: Math.min(openWindows.length * 60 + 300, window.innerWidth - 32) + 'px',
        maxWidth: '90vw'
      }}
    >

      {/* Left: Start & Taskbar Items */}
      <div className="flex items-center gap-2 h-full py-2">

        {/* Start Button */}
        <button
          onClick={onStartClick}
          className="h-12 w-12 flex items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 group shadow-sm bg-opacity-50"
          style={{ backgroundColor: 'var(--os-hover-bg)' }}
        >
          <Command size={22} className="text-[var(--os-accent)] group-hover:opacity-80 transition-opacity" />
        </button>

        {/* Separator */}
        <div className="w-px h-8 bg-[var(--os-border)] mx-2" />

        {/* Window List - Icon Only for Dock Look */}
        {openWindows.map((win) => (
          <motion.div
            ref={(el) => { itemRefs.current[win.id] = el }}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            key={win.id}
            onClick={() => {
              if (activeWindowId === win.id && !win.isMinimized) {
                minimizeWindow(win.id)
              } else {
                focusWindow(win.id)
              }
            }}
            className="h-12 w-12 flex items-center justify-center rounded-xl transition-all cursor-pointer hover:scale-110 active:scale-95 relative group"
            style={{
              backgroundColor: activeWindowId === win.id && !win.isMinimized
                ? 'var(--os-accent-dim)'
                : 'transparent',
              willChange: 'transform'
            }}
          >
            {/* Active Indicator Dot */}
            {!win.isMinimized && (
              <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--os-accent)] shadow-[0_0_5px_var(--os-accent)]" />
            )}

            {/* Window Icon */}
            {win.icon ? (() => {
              const Icon = win.icon
              return <Icon size={22} className="text-[var(--os-text-primary)]" />
            })() : (
              <div className="w-4 h-4 rounded-sm border flex items-center justify-center"
                style={{ borderColor: 'var(--os-text-primary)' }}
              >
                <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: 'var(--os-text-primary)' }} />
              </div>
            )}

            {/* Tooltip */}
            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded bg-[var(--os-bg-panel)] border border-[var(--os-border)] text-xs shadow-sm whitespace-nowrap pointer-events-none text-[var(--os-text-primary)]">
              {win.title}
            </div>

          </motion.div>
        ))}
      </div>

      {/* Right: System Tray (Simplified) */}
      <div className="flex items-center gap-3 h-full pl-4 border-l border-[var(--os-border)] ml-auto" style={{ color: 'var(--os-text-secondary)' }}>

        {/* Clock */}
        <div className="flex flex-col items-end leading-none gap-0.5 px-2 py-1 rounded cursor-default">
          <SystemClock showDate />
        </div>

      </div>
    </div>
  )
}
