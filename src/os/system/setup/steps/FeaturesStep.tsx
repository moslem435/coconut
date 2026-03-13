'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, TerminalSquare, HardDrive, ChevronRight, ChevronLeft } from 'lucide-react'
import { useSystemSettingsStore } from '@/os/kernel/useSystemSettingsStore'
import { useLanguageStore } from '@/os/kernel/useLanguageStore'

interface FeaturesStepProps {
    onNext: () => void
    onBack: () => void
}

export default function FeaturesStep({ onNext, onBack }: FeaturesStepProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const { accentColor, theme } = useSystemSettingsStore()
    const { language } = useLanguageStore()

    const isDark = theme === 'dark'

    const features = {
        en: [
            {
                id: 'ai',
                title: 'Local Intelligence',
                description: 'Experience a powerful AI assistant running entirely in your browser. No data leaves your device, ensuring complete privacy and zero latency.',
                icon: BrainCircuit,
                color: '#8b5cf6'
            },
            {
                id: 'webcontainer',
                title: 'Full Node.js Environment',
                description: 'Powered by WebContainers, execute Node.js commands, run servers, and install packages directly in the browser with native-like performance.',
                icon: TerminalSquare,
                color: '#10b981'
            },
            {
                id: 'filesystem',
                title: 'Persistent File System',
                description: 'Your files are safe. Leveraging the Origin Private File System (OPFS), changes persist across reloads and are isolated for security.',
                icon: HardDrive,
                color: '#f97316'
            }
        ],
        zh: [
            {
                id: 'ai',
                title: '本地智能',
                description: '体验完全在浏览器中运行的强大 AI 助手。数据不出设备，确保完全隐私和零延迟。',
                icon: BrainCircuit,
                color: '#8b5cf6'
            },
            {
                id: 'webcontainer',
                title: '完整 Node.js 环境',
                description: '由 WebContainers 驱动，直接在浏览器中执行 Node.js 命令、运行服务器和安装包，拥有原生般的性能。',
                icon: TerminalSquare,
                color: '#10b981'
            },
            {
                id: 'filesystem',
                title: '持久化文件系统',
                description: '您的文件安全无忧。利用源私有文件系统 (OPFS)，更改在刷新后依然保留，并且为了安全而隔离。',
                icon: HardDrive,
                color: '#f97316'
            }
        ]
    }[language] || [
        // Fallback to en
        {
            id: 'ai',
            title: 'Local Intelligence',
            description: 'Experience a powerful AI assistant running entirely in your browser. No data leaves your device, ensuring complete privacy and zero latency.',
            icon: BrainCircuit,
            color: '#8b5cf6'
        },
        {
            id: 'webcontainer',
            title: 'Full Node.js Environment',
            description: 'Powered by WebContainers, execute Node.js commands, run servers, and install packages directly in the browser with native-like performance.',
            icon: TerminalSquare,
            color: '#10b981'
        },
        {
            id: 'filesystem',
            title: 'Persistent File System',
            description: 'Your files are safe. Leveraging the Origin Private File System (OPFS), changes persist across reloads and are isolated for security.',
            icon: HardDrive,
            color: '#f97316'
        }
    ]

    const commonText = {
        en: { title: 'Core Technologies', subtitle: 'Discover what makes Coconut OS unique.', back: 'Back', continue: 'Continue' },
        zh: { title: '核心技术', subtitle: '探索 Coconut OS 的独特之处。', back: '返回', continue: '继续' }
    }[language] || { title: 'Core Technologies', subtitle: 'Discover what makes Coconut OS unique.', back: 'Back', continue: 'Continue' }

    const handleNext = () => {
        if (currentIndex < features.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            onNext()
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
        } else {
            onBack()
        }
    }

    const currentFeature = (features[currentIndex] ?? features[0])!

    return (
        <div className="flex flex-col h-full p-6 max-w-2xl mx-auto w-full">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-6 text-center"
            >
                <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-black'}`}>{commonText.title}</h2>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>{commonText.subtitle}</p>
            </motion.div>

            <div className="flex-1 relative flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -50, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`rounded-3xl p-6 border backdrop-blur-md w-full max-w-[440px] aspect-[4/3] flex flex-col items-center justify-center text-center relative overflow-hidden group transition-colors duration-300 ${
                            isDark 
                                ? 'bg-white/5 border-white/10' 
                                : 'bg-black/5 border-black/10 shadow-lg'
                        }`}
                    >
                        {/* Background Gradient */}
                        <div 
                            className="absolute inset-0 opacity-10 transition-opacity duration-500 group-hover:opacity-20"
                            style={{ 
                                background: `radial-gradient(circle at center, ${currentFeature.color}, transparent 70%)` 
                            }}
                        />

                        {/* Icon */}
                        <div 
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg relative z-10"
                            style={{ backgroundColor: `${currentFeature.color}20` }}
                        >
                            {React.createElement(currentFeature.icon, {
                                size: 32,
                                color: currentFeature.color
                            })}
                        </div>

                        <h3 className={`text-xl font-bold mb-3 relative z-10 ${isDark ? 'text-white' : 'text-black'}`}>
                            {currentFeature.title}
                        </h3>
                        
                        <p className={`text-sm leading-relaxed relative z-10 px-4 ${isDark ? 'text-white/70' : 'text-black/70'}`}>
                            {currentFeature.description}
                        </p>

                        {/* Pagination Dots */}
                        <div className="absolute bottom-5 flex gap-2">
                            {features.map((_, idx) => (
                                <div 
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                                        idx === currentIndex 
                                            ? (isDark ? 'w-4 bg-white' : 'w-4 bg-black') 
                                            : (isDark ? 'bg-white/20' : 'bg-black/20')
                                    }`}
                                />
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Arrows */}
                <button 
                    onClick={handlePrev}
                    className={`absolute -left-2 p-2 rounded-full transition-all ${
                        isDark 
                            ? 'hover:bg-white/10 text-white/50 hover:text-white' 
                            : 'hover:bg-black/5 text-black/50 hover:text-black'
                    }`}
                >
                    <ChevronLeft size={28} />
                </button>
                <button 
                    onClick={handleNext}
                    className={`absolute -right-2 p-2 rounded-full transition-all ${
                        isDark 
                            ? 'hover:bg-white/10 text-white/50 hover:text-white' 
                            : 'hover:bg-black/5 text-black/50 hover:text-black'
                    }`}
                >
                    <ChevronRight size={28} />
                </button>
            </div>

            {/* Bottom Navigation */}
            <div className={`flex justify-between items-center mt-6 pt-4 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                <button
                    onClick={onBack}
                    className={`transition-colors px-4 py-2 text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'}`}
                >
                    {commonText.back}
                </button>
                <button
                    onClick={onNext}
                    className="px-6 py-2 rounded-lg text-white font-medium text-sm transition-transform active:scale-95"
                    style={{ backgroundColor: accentColor }}
                >
                    {commonText.continue}
                </button>
            </div>
        </div>
    )
}
