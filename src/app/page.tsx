'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import { motion } from 'framer-motion'
import Shell from '@/components/os/Shell'
import BootSequence from '@/components/os/BootSequence'
import { ProjectContext } from '@/lib/ProjectContext'

// Dynamically import the Scene to avoid SSR issues with WebGL
const Scene = dynamic(() => import('@/components/canvas/Scene'), {
  ssr: false,
  loading: () => null
})

export default function Home() {
  const [activeProjectIndex, setActiveProjectIndex] = useState(0)
  const [isPortalActive, setIsPortalActive] = useState(false)
  const [hasBooted, setHasBooted] = useState(false)

  const handleProjectClick = (index: number) => {
    setActiveProjectIndex(index)
    setIsPortalActive(true)
  }

  const handlePortalComplete = () => {
    setIsPortalActive(false)
  }

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
          <ProjectContext.Provider value={{ 
            activeProject: activeProjectIndex, 
            setActiveProject: setActiveProjectIndex,
            onProjectClick: handleProjectClick 
          }}>
            <Shell
              activeProject={activeProjectIndex}
              onProjectChange={setActiveProjectIndex}
              onProjectClick={handleProjectClick}
              sceneSlot={
                <Scene 
                  activeProjectIndex={activeProjectIndex} 
                  isPortalActive={isPortalActive}
                  onPortalComplete={handlePortalComplete}
                />
              }
            />
          </ProjectContext.Provider>

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
