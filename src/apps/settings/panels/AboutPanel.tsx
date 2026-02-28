import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LayoutTemplate, User } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { AboutProjectTab } from '../components/about/AboutProjectTab'
import { AboutMeTab } from '../components/about/AboutMeTab'

export function AboutPanel() {
    const { t } = useLanguage()
    const [activeTab, setActiveTab] = useState<'project' | 'me'>('project')

    return (
        <div className="flex flex-col h-full space-y-6 pb-8">
            {/* Tab Switcher */}
            <div className="flex p-1 bg-[var(--os-bg-base)]/50 rounded-xl border border-[var(--os-border)] shrink-0 backdrop-blur-sm">
                <button
                    onClick={() => setActiveTab('project')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeTab === 'project'
                            ? 'bg-[var(--os-accent)] text-white shadow-md shadow-[var(--os-accent)]/20'
                            : 'text-[var(--os-text-secondary)] hover:bg-[var(--os-hover-bg)] hover:text-[var(--os-text-primary)]'
                    }`}
                >
                    <LayoutTemplate size={16} />
                    {t('settings.about.tab.project') || 'Project'}
                </button>
                <button
                    onClick={() => setActiveTab('me')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeTab === 'me'
                            ? 'bg-[var(--os-accent)] text-white shadow-md shadow-[var(--os-accent)]/20'
                            : 'text-[var(--os-text-secondary)] hover:bg-[var(--os-hover-bg)] hover:text-[var(--os-text-primary)]'
                    }`}
                >
                    <User size={16} />
                    {t('settings.about.tab.me') || 'About Me'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <AnimatePresence mode="wait">
                    {activeTab === 'project' ? (
                        <AboutProjectTab key="project" />
                    ) : (
                        <AboutMeTab key="me" />
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
