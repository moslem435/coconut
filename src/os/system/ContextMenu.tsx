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
          className="fixed z-[9999] backdrop-blur-md min-w-[200px] shadow-lg overflow-hidden"
          style={{
            top: position.y,
            left: position.x,
            // Adjust if near screen edge
            transform: `translate(${position.x > window.innerWidth - 200 ? '-100%' : '0'}, ${position.y > window.innerHeight - 200 ? '-100%' : '0'})`,
            backgroundColor: 'var(--os-bg-panel)',
            borderColor: 'var(--os-border)',
            borderWidth: '1px',
            borderStyle: 'solid',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)'
          }}
        >
          <div className="flex flex-col p-1">
            <div
              className="px-3 py-2 text-[10px] tracking-widest border-b mb-1"
              style={{
                color: 'var(--os-text-muted)',
                borderColor: 'var(--os-border)'
              }}
            >
              SYSTEM_COMMANDS
            </div>
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.action()
                  setVisible(false)
                }}
                className="flex items-center gap-3 px-3 py-2 text-xs font-mono transition-colors text-left group"
                style={{ color: 'var(--os-text-primary)' }}
              >
                <item.icon size={14} className="group-hover:scale-110 transition-transform" />
                <span>{item.label}</span>
                <style jsx>{`
                  button:hover {
                    background-color: var(--os-accent-glow);
                    color: var(--os-accent) !important;
                  }
                `}</style>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
