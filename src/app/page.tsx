'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Shell from '@/os/system/Shell'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'

export default function Home() {
  const [hasBooted, setHasBooted] = useState(true)
  const [isShuttingDown, setIsShuttingDown] = useState(false)
  const { skipBootSequence } = useSystemSettings()

  const closeAllWindows = useWindowStore(state => state.closeAllWindows)

  const handleShutdown = useCallback(() => {
    setIsShuttingDown(true)
    // Close all windows first
    closeAllWindows?.()
    // Wait for shutdown animation, then reset to boot screen
    setTimeout(() => {
      // Just reload page to restart
      window.location.reload()
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

      {/* Main Content */}
      {!isShuttingDown && (
        <motion.div
          className="h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Shell onShutdown={handleShutdown} />
        </motion.div>
      )}
    </main>
  )
}
