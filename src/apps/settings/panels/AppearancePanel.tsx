import { useState, useEffect, useRef } from 'react'
import { Box, Shapes, Loader2 } from 'lucide-react'
import { useSystem } from '@/os/sdk'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { Tooltip } from '@/os/ui/Tooltip'
import { SettingSection } from '../components/SettingSection'
import { ThemeOption } from '../components/ThemeOption'
import { ToggleSwitch } from '../components/ToggleSwitch'
import { Slider } from '@/os/components/ui/Slider'
import { getAccentColors, getWallpaperOptions } from '../constants'

export function AppearancePanel() {
    const { t } = useLanguage()
    const [isLoadingWallpaper, setIsLoadingWallpaper] = useState(false)

    const {
        accentColor, setAccentColor,
        iconTheme, setIconTheme,
        wallpaper, setWallpaper,
        useTransparency, setUseTransparency,
        transparencyLevel, setTransparencyLevel,
        blurLevel, setBlurLevel,
        useAnimations, setUseAnimations,
        useTaskbarPreviews, setUseTaskbarPreviews
    } = useSystem()

    const accentColors = getAccentColors(t)
    const wallpaperOptions = getWallpaperOptions(t)
    
    // Local state for color picker to prevent lag
    const [localColor, setLocalColor] = useState(accentColor)
    const timeoutRef = useRef<NodeJS.Timeout>()
    
    // Local state for transparency and blur to prevent lag
    const [localTransparency, setLocalTransparency] = useState(transparencyLevel)
    const [localBlur, setLocalBlur] = useState(blurLevel)
    const transparencyTimeoutRef = useRef<NodeJS.Timeout>()
    const blurTimeoutRef = useRef<NodeJS.Timeout>()

    // Sync local color when external changes happen
    useEffect(() => {
        if (!timeoutRef.current) {
            setLocalColor(accentColor)
        }
    }, [accentColor])

    // Sync local transparency when external changes happen
    useEffect(() => {
        if (!transparencyTimeoutRef.current) {
            setLocalTransparency(transparencyLevel)
        }
    }, [transparencyLevel])

    // Sync local blur when external changes happen
    useEffect(() => {
        if (!blurTimeoutRef.current) {
            setLocalBlur(blurLevel)
        }
    }, [blurLevel])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            if (transparencyTimeoutRef.current) clearTimeout(transparencyTimeoutRef.current)
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
        }
    }, [])

    const handleTransparencyChange = (value: number) => {
        setLocalTransparency(value)
        if (transparencyTimeoutRef.current) clearTimeout(transparencyTimeoutRef.current)
        transparencyTimeoutRef.current = setTimeout(() => {
            setTransparencyLevel(value)
            transparencyTimeoutRef.current = undefined
        }, 50) // 50ms delay
    }

    const handleBlurChange = (value: number) => {
        setLocalBlur(value)
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
        blurTimeoutRef.current = setTimeout(() => {
            setBlurLevel(value)
            blurTimeoutRef.current = undefined
        }, 50) // 50ms delay
    }

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newColor = e.target.value
        setLocalColor(newColor)
        
        // Debounce the actual system update
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
            setAccentColor(newColor)
            timeoutRef.current = undefined
        }, 50) // 50ms delay for smoother dragging
    }

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
                            {['image', 'video', 'dynamic-time'].includes(wp.type as string) ? (
                                (wp.type as string) === 'video' ? (
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
                                            if ((wp as any).type === 'dynamic-time') {
                                                try {
                                                    const schedule = JSON.parse((wp as any).value);
                                                    return schedule[0]?.url || '/wallpapers/default.jpg';
                                                } catch { return '/wallpapers/default.jpg'; }
                                            }
                                            return (wp as any).value === 'daily' ? '/wallpapers/default.jpg' : (wp as any).value;
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
                <div className="flex gap-3 flex-wrap items-center">
                    {/* Default Colors */}
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

                    {/* Custom Color Picker */}
                    <div className="w-px h-8 bg-[var(--os-border)] mx-2" />
                    
                    <div className="flex items-center gap-3">
                        <Tooltip content={t('settings.appearance.customColor')} side="top">
                            <label className={`relative flex items-center justify-center w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                                !accentColors.some(c => c.value === accentColor) ? 'scale-110 border-[var(--os-text-primary)]' : 'border-transparent'
                            }`}>
                                <input
                                    type="color"
                                    value={localColor}
                                    onChange={handleColorChange}
                                    className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer opacity-0"
                                />
                                <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-green-500 to-blue-500" />
                            </label>
                        </Tooltip>
                        
                        {!accentColors.some(c => c.value === accentColor) && (
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-[var(--os-text-primary)]">
                                    {t('settings.appearance.customColor')}
                                </span>
                                <span className="text-[10px] text-[var(--os-text-secondary)] font-mono uppercase">
                                    {localColor}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </SettingSection>

            <SettingSection title={t('settings.appearance.effects')}>
                <div className="space-y-4">
                    <div>
                        <ToggleSwitch
                            checked={useTransparency}
                            onChange={setUseTransparency}
                            label={t('settings.appearance.transparency')}
                        />
                        {useTransparency && (
                            <div className="pl-4 pt-2 space-y-4 border-l-2 border-[var(--os-border)] ml-1 mt-2">
                                <Slider
                                    min={0.1}
                                    max={1}
                                    step={0.05}
                                    value={localTransparency}
                                    onChange={handleTransparencyChange}
                                    label="Opacity"
                                    formatValue={(v) => `${Math.round(v * 100)}%`}
                                />
                                <Slider
                                    min={0}
                                    max={60}
                                    step={1}
                                    value={localBlur}
                                    onChange={handleBlurChange}
                                    label="Blur"
                                    formatValue={(v) => `${v}px`}
                                />
                            </div>
                        )}
                    </div>
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
