'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Power } from 'lucide-react'

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [hasStarted, setHasStarted] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasStarted) return

    const bootLogs = [
      "BIOS DATE 01/15/2026 14:23:05 VER 1.0.4",
      "CPU: QUANTUM CORE i9-14900K @ 6.2GHz",
      "RAM: 128GB DDR6 8400MHz DETECTED",
      "VGA: RTX 6090 Ti 48GB DETECTED",
      "DETECTING NVME DRIVES...",
      "  DRIVE 0: PORTFOLIO_SYS (2TB) - OK",
      "  DRIVE 1: BACKUP_CORE (4TB) - OK",
      "INITIALIZING SYSTEM CORE...",
      "LOADING KERNEL MODULES...",
      "  [OK] GRAPHICS_ENGINE",
      "  [OK] AUDIO_SUBSYSTEM",
      "  [OK] NETWORK_INTERFACE",
      "  [OK] SECURITY_PROTOCOL",
      "MOUNTING FILE SYSTEM...",
      "STARTING SERVICES...",
      "ESTABLISHING SECURE CONNECTION...",
      "ACCESS GRANTED.",
      "WELCOME, USER.",
      "STARTING DESKTOP ENVIRONMENT..."
    ]

    let currentLog = 0
    const interval = setInterval(() => {
      if (currentLog < bootLogs.length) {
        const nextLog = bootLogs[currentLog]
        setLogs(prev => [...prev, nextLog])
        currentLog++
      } else {
        clearInterval(interval)
        setTimeout(onComplete, 800)
      }
    }, 150)

    return () => clearInterval(interval)
  }, [hasStarted, onComplete])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="fixed inset-0 z-[10000] bg-black overflow-hidden font-mono select-none cursor-default">
      <AnimatePresence>
        {!hasStarted ? (
          <motion.div
            key="standby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full flex items-center justify-center"
          >
             <div className="relative group cursor-pointer" onClick={() => setHasStarted(true)}>
                <div className="absolute inset-0 bg-cyan-500/20 blur-[50px] rounded-full group-hover:bg-cyan-500/40 transition-all duration-500" />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative w-24 h-24 rounded-full border-2 border-cyan-500/50 flex items-center justify-center bg-black/50 backdrop-blur-sm group-hover:border-cyan-400 transition-colors"
                >
                   <Power size={48} className="text-cyan-500/70 group-hover:text-cyan-400 group-hover:drop-shadow-[0_0_10px_cyan] transition-all" />
                </motion.button>
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-cyan-900 text-xs tracking-[0.5em] group-hover:text-cyan-700 transition-colors whitespace-nowrap">
                   INITIALIZE SYSTEM
                </div>
             </div>
          </motion.div>
        ) : (
          <motion.div
            key="booting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 md:p-12 text-sm md:text-base text-cyan-500/80 leading-relaxed h-full w-full relative"
          >
             {/* Scanlines */}
             <div className="absolute inset-0 pointer-events-none z-10 opacity-10" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />
             
             {/* Logs */}
             <div className="max-w-3xl flex flex-col gap-1 relative z-20">
               {logs.map((log, i) => (
                 <div key={i} className="flex gap-2">
                   <span className="text-cyan-800 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                   <span className={(log || "").includes("OK") || (log || "").includes("GRANTED") ? "text-green-400" : ""}>{log}</span>
                 </div>
               ))}
               <div ref={bottomRef} />
             </div>

             {/* Cursor */}
             <div className="fixed bottom-8 left-8 md:left-12 w-3 h-5 bg-cyan-500 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
