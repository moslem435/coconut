import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Activity, Monitor, Wifi, Box } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { SettingSection } from '../components/SettingSection'
import { InfoCard } from '../components/InfoCard'
import { TechStackGrid } from '../components/TechStackGrid'
import { useSystemInfo } from '../hooks/useSystemInfo'
import { useUptime } from '../hooks/useUptime'

export function AboutPanel() {
    const { t } = useLanguage()
    const sysInfo = useSystemInfo()
    const uptime = useUptime()
    const [devModeCount, setDevModeCount] = useState(0)

    const handleDevMode = () => {
        if (devModeCount >= 5) return
        const newCount = devModeCount + 1
        setDevModeCount(newCount)
        if (newCount === 5) {
            // In a real app, this would enable a global dev mode state
        }
    }

    return (
        <div className="space-y-8 pb-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--os-accent-dim)]/30 to-transparent border border-[var(--os-border)] p-8 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', duration: 0.8 }}
                    className="relative z-10"
                >
                    <div className="inline-block p-4 rounded-2xl bg-[var(--os-bg-base)] border border-[var(--os-accent)]/30 mb-4 shadow-[0_0_30px_var(--os-accent-dim)]">
                        <Settings size={48} className="text-[var(--os-accent)] animate-spin-slow" style={{ animationDuration: '10s' }} />
                    </div>
                    <h2 className="text-3xl font-bold mb-2 tracking-tight" style={{ color: 'var(--os-text-primary)' }}>{t('start.os')}</h2>
                    <div
                        className="cursor-pointer select-none inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--os-accent)]/10 border border-[var(--os-accent)]/20 text-[var(--os-accent)] text-xs font-medium hover:bg-[var(--os-accent)]/20 transition-colors"
                        onClick={handleDevMode}
                    >
                        <span>v1.0.0 (Beta)</span>
                        <span>•</span>
                        <span>Build 2026.02.05</span>
                    </div>

                    <AnimatePresence>
                        {devModeCount >= 5 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 text-sm font-bold text-green-400"
                            >
                                {t('settings.about.dev')}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--os-accent)]/10 blur-[80px] rounded-full pointer-events-none" />
            </div>

            {/* System Dashboard */}
            <div className="grid grid-cols-2 gap-3">
                <InfoCard
                    icon={<Activity size={18} />}
                    label={t('settings.about.uptime')}
                    value={uptime}
                />
                <InfoCard
                    icon={<Monitor size={18} />}
                    label={t('settings.about.screen')}
                    value={sysInfo.resolution}
                />
                <InfoCard
                    icon={<Wifi size={18} />}
                    label={t('settings.about.network')}
                    value={sysInfo.network}
                />
                <InfoCard
                    icon={<Box size={18} />}
                    label={t('settings.about.browser')}
                    value={sysInfo.browser}
                />
            </div>

            {/* Tech Stack */}
            <SettingSection title={t('settings.about.powered')}>
                <TechStackGrid />
            </SettingSection>
        </div>
    )
}
