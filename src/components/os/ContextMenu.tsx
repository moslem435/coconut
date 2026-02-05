'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Monitor, Volume2, VolumeX, Terminal, Shield } from 'lucide-react'

export default function SystemContextMenu() {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      setVisible(true)
      setPosition({ x: e.clientX, y: e.clientY })
    }

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false)
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('click', handleClick)
    document.addEventListener('scroll', () => setVisible(false))

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('scroll', () => setVisible(false))
    }
  }, [])

  const menuItems = [
    { 
      label: 'SYSTEM_REBOOT', 
      icon: RefreshCw, 
      action: () => window.location.reload() 
    },
    { 
      label: 'TOGGLE_FULLSCREEN', 
      icon: Monitor, 
      action: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(e => console.error(e))
        } else {
          document.exitFullscreen()
        }
      } 
    },
    { 
      label: 'RUN_DIAGNOSTICS', 
      icon: Terminal, 
      action: () => console.log('System diagnostics running... OK') 
    },
    { 
      label: 'SECURITY_PROTOCOL', 
      icon: Shield, 
      action: () => alert('Security Protocol: ACTIVE. Unauthorized access will be logged.') 
    }
  ]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.9, height: 0 }}
          animate={{ opacity: 1, scale: 1, height: 'auto' }}
          exit={{ opacity: 0, scale: 0.9, height: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed z-[9999] bg-black/90 border border-cyan-500/30 backdrop-blur-md min-w-[200px] shadow-[0_0_20px_rgba(6,182,212,0.15)] overflow-hidden"
          style={{ 
            top: position.y, 
            left: position.x,
            // Adjust if near screen edge
            transform: `translate(${position.x > window.innerWidth - 200 ? '-100%' : '0'}, ${position.y > window.innerHeight - 200 ? '-100%' : '0'})`
          }}
        >
          <div className="flex flex-col p-1">
            <div className="px-3 py-2 text-[10px] text-cyan-500/50 tracking-widest border-b border-white/5 mb-1">
              SYSTEM_COMMANDS
            </div>
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.action()
                  setVisible(false)
                }}
                className="flex items-center gap-3 px-3 py-2 text-xs font-mono text-white/80 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors text-left group"
              >
                <item.icon size={14} className="group-hover:scale-110 transition-transform" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
