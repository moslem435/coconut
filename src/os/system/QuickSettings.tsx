'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Volume2, VolumeX, Sun, Moon, Monitor,
  Activity, LayoutTemplate, Languages,
  Wifi, Battery, Shield
} from 'lucide-react'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { Tooltip } from '@/os/ui/Tooltip'

interface QuickSettingsProps {
  isOpen: boolean
  onClose: () => void
  toggleRef: React.RefObject<HTMLDivElement>
}

export default function QuickSettings({ isOpen, onClose, toggleRef }: QuickSettingsProps) {
  const {
    volume, setVolume,
    displayScale, setDisplayScale,
    useAnimations, setUseAnimations,
    useTaskbarPreviews, setUseTaskbarPreviews,
    theme, setTheme,
    isMuted, toggleMute
  } = useSystemSettings()

  const { language, toggleLanguage, t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        toggleRef.current &&
        !toggleRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, toggleRef])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-16 right-4 w-80 rounded-2xl shadow-2xl p-4 z-[5000] text-[var(--os-text-primary)] backdrop-blur-2xl"
          style={{
            backgroundColor: 'rgba(var(--os-bg-panel-rgb), 0.85)',
            border: '1px solid var(--os-border)'
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="font-semibold text-sm tracking-wide">{t('quicksettings.title')}</h3>
            <div className="text-xs text-[var(--os-text-muted)]">{Math.round(volume)}%</div>
          </div>

          {/* Sliders Section */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Volume */}
            <div className="flex items-center gap-3 group">
              <Tooltip content={t('settings.sound.volume')} side="left">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full hover:bg-[var(--os-hover-bg)] transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </Tooltip>
              <div className="flex-1 h-8 relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[var(--os-border)] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[var(--os-accent)] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                />
              </div>
            </div>

            {/* Scale - Mock only as we might not want to break layout */}
            <div className="flex items-center gap-3 group">
              <Tooltip content={t('settings.display.scale')} side="left">
                <div className="p-2 rounded-full text-[var(--os-text-secondary)]">
                  <Monitor size={18} />
                </div>
              </Tooltip>
              <div className="flex-1 h-8 relative flex items-center">
                <input
                  type="range"
                  min="75"
                  max="125"
                  step="5"
                  value={displayScale}
                  onChange={(e) => setDisplayScale(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[var(--os-border)] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[var(--os-text-secondary)] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Toggles Grid */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {/* Theme Toggle */}
            <ToggleButton
              isActive={theme === 'dark'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              label={theme === 'dark' ? t('quicksettings.theme.dark') : t('quicksettings.theme.light')}
              icon={theme === 'dark' ? Moon : Sun}
            />

            {/* Animations Toggle */}
            <ToggleButton
              isActive={useAnimations}
              onClick={() => setUseAnimations(!useAnimations)}
              label={t('quicksettings.effects')}
              icon={Activity}
            />

            {/* Previews Toggle */}
            <ToggleButton
              isActive={useTaskbarPreviews}
              onClick={() => setUseTaskbarPreviews(!useTaskbarPreviews)}
              label={t('quicksettings.previews')}
              icon={LayoutTemplate}
            />

            {/* Language Toggle */}
            <ToggleButton
              isActive={true}
              activeColor="bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
              onClick={toggleLanguage}
              label={language === 'en' ? 'English' : '中文'}
              icon={Languages}
            />


          </div>

        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ToggleButton({
  isActive,
  onClick,
  label,
  icon: Icon,
  activeColor
}: {
  isActive: boolean
  onClick: () => void
  label: string
  icon: any
  activeColor?: string
}) {
  const activeClass = activeColor || "bg-[var(--os-accent)] text-[var(--os-accent-contrast)] border-transparent"
  const inactiveClass = "bg-[var(--os-bg-base)] text-[var(--os-text-primary)] border-[var(--os-border)] hover:bg-[var(--os-hover-bg)]"

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200 ${isActive ? activeClass : inactiveClass}`}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium truncate w-full text-center">{label}</span>
    </button>
  )
}
