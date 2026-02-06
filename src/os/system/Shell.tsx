'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DATA } from '@/lib/data'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useShallow } from 'zustand/react/shallow'
import { APPS_REGISTRY } from '@/os/registry/config'
import AppSplashScreen from '@/apps/AppSplashScreen'

// Components
import Taskbar from './Taskbar'
import ContextMenu from './ContextMenu'
import Desktop from './Desktop'
import StartMenu from './StartMenu'
import Window from './Window'

// No props needed for Shell anymore
export default function Shell() {
  const { language } = useLanguage()
  // Optimize: Only subscribe to the list of window IDs.
  // Shell will only re-render when a window is added or removed.
  const windowIds = useWindowStore(useShallow(state => Object.keys(state.windows)))
  const openWindow = useWindowStore(state => state.openWindow)

  const PROJECTS = DATA[language].PROJECTS

  const [isBooting, setIsBooting] = useState(false)
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false)

  // Handlers
  const handleLaunchSystemCore = () => {
    setIsBooting(true)
  }

  const handleBootComplete = () => {
    setIsBooting(false)
    const appConfig = APPS_REGISTRY['system-core']
    const PortfolioComponent = appConfig.component

    // Open standard window without prop injection
    openWindow(
      appConfig.id,
      appConfig.title,
      <PortfolioComponent />,
      appConfig.icon,
      appConfig.defaultWindowOptions
    )
  }

  const handleStartClick = () => {
    setIsStartMenuOpen(!isStartMenuOpen)
  }

  return (
    <>
      {/* 1. Desktop Layer (Always Present) */}
      <div className="fixed inset-0 z-0">
        <Desktop
          onLaunch={handleLaunchSystemCore}
          onToggleMenu={() => setIsStartMenuOpen(!isStartMenuOpen)}
        />
      </div>

      {/* 2. Window Manager / App Layer */}
      <AnimatePresence>
        {/* Boot Sequence Overlay */}
        {isBooting && (
          <AppSplashScreen onComplete={handleBootComplete} />
        )}

        {/* Windows */}
        {windowIds.map(id => (
          <Window key={id} id={id} />
        ))}
      </AnimatePresence>

      {/* 3. System UI Layer (Always Top) */}

      {/* Start Menu - z-[250] */}
      <StartMenu
        isOpen={isStartMenuOpen}
        onClose={() => setIsStartMenuOpen(false)}
      />

      {/* Status Bar - z-[200] */}
      <Taskbar
        onStartClick={handleStartClick}
      />

      {/* Context Menu */}
      <ContextMenu />

      {/* Close Start Menu when clicking outside (Overlay) */}
      {isStartMenuOpen && (
        <div
          className="fixed inset-0 z-[150]"
          onClick={() => setIsStartMenuOpen(false)}
        />
      )}
    </>
  )
}