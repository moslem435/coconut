import { Volume2 } from 'lucide-react'
import { useSystem } from '@/os/sdk'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { SettingSection } from '../components/SettingSection'

export function SoundPanel() {
    const { t } = useLanguage()
    const { volume, setVolume, isMuted, toggleMute } = useSystem()

    return (
        <div className="space-y-6">
            <SettingSection title={t('settings.sound.volume')}>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleMute}
                            className="p-2 hover:rounded-full transition-colors hover:bg-[var(--os-hover-bg)]"
                            style={{ backgroundColor: isMuted ? 'transparent' : 'transparent' }}
                        >
                            <Volume2 size={20} className={isMuted ? '' : 'text-[var(--os-accent)]'} style={{ color: isMuted ? 'var(--os-text-muted)' : 'var(--os-accent)' }} />
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume}
                            disabled={isMuted}
                            onChange={(e) => setVolume(parseInt(e.target.value))}
                            className={`flex-1 h-1 rounded-lg appearance-none cursor-pointer ${isMuted ? 'opacity-50' : ''}`}
                            style={{ accentColor: 'var(--os-accent)', backgroundColor: 'var(--os-hover-bg)' }}
                        />
                        <span className="text-sm w-8 text-right" style={{ color: 'var(--os-text-secondary)' }}>{volume}%</span>
                    </div>
                </div>
            </SettingSection>
        </div>
    )
}
