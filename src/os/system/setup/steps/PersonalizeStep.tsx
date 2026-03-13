'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Sun, Check, Sparkles } from 'lucide-react'
import { useSystemSettingsStore } from '@/os/kernel/useSystemSettingsStore'
import { useLanguageStore } from '@/os/kernel/useLanguageStore'

interface PersonalizeStepProps {
    onNext: () => void
    onBack: () => void
}

const ACCENT_COLORS = [
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
]

export default function PersonalizeStep({ onNext, onBack }: PersonalizeStepProps) {
    const { theme, setTheme, accentColor, setAccentColor } = useSystemSettingsStore()
    const { language } = useLanguageStore()

    const content = {
        en: {
            title: 'Personalize Your Experience',
            subtitle: 'Choose your preferred theme and accent color.',
            appearance: 'Appearance',
            light: 'Light',
            dark: 'Dark',
            accent: 'Accent Color',
            back: 'Back',
            continue: 'Continue'
        },
        zh: {
            title: '个性化您的体验',
            subtitle: '选择您喜欢的主题和强调色。',
            appearance: '外观',
            light: '浅色',
            dark: '深色',
            accent: '强调色',
            back: '返回',
            continue: '继续'
        }
    }[language] || {
        title: 'Personalize Your Experience',
        subtitle: 'Choose your preferred theme and accent color.',
        appearance: 'Appearance',
        light: 'Light',
        dark: 'Dark',
        accent: 'Accent Color',
        back: 'Back',
        continue: 'Continue'
    }

    const isDark = theme === 'dark'

    return (
        <div className="flex flex-col h-full p-8 max-w-2xl mx-auto w-full">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-6 text-center"
            >
                <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-black'}`}>{content.title}</h2>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>{content.subtitle}</p>
            </motion.div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Theme Selection */}
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className={`rounded-2xl p-5 border transition-colors duration-300 ${
                        isDark 
                            ? 'bg-[#18181b] border-white/10' 
                            : 'bg-white border-black/10 shadow-sm'
                    }`}
                >
                    <h3 className={`text-base font-medium mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
                        <span className={`p-1.5 rounded-md ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                            <Sun size={16} className={isDark ? 'text-white' : 'text-black'} />
                        </span>
                        {content.appearance}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setTheme('light')}
                            className={`
                                group relative p-3 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2
                                ${theme === 'light' 
                                    ? (isDark ? 'bg-white/5 border-white/40 ring-1 ring-white/20' : 'bg-black/5 border-black/20 ring-1 ring-black/10')
                                    : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5'}
                            `}
                        >
                            <div className="w-20 h-12 rounded-lg bg-[#e4e4e7] relative overflow-hidden flex flex-col p-1.5 gap-1 border border-black/5">
                                <div className="w-8 h-3 rounded-sm bg-white shadow-sm" />
                                <div className="w-full h-full rounded-sm bg-white/50" />
                                {theme === 'light' && (
                                    <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center border border-white shadow-sm">
                                        <Check size={8} className="text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            <span className={`text-xs font-medium ${isDark ? 'text-white/90' : 'text-black/90'}`}>{content.light}</span>
                        </button>

                        <button
                            onClick={() => setTheme('dark')}
                            className={`
                                group relative p-3 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2
                                ${theme === 'dark' 
                                    ? (isDark ? 'bg-white/5 border-white/40 ring-1 ring-white/20' : 'bg-black/5 border-black/20 ring-1 ring-black/10')
                                    : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5'}
                            `}
                        >
                            <div className="w-20 h-12 rounded-lg bg-[#27272a] relative overflow-hidden flex flex-col p-1.5 gap-1 border border-white/5">
                                <div className="w-8 h-3 rounded-sm bg-white/10 shadow-sm" />
                                <div className="w-full h-full rounded-sm bg-white/5" />
                                {theme === 'dark' && (
                                    <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center border border-[#18181b] shadow-sm">
                                        <Check size={8} className="text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            <span className={`text-xs font-medium ${isDark ? 'text-white/90' : 'text-black/90'}`}>{content.dark}</span>
                        </button>
                    </div>
                </motion.div>

                {/* Accent Color Selection */}
                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className={`rounded-2xl p-5 border transition-colors duration-300 ${
                        isDark 
                            ? 'bg-[#18181b] border-white/10' 
                            : 'bg-white border-black/10 shadow-sm'
                    }`}
                >
                    <h3 className={`text-base font-medium mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
                        <span className={`p-1.5 rounded-md ${isDark ? 'bg-white/10' : 'bg-black/5'}`} style={{ color: accentColor }}>
                            <Sparkles size={16} />
                        </span>
                        {content.accent}
                    </h3>

                    <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                        {ACCENT_COLORS.map((color) => (
                            <button
                                key={color.name}
                                onClick={() => setAccentColor(color.value)}
                                className={`
                                    group relative flex flex-col items-center gap-2 rounded-xl transition-all duration-200
                                    ${accentColor === color.value 
                                        ? 'opacity-100' 
                                        : 'opacity-70 hover:opacity-100'}
                                `}
                            >
                                <div className="relative">
                                    <div 
                                        className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-transform group-hover:scale-105"
                                        style={{ backgroundColor: color.value }}
                                    >
                                        {accentColor === color.value && (
                                            <Check size={20} className="text-white drop-shadow-md" strokeWidth={3} />
                                        )}
                                    </div>
                                    {/* Selection ring */}
                                    {accentColor === color.value && (
                                        <motion.div 
                                            layoutId="accent-ring"
                                            className={`absolute -inset-1 rounded-full border-2 ${isDark ? 'border-white/20' : 'border-black/10'}`}
                                            transition={{ duration: 0.2 }}
                                        />
                                    )}
                                </div>
                                <span className={`text-[10px] font-medium ${isDark ? 'text-white/90' : 'text-black/90'}`}>{color.name}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Navigation */}
            <div className={`flex justify-between items-center mt-auto pt-6 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                <button
                    onClick={onBack}
                    className={`transition-colors px-4 py-2 text-sm font-medium ${isDark ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'}`}
                >
                    {content.back}
                </button>
                <button
                    onClick={onNext}
                    className="px-6 py-2 rounded-lg text-white font-bold text-sm transition-transform active:scale-95 shadow-lg"
                    style={{ backgroundColor: accentColor }}
                >
                    {content.continue}
                </button>
            </div>
        </div>
    )
}
