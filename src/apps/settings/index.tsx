'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Palette, Monitor, Volume2, Globe, User, Shield, Info } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { SettingCategory } from './types'
import { SettingSidebar } from './components/SettingSidebar'
import { DisplayPanel } from './panels/DisplayPanel'
import { AppearancePanel } from './panels/AppearancePanel'
import { SoundPanel } from './panels/SoundPanel'
import { LanguagePanel } from './panels/LanguagePanel'
import { AccountPanel } from './panels/AccountPanel'
import { PrivacyPanel } from './panels/PrivacyPanel'
import { AboutPanel } from './panels/AboutPanel'

export default function SettingsApp({ initialCategory }: { initialCategory?: string }) {
    const [activeCategory, setActiveCategory] = useState(initialCategory || 'display')
    const { t } = useLanguage()

    // Dynamic categories based on language
    const categories: SettingCategory[] = [
        { id: 'display', label: t('settings.display'), icon: Monitor, description: t('settings.desc.display') },
        { id: 'appearance', label: t('settings.appearance'), icon: Palette, description: t('settings.desc.appearance') },
        { id: 'sound', label: t('settings.sound'), icon: Volume2, description: t('settings.desc.sound') },
        { id: 'language', label: t('settings.language'), icon: Globe, description: t('settings.desc.language') },
        { id: 'account', label: t('settings.account'), icon: User, description: t('settings.desc.account') },
        { id: 'privacy', label: t('settings.privacy'), icon: Shield, description: t('settings.desc.privacy') },
        { id: 'about', label: t('settings.about'), icon: Info, description: t('settings.desc.about') },
    ]

    // Panel mapping
    const panels: Record<string, React.ComponentType> = {
        display: DisplayPanel,
        appearance: AppearancePanel,
        sound: SoundPanel,
        language: LanguagePanel,
        account: AccountPanel,
        privacy: PrivacyPanel,
        about: AboutPanel
    }

    const CurrentPanel = panels[activeCategory] || DisplayPanel
    const currentCategory = categories.find(c => c.id === activeCategory)

    return (
        <div className="h-full flex bg-transparent text-[var(--os-text-primary)] transition-colors duration-300">
            {/* Sidebar */}
            <SettingSidebar
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
            />

            {/* Content */}
            <div className="flex-1 p-8 pt-16 overflow-y-auto">
                <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <h1 className="text-2xl font-semibold mb-2">
                        {currentCategory?.label}
                    </h1>
                    <p className="text-[var(--os-text-muted)] text-sm mb-8">
                        {currentCategory?.description}
                    </p>
                    <CurrentPanel />
                </motion.div>
            </div>
        </div>
    )
}
