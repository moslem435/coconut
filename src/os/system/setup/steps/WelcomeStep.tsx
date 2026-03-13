'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Palmtree, ChevronRight } from 'lucide-react'
import { useSystemSettingsStore } from '@/os/kernel/useSystemSettingsStore'
import { useLanguageStore } from '@/os/kernel/useLanguageStore'

interface WelcomeStepProps {
    onNext: () => void
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
    const { accentColor, theme } = useSystemSettingsStore()
    const { language } = useLanguageStore()

    const content = {
        en: {
            title: 'Welcome to Coconut',
            subtitle: 'OS',
            description: 'A web-based operating system experience showcasing the power of modern web technologies.',
            button: 'Get Started',
            version: 'v3.0.0-rc1 • Early Access'
        },
        zh: {
            title: '欢迎使用 Coconut',
            subtitle: 'OS',
            description: '一个展示现代 Web 技术力量的基于 Web 的操作系统体验。',
            button: '开始体验',
            version: 'v3.0.0-rc1 • 早期预览'
        }
    }[language] || { // Fallback to en if language not found
        title: 'Welcome to Coconut',
        subtitle: 'OS',
        description: 'A web-based operating system experience showcasing the power of modern web technologies.',
        button: 'Get Started',
        version: 'v3.0.0-rc1 • Early Access'
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-10 pointer-events-none"
                style={{ backgroundColor: accentColor }}
            />

            {/* Logo Animation */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
                className="relative mb-10"
            >
                <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Concentric Glow Rings - Simplified & Elegant */}
                    {[0, 1].map((i) => (
                        <motion.div
                            key={i}
                            className={`absolute inset-0 rounded-full border opacity-20 ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}
                            style={{ 
                                borderColor: accentColor,
                                transform: `scale(${1 + i * 0.3})`
                            }}
                            animate={{ 
                                scale: [1 + i * 0.3, 1 + i * 0.3 + 0.1, 1 + i * 0.3],
                                opacity: [0.2, 0.4, 0.2]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                delay: i * 0.5,
                                ease: "easeInOut"
                            }}
                        />
                    ))}

                    {/* Subtle Core Glow */}
                    <motion.div 
                        className="absolute inset-0 rounded-full blur-3xl opacity-20"
                        style={{ backgroundColor: accentColor }}
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 4, repeat: Infinity }}
                    />
                    
                    {/* Icon Container */}
                    <motion.div 
                        className={`relative z-10 flex flex-col items-center justify-center drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] ${theme === 'dark' ? 'text-white' : 'text-black'}`}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300, damping: 10 }}
                    >
                        <Palmtree size={64} strokeWidth={1.5} className={`mb-3 ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
                        <span className={`text-[10px] font-bold tracking-[0.25em] opacity-80 uppercase ${theme === 'dark' ? 'text-white/80' : 'text-black/80'}`}>OS</span>
                    </motion.div>
                </div>
            </motion.div>

            {/* Title & Description */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="space-y-4 max-w-2xl z-10"
            >
                <div className="flex flex-col items-center justify-center leading-tight">
                    <h1 className={`text-5xl font-bold tracking-tight drop-shadow-lg flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        {content.title === 'Welcome to Coconut' ? 'Welcome to' : '欢迎使用'}
                        <span 
                            className={`bg-clip-text text-transparent ${theme === 'dark' ? 'bg-gradient-to-b from-white to-white/70' : 'bg-gradient-to-b from-black to-black/70'}`}
                            style={{ 
                                textShadow: `0 0 30px ${accentColor}40`,
                                color: accentColor
                            }}
                        >
                            Coconut OS
                        </span>
                    </h1>
                </div>
                
                <p className={`text-base leading-relaxed font-normal pt-4 max-w-lg mx-auto ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                    {content.description}
                </p>
            </motion.div>

            {/* Action Button Container */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mt-10 z-10 relative flex flex-col items-center gap-5"
            >
                {/* Version text */}
                <div className={`text-[10px] font-mono tracking-wider uppercase ${theme === 'dark' ? 'text-white/20' : 'text-black/20'}`}>
                    {content.version}
                </div>

                <button
                    onClick={onNext}
                    className={`
                        group relative px-10 py-3 rounded-full border transition-all duration-300 flex items-center gap-3 overflow-hidden shadow-2xl hover:scale-105 active:scale-95
                        ${theme === 'dark' 
                            ? 'bg-[#18181b] hover:bg-[#27272a] border-white/10' 
                            : 'bg-white hover:bg-gray-50 border-black/10'}
                    `}
                >
                    <span className={`relative z-10 font-bold text-base tracking-wide ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{content.button}</span>
                    <ChevronRight size={18} className={`relative z-10 group-hover:translate-x-1 transition-transform ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`} />
                    
                    {/* Inner Glow */}
                    <div 
                        className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-300 group-hover:opacity-30"
                        style={{ 
                            background: `radial-gradient(circle at center, ${accentColor}, transparent 100%)` 
                        }}
                    />
                </button>
            </motion.div>
        </div>
    )
}
