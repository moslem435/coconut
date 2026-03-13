'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe } from 'lucide-react'
import WelcomeStep from './steps/WelcomeStep'
import PersonalizeStep from './steps/PersonalizeStep'
import FeaturesStep from './steps/FeaturesStep'
import ReadyStep from './steps/ReadyStep'
import { useSystemSettingsStore } from '@/os/kernel/useSystemSettingsStore'
import { useLanguageStore } from '@/os/kernel/useLanguageStore'

interface SetupWizardProps {
    onComplete: () => void
}

const STEPS = [
    'welcome',
    'personalize',
    'features',
    'ready'
]

export default function SetupWizard({ onComplete }: SetupWizardProps) {
    const [stepIndex, setStepIndex] = useState(0)
    const [direction, setDirection] = useState(1)
    const { completeOOBE, theme } = useSystemSettingsStore()
    const { language, setLanguage } = useLanguageStore()
    const [showLangMenu, setShowLangMenu] = useState(false)

    const handleNext = () => {
        if (stepIndex < STEPS.length - 1) {
            setDirection(1)
            setStepIndex(prev => prev + 1)
        }
    }

    const handleBack = () => {
        if (stepIndex > 0) {
            setDirection(-1)
            setStepIndex(prev => prev - 1)
        }
    }

    const handleComplete = () => {
        completeOOBE()
        onComplete()
    }

    const currentStep = STEPS[stepIndex]

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0,
            scale: 0.95
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -50 : 50,
            opacity: 0,
            scale: 0.95
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-xl"
        >
            {/* Background Gradient Mesh */}
            <div className="absolute inset-0 overflow-hidden -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[100px]" />
            </div>

            <motion.div
                layout
                className={`
                    relative w-[850px] h-[600px] border rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md flex transition-colors duration-300
                    ${theme === 'dark' 
                        ? 'bg-[#09090b]/90 border-white/10' 
                        : 'bg-white/90 border-black/5'}
                `}
            >
                {/* Step Indicator */}
                <div className="absolute top-8 left-8 flex gap-2 z-20">
                    {STEPS.map((_, idx) => (
                        <div 
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                idx === stepIndex 
                                    ? (theme === 'dark' ? 'w-8 bg-white' : 'w-8 bg-black') 
                                    : idx < stepIndex 
                                        ? (theme === 'dark' ? 'w-4 bg-white/40' : 'w-4 bg-black/40') 
                                        : (theme === 'dark' ? 'w-1.5 bg-white/10' : 'w-1.5 bg-black/10')
                            }`}
                        />
                    ))}
                </div>

                {/* Language Switcher */}
                <div className="absolute top-8 right-8 z-30">
                    <button 
                        onClick={() => setShowLangMenu(!showLangMenu)}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-xs
                            ${theme === 'dark' 
                                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white' 
                                : 'bg-black/5 hover:bg-black/10 border-black/10 text-black/70 hover:text-black'}
                        `}
                    >
                        <Globe size={14} />
                        <span className="uppercase">{language}</span>
                    </button>
                    
                    <AnimatePresence>
                        {showLangMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                className={`
                                    absolute top-full right-0 mt-2 w-32 border rounded-xl shadow-xl overflow-hidden py-1
                                    ${theme === 'dark' ? 'bg-[#18181b] border-white/10' : 'bg-white border-black/10'}
                                `}
                            >
                                <button
                                    onClick={() => { setLanguage('en'); setShowLangMenu(false) }}
                                    className={`
                                        w-full text-left px-4 py-2 text-sm transition-colors
                                        ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'}
                                        ${language === 'en' 
                                            ? (theme === 'dark' ? 'text-white font-medium' : 'text-black font-medium') 
                                            : (theme === 'dark' ? 'text-white/50' : 'text-black/50')}
                                    `}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => { setLanguage('zh'); setShowLangMenu(false) }}
                                    className={`
                                        w-full text-left px-4 py-2 text-sm transition-colors
                                        ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'}
                                        ${language === 'zh' 
                                            ? (theme === 'dark' ? 'text-white font-medium' : 'text-black font-medium') 
                                            : (theme === 'dark' ? 'text-white/50' : 'text-black/50')}
                                    `}
                                >
                                    中文
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex-1 relative">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={stepIndex}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.4, type: "spring", stiffness: 100, damping: 20 }}
                            className="absolute inset-0 w-full h-full"
                        >
                            {currentStep === 'welcome' && <WelcomeStep onNext={handleNext} />}
                            {currentStep === 'personalize' && <PersonalizeStep onNext={handleNext} onBack={handleBack} />}
                            {currentStep === 'features' && <FeaturesStep onNext={handleNext} onBack={handleBack} />}
                            {currentStep === 'ready' && <ReadyStep onComplete={handleComplete} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    )
}
