'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { APPS_REGISTRY } from '@/lib/apps-registry'
import { useWindowManager } from '@/lib/WindowManagerContext'

interface DesktopProps {
  onLaunch: () => void
  onToggleMenu: () => void
}

export default function Desktop({ onLaunch, onToggleMenu }: DesktopProps) {
  const { openWindow } = useWindowManager()
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  
  // Update time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleIconClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIcon(id)
  }

  const handleDoubleClick = (id: string) => {
    if (id === 'system-core') {
      onLaunch()
    } else {
      const app = APPS_REGISTRY[id]
      if (app) {
         openWindow(
            app.id, 
            app.title, 
            <app.component />, 
            app.icon, 
            app.defaultWindowOptions
         )
      }
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black font-mono overflow-hidden select-none cursor-default z-0 text-cyan-500"
      onClick={() => {
        setSelectedIcon(null)
      }}
    >
      {/* Background Grid & Noise */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{
          backgroundImage: `
            linear-gradient(to right, #004444 1px, transparent 1px),
            linear-gradient(to bottom, #004444 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] pointer-events-none" />

      {/* Desktop Area */}
      <div className="absolute inset-0 top-0 bottom-24 p-8 flex flex-col items-start gap-8 flex-wrap content-start">
        
        {Object.values(APPS_REGISTRY).map((app) => (
            <motion.div 
              key={app.id}
              className="group flex flex-col items-center gap-2 w-24 cursor-pointer"
              onClick={(e) => handleIconClick(app.id, e)}
              onDoubleClick={() => handleDoubleClick(app.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className={`
                relative p-4 rounded-lg border transition-all duration-300
                ${selectedIcon === app.id 
                  ? 'bg-cyan-900/30 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                  : 'bg-black/40 border-cyan-900/50 hover:border-cyan-700'
                }
              `}>
                 <app.icon size={40} className={`transition-colors ${selectedIcon === app.id ? 'text-cyan-300' : 'text-cyan-600'}`} />
                 {/* Glitch effect overlay on hover */}
                 <div className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 animate-pulse rounded-lg" />
              </div>
              <span className={`text-xs tracking-wider px-2 py-0.5 rounded ${selectedIcon === app.id ? 'bg-cyan-900/50 text-cyan-200' : 'text-cyan-700'}`}>
                {app.title}
              </span>
            </motion.div>
        ))}

      </div>
    </div>
  )
}

function DockItem({ icon: Icon, label, onClick, active }: { icon: any, label: string, onClick?: (e: React.MouseEvent) => void, active?: boolean }) {
  return (
    <motion.div 
      className="relative group cursor-pointer flex flex-col items-center justify-center"
      whileHover={{ y: -5 }}
      onClick={onClick}
    >
      <Icon size={20} className={`transition-colors ${active ? 'text-cyan-300' : 'text-cyan-600 group-hover:text-cyan-400'}`} />
      <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] tracking-widest text-cyan-500 whitespace-nowrap bg-black/80 px-2 py-0.5 rounded border border-cyan-900/50">
        {label}
      </div>
      {active && <div className="absolute -bottom-2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_5px_cyan]" />}
    </motion.div>
  )
}
