'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Monitor, Settings, Info, Grid3X3, Check, X, Minimize2, Maximize2, ArrowLeftToLine, ArrowRightToLine, ExternalLink, FolderPlus, Image } from 'lucide-react'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore, MenuType } from '@/os/kernel/useContextMenuStore'
import { useNotificationStore } from '@/os/kernel/useNotificationStore'
import { useDesktopStore } from '@/os/kernel/useDesktopStore'
import { APPS_REGISTRY } from '@/os/registry/config'

export default function SystemContextMenu() {
  const { visible, position, type, data, hideMenu } = useContextMenuStore()
  const { addNotification } = useNotificationStore()
  const { organizeIcons } = useDesktopStore()
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)

  const { snapToGrid, setSnapToGrid, pinnedAppIds, pinApp, unpinApp, useAnimations, displayScale } = useSystemSettings()
  const { openWindow, closeWindow, minimizeWindow, maximizeWindow, updateWindowPosition, updateWindowSize } = useWindowStore()

  // Handle outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideMenu()
      }
    }
    const handleScroll = () => hideMenu()

    if (visible) {
      document.addEventListener('click', handleClick)
      document.addEventListener('scroll', handleScroll)
    }

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('scroll', handleScroll)
    }
  }, [visible, hideMenu])

  // Prevent default browser context menu globally when our menu is active
  // But we still need to listen for trigger events in other components
  // This component now acts as the VIEW only.

  const handleOpenSettings = () => {
    const app = APPS_REGISTRY['settings']
    if (app) {
      openWindow(app.id, t('start.settings'), <app.component />, app.icon, app.defaultWindowOptions)
    }
    hideMenu()
  }

  const handleSnap = (direction: 'left' | 'right') => {
    if (!data?.windowId) return
    
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight - 64 // - taskbar
    const width = screenWidth / 2
    
    updateWindowSize(data.windowId, { width, height: screenHeight })
    updateWindowPosition(data.windowId, { 
      x: direction === 'left' ? 0 : width, 
      y: 0 
    })
    hideMenu()
  }

  // --- Menu Configurations ---

  const getMenuItems = () => {
    switch (type) {
      case 'taskbar-icon':
        const isPinned = pinnedAppIds.includes(data.appId)
        
        return [
          {
            label: t('menu.open'),
            icon: ExternalLink,
            action: () => {
              if (data.windowId) {
                const win = useWindowStore.getState().windows[data.windowId]
                if (win?.isMinimized) useWindowStore.getState().minimizeWindow(data.windowId)
                useWindowStore.getState().focusWindow(data.windowId)
              } else {
                 // Launch App
                 const app = APPS_REGISTRY[data.appId]
                 if (app) {
                   const title = app.id === 'settings' ? t('start.settings') : app.title
                   openWindow(app.id, title, <app.component />, app.icon, app.defaultWindowOptions)
                 }
              }
            }
          },
          {
            label: isPinned ? t('menu.unpin') : t('menu.pin'),
            icon: Check, 
            checked: isPinned,
            action: () => {
              if (isPinned) {
                unpinApp(data.appId)
                addNotification({ type: 'info', message: t('msg.unpinned') })
              } else {
                pinApp(data.appId)
                addNotification({ type: 'success', message: t('msg.pinned') })
              }
            }
          },
          { type: 'separator' },
          {
            label: t('menu.close'),
            icon: X,
            danger: true,
            disabled: !data.windowId, // Custom property we need to handle in render
            action: () => {
              if (data.windowId) closeWindow(data.windowId)
            }
          }
        ].filter(item => !item.disabled) // Simple filter for disabled items

      case 'window-titlebar':
        const win = useWindowStore.getState().windows[data?.windowId]
        if (!win) return []
        
        return [
          {
            label: win.isMaximized ? t('menu.restore') : t('menu.maximize'),
            icon: win.isMaximized ? Minimize2 : Maximize2,
            action: () => maximizeWindow(data.windowId)
          },
          {
            label: t('menu.minimize'),
            icon: MinusIcon,
            action: () => minimizeWindow(data.windowId)
          },
          { type: 'separator' },
          {
            label: t('menu.snap.left'),
            icon: ArrowLeftToLine,
            action: () => handleSnap('left')
          },
          {
            label: t('menu.snap.right'),
            icon: ArrowRightToLine,
            action: () => handleSnap('right')
          },
          { type: 'separator' },
          {
            label: t('menu.close'),
            icon: X,
            danger: true,
            action: () => closeWindow(data.windowId)
          }
        ]

      case 'desktop':
      default:
        return [
          {
            label: t('menu.refresh'),
            icon: RefreshCw,
            action: () => window.location.reload()
          },
          { type: 'separator' },
          {
            label: t('menu.newfolder'),
            icon: FolderPlus,
            action: () => addNotification({
              type: 'info',
              title: t('msg.info'),
              message: t('msg.folder.impl')
            })
          },
          {
            label: t('menu.wallpaper'),
            icon: Image,
            action: handleOpenSettings
          },
          {
            label: t('menu.align'),
            icon: Grid3X3,
            action: () => {
              // Re-calculate grid parameters (matching Desktop.tsx logic)
              const GRID_SIZE = 90
              const GRID_PADDING = 24
              const scaleFactor = displayScale / 100
              const currentGridSize = GRID_SIZE * scaleFactor
              const currentGridPadding = GRID_PADDING * scaleFactor
              
              const maxRows = Math.floor((window.innerHeight - 150) / currentGridSize)
              
              organizeIcons(maxRows, currentGridSize, currentGridPadding)
            } 
          },
          { type: 'separator' },
          {
            label: t('menu.about'),
            icon: Info,
            action: () => addNotification({
              type: 'info',
              title: t('msg.about.title'),
              message: t('msg.about.desc'),
              duration: 5000
            })
          }
        ]
    }
  }
  
  // Helper for icons
  const MinusIcon = (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/></svg>
  )

  const menuItems = getMenuItems()

  // Calculate menu position to avoid overflow
  const getMenuStyle = () => {
    const menuWidth = 200
    // Estimate height based on items (approx 36px per item + separators)
    const menuHeight = menuItems.length * 36 + 20 
    let x = position.x
    let y = position.y

    if (typeof window !== 'undefined') {
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10
      }
    }

    return { top: y, left: x }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: useAnimations ? 0.1 : 0 }}
          className="fixed z-[20000] min-w-[200px] bg-[var(--os-bg-panel)]/95 backdrop-blur-xl border border-[var(--os-border)] shadow-2xl rounded-xl py-1.5 overflow-hidden select-none"
          style={getMenuStyle()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {menuItems.map((item, index) => {
            if (item.type === 'separator') {
              return <div key={index} className="h-px bg-[var(--os-border)] my-1.5 mx-2" />
            }

            const Icon = item.icon
            
            return (
              <button
                key={index}
                onClick={() => {
                  if (item.action) item.action()
                  hideMenu()
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-sm transition-colors relative group
                  ${item.danger 
                    ? 'text-red-500 hover:bg-red-500/10' 
                    : 'text-[var(--os-text-primary)] hover:bg-[var(--os-accent)] hover:text-[var(--os-accent-contrast)]'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  {Icon && <Icon size={16} className={item.danger ? '' : "opacity-70 group-hover:opacity-100"} />}
                  <span>{item.label}</span>
                </div>
                {item.checked && <Check size={14} />}
              </button>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
