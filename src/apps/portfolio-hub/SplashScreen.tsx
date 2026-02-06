'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Cpu, Zap, Layers, Command } from 'lucide-react'

interface PortfolioSplashScreenProps {
    onComplete?: () => void
}

const LOADING_STEPS = [
    "Initializing Portfolio...",
    "Loading Project Assets...",
    "Preparing 3D Scene...",
    "Indexing Works...",
    "Connecting Services...",
    "Hydrating UI...",
    "Ready."
]

export default function PortfolioSplashScreen({ onComplete }: PortfolioSplashScreenProps) {
    const [progress, setProgress] = useState(0)
    const [loadingText, setLoadingText] = useState(LOADING_STEPS[0])
    const [mounted, setMounted] = useState(false)

    // Ensure we only use portal on client side
    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        let stepIndex = 0

        // Simulate loading progress
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer)
                    setTimeout(() => onComplete?.(), 800)
                    return 100
                }

                // Update loading text based on progress chunks
                const currentStep = Math.floor((prev / 100) * LOADING_STEPS.length)
                if (currentStep !== stepIndex && LOADING_STEPS[currentStep]) {
                    stepIndex = currentStep
                    setLoadingText(LOADING_STEPS[stepIndex])
                }

                // Non-linear realistic loading speed
                const jump = Math.random() > 0.7 ? Math.random() * 15 : Math.random() * 2
                return Math.min(prev + jump, 100)
            })
        }, 150)

        return () => clearInterval(timer)
    }, [onComplete])

    // Don't render anything on server side
    if (!mounted) return null

    // Use portal to render directly into document.body
    return createPortal(
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative w-[680px] h-[400px] bg-[#09090b] overflow-hidden shadow-2xl border border-white/10 flex pointer-events-auto"
                // Style mimicking Adobe/JetBrains splash screens
                style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.05)'
                }}
            >
                {/* --- Left Art Side (Abstract Graphics) --- */}
                <div className="w-[280px] relative h-full overflow-hidden bg-[#000]">
                    {/* Background Gradient Mesh */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/40 via-purple-900/20 to-black z-0" />

                    {/* Animated Grid/Lines */}
                    <div className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
                            backgroundSize: '24px 24px'
                        }}
                    />

                    {/* Main Graphic Symbol */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border border-cyan-500/30 rounded-full border-dashed"
                        />
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-[15%] border border-purple-500/30 rounded-full border-dotted"
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-cyan-500 blur-sm opacity-50">
                            <Zap size={64} />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                            <Command size={48} />
                        </div>
                    </div>

                    {/* Version Badge */}
                    <div className="absolute top-6 left-6 flex flex-col">
                        <span className="text-xs font-bold text-cyan-500 tracking-widest">BUILD 2026.1</span>
                        <span className="text-[10px] text-white/30 font-mono">EARLY ACCESS</span>
                    </div>
                </div>

                {/* --- Right Content Side --- */}
                <div className="flex-1 h-full relative p-10 flex flex-col justify-between bg-gradient-to-br from-[#0a0a0a] to-[#050505]">

                    {/* Header / Title */}
                    <div className="space-y-1 mt-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center border border-white/10">
                                <Terminal size={16} className="text-white/80" />
                            </div>
                            <span className="text-xs font-medium text-white/40 tracking-wide">PORTFOLIO HUB</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
                            Portfolio Hub
                        </h1>
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-light text-cyan-500">Ultimate Edition</span>
                            <span className="text-[10px] text-white/20">v3.0.0-rc1</span>
                        </div>
                    </div>

                    {/* Footer / Loading Status */}
                    <div className="space-y-4 mb-2">

                        {/* Text Status */}
                        <div className="h-5 overflow-hidden relative">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={loadingText}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.1 }}
                                    className="text-[11px] font-mono text-white/50 truncate w-full absolute top-0 left-0"
                                >
                                    {loadingText}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-[2px] w-full bg-white/5 overflow-hidden">
                            <motion.div
                                className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ type: "spring", stiffness: 50, damping: 15 }}
                            />
                        </div>

                        {/* Credits */}
                        <div className="flex justify-between items-end pt-2 border-t border-white/5">
                            <div className="text-[9px] text-white/20 leading-relaxed max-w-[200px]">
                                © 2026 Antigravity Systems. <br />
                                Licensed under MIT Open Source. <br />
                                All rights reserved.
                            </div>
                            <div className="flex gap-2 opacity-20">
                                <Cpu size={14} />
                                <Layers size={14} />
                            </div>
                        </div>
                    </div>

                </div>
            </motion.div>
        </motion.div>,
        document.body
    )
}
