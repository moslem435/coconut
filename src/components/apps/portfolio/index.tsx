'use client'

import React, { useRef, useEffect, useState, Suspense, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { DATA } from '@/lib/data'
import { useLanguage } from '@/lib/LanguageContext'
import { useProject } from '@/lib/ProjectContext'
import { soundManager } from '@/lib/sound'
import IOSPicker, { type IOSPickerHandle } from '../../ui/IOSPicker'
import About from './components/About'
import Projects from './components/Projects'
import Logs from './components/Logs'
import Lab from './components/Lab'
import MusicPlayer from './components/MusicPlayer'
import Contact from './components/Contact'
import Resume from './components/Resume'
import Services from './components/Services'

// Utility Component for CRT/Screen Effect
const ScreenOverlay = () => (
  <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
    {/* Scanlines */}
    <div 
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 50%)',
        backgroundSize: '100% 4px'
      }}
    />
    {/* Vignette */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)]" />
    {/* Inner Border Glow */}
    <div className="absolute inset-0 border border-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]" />
  </div>
)

interface PortfolioProps {
  activeProject?: number
  onProjectChange?: (index: number) => void
  onProjectClick?: (index: number) => void
  sceneSlot?: React.ReactNode
  onClose?: () => void
}

export default function Portfolio({ 
  activeProject: propActiveProject, 
  onProjectChange: propOnProjectChange, 
  onProjectClick: propOnProjectClick,
  sceneSlot,
  onClose
}: PortfolioProps) {
  const { language, toggleLanguage } = useLanguage()
  const projectContext = useProject()
  const PROJECTS = DATA[language].PROJECTS

  const pickerRef = useRef<IOSPickerHandle>(null)
  const [selectedSubProject, setSelectedSubProject] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  
  // Internal State
  const [internalActiveProject, setInternalActiveProject] = useState(0)
  
  // Priority: Context > Prop > Internal
  const activeProject = projectContext?.activeProject ?? propActiveProject ?? internalActiveProject

  const changeProject = useCallback((index: number) => {
     if (projectContext) {
        projectContext.setActiveProject(index)
     } else if (propOnProjectChange) {
        propOnProjectChange(index)
     } else {
        setInternalActiveProject(index)
     }
  }, [propOnProjectChange, projectContext])

  // Layout Configuration
  const LEFT_WIDTH = 25 
  const CENTER_WIDTH = 50 
  const RIGHT_WIDTH = 25 
  const VERTICAL_PADDING = 15 
  const rotationAngle = 75

  const project = PROJECTS[activeProject] || PROJECTS[0]

  // Clone the sceneSlot to inject the selectedSubProject prop
  const sceneWithProps = React.isValidElement(sceneSlot) 
    ? React.cloneElement(sceneSlot as React.ReactElement<any>, { 
        selectedSubProject: project ? (project.id === "02" ? null : selectedSubProject) : null, 
        activeProjectIndex: activeProject 
      })
    : sceneSlot

  // Mobile Detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input is focused
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault()
          soundManager.playClick()
          changeProject((activeProject - 1 + PROJECTS.length) % PROJECTS.length)
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault()
          soundManager.playClick()
          changeProject((activeProject + 1) % PROJECTS.length)
          break
        case 'Escape':
          if (selectedSubProject) {
            e.preventDefault()
            setSelectedSubProject(null)
            soundManager.playHover() 
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeProject, PROJECTS.length, changeProject, selectedSubProject])

  const handleProjectChange = (index: number) => {
    if (activeProject !== index) {
      changeProject(index)
      setSelectedSubProject(null)
    }
  }

  const handleClick = (index: number) => {
    soundManager.playClick()
    changeProject(index)
    propOnProjectClick?.(index)
  }

  // Mobile Layout Render
  if (isMobile) {
    return (
      <div className="relative h-full w-full bg-black text-white overflow-hidden flex flex-col">
        {/* Mobile Header / Nav */}
        <div className="h-16 border-b border-white/10 flex items-center px-4 shrink-0 z-20 bg-black/50 backdrop-blur-md justify-between gap-4">
          <div className="flex-1 overflow-x-auto custom-scrollbar flex gap-4 items-center no-scrollbar">
            {PROJECTS.map((p, i) => (
              <button 
                key={p.id}
                onClick={() => handleProjectChange(i)}
                className={`whitespace-nowrap px-3 py-1 text-xs font-mono border rounded-sm transition-colors ${
                  activeProject === i 
                    ? 'border-cyan-500 text-cyan-400 bg-cyan-900/20' 
                    : 'border-white/20 text-white/50'
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => {
              soundManager.playClick()
              toggleLanguage()
            }}
            className="flex items-center justify-center w-8 h-8 border border-white/20 rounded-sm text-[10px] font-mono text-cyan-400 hover:bg-cyan-900/20 hover:border-cyan-500 transition-colors shrink-0"
          >
            {language === 'en' ? 'EN' : '中'}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Background Scene Layer */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
             <Suspense fallback={null}>{sceneWithProps}</Suspense>
          </div>

          {/* Content Overlay */}
          <div className="absolute inset-0 z-10 p-4 overflow-hidden pb-20">
             <AnimatePresence mode="wait">
                <motion.div
                  key={activeProject}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full"
                >
                  {project.id === "02" ? (
                    <About />
                  ) : project.id === "03" ? (
                    <Logs />
                  ) : (
                    <Projects onSelect={setSelectedSubProject} />
                  )}
                </motion.div>
             </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  // Desktop Layout
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="relative h-full w-full bg-black text-white overflow-hidden min-w-[1024px]"
    >
      
      {/* 2D INPUT OVERLAY - Guaranteed Hit Testing for 3D Elements */}
      <div className="absolute inset-0 z-50 pointer-events-none flex">
         {/* Language Switcher - Desktop */}
         <div className="absolute top-8 right-8 pointer-events-auto">
            <button
              onClick={() => {
                soundManager.playClick()
                toggleLanguage()
              }}
              className="group relative px-4 py-2 border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden"
            >
              <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <div className="relative flex items-center gap-3 font-mono text-xs tracking-widest">
                <span className={language === 'en' ? 'text-cyan-400' : 'text-white/30'}>EN</span>
                <span className="text-white/20">/</span>
                <span className={language === 'zh' ? 'text-cyan-400' : 'text-white/30'}>中</span>
              </div>
            </button>
         </div>

         {/* Left Column Control Proxy */}
         <div 
           className="h-full w-[25%] pointer-events-auto cursor-grab active:cursor-grabbing"
           onWheel={(e) => pickerRef.current?.handleWheel(e)}
           onPointerDown={(e) => {
              (e.target as Element).setPointerCapture(e.pointerId);
              pickerRef.current?.handlePointerDown(e);
           }}
           onPointerMove={(e) => pickerRef.current?.handlePointerMove(e)}
           onPointerUp={(e) => {
              (e.target as Element).releasePointerCapture(e.pointerId);
              pickerRef.current?.handlePointerUp(e);
           }}
           onPointerCancel={(e) => {
              (e.target as Element).releasePointerCapture(e.pointerId);
              pickerRef.current?.handlePointerUp(e);
           }}
           style={{ touchAction: 'none' }} 
         />
      </div>

      {/* Global Perspective Container */}
      <div className="absolute inset-0 z-10 flex perspective-[1200px] transform-style-3d">
        
        {/* LEFT WALL: Project List */}
        <div 
          className="relative h-full z-30"
          style={{ 
            width: `${LEFT_WIDTH}%`,
            transform: `rotateY(${rotationAngle}deg)`,
            transformOrigin: 'right center',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
        >
          {/* Infinite Background Wall */}
          <div 
            className="absolute top-[-50%] bottom-[-50%] right-0 w-[200vw] origin-right pointer-events-none"
            style={{ background: 'transparent' }}
          />

          {/* Content Container */}
          <div className="relative h-full w-full" style={{ overflow: 'visible' }}>
             {/* Border Frame */}
             <div 
               className="absolute right-0 border-l border-y border-white/10 pointer-events-none"
               style={{ 
                 top: `${VERTICAL_PADDING}%`, 
                 height: `${100 - VERTICAL_PADDING * 2}%`,
                 width: '400%' 
               }}
             />

            <div className="absolute inset-0 flex items-center justify-end pr-8">
               <IOSPicker 
                  ref={pickerRef}
                  items={PROJECTS}
                  value={activeProject}
                  onChange={handleProjectChange}
                  onItemClick={(index) => handleClick(index)}
                  itemHeight={100}
                  height={600}
                  parentRotation={rotationAngle}
                />
            </div>
          </div>
        </div>

        {/* CENTER WALL: Details */}
        <div 
          className="relative h-full z-20"
          style={{ width: `${CENTER_WIDTH}%` }}
        >
           <div 
             className="absolute inset-x-0 h-full border border-white/10 bg-transparent backdrop-blur-[2px]"
             style={{ top: `${VERTICAL_PADDING}%`, height: `${100 - VERTICAL_PADDING * 2}%` }}
           >
              <ScreenOverlay />
              <div className="relative h-full w-full p-6 md:p-8 lg:p-12 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeProject}
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col h-full justify-between"
                  >
                    {project.id === "01" && <Projects activeProject={activeProject} onProjectChange={changeProject} selectedSubProject={selectedSubProject} onSubProjectChange={setSelectedSubProject} />}
                    {project.id === "02" && <About />}
                    {project.id === "03" && <Logs />}
                    {project.id === "04" && <Lab />}
                    {project.id === "05" && <MusicPlayer />}
                    {project.id === "06" && <Contact />}
                    {project.id === "07" && <Resume />}
                    {project.id === "08" && <Services />}
                  </motion.div>
                </AnimatePresence>
              </div>
           </div>
        </div>

        {/* RIGHT WALL: Visuals */}
        <div 
          className="relative h-full z-30"
          style={{ 
            width: `${RIGHT_WIDTH}%`,
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Background Frame Layer */}
          <div 
             className="absolute inset-0 pointer-events-none"
             style={{ 
               transform: `rotateY(-${rotationAngle}deg)`,
               transformOrigin: 'left center',
               transformStyle: 'preserve-3d',
               transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
             }}
          >
             {/* Infinite Background Wall */}
            <div 
              className="absolute top-[-50%] bottom-[-50%] left-0 w-[200vw] origin-left pointer-events-none"
              style={{ background: 'transparent' }}
            />

             {/* Border Frame */}
             <div 
               className="absolute left-0 border-r border-y border-white/10 pointer-events-none z-40"
               style={{ 
                 top: `${VERTICAL_PADDING}%`, 
                 height: `${100 - VERTICAL_PADDING * 2}%`,
                 width: '400%' 
               }}
             />
          </div>

          {/* Content Layer */}
          <div className="relative h-full w-full" style={{ overflow: 'visible' }}>
             {/* Visual Feed Label */}
             <div className="absolute top-4 right-4 z-30 font-mono text-[10px] text-white/40 tracking-widest">[VISUAL_FEED]</div>
             
             {/* The 3D Scene */}
             <div 
               className="absolute inset-x-0 z-10 opacity-90 flex items-center justify-center pointer-events-none"
               style={{ 
                 top: `${VERTICAL_PADDING}%`, 
                 height: `${100 - VERTICAL_PADDING * 2}%`,
               }}
             >
               <div className="w-full h-full relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center">
                      <Suspense fallback={null}>
                        {sceneWithProps}
                      </Suspense>
                    </div>
                  </div>
               </div>
             </div>
          </div>
        </div>

      </div>
    </motion.div>
  )
}