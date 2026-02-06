'use client'

import { useState, useEffect, ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { APPS_REGISTRY } from '@/os/registry/config'
import { AppManifest } from '@/os/registry/types'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useShallow } from 'zustand/react/shallow'

interface DesktopProps {
    onToggleMenu: () => void
}

export default function Desktop({ onToggleMenu }: DesktopProps) {
    // Actions - stable
    const openWindow = useWindowStore(state => state.openWindow)
    const focusWindow = useWindowStore(state => state.focusWindow)
    // Granular subscription for window status checks
    const windows = useWindowStore(useShallow(state => state.windows))

    const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
    const [currentTime, setCurrentTime] = useState('')

    // Splash screen state: which app is currently splashing
    const [splashingApp, setSplashingApp] = useState<AppManifest | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

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
        // Check if window already exists and is open
        if (windows[id]?.isOpen) {
            focusWindow(id)
            return
        }

        const app = APPS_REGISTRY[id]
        if (!app) return

        // If app has a splash screen, show it first
        if (app.splashScreen) {
            setSplashingApp(app)
        } else {
            // No splash screen, open window directly
            openWindow(
                app.id,
                app.title,
                <app.component />,
                app.icon,
                app.defaultWindowOptions
            )
        }
    }

    // Called when splash screen completes
    const handleSplashComplete = () => {
        if (splashingApp) {
            openWindow(
                splashingApp.id,
                splashingApp.title,
                <splashingApp.component />,
                splashingApp.icon,
                splashingApp.defaultWindowOptions
            )
            setSplashingApp(null)
        }
    }

    // Render splash screen via portal
    const SplashComponent = splashingApp?.splashScreen
    const splashPortal = mounted && SplashComponent && createPortal(
        <AnimatePresence>
            <SplashComponent onComplete={handleSplashComplete} />
        </AnimatePresence>,
        document.body
    )

    return (
        <>
            <div
                className="fixed inset-0 font-mono overflow-hidden select-none cursor-default z-0"
                style={{
                    backgroundColor: 'var(--os-bg-base)',
                    color: 'var(--os-text-primary)'
                }}
                onClick={() => {
                    setSelectedIcon(null)
                }}
            >
                {/* Background Gradient - Ambient Light */}
                <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000 bg-gradient-to-br from-[var(--os-bg-base)] via-[var(--os-bg-base)] to-[var(--os-accent-dim)] opacity-50" />

                {/* Desktop Area */}
                <div className="absolute inset-0 top-6 bottom-24 p-8 flex flex-col items-start gap-6 flex-wrap content-start">

                    {Object.values(APPS_REGISTRY).map((app) => (
                        <motion.div
                            key={app.id}
                            className="group flex flex-col items-center gap-2 w-24 cursor-pointer"
                            onClick={(e) => handleIconClick(app.id, e)}
                            onDoubleClick={() => handleDoubleClick(app.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <div
                                className="relative p-3.5 rounded-2xl transition-all duration-300 shadow-sm"
                                style={{
                                    backgroundColor: selectedIcon === app.id ? 'var(--os-accent)' : 'var(--os-bg-panel)',
                                    border: `1px solid ${selectedIcon === app.id ? 'var(--os-accent)' : 'var(--os-border)'}`,
                                    opacity: 0.9
                                }}
                            >
                                <app.icon
                                    size={32}
                                    className="transition-colors"
                                    style={{
                                        color: selectedIcon === app.id ? '#ffffff' : 'var(--os-accent)'
                                    }}
                                />
                            </div>
                            <span
                                className="text-xs font-medium tracking-wide px-2 py-0.5 rounded shadow-sm backdrop-blur-sm transition-colors text-center max-w-[110%] truncate"
                                style={{
                                    backgroundColor: selectedIcon === app.id ? 'var(--os-accent)' : 'var(--os-bg-panel)',
                                    color: selectedIcon === app.id ? '#ffffff' : 'var(--os-text-secondary)'
                                }}
                            >
                                {app.title}
                            </span>
                        </motion.div>
                    ))}

                </div>
            </div>

            {/* Splash Screen Portal */}
            {splashPortal}
        </>
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
