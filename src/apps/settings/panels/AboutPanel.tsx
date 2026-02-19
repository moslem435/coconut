import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Palmtree, Globe, Container, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { SettingSection } from '../components/SettingSection'
import { TechStackGrid } from '../components/TechStackGrid'
import { DevTools } from '../components/DevTools'

export function AboutPanel() {
    const { t } = useLanguage()
    const [devModeCount, setDevModeCount] = useState(0)

    const [coconuts, setCoconuts] = useState<{ id: number, x: number }[]>([])

    const dropCoconut = () => {
        const id = Date.now()
        const x = Math.random() * 95 // Random position 0% - 95%
        setCoconuts(prev => [...prev, { id, x }])

        // Remove after animation
        setTimeout(() => {
            setCoconuts(prev => prev.filter(c => c.id !== id))
        }, 2000)
    }

    const handleLogoClick = () => {
        dropCoconut()
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
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
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

                    <div
                        className="cursor-pointer select-none inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--os-accent)]/10 border border-[var(--os-accent)]/20 text-[var(--os-accent)] text-xs font-medium hover:bg-[var(--os-accent)]/20 transition-all hover:scale-105 active:scale-95"
                        onClick={() => {
                            if (devModeCount < 5) setDevModeCount(prev => prev + 1)
                        }}
                    >
                        <span>v1.0.0 (Coco-Alpha)</span>
                        <span className="opacity-50">•</span>
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
            </div>

            {/* Developer Tools */}
            <AnimatePresence>
                {devModeCount >= 3 && (
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
                <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-[var(--os-bg-base)]/50 border border-[var(--os-border)] hover:bg-[var(--os-hover-bg)] transition-colors group">
                    <div className="p-2 rounded-full bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--os-text-primary)]">{t('settings.about.pillar.web.title')}</h3>
                        <p className="text-[10px] text-[var(--os-text-secondary)]">{t('settings.about.pillar.web.desc')}</p>
                    </div>
                </div>
                <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-[var(--os-bg-base)]/50 border border-[var(--os-border)] hover:bg-[var(--os-hover-bg)] transition-colors group">
                    <div className="p-2 rounded-full bg-yellow-500/10 text-yellow-500 group-hover:scale-110 transition-transform">
                        <Container size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--os-text-primary)]">{t('settings.about.pillar.dev.title')}</h3>
                        <p className="text-[10px] text-[var(--os-text-secondary)]">{t('settings.about.pillar.dev.desc')}</p>
                    </div>
                </div>
                <div className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-[var(--os-bg-base)]/50 border border-[var(--os-border)] hover:bg-[var(--os-hover-bg)] transition-colors group">
                    <div className="p-2 rounded-full bg-green-500/10 text-green-500 group-hover:scale-110 transition-transform">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--os-text-primary)]">{t('settings.about.pillar.local.title')}</h3>
                        <p className="text-[10px] text-[var(--os-text-secondary)]">{t('settings.about.pillar.local.desc')}</p>
                    </div>
                </div>
            </div>

            {/* Tech Stack */}
            <SettingSection title={t('settings.about.powered_title')}>
                <TechStackGrid />
            </SettingSection>

            {/* Footer */}
            <div className="text-center space-y-2 pt-4 border-t border-[var(--os-border)]/50">
                <p className="text-xs text-[var(--os-text-secondary)] opacity-60">
                    {t('settings.about.copyright')}
                </p>
                <div className="flex justify-center gap-4">
                    <a 
                        href="https://github.com/Renovamen/playground-macos" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-[var(--os-accent)] hover:underline flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                    >
                        {t('settings.about.github')}
                    </a>
                </div>
            </div>
        </div>
    )
}
