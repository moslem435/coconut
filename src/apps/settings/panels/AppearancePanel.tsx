import { useState } from 'react'
import { Box, Shapes, Loader2 } from 'lucide-react'
import { useSystem } from '@/os/sdk'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { Tooltip } from '@/os/ui/Tooltip'
import { SettingSection } from '../components/SettingSection'
import { ThemeOption } from '../components/ThemeOption'
import { ToggleSwitch } from '../components/ToggleSwitch'
import { getAccentColors, getWallpaperOptions } from '../constants'

export function AppearancePanel() {
    const { t } = useLanguage()
    const [isLoadingWallpaper, setIsLoadingWallpaper] = useState(false)

    const {
        accentColor, setAccentColor,
        iconTheme, setIconTheme,
        wallpaper, setWallpaper,
        useTransparency, setUseTransparency,
        useAnimations, setUseAnimations,
        useTaskbarPreviews, setUseTaskbarPreviews
    } = useSystem()

    const accentColors = getAccentColors(t)
    const wallpaperOptions = getWallpaperOptions(t)

    const handleWallpaperSelect = (wp: any) => {
        if (wp.value === 'daily') {
            setWallpaper({ type: 'daily', value: 'daily' })
        } else {
            setWallpaper({ type: wp.type, value: wp.value })
        }
    }

    return (
        <div className="space-y-6">
            <SettingSection title={t('settings.appearance.wallpaper')}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {wallpaperOptions.map((wp, i) => (
                        <button
                            key={i}
                            onClick={() => handleWallpaperSelect(wp)}
                            disabled={isLoadingWallpaper && wp.value === 'daily'}
                            className={`group relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${wallpaper?.value === wp.value ? 'border-[var(--os-accent)] ring-2 ring-[var(--os-accent)]/30' : 'border-transparent hover:border-[var(--os-text-secondary)]'
                                }`}
                        >
                            {['image', 'video', 'dynamic-time'].includes(wp.type) ? (
                                wp.type === 'video' ? (
                                    <video
                                         src={wp.value}
                                         muted
                                         loop
                                         autoPlay
                                         playsInline
                                         className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                     />
                                ) : (
                                    <img
                                        src={(() => {
                                            if (wp.type === 'dynamic-time') {
                                                try {
                                                    const schedule = JSON.parse(wp.value);
                                                    return schedule[0]?.url || '/wallpapers/default.jpg';
                                                } catch { return '/wallpapers/default.jpg'; }
                                            }
                                            return wp.value === 'daily' ? '/wallpapers/default.jpg' : wp.value;
                                        })()}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                        alt={wp.name}
                                    />
                                )
                            ) : (
                                <div className="w-full h-full" style={{ background: wp.value }} />
                            )}
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                {wp.name}
                            </div>
                            {wallpaper?.value === wp.value && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--os-accent)] rounded-full flex items-center justify-center text-[var(--os-accent-contrast)] shadow-sm">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                            )}
                            {isLoadingWallpaper && wp.value === 'daily' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </SettingSection>

            <SettingSection title={t('settings.appearance.icons')}>
                <div className="flex gap-4">
                    <ThemeOption
                        icon={Box}
                        label={t('settings.appearance.icons.filled')}
                        active={iconTheme === 'filled'}
                        onClick={() => setIconTheme('filled')}
                    />
                    <ThemeOption
                        icon={Shapes}
                        label={t('settings.appearance.icons.line')}
                        active={iconTheme === 'line'}
                        onClick={() => setIconTheme('line')}
                    />
                </div>
            </SettingSection>

            <SettingSection title={t('settings.appearance.accent')}>
                <div className="flex gap-3 flex-wrap">
                    {accentColors.map((color) => (
                        <Tooltip key={color.value} content={color.name} side="top">
                            <button
                                onClick={() => setAccentColor(color.value)}
                                className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${accentColor === color.value ? 'scale-110' : 'border-transparent'
                                    }`}
                                style={{
                                    backgroundColor: color.value,
                                    borderColor: accentColor === color.value ? 'var(--os-text-primary)' : 'transparent'
                                }}
                            />
                        </Tooltip>
                    ))}
                </div>
            </SettingSection>

            <SettingSection title={t('settings.appearance.effects')}>
                <div className="space-y-4">
                    <ToggleSwitch
                        checked={useTransparency}
                        onChange={setUseTransparency}
                        label={t('settings.appearance.transparency')}
                    />
                    <ToggleSwitch
                        checked={useAnimations}
                        onChange={setUseAnimations}
                        label={t('settings.appearance.animations')}
                    />
                    <ToggleSwitch
                        checked={useTaskbarPreviews}
                        onChange={setUseTaskbarPreviews}
                        label={t('settings.appearance.previews')}
                    />
                </div>
            </SettingSection>
        </div>
    )
}
