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
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'

interface SettingCategory {
    id: string
    label: string
    icon: React.ComponentType<any>
    description: string
}

const categories: SettingCategory[] = [
    { id: 'display', label: '显示', icon: Monitor, description: '调整显示设置和主题' },
    { id: 'appearance', label: '外观', icon: Palette, description: '自定义颜色和视觉效果' },
    { id: 'sound', label: '声音', icon: Volume2, description: '音量和通知设置' },
    { id: 'language', label: '语言', icon: Globe, description: '系统语言和区域设置' },
    { id: 'account', label: '账户', icon: User, description: '个人资料和账户信息' },
    { id: 'privacy', label: '隐私', icon: Shield, description: '安全和隐私选项' },
    { id: 'about', label: '关于', icon: Info, description: '系统信息和版本' },
]

export default function SettingsApp() {
    const [activeCategory, setActiveCategory] = useState('display')

    // Connect to System Context
    const {
        theme, setTheme,
        accentColor, setAccentColor,
        useTransparency, setUseTransparency,
        useAnimations, setUseAnimations,
        displayScale, setDisplayScale,
        volume, setVolume,
        isMuted, toggleMute
    } = useSystemSettings()

    // Connect to Language Context
    const { language, setLanguage } = useLanguage()

    const accentColors = [
        { name: '青色', value: '#06b6d4' },
        { name: '蓝色', value: '#3b82f6' },
        { name: '紫色', value: '#8b5cf6' },
        { name: '粉色', value: '#ec4899' },
        { name: '红色', value: '#ef4444' },
        { name: '橙色', value: '#f97316' },
        { name: '绿色', value: '#22c55e' },
    ]

    const renderContent = () => {
        switch (activeCategory) {
            case 'display':
                return (
                    <div className="space-y-6">
                        <SettingSection title="主题模式">
                            <div className="flex gap-4">
                                <ThemeOption
                                    icon={Sun}
                                    label="浅色"
                                    active={theme === 'light'}
                                    onClick={() => setTheme('light')}
                                />
                                <ThemeOption
                                    icon={Moon}
                                    label="深色"
                                    active={theme === 'dark'}
                                    onClick={() => setTheme('dark')}
                                />
                            </div>
                        </SettingSection>

                        <SettingSection title="显示比例">
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
                                <p className="text-xs" style={{ color: 'var(--os-text-muted)' }}>调整系统字体和窗口大小的缩放比例。</p>
                            </div>
                        </SettingSection>
                    </div>
                )

            case 'appearance':
                return (
                    <div className="space-y-6">
                        <SettingSection title="主题色">
                            <div className="flex gap-3 flex-wrap">
                                {accentColors.map((color) => (
                                    <motion.button
                                        key={color.value}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setAccentColor(color.value)}
                                        className={`w-10 h-10 rounded-full border-2 transition-all ${accentColor === color.value
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

                        <SettingSection title="视觉效果">
                            <div className="space-y-4">
                                <ToggleSwitch
                                    checked={useTransparency}
                                    onChange={setUseTransparency}
                                    label="启用窗口透明与模糊效果"
                                />
                                <ToggleSwitch
                                    checked={useAnimations}
                                    onChange={setUseAnimations}
                                    label="启用系统动画"
                                />
                            </div>
                        </SettingSection>
                    </div>
                )

            case 'sound':
                return (
                    <div className="space-y-6">
                        <SettingSection title="音量">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={toggleMute}
                                        className="p-2 hover:rounded-full transition-colors"
                                        style={{ backgroundColor: isMuted ? 'transparent' : 'transparent' }}
                                    >
                                        <Volume2 size={20} className={isMuted ? '' : 'text-[var(--os-accent)]'} style={{ color: isMuted ? 'var(--os-text-muted)' : 'var(--os-accent)' }} />
                                        <style jsx>{`
                                            button:hover {
                                                background-color: var(--os-hover-bg);
                                            }
                                        `}</style>
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
                        <SettingSection title="选择语言">
                            <div className="space-y-2">
                                {[
                                    { code: 'zh', name: '简体中文' },
                                    { code: 'en', name: 'English (US)' },
                                ].map((lang) => (
                                    <motion.button
                                        key={lang.code}
                                        whileHover={{ x: 4 }}
                                        onClick={() => setLanguage(lang.code as 'zh' | 'en')}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all`}
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
                                    </motion.button>
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
                            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--os-text-primary)' }}>Cloud OS</h2>
                            <p className="text-sm mb-4" style={{ color: 'var(--os-text-muted)' }}>Version 1.0.0</p>
                            <div className="inline-block px-4 py-2 rounded-full bg-[var(--os-accent)]/10 border border-[var(--os-accent)]/30 text-[var(--os-accent)] text-sm">
                                Build 2026.02.05
                            </div>
                        </div>

                        <SettingSection title="系统信息">
                            <div className="space-y-2 text-sm">
                                <InfoRow label="运行环境" value="Web Browser" />
                                <InfoRow label="内核" value="Next.js 15 + React 19" />
                                <InfoRow label="渲染引擎" value="Tw + Framer Motion" />
                            </div>
                        </SettingSection>
                    </div>
                )

            default:
                return (
                    <div className="flex items-center justify-center h-64 text-white/40" style={{ color: 'var(--os-text-muted)' }}>
                        <p>功能开发中...</p>
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
                    <span className="text-lg font-semibold">设置</span>
                </div>

                {categories.map((cat) => {
                    const Icon = cat.icon
                    const isActive = activeCategory === cat.id
                    return (
                        <motion.button
                            key={cat.id}
                            whileHover={{ x: 4 }}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group`}
                            style={{
                                backgroundColor: isActive ? 'var(--os-accent-dim)' : 'transparent',
                                color: isActive ? 'var(--os-accent)' : 'var(--os-text-secondary)'
                            }}
                        >
                            <Icon size={18} className="group-hover:text-[var(--os-text-primary)]" />
                            <span className="text-sm group-hover:text-[var(--os-text-primary)]">{cat.label}</span>
                            {isActive && (
                                <ChevronRight size={14} className="ml-auto" />
                            )}
                            <style jsx>{`
                                button:hover {
                                    background-color: ${isActive ? 'var(--os-accent-dim)' : 'var(--os-hover-bg)'};
                                }
                             `}</style>
                        </motion.button>
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
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all`}
            style={{
                backgroundColor: active ? 'var(--os-accent-dim)' : 'var(--os-hover-bg)',
                borderColor: active ? 'var(--os-accent)' : 'transparent',
                color: active ? 'var(--os-accent)' : 'var(--os-text-secondary)'
            }}
        >
            <Icon size={24} color={active ? 'var(--os-accent)' : 'var(--os-text-secondary)'} />
            <span className={`text-sm`} style={{ color: active ? 'var(--os-accent)' : 'var(--os-text-secondary)' }}>{label}</span>
            <style jsx>{`
                button:hover {
                    border-color: ${active ? 'var(--os-accent)' : 'var(--os-border)'};
                }
             `}</style>
        </motion.button>
    )
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm transition-colors" style={{ color: 'var(--os-text-primary)' }}>{label}</span>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors`}
                style={{
                    backgroundColor: checked ? 'var(--os-accent)' : 'var(--os-border)' // using border color as disabled slide bg
                }}
            >
                <motion.div
                    animate={{ x: checked ? 20 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                />
            </button>
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
