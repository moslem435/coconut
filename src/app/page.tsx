'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Shell from '@/os/system/Shell'
import BootSequence from '@/os/system/BootSequence'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'

export default function Home() {
  const [hasBooted, setHasBooted] = useState(false)
  const [isShuttingDown, setIsShuttingDown] = useState(false)
  const { skipBootSequence } = useSystemSettings()

  const closeAllWindows = useWindowStore(state => state.closeAllWindows)

  // Auto-login / Skip Boot Check
  useEffect(() => {
    // Check session storage for "already booted in this session"
    const sessionBoot = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cloud-os-booted') : null
    
    if (skipBootSequence || sessionBoot === 'true') {
        setHasBooted(true)
    }
  }, [skipBootSequence])

  const handleBootComplete = useCallback(() => {
    setHasBooted(true)
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('cloud-os-booted', 'true')
    }
  }, [])

  const handleShutdown = useCallback(() => {
    setIsShuttingDown(true)
    // Close all windows first
    closeAllWindows?.()
    // Wait for shutdown animation, then reset to boot screen
    setTimeout(() => {
      setHasBooted(false)
      setIsShuttingDown(false)
      // Clear session boot flag on shutdown
      if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('cloud-os-booted')
      }
    }, 1000)
  }, [closeAllWindows])

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Shutdown Overlay */}
      <AnimatePresence>
        {isShuttingDown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-white/50 text-sm font-mono tracking-widest"
            >
              SHUTTING DOWN...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boot Screen Overlay */}
      {!hasBooted && !isShuttingDown && (
        <BootSequence onComplete={handleBootComplete} />
      )}

      {/* Main Content - Fades in after boot */}
      {hasBooted && !isShuttingDown && (
        <motion.div
          className="h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <Shell onShutdown={handleShutdown} />
        </motion.div>
      )}
    </main>
  )
}
