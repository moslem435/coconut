'use client'

import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react'
import { Wifi, Battery, Volume2, Command, Settings2 } from 'lucide-react'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useShallow } from 'zustand/react/shallow'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { APPS_REGISTRY } from '@/os/registry/config'
import { AnimatePresence } from 'framer-motion'
import { WindowPreview } from './WindowPreview'
import { Tooltip } from '@/os/ui/Tooltip'
import StartMenu from './StartMenu'

interface TaskbarProps {
  onStartClick?: () => void
  isStartMenuOpen: boolean
  onCloseStartMenu: () => void
  onShutdown?: () => void
}

import SystemClock from './SystemClock'
import QuickSettings from './QuickSettings'
import ActionCenter from './ActionCenter'

export default function Taskbar({
  onStartClick,
  isStartMenuOpen,
  onCloseStartMenu,
  onShutdown
}: TaskbarProps) {
  const { t, language, toggleLanguage } = useLanguage()
  // Taskbar needs list of all open windows
  const openWindows = useWindowStore(useShallow(state =>
    Object.values(state.windows).filter(w => w.isOpen)
  ))
  const activeWindowId = useWindowStore(state => state.activeWindowId)
  const snapshots = useWindowStore(state => state.snapshots)
  const launchingAppIds = useWindowStore(state => state.launchingAppIds)
  const { pinnedAppIds, useTaskbarPreviews } = useSystemSettings()

  // Actions
  const openWindow = useWindowStore(state => state.openWindow)
  const focusWindow = useWindowStore(state => state.focusWindow)
  const minimizeWindow = useWindowStore(state => state.minimizeWindow)
  const updateTaskbarPosition = useWindowStore(state => state.updateTaskbarPosition)
  const setSnapshot = useWindowStore(state => state.setSnapshot)
  const setPeekWindowId = useWindowStore(state => state.setPeekWindowId)
  const launchApp = useWindowStore(state => state.launchApp)

  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false)
  const [isActionCenterOpen, setIsActionCenterOpen] = useState(false)
  const quickSettingsRef = useRef<HTMLDivElement>(null)
  const actionCenterRef = useRef<HTMLDivElement>(null)
  const startBtnRef = useRef<HTMLButtonElement>(null)

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const peekTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Merge pinned apps and open windows
  const taskbarItems = useMemo(() => {
    const items: Array<{
      id: string // appId or windowId
      appId: string
      title: string
      icon: any
      isOpen: boolean
      isMinimized: boolean
      isActive: boolean
      isLoading?: boolean
    }> = []

    // 1. Add Pinned Apps first
    pinnedAppIds.forEach(appId => {
      const app = APPS_REGISTRY[appId]
      if (!app) return

      // Check if it's open (using appId as windowId for single-instance apps)
      const win = openWindows.find(w => w.id === appId)

      const title = appId === 'settings' ? t('start.settings') : app.title

      items.push({
        id: appId,
        appId: appId,
        title: title,
        icon: app.icon,
        isOpen: !!win,
        isMinimized: win?.isMinimized ?? false,
        isActive: activeWindowId === appId,
        isLoading: launchingAppIds.includes(appId)
      })
    })

    // 2. Add remaining Open Windows that aren't pinned
    openWindows.forEach(win => {
      // If already added via pinned list, skip
      if (pinnedAppIds.includes(win.id)) return

      items.push({
        id: win.id,
        appId: win.id, // Assuming window id is app id
        title: win.title,
        icon: win.icon,
        isOpen: true,
        isMinimized: win.isMinimized,
        isActive: activeWindowId === win.id
      })
    })

    // 3. Add Launching Apps (that are not pinned and not open yet)
    launchingAppIds.forEach(appId => {
      // If already in items (pinned or open), we handled it above
      if (items.some(i => i.appId === appId)) return

      const app = APPS_REGISTRY[appId]
      if (!app) return

      items.push({
        id: appId,
        appId: appId,
        title: app.title,
        icon: app.icon,
        isOpen: false,
        isMinimized: false,
        isActive: false,
        isLoading: true
      })
    })

    return items
  }, [openWindows, pinnedAppIds, activeWindowId, launchingAppIds])

  // Update taskbar positions after render
  useLayoutEffect(() => {
    // Only update position for open windows (pinned-only apps don't have windows yet)
    // But we need to track position for minimize animation target
    taskbarItems.forEach(item => {
      const el = itemRefs.current[item.id]
      if (el) {
        const rect = el.getBoundingClientRect()
        // Update position in window store for minimize animation
        // Even if window isn't open, we update it so when it opens it knows where to go? 
        // Actually only open windows need this.
        if (item.isOpen) {
          updateTaskbarPosition(item.id, { x: rect.left + rect.width / 2, y: rect.top })
        }
      }
    })
  }, [taskbarItems, updateTaskbarPosition])


  const handleItemClick = (item: typeof taskbarItems[0]) => {
    // Close preview immediately on click
    setHoveredId(null)
    setPeekWindowId(null)
    if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current)

    if (item.isOpen) {
      if (item.isActive && !item.isMinimized) {
        minimizeWindow(item.id)
      } else {
        focusWindow(item.id)
      }
    } else {
      if (item.isLoading) return

      // Launch App
      const app = APPS_REGISTRY[item.appId]
      if (app) {
        const el = itemRefs.current[item.id]
        let taskbarPos = undefined
        if (el) {
          const rect = el.getBoundingClientRect()
          taskbarPos = { x: rect.left + rect.width / 2, y: rect.top }
        }

        const title = item.appId === 'settings' ? t('start.settings') : app.title

        launchApp(app.id, title, <app.component />, app.icon, {
          ...app.defaultWindowOptions,
          taskbarPosition: taskbarPos
        })
      }
    }
  }

  return (
    <div
      data-taskbar
      className="fixed bottom-4 left-1/2 -translate-x-1/2 h-16 z-[10000] flex items-center justify-between select-none shadow-2xl backdrop-blur-3xl backdrop-saturate-150 rounded-2xl px-3 transition-[width,height] duration-300 w-fit max-w-[calc(100vw-2rem)]"
      style={{
        backgroundColor: 'rgba(var(--os-bg-panel-rgb), 0.65)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
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
            className="h-12 w-12 flex items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 group shadow-sm bg-opacity-50"
            style={{ backgroundColor: 'var(--os-hover-bg)' }}
          >
            <Command className="w-[1.375rem] h-[1.375rem] text-[var(--os-accent)] group-hover:opacity-80 transition-opacity" />
          </button>
        </Tooltip>

        {/* Separator - Only show if there are items */}
        {taskbarItems.length > 0 && (
          <div className="w-px h-5 bg-[var(--os-border)] mx-2" />
        )}

        {/* Window List - Icon Only for Dock Look */}
        {taskbarItems.map((item) => (
          <Tooltip
            key={item.id}
            content={(!useTaskbarPreviews || !item.isOpen) ? item.title : null}
            side="top"
            offset={20}
          >
            <button
              ref={(el) => { itemRefs.current[item.id] = el }}
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => {
                setHoveredId(item.id)
              }}
              onMouseLeave={() => {
                setHoveredId(null)

                // Clear Peek (Safety fallback)
                if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current)
                setPeekWindowId(null)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                useContextMenuStore.getState().showMenu(e.clientX, e.clientY, 'taskbar-icon', {
                  windowId: item.isOpen ? item.id : undefined,
                  appId: item.appId
                })
              }}
              className={`h-12 w-12 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-200 active:scale-95 relative group hover:bg-[var(--os-hover-bg)] ${item.isLoading ? 'animate-pulse cursor-wait' : ''
                }`}
              style={{
                backgroundColor: item.isActive && !item.isMinimized
                  ? 'var(--os-accent-dim)'
                  : undefined
              }}
            >

              {/* Window Icon */}
              {item.icon ? (() => {
                const Icon = item.icon
                return <Icon className="w-[1.375rem] h-[1.375rem] text-[var(--os-text-primary)]" />
              })() : (
                <div className="w-4 h-4 rounded-sm border flex items-center justify-center"
                  style={{ borderColor: 'var(--os-text-primary)' }}
                >
                  <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: 'var(--os-text-primary)' }} />
                </div>
              )}

              {/* Indicator Dot for Open Apps */}
              {item.isOpen && (
                <div className={`absolute bottom-1 w-1 h-1 rounded-full ${item.isActive && !item.isMinimized ? 'bg-[var(--os-accent)]' : 'bg-[var(--os-text-secondary)]'}`} />
              )}

              {/* Window Preview */}
              <AnimatePresence>
                {useTaskbarPreviews && item.isOpen && hoveredId === item.id && (
                  <WindowPreview
                    appId={item.appId}
                    title={item.title}
                    icon={item.icon}
                    isActive={item.isActive}
                    snapshot={snapshots[item.id]}
                    onPeek={(shouldPeek) => {
                      if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current)
                      if (shouldPeek) {
                        // Enter peek mode (slight delay to prevent accidental triggers)
                        peekTimeoutRef.current = setTimeout(() => {
                          setPeekWindowId(item.id)
                        }, 200)
                      } else {
                        // Exit peek mode immediately
                        setPeekWindowId(null)
                      }
                    }}
                  />
                )}
              </AnimatePresence>
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Right: System Tray */}
      <div className="flex items-center gap-1.5 h-full pl-4 ml-auto relative" style={{ color: 'var(--os-text-secondary)' }}>

        {/* Separator */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-5 bg-white/5" />

        {/* Language Indicator */}
        <Tooltip content={t('settings.language')} side="top">
          <div
            className="hidden sm:flex items-center justify-center px-2 py-1 rounded-md hover:bg-white/5 cursor-pointer text-xs font-medium tracking-wider transition-colors"
            onClick={toggleLanguage}
          >
            {language === 'en' ? 'EN' : '中'}
          </div>
        </Tooltip>

        {/* Unified Status Pill */}
        <Tooltip content={t('settings.desc.appearance')} side="top">
          <div
            ref={quickSettingsRef}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all cursor-pointer ${isQuickSettingsOpen ? 'bg-white/10 text-[var(--os-text-primary)]' : 'hover:bg-white/5'}`}
            onClick={() => setIsQuickSettingsOpen(!isQuickSettingsOpen)}
          >
            <Volume2 className="w-4 h-4" />
            <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
            <Settings2 className="w-4 h-4" />
          </div>
        </Tooltip>

        {/* Clock - Action Center Trigger */}
        <Tooltip content={t('start.notifications')} side="top" offset={20}>
          <div
            ref={actionCenterRef}
            className={`flex flex-col items-center justify-center leading-none gap-0.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 min-w-[5rem] ${isActionCenterOpen ? 'bg-white/10 text-[var(--os-text-primary)]' : 'hover:bg-white/5'}`}
            onClick={() => setIsActionCenterOpen(!isActionCenterOpen)}
          >
            <SystemClock showDate />
          </div>
        </Tooltip>

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
        toggleRef={quickSettingsRef}
      />

      <ActionCenter
        isOpen={isActionCenterOpen}
        onClose={() => setIsActionCenterOpen(false)}
        toggleRef={actionCenterRef}
      />
    </div>
  )
}
