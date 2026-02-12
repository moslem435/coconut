'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Power, Settings } from 'lucide-react'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { APPS_REGISTRY } from '@/os/registry/config'
import { AppManifest } from '@/os/registry/types'
import { AppIcon } from '@/os/ui/AppIcon'

interface StartMenuProps {
    isOpen: boolean
    onClose: () => void
    onShutdown?: () => void
    toggleRef: React.RefObject<HTMLElement | null>
}

export default function StartMenu({ isOpen, onClose, onShutdown, toggleRef }: StartMenuProps) {
    const { useAnimations } = useSystemSettings()
    const { t } = useLanguage()
    const openWindow = useWindowStore(state => state.openWindow)
    const launchApp = useWindowStore(state => state.launchApp)
    const focusWindow = useWindowStore(state => state.focusWindow)
    const menuRef = useRef<HTMLDivElement>(null)

    const [position, setPosition] = useState<{ x: number, y: number } | null>(null)

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isOpen &&
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                toggleRef.current &&
                !toggleRef.current.contains(event.target as Node)
            ) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose, toggleRef])

    useLayoutEffect(() => {
        if (isOpen && toggleRef.current && menuRef.current) {
            const triggerRect = toggleRef.current.getBoundingClientRect()
            const menuRect = menuRef.current.getBoundingClientRect()
            const taskbar = toggleRef.current.closest('[data-taskbar]')
            const taskbarRect = taskbar?.getBoundingClientRect()

            // Center align relative to trigger
            let x = triggerRect.left + triggerRect.width / 2 - menuRect.width / 2

            // Clamp to screen edges with padding
            const padding = 16
            const maxX = window.innerWidth - menuRect.width - padding
            x = Math.min(Math.max(padding, x), maxX)

            // Baseline positioning: Use taskbar top for unified alignment
            const baselineY = taskbarRect ? taskbarRect.top : triggerRect.top

            // Calculate dynamic gap based on REM to support scaling
            const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
            const gap = 0.75 * rootFontSize // 0.75rem gap

            const y = window.innerHeight - baselineY + gap

            setPosition({ x, y })
        }
    }, [isOpen, toggleRef])

    const handleLaunchApp = (appId: string) => {
        const app = APPS_REGISTRY[appId]
        if (!app) return

        // Check if window is open using getState() to avoid subscription
        const isWindowOpen = useWindowStore.getState().windows[appId]?.isOpen

        if (isWindowOpen) {
            focusWindow(appId)
        } else {
            launchApp(
                app.id,
                t(`app.${app.id}`),
                <app.component />,
                app.icon,
                { ...app.defaultWindowOptions, isDefaultTitle: true }
            )
        }
        onClose()
    }

    const handleShutdown = () => {
        onClose()
        // Small delay for menu close animation
        setTimeout(() => {
            onShutdown?.()
        }, 300)
    }

    if (typeof document === 'undefined') return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    transition={{ duration: useAnimations ? 0.2 : 0, ease: 'easeOut' }}
                    className="fixed w-80 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl z-[10001]"
                    style={{
                        backgroundColor: 'rgba(var(--os-bg-panel-rgb), 0.75)',
                        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(40px) saturate(150%)',
                        left: position?.x ?? 0,
                        bottom: position?.y ?? '5rem', // Fallback in REM
                        visibility: position ? 'visible' : 'hidden'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* User Profile */}
                    <div className="flex items-center gap-4 p-2 mb-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm"
                            style={{
                                backgroundColor: 'var(--os-bg-base)',
                                border: '1px solid var(--os-border)'
                            }}>
                            <Terminal size={24} style={{ color: 'var(--os-accent)' }} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold" style={{ color: 'var(--os-text-primary)' }}>{t('start.visitor')}</div>
                            <div className="text-xs" style={{ color: 'var(--os-text-secondary)' }}>{t('start.os')}</div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-1">
                        <MenuItem icon={Power} label={t('start.shutdown')} onClick={handleShutdown} danger />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}

interface MenuItemProps {
    manifest?: AppManifest
    icon?: any
    label: string
    onClick?: () => void
    danger?: boolean
}

function MenuItem({ manifest, icon: Icon, label, onClick, danger }: MenuItemProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${danger
                ? 'hover:bg-red-500/10 text-red-400'
                : 'hover:bg-[var(--os-hover-bg)] text-[var(--os-text-primary)]'
                }`}
        >
            {manifest ? (
                <AppIcon 
                    manifest={manifest} 
                    icon={Icon} 
                    size={32} 
                    background={true}
                    className={danger ? 'text-red-400' : undefined}
                />
            ) : (
                <div className="w-8 h-8 flex items-center justify-center">
                    <Icon size={20} strokeWidth={2} />
                </div>
            )}
            <span className="text-sm font-medium">{label}</span>
        </button>
    )
}
