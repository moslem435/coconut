'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
    Settings,
    Palette,
    Monitor,
    Volume2,
    Globe,
    User,
    Shield,
    Info,
    ChevronRight,
    Sun,
    Moon,
    Languages
} from 'lucide-react'
import { useSystem } from '@/os/sdk'
import { useLanguage } from '@/os/kernel/LanguageContext'

interface SettingCategory {
    id: string
    label: string
    icon: React.ComponentType<any>
    description: string
}

export default function SettingsApp() {
    const [activeCategory, setActiveCategory] = useState('display')
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

    // Connect to System SDK
    const {
        theme, setTheme,
        accentColor, setAccentColor,
        useTransparency, setUseTransparency,
        useAnimations, setUseAnimations,
        useTaskbarPreviews, setUseTaskbarPreviews,
        displayScale, setDisplayScale,
        volume, setVolume,
        isMuted, toggleMute,
        language, setLanguage,
        wallpaper, setWallpaper
    } = useSystem()


    const accentColors = [
        { name: t('color.cyan'), value: '#06b6d4' },
        { name: t('color.blue'), value: '#3b82f6' },
        { name: t('color.purple'), value: '#8b5cf6' },
        { name: t('color.pink'), value: '#ec4899' },
        { name: t('color.red'), value: '#ef4444' },
        { name: t('color.orange'), value: '#f97316' },
        { name: t('color.green'), value: '#22c55e' },
    ]

    const wallpaperOptions = [
        { name: t('wallpaper.preset.flow'), type: 'preset', value: 'linear-gradient(to bottom right, var(--os-bg-base), var(--os-accent-dim))' },
        { name: t('wallpaper.preset.stars'), type: 'preset', value: 'linear-gradient(to top, #30cfd0 0%, #330867 100%)' },
        { name: t('wallpaper.preset.neon'), type: 'preset', value: 'linear-gradient(to right, #f83600 0%, #f9d423 100%)' },
        { name: t('wallpaper.preset.midnight'), type: 'preset', value: 'linear-gradient(109.6deg, rgb(36, 45, 57) 11.2%, rgb(16, 37, 60) 51.2%, rgb(0, 0, 0) 98.6%)' },
        { name: t('wallpaper.image.daily'), type: 'image', value: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop' },
        { name: t('wallpaper.image.snow'), type: 'image', value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80' },
        { name: t('wallpaper.image.desert'), type: 'image', value: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80' },
        { name: t('wallpaper.image.city'), type: 'image', value: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80' },
    ]

    const renderContent = () => {
        switch (activeCategory) {
            case 'display':
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
                    </div>
                )

            case 'appearance':
                return (
                    <div className="space-y-6">
                        <SettingSection title={t('settings.appearance.wallpaper')}>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {wallpaperOptions.map((wp, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setWallpaper({ type: wp.type as any, value: wp.value })}
                                        className={`group relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                                            wallpaper?.value === wp.value ? 'border-[var(--os-accent)] ring-2 ring-[var(--os-accent)]/30' : 'border-transparent hover:border-[var(--os-text-secondary)]'
                                        }`}
                                    >
                                        {wp.type === 'image' ? (
                                            <img src={wp.value} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={wp.name} />
                                        ) : (
                                            <div className="w-full h-full" style={{ background: wp.value }} />
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                            {wp.name}
                                        </div>
                                        {wallpaper?.value === wp.value && (
                                            <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--os-accent)] rounded-full flex items-center justify-center text-[var(--os-accent-contrast)] shadow-sm">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </SettingSection>

                        <SettingSection title={t('settings.appearance.accent')}>
                            <div className="flex gap-3 flex-wrap">
                                {accentColors.map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() => setAccentColor(color.value)}
                                        className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${accentColor === color.value
                                            ? 'scale-110'
                                            : 'border-transparent'
                                            }`}
                                        style={{
                                            backgroundColor: color.value,
                                            borderColor: accentColor === color.value ? 'var(--os-text-primary)' : 'transparent'
                                        }}
                                        title={color.name}
                                    />
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

            case 'sound':
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

            case 'language':
                return (
                    <div className="space-y-6">
                        <SettingSection title={t('settings.language.select')}>
                            <div className="space-y-2">
                                {[
                                    { code: 'zh', name: '简体中文' },
                                    { code: 'en', name: 'English (US)' },
                                ].map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setLanguage(lang.code as 'zh' | 'en')}
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

            case 'about':
                return (
                    <div className="space-y-6">
                        <div className="text-center py-8">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="inline-block p-6 rounded-2xl bg-gradient-to-br from-[var(--os-accent)]/20 to-blue-500/20 border border-[var(--os-accent)]/30 mb-6"
                            >
                                <Settings size={48} className="text-[var(--os-accent)]" />
                            </motion.div>
                            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--os-text-primary)' }}>{t('start.os')}</h2>
                            <p className="text-sm mb-4" style={{ color: 'var(--os-text-muted)' }}>Version 1.0.0</p>
                            <div className="inline-block px-4 py-2 rounded-full bg-[var(--os-accent)]/10 border border-[var(--os-accent)]/30 text-[var(--os-accent)] text-sm">
                                Build 2026.02.05
                            </div>
                        </div>

                        <SettingSection title={t('settings.about.system')}>
                            <div className="space-y-2 text-sm">
                                <InfoRow label={t('settings.about.env')} value="Web Browser" />
                                <InfoRow label={t('settings.about.kernel')} value="Next.js 15 + React 19" />
                                <InfoRow label={t('settings.about.render')} value="Tw + Framer Motion" />
                            </div>
                        </SettingSection>
                    </div>
                )

            default:
                return (
                    <div className="flex items-center justify-center h-64 text-white/40" style={{ color: 'var(--os-text-muted)' }}>
                        <p>{t('settings.dev')}</p>
                    </div>
                )
        }
    }

    return (
        <div className="h-full flex bg-[var(--os-bg-base)] text-[var(--os-text-primary)] transition-colors duration-300">
            {/* Sidebar */}
            <div className="w-64 border-r border-[var(--os-border)] p-4 space-y-1 overflow-y-auto shrink-0 bg-[var(--os-bg-panel)]">
                <div className="flex items-center gap-3 px-3 py-4 mb-4">
                    <Settings size={24} className="text-[var(--os-accent)]" />
                    <span className="text-lg font-semibold">{t('start.settings')}</span>
                </div>

                {categories.map((cat) => {
                    const Icon = cat.icon
                    const isActive = activeCategory === cat.id
                    return (
                        <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${isActive ? '' : 'hover:bg-[var(--os-hover-bg)] hover:translate-x-1'}`}
                                style={{
                                    backgroundColor: isActive ? 'var(--os-accent-dim)' : undefined,
                                    color: isActive ? 'var(--os-accent)' : 'var(--os-text-secondary)'
                                }}
                            >
                                <Icon size={18} className="group-hover:text-[var(--os-text-primary)]" />
                                <span className="text-sm group-hover:text-[var(--os-text-primary)]">{cat.label}</span>
                                {isActive && (
                                    <ChevronRight size={14} className="ml-auto" />
                                )}
                            </button>
                    )
                })}
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <h1 className="text-2xl font-semibold mb-2">
                        {categories.find(c => c.id === activeCategory)?.label}
                    </h1>
                    <p className="text-[var(--os-text-muted)] text-sm mb-8">
                        {categories.find(c => c.id === activeCategory)?.description}
                    </p>
                    {renderContent()}
                </motion.div>
            </div>
        </div>
    )
}

// Helper Components
function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[var(--os-text-muted)] uppercase tracking-wider pl-1">{title}</h3>
            <div className="bg-[var(--os-bg-panel)] rounded-xl p-6 border border-[var(--os-border)] shadow-sm">
                {children}
            </div>
        </div>
    )
}

function ThemeOption({
    icon: Icon,
    label,
    active,
    onClick
}: {
    icon: React.ComponentType<any>
    label: string
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${active ? 'border-[var(--os-accent)]' : 'border-transparent hover:border-[var(--os-border)]'}`}
            style={{
                backgroundColor: active ? 'var(--os-accent-dim)' : 'var(--os-hover-bg)',
                color: active ? 'var(--os-accent)' : 'var(--os-text-secondary)'
            }}
        >
            <Icon size={24} color={active ? 'var(--os-accent)' : 'var(--os-text-secondary)'} />
            <span className={`text-sm`} style={{ color: active ? 'var(--os-accent)' : 'var(--os-text-secondary)' }}>{label}</span>
        </button>
    )
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="flex items-center justify-between cursor-pointer group py-2">
            <span className="text-sm font-medium transition-colors duration-200 group-hover:text-[var(--os-text-primary)] text-[var(--os-text-secondary)]">
                {label}
            </span>
            
            <div 
                className="relative"
                onClick={(e) => {
                    e.preventDefault()
                    onChange(!checked)
                }}
            >
                {/* Track */}
                <motion.div
                    className="w-11 h-6 rounded-full transition-colors duration-300 border"
                    style={{
                        backgroundColor: checked ? 'var(--os-accent)' : 'var(--os-hover-bg)',
                        borderColor: checked ? 'var(--os-accent)' : 'var(--os-border)',
                        boxShadow: checked ? '0 0 8px var(--os-accent-dim)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                    }}
                />
                
                {/* Knob */}
                <motion.div
                    initial={false}
                    animate={{ 
                        x: checked ? 26 : 2,
                        scale: 1 
                    }}
                    whileTap={{ scale: 0.9, width: 20 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-sm z-10"
                />
            </div>
        </label>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--os-border)' }}>
            <span style={{ color: 'var(--os-text-muted)' }}>{label}</span>
            <span style={{ color: 'var(--os-text-primary)' }}>{value}</span>
        </div>
    )
}
