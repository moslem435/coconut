'use client'

import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react'
import { Wifi, Battery, Volume2, Command } from 'lucide-react'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useShallow } from 'zustand/react/shallow'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { APPS_REGISTRY } from '@/os/registry/config'
import { AnimatePresence } from 'framer-motion'
import { WindowPreview } from './WindowPreview'
import { toPng } from 'html-to-image'

interface TaskbarProps {
  onStartClick?: () => void
}

import SystemClock from './SystemClock'

export default function Taskbar({
  onStartClick
}: TaskbarProps) {
  const { t } = useLanguage()
  // Taskbar needs list of all open windows
  const openWindows = useWindowStore(useShallow(state =>
    Object.values(state.windows).filter(w => w.isOpen)
  ))
  const activeWindowId = useWindowStore(state => state.activeWindowId)
  const snapshots = useWindowStore(state => state.snapshots)
  const { pinnedAppIds, useTaskbarPreviews } = useSystemSettings()

  // Actions
  const openWindow = useWindowStore(state => state.openWindow)
  const focusWindow = useWindowStore(state => state.focusWindow)
  const minimizeWindow = useWindowStore(state => state.minimizeWindow)
  const updateTaskbarPosition = useWindowStore(state => state.updateTaskbarPosition)
  const setSnapshot = useWindowStore(state => state.setSnapshot)
  const setPeekWindowId = useWindowStore(state => state.setPeekWindowId)

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const peekTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

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
        isActive: activeWindowId === appId
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

    return items
  }, [openWindows, pinnedAppIds, activeWindowId])

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

  const captureSnapshot = async (id: string) => {
    const el = document.getElementById(`window-${id}`)
    if (el) {
        try {
            // Use lower quality/scale for performance
            const dataUrl = await toPng(el, { 
                cacheBust: true, 
                pixelRatio: 0.5,
                skipAutoScale: true,
                style: {
                    transform: 'none', // Reset transform to avoid capturing position offset
                    transition: 'none'
                }
            })
            setSnapshot(id, dataUrl)
        } catch (err) {
            console.error('Snapshot failed', err)
        }
    }
  }

  const handleItemClick = (item: typeof taskbarItems[0]) => {
    // Close preview immediately on click
    setHoveredId(null)
    setPeekWindowId(null)
    if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current)

    if (item.isOpen) {
      if (item.isActive && !item.isMinimized) {
        // Capture snapshot before minimizing
        captureSnapshot(item.id).finally(() => {
            minimizeWindow(item.id)
        })
      } else {
        focusWindow(item.id)
      }
    } else {
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

        openWindow(app.id, title, <app.component />, app.icon, {
            ...app.defaultWindowOptions,
            taskbarPosition: taskbarPos
        })
      }
    }
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 h-16 z-[10000] flex items-center justify-between select-none shadow-2xl backdrop-blur-3xl backdrop-saturate-150 rounded-2xl px-2 transition-[width] duration-300"
      style={{
        backgroundColor: 'rgba(var(--os-bg-panel-rgb), 0.75)',
        border: '1px solid var(--os-border)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        width: Math.min(taskbarItems.length * 60 + 300, window.innerWidth - 32) + 'px',
        maxWidth: '90vw'
      }}
    >

      {/* Left: Start & Taskbar Items */}
      <div className="flex items-center gap-2 h-full py-2">

        {/* Start Button */}
        <button
          onClick={onStartClick}
          className="h-12 w-12 flex items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 group shadow-sm bg-opacity-50"
          style={{ backgroundColor: 'var(--os-hover-bg)' }}
        >
          <Command size={22} className="text-[var(--os-accent)] group-hover:opacity-80 transition-opacity" />
        </button>

        {/* Separator - Only show if there are items */}
        {taskbarItems.length > 0 && (
          <div className="w-px h-5 bg-[var(--os-border)] mx-2" />
        )}

        {/* Window List - Icon Only for Dock Look */}
        {taskbarItems.map((item) => (
          <button
            ref={(el) => { itemRefs.current[item.id] = el }}
            key={item.id}
            onClick={() => handleItemClick(item)}
            title={!useTaskbarPreviews ? item.title : undefined}
            onMouseEnter={() => {
                setHoveredId(item.id)
                if (item.isOpen) {
                    // Update snapshot
                    if (!item.isMinimized) {
                        captureSnapshot(item.id)
                    }
                }
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
            className="h-12 w-12 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-200 active:scale-95 relative group hover:bg-[var(--os-hover-bg)]"
            style={{
              backgroundColor: item.isActive && !item.isMinimized
                ? 'var(--os-accent-dim)'
                : undefined
            }}
          >

            {/* Window Icon */}
            {item.icon ? (() => {
              const Icon = item.icon
              return <Icon size={22} className="text-[var(--os-text-primary)]" />
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
                  {useTaskbarPreviews && hoveredId === item.id && (
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
        ))}
      </div>

      {/* Right: System Tray */}
      <div className="flex items-center gap-1.5 h-full pl-4 ml-auto relative" style={{ color: 'var(--os-text-secondary)' }}>
        
        {/* Separator */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-5 bg-white/5" />
        
        {/* Status Icons */}
        <div className="flex items-center gap-1 px-2">
          <div className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" title={t('status.wifi')}>
            <Wifi size={18} />
          </div>
          <div className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" title={`${t('status.volume')}: 80%`}>
            <Volume2 size={18} />
          </div>
          <div className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" title={`${t('status.battery')}: 100%`}>
            <Battery size={18} />
          </div>
        </div>

        {/* Clock - Interactive */}
        <div className="flex flex-col items-end leading-none gap-0.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/5 active:scale-95">
          <SystemClock showDate />
        </div>

      </div>
    </div>
  )
}
