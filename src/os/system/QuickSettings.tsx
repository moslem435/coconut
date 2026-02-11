'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [activeControl, setActiveControl] = useState<'volume' | 'scale'>('volume')

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

  const [position, setPosition] = useState<{ x: number, y: number } | null>(null)

  useLayoutEffect(() => {
    if (isOpen && toggleRef.current && menuRef.current) {
      const triggerRect = toggleRef.current.getBoundingClientRect()
      const menuRect = menuRef.current.getBoundingClientRect()
      const taskbar = toggleRef.current.closest('[data-taskbar]')
      const taskbarRect = taskbar?.getBoundingClientRect()

      // Center align relative to trigger
      let x = triggerRect.left + triggerRect.width / 2 - menuRect.width / 2

      // Clamp to screen edges with padding
      const padding = 16
      const maxX = window.innerWidth - menuRect.width - padding
      x = Math.min(Math.max(padding, x), maxX)

      // Baseline positioning: Use taskbar top instead of individual button top
      // This ensures all panels start from the same height regardless of button size
      const baselineY = taskbarRect ? taskbarRect.top : triggerRect.top

      // Calculate dynamic gap based on REM to support scaling
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const gap = 0.75 * rootFontSize // 0.75rem gap

      const y = window.innerHeight - baselineY + gap

      setPosition({ x, y })
    }
  }, [isOpen, toggleRef])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed z-[5000] w-80 rounded-2xl p-4 text-[var(--os-text-primary)]"
          style={{
            left: position?.x ?? 0,
            bottom: position?.y ?? '5rem', // Fallback in REM for consistency
            visibility: position ? 'visible' : 'hidden',
            backgroundColor: 'rgba(var(--os-bg-panel-rgb), 0.65)',
            backdropFilter: 'blur(40px) saturate(150%)',
            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            isolation: 'isolate',
            transform: 'translateZ(0)'
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="font-semibold text-sm tracking-wide">{t('quicksettings.title')}</h3>
            <div className="text-xs text-[var(--os-text-muted)]">
              {activeControl === 'volume' ? `${Math.round(volume)}%` : `${Math.round(displayScale)}%`}
            </div>
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
                  onChange={(e) => {
                    setVolume(parseInt(e.target.value))
                    setActiveControl('volume')
                  }}
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
                  onChange={(e) => {
                    setDisplayScale(parseInt(e.target.value))
                    setActiveControl('scale')
                  }}
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
              onClick={toggleLanguage}
              label={language === 'en' ? 'English' : '中文'}
              icon={Languages}
            />


          </div>

        </motion.div>
      )}
    </AnimatePresence>,
    document.body
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
