'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DATA } from '@/lib/data'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useSystemStore } from '@/os/kernel/useSystemStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useShallow } from 'zustand/react/shallow'
import { APPS_REGISTRY } from '@/os/registry/config'
import { Kernel } from '@/os/kernel/Kernel'
import { useProcessStore } from '@/os/kernel/useProcessStore'

// Components
import Taskbar from './Taskbar'
import ContextMenu from './ContextMenu'
import Desktop from './Desktop'
import Window from './Window'
import Notifications from './Notifications'
import GlobalShortcuts from './GlobalShortcuts'
import GlobalDialogs from './GlobalDialogs'

interface ShellProps {
  onShutdown?: () => void
}

export default function Shell({ onShutdown }: ShellProps) {
  const { language } = useLanguage()
  // Optimize: Only subscribe to the list of window IDs.
  // Shell will only re-render when a window is added or removed.
  const windowIds = useWindowStore(useShallow(state => Object.keys(state.windows)))

  // VFS Sync
  const { syncToOPFS, initialize } = useFileSystemStore()

  useEffect(() => {
    Kernel.init()
    syncToOPFS().catch(console.error)
    initialize().catch(console.error)

    const interval = setInterval(() => {
      useProcessStore.getState().tick()
    }, 2000)

    return () => clearInterval(interval)
  }, []) // Run once on startup

  const { isStartMenuOpen, toggleStartMenu, setStartMenuOpen } = useSystemStore()

  const handleStartClick = () => {
    toggleStartMenu()
  }

  return (
    <>
      <GlobalShortcuts />

      {/* 1. Desktop Layer (Always Present) */}
      <div className="fixed inset-0 z-0">
        <Desktop
          onToggleMenu={toggleStartMenu}
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
        onCloseStartMenu={() => setStartMenuOpen(false)}
        onShutdown={onShutdown}
      />

      {/* Context Menu */}
      <ContextMenu />

      {/* Notifications - z-[9999] defined in component */}
      <Notifications />

      {/* Global Dialogs - z-[99999] */}
      <GlobalDialogs />
    </>
  )
}