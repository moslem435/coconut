'use client'

import { useState, useEffect } from 'react'
import { Wifi, Battery, Volume2, Command } from 'lucide-react'
import { motion } from 'framer-motion'
import { useWindowManager } from '@/lib/WindowManagerContext'

interface TaskbarProps {
  onStartClick?: () => void
}

export default function Taskbar({ 
  onStartClick
}: TaskbarProps) {
  const { windows, activeWindowId, focusWindow, minimizeWindow, showDesktop } = useWindowManager()
  const [time, setTime] = useState("")
  
  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Sort windows by creation order (or just object keys for now)
  const openWindows = Object.values(windows).filter(w => w.isOpen)

  return (
    <div className="fixed bottom-0 left-0 right-0 h-10 bg-[#0a0a0a] border-t border-white/10 z-[200] flex items-center justify-between select-none shadow-lg">
      
      {/* Left: Start & Taskbar Items */}
      <div className="flex items-center gap-2 h-full py-1 pl-2">
        
        {/* Start Button */}
        <button 
          onClick={onStartClick}
          className="h-full aspect-square flex items-center justify-center hover:bg-white/10 rounded transition-colors group"
        >
          <Command size={18} className="text-cyan-500 group-hover:text-cyan-400" />
        </button>

        {/* Separator */}
        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Window List */}
        {openWindows.map((win) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={win.id}
            onClick={() => {
              if (activeWindowId === win.id && !win.isMinimized) {
                minimizeWindow(win.id)
              } else {
                focusWindow(win.id)
              }
            }}
            className={`
              h-full px-4 flex items-center gap-3 border-b-2 transition-colors cursor-pointer min-w-[140px] max-w-[200px]
              ${activeWindowId === win.id && !win.isMinimized
                ? 'bg-white/10 border-cyan-500' 
                : 'bg-white/5 border-transparent hover:bg-white/10'
              }
            `}
          >
            {/* Window Icon */}
            {win.icon ? (() => {
               const Icon = win.icon
               return <Icon size={14} className="text-cyan-400" />
            })() : (
               <div className="w-3 h-3 rounded-sm bg-cyan-900 border border-cyan-500/50 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-[1px]" />
               </div>
            )}
            
            <span className="text-xs font-mono text-cyan-100 tracking-wide truncate">
              {win.title}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Right: System Tray */}
      <div className="flex items-center gap-4 h-full text-xs font-mono text-white/60">
        
        {/* Icons */}
        <div className="flex items-center gap-3">
           <Volume2 size={14} className="hover:text-white transition-colors cursor-pointer" />
           <Wifi size={14} className="hover:text-white transition-colors cursor-pointer" />
           <Battery size={14} className="hover:text-white transition-colors cursor-pointer" />
        </div>

        {/* Clock */}
        <div className="flex flex-col items-end leading-none gap-0.5 px-2 hover:bg-white/5 py-1 rounded cursor-default">
           <span className="text-white/90 font-bold">{time}</span>
           <span className="text-[9px] text-white/40">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
        
        {/* Show Desktop Sliver */}
        <div 
          onClick={showDesktop}
          className="w-4 h-full border-l border-white/10 hover:bg-white/20 cursor-pointer transition-colors"
          title="Show Desktop"
        />
      </div>
    </div>
  )
}
