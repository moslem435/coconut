'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'
import { useSystemSettingsStore } from '@/os/kernel/useSystemSettingsStore'
import { useLanguageStore } from '@/os/kernel/useLanguageStore'

interface ReadyStepProps {
    onComplete: () => void
}

export default function ReadyStep({ onComplete }: ReadyStepProps) {
    const { accentColor, theme } = useSystemSettingsStore()
    const { language } = useLanguageStore()

    const isDark = theme === 'dark'

    const content = {
        en: {
            title: 'System Ready',
            description: 'Your environment has been configured successfully.\nEnjoy your exploration.',
            button: 'Enter Desktop'
        },
        zh: {
            title: '系统就绪',
            description: '您的环境已配置成功。\n祝您探索愉快。',
            button: '进入桌面'
        }
    }[language] || {
        title: 'System Ready',
        description: 'Your environment has been configured successfully.\nEnjoy your exploration.',
        button: 'Enter Desktop'
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="relative mb-10"
            >
                <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl relative z-10"
                    style={{ backgroundColor: accentColor }}
                >
                    <Check size={48} className="text-white" />
                </div>
                
                {/* Ripple Effect */}
                <motion.div
                    animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full z-0"
                    style={{ backgroundColor: accentColor }}
                />
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-4 max-w-md"
            >
                <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>{content.title}</h1>
                <p className={`text-lg whitespace-pre-line ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                    {content.description}
                </p>
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-12"
            >
                <button
                    onClick={onComplete}
                    className={`
                        group relative px-10 py-4 rounded-xl font-bold text-lg hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 shadow-lg
                        ${isDark 
                            ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                            : 'bg-black text-white shadow-[0_0_20px_rgba(0,0,0,0.3)]'}
                    `}
                >
                    <span>{content.button}</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </motion.div>
        </div>
    )
}
