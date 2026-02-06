'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Monitor, Settings, Info, Grid3X3, Check, X, Minimize2, Maximize2, ArrowLeftToLine, ArrowRightToLine, ExternalLink, FolderPlus, Image } from 'lucide-react'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore, MenuType } from '@/os/kernel/useContextMenuStore'
import { useNotificationStore } from '@/os/kernel/useNotificationStore'
import { APPS_REGISTRY } from '@/os/registry/config'

export default function SystemContextMenu() {
  const { visible, position, type, data, hideMenu } = useContextMenuStore()
  const { addNotification } = useNotificationStore()
  const menuRef = useRef<HTMLDivElement>(null)

  const { snapToGrid, setSnapToGrid, pinnedAppIds, pinApp, unpinApp } = useSystemSettings()
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
      openWindow(app.id, app.title, <app.component />, app.icon, app.defaultWindowOptions)
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
            label: '打开/聚焦',
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
                   openWindow(app.id, app.title, <app.component />, app.icon, app.defaultWindowOptions)
                 }
              }
            }
          },
          {
            label: isPinned ? '从任务栏取消固定' : '固定到任务栏',
            icon: Check, 
            checked: isPinned,
            action: () => {
              if (isPinned) {
                unpinApp(data.appId)
                addNotification({ type: 'info', message: '已取消固定' })
              } else {
                pinApp(data.appId)
                addNotification({ type: 'success', message: '已固定到任务栏' })
              }
            }
          },
          { type: 'separator' },
          {
            label: '关闭窗口',
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
            label: win.isMaximized ? '还原' : '最大化',
            icon: win.isMaximized ? Minimize2 : Maximize2,
            action: () => maximizeWindow(data.windowId)
          },
          {
            label: '最小化',
            icon: MinusIcon,
            action: () => minimizeWindow(data.windowId)
          },
          { type: 'separator' },
          {
            label: '左侧分屏',
            icon: ArrowLeftToLine,
            action: () => handleSnap('left')
          },
          {
            label: '右侧分屏',
            icon: ArrowRightToLine,
            action: () => handleSnap('right')
          },
          { type: 'separator' },
          {
            label: '关闭',
            icon: X,
            danger: true,
            action: () => closeWindow(data.windowId)
          }
        ]

      case 'desktop':
      default:
        return [
          {
            label: '刷新',
            icon: RefreshCw,
            action: () => window.location.reload()
          },
          { type: 'separator' },
          {
            label: '新建文件夹',
            icon: FolderPlus,
            action: () => addNotification({
              type: 'info',
              title: '提示',
              message: '新建文件夹功能尚未实现 (模拟)'
            })
          },
          {
            label: '更换壁纸',
            icon: Image,
            action: handleOpenSettings
          },
          {
            label: '排列方式',
            icon: Grid3X3,
            checked: snapToGrid,
            action: () => setSnapToGrid(!snapToGrid) // Reusing grid toggle as sort/align
          },
          { type: 'separator' },
          {
            label: '关于系统',
            icon: Info,
            action: () => addNotification({
              type: 'info',
              title: 'Portfolio OS v1.0',
              message: '一个基于 Web 技术的操作系统模拟界面。',
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
          transition={{ duration: 0.1 }}
          className="fixed z-[9999] min-w-[200px] bg-[var(--os-bg-panel)]/95 backdrop-blur-xl border border-[var(--os-border)] shadow-2xl rounded-xl py-1.5 overflow-hidden select-none"
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
