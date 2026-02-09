'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DATA } from '@/lib/data'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useShallow } from 'zustand/react/shallow'
import { APPS_REGISTRY } from '@/os/registry/config'

// Components
import Taskbar from './Taskbar'
import ContextMenu from './ContextMenu'
import Desktop from './Desktop'
import Window from './Window'
import Notifications from './Notifications'

interface ShellProps {
  onShutdown?: () => void
}

export default function Shell({ onShutdown }: ShellProps) {
  const { language } = useLanguage()
  // Optimize: Only subscribe to the list of window IDs.
  // Shell will only re-render when a window is added or removed.
  const windowIds = useWindowStore(useShallow(state => Object.keys(state.windows)))

  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false)

  const handleStartClick = () => {
    setIsStartMenuOpen(!isStartMenuOpen)
  }

  return (
    <>
      {/* 1. Desktop Layer (Always Present) */}
      <div className="fixed inset-0 z-0">
        <Desktop
          onToggleMenu={() => setIsStartMenuOpen(!isStartMenuOpen)}
        />
      </div>

      {/* 2. Window Manager / App Layer */}
      <AnimatePresence>
        {/* Windows */}
        {windowIds.map(id => (
          <Window key={id} id={id} />
        ))}
      </AnimatePresence>

      {/* 3. System UI Layer (Always Top) */}

      {/* Status Bar - z-[200] */}
      <Taskbar
        onStartClick={handleStartClick}
        isStartMenuOpen={isStartMenuOpen}
        onCloseStartMenu={() => setIsStartMenuOpen(false)}
        onShutdown={onShutdown}
      />

      {/* Context Menu */}
      <ContextMenu />

      {/* Notifications - z-[9999] defined in component */}
      <Notifications />
    </>
  )
}