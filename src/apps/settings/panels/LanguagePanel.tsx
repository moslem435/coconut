import { Languages } from 'lucide-react'
import { useSystem } from '@/os/sdk'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { SettingSection } from '../components/SettingSection'

export function LanguagePanel() {
    const { t } = useLanguage()
    const { language, setLanguage } = useSystem()

    const languages = [
        { code: 'zh' as const, name: '简体中文' },
        { code: 'en' as const, name: 'English (US)' },
    ]

    return (
        <div className="space-y-6">
            <SettingSection title={t('settings.language.select')}>
                <div className="space-y-2">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all hover:translate-x-1`}
                            style={{
                                backgroundColor: language === lang.code ? 'var(--os-accent-glow)' : 'var(--os-hover-bg)',
                                borderColor: language === lang.code ? 'var(--os-accent)' : 'var(--os-border)',
                                color: language === lang.code ? 'var(--os-accent)' : 'var(--os-text-secondary)'
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <Languages size={18} />
                                <span>{lang.name}</span>
                            </div>
                            {language === lang.code && (
                                <div className="w-2 h-2 rounded-full bg-[var(--os-accent)]" />
                            )}
                        </button>
                    ))}
                </div>
            </SettingSection>
        </div>
    )
}
