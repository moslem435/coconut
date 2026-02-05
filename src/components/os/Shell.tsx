'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DATA } from '@/lib/data'
import { useLanguage } from '@/lib/LanguageContext'
import { useWindowManager } from '@/lib/WindowManagerContext'
import { APPS_REGISTRY } from '@/lib/apps-registry'
import AppSplashScreen from '../apps/AppSplashScreen'

// Components
import Taskbar from './Taskbar'
import ContextMenu from './ContextMenu'
import Desktop from './Desktop'
import StartMenu from './StartMenu'
import Window from './Window'

interface ShellProps {
  activeProject: number
  onProjectChange: (index: number) => void
  onProjectClick: (index: number) => void
  sceneSlot: React.ReactNode
}

export default function Shell({ 
  activeProject, 
  onProjectChange, 
  onProjectClick,
  sceneSlot
}: ShellProps) {
  const { language } = useLanguage()
  const { windows, openWindow } = useWindowManager()
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
    
    openWindow(
      appConfig.id, 
      appConfig.title, 
      <PortfolioComponent 
        activeProject={activeProject}
        onProjectChange={onProjectChange}
        onProjectClick={onProjectClick}
        sceneSlot={sceneSlot}
      />,
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
        {Object.keys(windows).map(id => (
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