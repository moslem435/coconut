'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import { motion } from 'framer-motion'
import Shell from '@/os/system/Shell'
import BootSequence from '@/os/system/BootSequence'

export default function Home() {
  const [hasBooted, setHasBooted] = useState(false)

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Boot Screen Overlay */}
      {!hasBooted && (
        <BootSequence onComplete={() => setHasBooted(true)} />
      )}

      {/* Main Content - Fades in after boot */}
      {hasBooted && (
        <motion.div
          className="h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <Shell />

          {/* Persistent HUD Elements - Background Layer */}
          <div className="pointer-events-none absolute inset-0 z-0 flex flex-col justify-between p-12 mix-blend-difference opacity-50">
            <div className="flex flex-col gap-2">
              <h1 className="font-mono text-xs tracking-widest text-white/50">
              </h1>
              <div className="h-px w-12 bg-white/20" />
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <p className="font-mono text-xs text-white/50">
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </main>
  )
}
