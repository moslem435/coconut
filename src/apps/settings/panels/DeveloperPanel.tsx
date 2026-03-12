import { useSystemSettingsStore } from '@/os/kernel/useSystemSettingsStore'
import { SettingSection } from '../components/SettingSection'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { motion } from 'framer-motion'
import { HardDrive } from 'lucide-react'

export function DeveloperPanel() {
    const { t } = useLanguage()
    const { useDependencyCache, setUseDependencyCache } = useSystemSettingsStore()

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingSection title={t('settings.developer')}>
                <div className="space-y-4">
                    
                    {/* Cache Toggle Row */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-start gap-4 pr-4">
                            <div className={`mt-1 p-2 rounded-lg transition-colors duration-300 ${
                                useDependencyCache 
                                    ? 'bg-green-500/10 text-green-500' 
                                    : 'bg-[var(--os-text-secondary)]/10 text-[var(--os-text-secondary)]'
                            }`}>
                                <HardDrive size={20} />
                            </div>
                            <div className="space-y-1">
                                <div className="font-medium text-[var(--os-text-primary)]">
                                    {t('settings.developer.cache')}
                                </div>
                                <div className="text-sm text-[var(--os-text-secondary)] leading-relaxed max-w-lg">
                                    {t('settings.developer.cache.desc')}
                                </div>
                            </div>
                        </div>

                        {/* Custom Toggle Switch Implementation */}
                        <div
                            className="relative isolate cursor-pointer"
                            onClick={() => setUseDependencyCache(!useDependencyCache)}
                        >
                            <motion.div
                                className="w-[52px] h-[32px] rounded-full transition-colors duration-300"
                                style={{
                                    backgroundColor: useDependencyCache ? 'var(--os-accent)' : 'var(--os-border-active)',
                                    boxShadow: useDependencyCache
                                        ? '0 0 12px var(--os-accent-dim)'
                                        : 'inset 0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            />
                            <motion.div
                                initial={false}
                                animate={{
                                    x: useDependencyCache ? 22 : 2
                                }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className="absolute top-[2px] left-0 w-[28px] h-[28px] rounded-full bg-white shadow-sm z-10"
                            />
                        </div>
                    </div>

                </div>
            </SettingSection>
        </div>
    )
}
