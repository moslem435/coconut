/**
 * @fileoverview 任务栏组件 - 应用快捷方式、系统托盘与窗口切换
 * 
 * 功能：
 * - 固定应用快捷方式（Dock 风格）
 * - 已打开窗口列表与切换
 * - 系统时钟和日期
 * - 展开操作中心和快速设置
 * - 展开开始菜单
 * 
 * @author yume
 * @created 2026-02-06
 * @lastModified 2026-03-09
 * @module src/os/system/Taskbar
 */

'use client'
import { useState, useRef, useMemo } from 'react'
import { Volume2, Palmtree, Settings2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { Tooltip } from '@/os/ui/Tooltip'
import { APPS_REGISTRY } from '@/os/registry/config'
import StartMenu from './StartMenu'
import { TaskbarItem } from './TaskbarItem'

import SystemClock from './SystemClock'
import QuickSettings from './QuickSettings'
import ActionCenter from './ActionCenter'

interface TaskbarProps {
  onStartClick?: () => void
  isStartMenuOpen: boolean
  onCloseStartMenu: () => void
  onShutdown?: () => void
}

export default function Taskbar({
  onStartClick,
  isStartMenuOpen,
  onCloseStartMenu,
  onShutdown
}: TaskbarProps) {
  const { t, language, toggleLanguage } = useLanguage()

  // Taskbar needs list of all open window IDs/AppIDs
  // We use useShallow with a composite key string to avoid re-renders when other window properties change
  const openWindowsStrings = useWindowStore(
    useShallow(state => Object.values(state.windows)
      .filter(w => w.isOpen)
      .map(w => `${w.id}|${w.appId || ''}`))
  )

  const launchingAppIds = useWindowStore(useShallow(state => state.launchingAppIds))
  const { pinnedAppIds } = useSystemSettings()

  // Check if active window is maximized for auto-hide behavior
  const isMaximized = useWindowStore(useShallow(state => {
    if (!state.activeWindowId) return false
    return state.windows[state.activeWindowId]?.isMaximized || false
  }))

  const [isHovered, setIsHovered] = useState(false)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 300)
  }

  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false)
  const [isActionCenterOpen, setIsActionCenterOpen] = useState(false)
  const quickSettingsRef = useRef<HTMLDivElement>(null)
  const actionCenterRef = useRef<HTMLDivElement>(null)
  const startBtnRef = useRef<HTMLButtonElement>(null)

  const { launchApp, closeWindow, minimizeWindow, focusWindow } = useWindowStore()
  const isAIChatOpen = useWindowStore(useShallow(state => !!state.windows['ai-chat']?.isOpen))
  const isAIChatMinimized = useWindowStore(useShallow(state => !!state.windows['ai-chat']?.isMinimized))
  const isAIChatSidebar = useWindowStore(useShallow(state => !!state.windows['ai-chat']?.isSidebar))

  const handleAIClick = () => {
    if (isAIChatOpen) {
      if (isAIChatMinimized) {
        focusWindow('ai-chat')
      } else {
        // If it's open and not minimized, clicking it should minimize it (toggle behavior)
        minimizeWindow('ai-chat')
      }
    } else {
      // Launch as sidebar by default
      const app = APPS_REGISTRY['ai-chat']
      if (app) {
        launchApp('ai-chat', 'AI Assistant', 'ai-chat', undefined, { ...app.defaultWindowOptions, isSidebar: true })
      }
    }
  }

  // Merge pinned apps and open windows
  // Result is a list of { id, appId }
  const taskbarItems = useMemo(() => {
    const items: Array<{ id: string, appId: string }> = []
    const addedIds = new Set<string>()

    // 1. Add Pinned Apps first
    pinnedAppIds.forEach(appId => {
      // Skip AI Chat if it's pinned (it has a special button)
      if (appId === 'ai-chat') return

      items.push({ id: appId, appId: appId })
      addedIds.add(appId)
    })

    // 2. Add remaining Open Windows that aren't pinned
    openWindowsStrings.forEach(str => {
      const parts = str.split('|')
      const id = parts[0]
      const appId = parts[1]

      if (!id) return

      // Skip AI Chat window from regular list
      if (appId === 'ai-chat') return

      // If the window ID is already added (e.g. it's a pinned app that is open), skip
      if (addedIds.has(id)) return

      items.push({ id, appId: appId || id }) // Fallback to id if appId is empty
      addedIds.add(id)
    })

    // 3. Add Launching Apps
    launchingAppIds.forEach(appId => {
      if (appId === 'ai-chat') return
      if (addedIds.has(appId)) return
      items.push({ id: appId, appId })
      addedIds.add(appId)
    })

    return items
  }, [openWindowsStrings, pinnedAppIds, launchingAppIds])

  const shouldHide = isMaximized && !isHovered && !isStartMenuOpen && !isQuickSettingsOpen && !isActionCenterOpen

  return (
    <>
      {/* Trigger Area for Auto-hide */}
      {isMaximized && (
        <div
          className="fixed bottom-0 left-0 right-0 h-6 z-[9999]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}

      <motion.div
        data-taskbar
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        initial={{ y: 0, x: "-50%" }}
        animate={{
          y: shouldHide ? "150%" : 0,
          x: "-50%"
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 1
        }}
        className="fixed bottom-4 left-1/2 h-14 z-[10000] flex justify-center w-fit max-w-[calc(100vw-2rem)]"
      >
        {/* Visual Taskbar Panel */}
        <div
          className="flex items-center justify-between gap-4 select-none shadow-2xl backdrop-blur-3xl backdrop-saturate-150 rounded-2xl px-3 h-full"
          style={{
            backgroundColor: 'rgba(var(--os-bg-panel-rgb), 0.65)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px var(--os-border), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(40px) saturate(150%)',
            WebkitBackdropFilter: 'blur(40px) saturate(150%)'
          }}
        >
          {/* Left: Start & Taskbar Items */}
          <div className="flex items-center gap-2 h-full py-2">

            {/* Start Button */}
            <Tooltip content={t('start.menu')} side="top" offset={20}>
              <button
                ref={startBtnRef}
                onClick={onStartClick}
                className="h-10 w-10 flex items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 group shadow-sm bg-opacity-50"
                style={{ backgroundColor: 'var(--os-hover-bg)' }}
              >
                <Palmtree className="w-[1.375rem] h-[1.375rem] text-[var(--os-accent)] group-hover:opacity-80 transition-opacity" />
              </button>
            </Tooltip>

            {/* Separator - Only show if there are items */}
            {taskbarItems.length > 0 && (
              <div className="w-px h-5 bg-[var(--os-border)] opacity-50" />
            )}

            {/* Window List */}
            {taskbarItems.map((item) => (
              <TaskbarItem key={item.id} id={item.id} appId={item.appId} />
            ))}
          </div>

          {/* Right: System Tray */}
          <div className="flex items-center gap-1.5 h-full pl-4 ml-auto relative" style={{ color: 'var(--os-text-secondary)' }}>
            {/* Separator */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-5 bg-[var(--os-border)]" />

            {/* Language Indicator */}
            <Tooltip content={t('settings.language')} side="top">
              <div
                className="hidden sm:flex items-center justify-center px-2 py-1 rounded-md hover:bg-[var(--os-hover-bg)] cursor-pointer text-xs font-medium tracking-wider transition-colors"
                onClick={toggleLanguage}
              >
                {language === 'en' ? 'EN' : '中'}
              </div>
            </Tooltip>

            {/* Unified Status Pill */}
            <Tooltip content={t('settings.desc.appearance')} side="top">
              <div
                ref={quickSettingsRef}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all cursor-pointer ${isQuickSettingsOpen ? 'bg-[var(--os-bg-selection)] text-[var(--os-text-primary)]' : 'hover:bg-[var(--os-hover-bg)]'}`}
                onClick={() => setIsQuickSettingsOpen(!isQuickSettingsOpen)}
              >
                <Volume2 className="w-4 h-4" />
                <div className="w-[1px] h-3 bg-[var(--os-border)]" />
                <Settings2 className="w-4 h-4" />
              </div>
            </Tooltip>

            {/* Clock - Action Center Trigger */}
            <Tooltip content={t('start.notifications')} side="top" offset={20}>
              <div
                ref={actionCenterRef}
                className={`flex flex-col items-center justify-center leading-none gap-0.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 min-w-[5rem] ${isActionCenterOpen ? 'bg-[var(--os-bg-selection)] text-[var(--os-text-primary)]' : 'hover:bg-[var(--os-hover-bg)]'}`}
                onClick={() => setIsActionCenterOpen(!isActionCenterOpen)}
              >
                <SystemClock showDate />
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Popups */}
        <StartMenu
          isOpen={isStartMenuOpen}
          onClose={onCloseStartMenu}
          onShutdown={onShutdown}
          toggleRef={startBtnRef as any}
        />

        <QuickSettings
          isOpen={isQuickSettingsOpen}
          onClose={() => setIsQuickSettingsOpen(false)}
          toggleRef={quickSettingsRef as React.RefObject<HTMLDivElement>}
        />

        <ActionCenter
          isOpen={isActionCenterOpen}
          onClose={() => setIsActionCenterOpen(false)}
          toggleRef={actionCenterRef as React.RefObject<HTMLDivElement>}
        />

        {/* Independent AI Assistant Button - Positioned relative to taskbar wrapper */}
        <div className="absolute -right-16 top-0 h-14 w-14" id="taskbar-ai-button">
          <motion.div
            className="group h-full w-full flex items-center justify-center select-none shadow-2xl backdrop-blur-3xl backdrop-saturate-150 rounded-2xl cursor-pointer relative overflow-hidden"
            style={{
              backgroundColor: 'rgba(var(--os-bg-panel-rgb), 0.65)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px var(--os-border), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(40px) saturate(150%)',
              WebkitBackdropFilter: 'blur(40px) saturate(150%)'
            }}
            onClick={handleAIClick}
            whileHover={{
              scale: 1.05
            }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="absolute inset-0 transition-colors duration-200 group-hover:bg-[var(--os-hover-bg)]" />
            <Tooltip content={t('app.ai-chat')} side="top" offset={20}>
              <div className="relative w-full h-full flex items-center justify-center z-10">
                <Sparkles className="w-6 h-6 text-[var(--os-text-primary)]" />
              </div>
            </Tooltip>
          </motion.div>
        </div>
      </motion.div>
    </>
  )
}
