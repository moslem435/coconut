import { Sun, Moon } from 'lucide-react'
import { useSystem } from '@/os/sdk'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { SettingSection } from '../components/SettingSection'
import { ThemeOption } from '../components/ThemeOption'

export function DisplayPanel() {
    const { t } = useLanguage()
    const { theme, setTheme, displayScale, setDisplayScale, brightness, setBrightness } = useSystem()

    return (
        <div className="space-y-6">
            <SettingSection title={t('settings.display.theme')}>
                <div className="flex gap-4">
                    <ThemeOption
                        icon={Sun}
                        label={t('settings.display.light')}
                        active={theme === 'light'}
                        onClick={() => setTheme('light')}
                    />
                    <ThemeOption
                        icon={Moon}
                        label={t('settings.display.dark')}
                        active={theme === 'dark'}
                        onClick={() => setTheme('dark')}
                    />
                </div>
            </SettingSection>

            <SettingSection title={t('settings.display.scale')}>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="75"
                            max="125"
                            step="5"
                            value={displayScale}
                            onChange={(e) => setDisplayScale(parseInt(e.target.value))}
                            className="flex-1 accent-[var(--os-accent)] h-1 rounded-lg appearance-none cursor-pointer"
                            style={{ backgroundColor: 'var(--os-hover-bg)' }}
                        />
                        <span className="text-sm w-12 text-right" style={{ color: 'var(--os-text-secondary)' }}>{displayScale}%</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--os-text-muted)' }}>{t('settings.display.scale.desc')}</p>
                </div>
            </SettingSection>

            <SettingSection title={t('settings.display.brightness')}>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Sun size={20} className="text-[var(--os-text-secondary)]" />
                        <input
                            type="range"
                            min="10"
                            max="100"
                            value={brightness}
                            onChange={(e) => setBrightness(parseInt(e.target.value))}
                            className="flex-1 accent-[var(--os-accent)] h-1 rounded-lg appearance-none cursor-pointer"
                            style={{ backgroundColor: 'var(--os-hover-bg)' }}
                        />
                        <span className="text-sm w-12 text-right" style={{ color: 'var(--os-text-secondary)' }}>{brightness}%</span>
                    </div>
                </div>
            </SettingSection>
        </div>
    )
}
