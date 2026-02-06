'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Shell from '@/os/system/Shell'
import BootSequence from '@/os/system/BootSequence'
import { useWindowStore } from '@/os/kernel/useWindowStore'

export default function Home() {
  const [hasBooted, setHasBooted] = useState(false)
  const [isShuttingDown, setIsShuttingDown] = useState(false)

  const closeAllWindows = useWindowStore(state => state.closeAllWindows)

  const handleShutdown = useCallback(() => {
    setIsShuttingDown(true)
    // Close all windows first
    closeAllWindows?.()
    // Wait for shutdown animation, then reset to boot screen
    setTimeout(() => {
      setHasBooted(false)
      setIsShuttingDown(false)
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
        <BootSequence onComplete={() => setHasBooted(true)} />
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
