'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Power, Settings } from 'lucide-react'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { APPS_REGISTRY } from '@/os/registry/config'

interface StartMenuProps {
    isOpen: boolean
    onClose: () => void
    onShutdown?: () => void
}

export default function StartMenu({ isOpen, onClose, onShutdown }: StartMenuProps) {
    const { useAnimations } = useSystemSettings()
    const { t } = useLanguage()
    const openWindow = useWindowStore(state => state.openWindow)
    const windows = useWindowStore(state => state.windows)
    const focusWindow = useWindowStore(state => state.focusWindow)

    const handleOpenSettings = () => {
        const settingsApp = APPS_REGISTRY['settings']
        if (!settingsApp) return

        // If already open, focus it
        if (windows['settings']?.isOpen) {
            focusWindow('settings')
        } else {
            openWindow(
                settingsApp.id,
                t('start.settings'),
                <settingsApp.component />,
                settingsApp.icon,
                settingsApp.defaultWindowOptions
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

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    transition={{ duration: useAnimations ? 0.2 : 0, ease: 'easeOut' }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 w-80 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl z-[10001]"
                    style={{
                        backgroundColor: 'rgba(var(--os-bg-panel-rgb), 0.85)',
                        border: '1px solid var(--os-border)',
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
                        <MenuItem icon={Settings} label={t('start.settings')} onClick={handleOpenSettings} />
                        <div className="h-px w-full my-2 bg-gradient-to-r from-transparent via-[var(--os-border)] to-transparent" />
                        <MenuItem icon={Power} label={t('start.shutdown')} onClick={handleShutdown} danger />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

interface MenuItemProps {
    icon: any
    label: string
    onClick?: () => void
    danger?: boolean
}

function MenuItem({ icon: Icon, label, onClick, danger }: MenuItemProps) {
    return (
        <div
            className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-150 hover:bg-[var(--os-hover-bg)] active:scale-[0.98]"
            onClick={onClick}
        >
            <Icon
                size={18}
                className="transition-colors"
                style={{ color: danger ? 'var(--os-danger)' : 'var(--os-text-secondary)' }}
            />
            <span
                className="text-sm font-medium transition-colors"
                style={{ color: danger ? 'var(--os-danger)' : 'var(--os-text-primary)' }}
            >
                {label}
            </span>
        </div>
    )
}