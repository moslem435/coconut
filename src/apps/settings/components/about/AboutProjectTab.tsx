import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Palmtree, Globe, Container, ShieldCheck, GitBranch, Scale, Sparkles, LayoutTemplate, User, Code2, Mail } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useSystemSettingsStore } from '@/os/kernel/useSystemSettingsStore'
import { SettingSection } from '../SettingSection'
import { TechStackGrid } from '../TechStackGrid'
import { DevTools } from '../DevTools'
import { APP_CONFIG } from '@/appConfig'

export function AboutProjectTab() {
    const { t } = useLanguage()
    const { devMode, setDevMode } = useSystemSettingsStore()

    const [coconuts, setCoconuts] = useState<{ id: number, x: number }[]>([])
    const [eggTriggered, setEggTriggered] = useState(false)
    const [toastVisible, setToastVisible] = useState(false)

    const dropCoconut = () => {
        const id = Date.now()
        const x = Math.random() * 95
        setCoconuts(prev => [...prev, { id, x }])

        setTimeout(() => {
            setCoconuts(prev => prev.filter(c => c.id !== id))
        }, 2000)
    }

    const handleLogoClick = () => {
        dropCoconut()
        if (!eggTriggered) {
            setEggTriggered(true)
            setToastVisible(true)
            setTimeout(() => setToastVisible(false), 3000)
        }
    }

    const currentYear = new Date().getFullYear()

    return (
        <motion.div
            key="project"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
        >
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--os-accent-dim)]/30 to-transparent border border-[var(--os-border)] p-8 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', duration: 0.8 }}
                    className="relative z-10"
                >
                    <div className="inline-block p-4 rounded-2xl bg-[var(--os-bg-base)] border border-[var(--os-accent)]/30 mb-4 shadow-[0_0_30px_var(--os-accent-dim)] group relative overflow-hidden">
                        <motion.div
                            whileHover={{ rotate: 15, scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 10 }}
                            onClick={handleLogoClick}
                            className="cursor-pointer"
                        >
                            <Palmtree size={48} className="text-[var(--os-accent)] relative z-10" />
                        </motion.div>
                    </div>
                    <h2 className="text-4xl font-bold mb-2 tracking-tight font-display" style={{ color: 'var(--os-text-primary)', fontFamily: 'var(--font-orbitron)' }}>
                        COCONUT <span className="text-[var(--os-accent)]">OS</span>
                    </h2>

                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="mb-4 text-sm font-medium italic opacity-80"
                        style={{ color: 'var(--os-text-secondary)' }}
                    >
                        {t('settings.about.slogan')}
                    </motion.div>

                    {/* Version Badge - Click to toggle Dev Mode */}
                    <div
                        className="cursor-pointer select-none inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--os-accent)]/10 border border-[var(--os-accent)]/20 text-[var(--os-accent)] text-xs font-medium hover:bg-[var(--os-accent)]/20 transition-all hover:scale-105 active:scale-95"
                        onClick={() => setDevMode(!devMode)}
                    >
                        <span>{APP_CONFIG.version} ({APP_CONFIG.codename})</span>
                        <span className="opacity-50">•</span>
                        <span>Build {APP_CONFIG.buildDate}</span>
                    </div>

                    <AnimatePresence>
                        {devMode && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                className="mt-3 space-y-1"
                            >
                                <p className="text-sm font-bold text-green-400">
                                    {t('settings.about.debug')}
                                </p>
                                <p className="text-[11px] text-[var(--os-text-secondary)] opacity-60">
                                    {t('settings.about.devmode_hint')}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--os-accent)]/10 blur-[80px] rounded-full pointer-events-none" />

                {/* Coconut Rain Portal */}
                {typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
                        <AnimatePresence>
                            {coconuts.map(coconut => (
                                <motion.div
                                    key={coconut.id}
                                    initial={{ y: -100, opacity: 1, rotate: 0 }}
                                    animate={{ y: '120vh', opacity: 1, rotate: 720 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 2, ease: "linear" }}
                                    className="absolute text-5xl drop-shadow-xl"
                                    style={{ left: `${coconut.x}vw` }}
                                >
                                    🥥
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>,
                    document.body
                )}

                {/* Egg Toast */}
                {typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {toastVisible && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] px-5 py-2.5 rounded-full bg-[var(--os-bg-base)] border border-[var(--os-accent)]/40 shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-none"
                                style={{ color: 'var(--os-text-primary)' }}
                            >
                                <Sparkles size={14} className="text-[var(--os-accent)]" />
                                {t('settings.about.egg_toast')}
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>

            {/* Developer Tools */}
            <AnimatePresence>
                {devMode && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <DevTools />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* The 3 Pillars */}
            <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-[var(--os-bg-base)]/50 border border-[var(--os-border)] hover:bg-[var(--os-hover-bg)] transition-colors group hover:shadow-lg hover:border-[var(--os-accent)]/30 duration-300">
                    <div className="p-3 rounded-full bg-blue-500/10 text-blue-500 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--os-text-primary)] mb-1">{t('settings.about.pillar.web.title')}</h3>
                        <p className="text-[10px] text-[var(--os-text-secondary)] leading-relaxed">{t('settings.about.pillar.web.desc')}</p>
                    </div>
                </div>
                <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-[var(--os-bg-base)]/50 border border-[var(--os-border)] hover:bg-[var(--os-hover-bg)] transition-colors group hover:shadow-lg hover:border-[var(--os-accent)]/30 duration-300">
                    <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-500 group-hover:scale-110 group-hover:bg-yellow-500/20 transition-all duration-300">
                        <Container size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--os-text-primary)] mb-1">{t('settings.about.pillar.dev.title')}</h3>
                        <p className="text-[10px] text-[var(--os-text-secondary)] leading-relaxed">{t('settings.about.pillar.dev.desc')}</p>
                    </div>
                </div>
                <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-[var(--os-bg-base)]/50 border border-[var(--os-border)] hover:bg-[var(--os-hover-bg)] transition-colors group hover:shadow-lg hover:border-[var(--os-accent)]/30 duration-300">
                    <div className="p-3 rounded-full bg-green-500/10 text-green-500 group-hover:scale-110 group-hover:bg-green-500/20 transition-all duration-300">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--os-text-primary)] mb-1">{t('settings.about.pillar.local.title')}</h3>
                        <p className="text-[10px] text-[var(--os-text-secondary)] leading-relaxed">{t('settings.about.pillar.local.desc')}</p>
                    </div>
                </div>
            </div>

            {/* Tech Stack */}
            <SettingSection title={t('settings.about.powered_title')}>
                <TechStackGrid />
            </SettingSection>

            {/* Footer */}
            <div className="text-center space-y-3 pt-6 border-t border-[var(--os-border)]/50">
                <p className="text-xs text-[var(--os-text-secondary)] opacity-60">
                    © {currentYear} Coconut Corp. All rights reserved.
                </p>
                <div className="flex justify-center gap-6 flex-wrap">
                    <a
                        href={APP_CONFIG.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--os-accent)] hover:underline flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"
                    >
                        <GitBranch size={14} />
                        {t('settings.about.github')}
                    </a>
                    <a
                        href={APP_CONFIG.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--os-accent)] hover:underline flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"
                    >
                        <Scale size={14} />
                        {t('settings.about.license')}
                    </a>
                    <a
                        href={APP_CONFIG.inspirationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--os-text-secondary)] hover:underline flex items-center gap-1.5 opacity-60 hover:opacity-80 transition-opacity"
                    >
                        {t('settings.about.inspiration')}
                    </a>
                </div>
            </div>
        </motion.div>
    )
}
