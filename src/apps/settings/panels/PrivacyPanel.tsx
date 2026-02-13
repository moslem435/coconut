import { useLanguage } from '@/os/kernel/LanguageContext'

export function PrivacyPanel() {
    const { t } = useLanguage()

    return (
        <div className="flex items-center justify-center h-64 text-white/40" style={{ color: 'var(--os-text-muted)' }}>
            <p>{t('settings.dev')}</p>
        </div>
    )
}
