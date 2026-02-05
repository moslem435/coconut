'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Terminal, Cpu, Layers, Sparkles } from 'lucide-react'

interface AppSplashScreenProps {
  onComplete: () => void
}

export default function AppSplashScreen({ onComplete }: AppSplashScreenProps) {
  const [status, setStatus] = useState('Initializing...')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const steps = [
      { msg: 'Loading core modules...', time: 400 },
      { msg: 'Initializing interface...', time: 800 },
      { msg: 'Loading project data...', time: 1200 },
      { msg: 'Starting graphics engine...', time: 1600 },
      { msg: 'Preparing workspace...', time: 2000 },
      { msg: 'Ready', time: 2400 }
    ]

    let currentStep = 0
    
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 2
      })
    }, 40)

    // Status text update
    const statusInterval = setInterval(() => {
      if (currentStep < steps.length) {
        setStatus(steps[currentStep].msg)
        currentStep++
      } else {
        clearInterval(statusInterval)
        setTimeout(onComplete, 500)
      }
    }, 400)

    return () => {
      clearInterval(progressInterval)
      clearInterval(statusInterval)
    }
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-[600px] h-[360px] overflow-hidden rounded-xl border border-white/10 shadow-2xl bg-[#1a1a1a]"
      >
        {/* Artistic Background */}
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-cyan-500/20 blur-[100px] rounded-full mix-blend-screen" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/20 blur-[100px] rounded-full mix-blend-screen" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        </div>

        <div className="relative h-full flex flex-col justify-between p-10 z-10">
            {/* Header / Logo Area */}
            <div className="flex justify-between items-start">
                <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Terminal size={32} className="text-white" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h1 className="text-3xl font-bold text-white tracking-tight">PORTFOLIO</h1>
                        <div className="flex items-center gap-2 text-white/50 text-xs font-mono uppercase tracking-widest">
                            <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">v2.6.0</span>
                            <span>Ultimate Edition</span>
                        </div>
                    </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="flex gap-2 text-white/20">
                    <Cpu size={20} />
                    <Layers size={20} />
                    <Sparkles size={20} />
                </div>
            </div>

            {/* Bottom Area */}
            <div className="space-y-4">
                {/* Main Art Text */}
                <div className="absolute top-1/2 left-10 -translate-y-1/2 opacity-10 pointer-events-none select-none">
                    <span className="text-9xl font-black text-white tracking-tighter">OS</span>
                </div>

                <div className="flex justify-between items-end text-xs font-mono">
                    <div className="text-cyan-400/80 min-w-[200px]">
                        {status}
                    </div>
                    <div className="text-white/30">
                        © 2026 System Corp. All Rights Reserved.
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: "spring", stiffness: 50, damping: 15 }}
                    />
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  )
}
