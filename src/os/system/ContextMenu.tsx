'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Monitor, Settings, Info, Grid3X3, Check, X, Minimize2, Maximize2, ArrowLeftToLine, ArrowRightToLine, ExternalLink, FolderPlus, Image, Trash2, FileEdit, Terminal, ArrowDownAZ, Palette, FileText, Minus, Download } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore, MenuType } from '@/os/kernel/useContextMenuStore'
import { useNotificationStore } from '@/os/kernel/useNotificationStore'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { useUIStore } from '@/os/kernel/useUIStore'
import { useDesktopStore } from '@/os/kernel/useDesktopStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import { findFreePosition, GRID_SIZE, GRID_PADDING } from '@/os/utils/grid'

export default function SystemContextMenu() {
  const { visible, position, type, data, hideMenu } = useContextMenuStore(useShallow(state => ({
    visible: state.visible,
    position: state.position,
    type: state.type,
    data: state.data,
    hideMenu: state.hideMenu
  })))
  const { addNotification } = useNotificationStore()
  const { organizeIcons, iconPositions, updateIconPosition } = useDesktopStore(useShallow(state => ({
    organizeIcons: state.organizeIcons,
    iconPositions: state.iconPositions,
    updateIconPosition: state.updateIconPosition
  })))
  const { createItem, deleteItem, getItem } = useFileSystemStore()
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)

  const { snapToGrid, setSnapToGrid, pinnedAppIds, pinApp, unpinApp, useAnimations, displayScale, setShowWeatherWidget } = useSystemSettings()
  const { openWindow, closeWindow, minimizeWindow, maximizeWindow, updateWindowPosition, updateWindowSize } = useWindowStore(useShallow(state => ({
    openWindow: state.openWindow,
    closeWindow: state.closeWindow, // Assuming closeWindow exists in WindowState, checking file...
    minimizeWindow: state.minimizeWindow, // Assuming minimizeWindow exists
    maximizeWindow: state.maximizeWindow,
    updateWindowPosition: state.updateWindowPosition,
    updateWindowSize: state.updateWindowSize
  })))

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

  const handleOpenSettings = (categoryId = 'display') => {
    const app = APPS_REGISTRY['settings']
    if (app) {
      openWindow(app.id, t('start.settings'), <app.component initialCategory={categoryId} />, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
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
                  const title = app.id === 'settings' ? t('start.settings') : t(`app.${app.id}`)
                  openWindow(app.id, title, <app.component />, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
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
            icon: Minus,
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

      case 'weather-widget':
        return [
          {
            label: t('menu.refresh') || 'Refresh',
            icon: RefreshCw,
            action: () => {
              if (data?.onRefresh) data.onRefresh()
              hideMenu()
            }
          },
          { type: 'separator' },
          {
            label: t('menu.close') || 'Close',
            icon: X,
            danger: true,
            action: () => {
              setShowWeatherWidget(false)
              hideMenu()
            }
          }
        ]

      case 'desktop-item':
        return [
          {
            label: t('menu.open'),
            icon: ExternalLink,
            action: () => {
              if (data?.appId) {
                const app = APPS_REGISTRY[data.appId]
                if (app) openWindow(app.id, t(`app.${app.id}`), <app.component />, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
              } else if (data?.id) {
                addNotification({ type: 'info', message: 'Double-click to open' })
              }
              hideMenu()
            }
          },
          {
            label: t('menu.rename'),
            icon: FileEdit,
            action: () => {
              hideMenu()
              if (data?.id) {
                useUIStore.getState().setRenamingId(data.id)
              }
            }
          },
          {
            label: t('menu.download'),
            icon: Download,
            action: () => {
              if (data?.id) {
                const file = useFileSystemStore.getState().getItem(data.id)
                if (file && file.type === 'file' && file.content) {
                  const blob = new Blob([file.content], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = file.name
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }
              }
              hideMenu()
            }
          },
          {
            label: t('menu.properties'),
            icon: FileText,
            action: () => {
              if (data?.id) {
                const file = useFileSystemStore.getState().getItem(data.id)
                if (file) {
                  addNotification({
                    type: 'info',
                    title: t('menu.properties'),
                    message: `${t('common.name')}: ${file.name}\n${t('common.type')}: ${file.type}\nID: ${file.id}`,
                    duration: 5000
                  })
                }
              }
              hideMenu()
            }
          },
          { type: 'separator' },
          {
            label: t('menu.delete'),
            icon: Trash2,
            danger: true,
            action: () => {
              if (data?.id) {
                // Fire and forget
                deleteItem(data.id).catch(console.error)
                addNotification({ type: 'success', message: 'Item deleted' })
              }
              hideMenu()
            }
          }
        ]

      case 'explorer-background':
        return [
          {
            label: t('menu.refresh'),
            icon: RefreshCw,
            action: () => {
              // In a real app, this might re-fetch. Here it's a no-op or just visual.
              hideMenu()
            }
          },
          { type: 'separator' },
          {
            label: t('menu.newfolder'),
            icon: FolderPlus,
            action: () => {
              if (data?.pathId) {
                createItem(data.pathId, 'New Folder', 'folder').catch(console.error)
              }
              hideMenu()
            }
          },
          {
            label: t('menu.openterminal'),
            icon: Terminal,
            action: () => {
              const app = APPS_REGISTRY['terminal']
              if (app) {
                // Pass initial path to terminal if supported
                // For now, just open terminal
                openWindow(app.id, t('app.terminal'), <app.component />, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
              }
              hideMenu()
            }
          },
          { type: 'separator' },
          {
            label: t('menu.properties'),
            icon: FileText,
            action: () => {
              if (data?.pathId) {
                const folder = getItem(data.pathId)
                if (folder) {
                  addNotification({
                    type: 'info',
                    title: t('menu.properties'),
                    message: `${t('common.name')}: ${folder.name}\n${t('common.type')}: ${folder.type}\nID: ${folder.id}`,
                    duration: 5000
                  })
                }
              }
              hideMenu()
            }
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
            action: () => {
              // Create item returns Promise<string> with the new ID
              createItem('desktop', 'New Folder', 'folder').then((id) => {
                // Calculate position based on where user clicked
                const scaleFactor = displayScale / 100
                const currentGridSize = GRID_SIZE * scaleFactor
                const currentGridPadding = GRID_PADDING * scaleFactor

                // Use the context menu position as the starting point
                const startX = position?.x || currentGridPadding
                const startY = position?.y || currentGridPadding

                const pos = findFreePosition(
                  startX,
                  startY,
                  id,
                  iconPositions,
                  currentGridSize,
                  currentGridPadding
                )

                updateIconPosition(id, pos)
              }).catch(console.error)

              hideMenu()
            }
          },
          {
            label: t('menu.openterminal'),
            icon: Terminal,
            action: () => {
              const app = APPS_REGISTRY['terminal']
              if (app) openWindow(app.id, t('app.terminal'), <app.component />, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
              hideMenu()
            }
          },
          { type: 'separator' },
          {
            label: t('menu.sort'),
            icon: ArrowDownAZ,
            action: () => {
              // Simple name sort re-organization
              const desktopItems = useFileSystemStore.getState().getChildren('desktop')
              // Sort by name
              desktopItems.sort((a, b) => a.name.localeCompare(b.name))

              const scaleFactor = displayScale / 100
              const currentGridSize = GRID_SIZE * scaleFactor
              const currentGridPadding = GRID_PADDING * scaleFactor
              const maxRows = Math.floor((window.innerHeight - 150) / currentGridSize)

              organizeIcons(desktopItems.map(i => i.id), maxRows, currentGridSize, currentGridPadding)
              hideMenu()
            }
          },
          {
            label: t('menu.align'),
            icon: Grid3X3,
            action: () => {
              // Re-calculate grid parameters (matching Desktop.tsx logic)
              const scaleFactor = displayScale / 100
              const currentGridSize = GRID_SIZE * scaleFactor
              const currentGridPadding = GRID_PADDING * scaleFactor

              const maxRows = Math.floor((window.innerHeight - 150) / currentGridSize)
              const desktopItems = useFileSystemStore.getState().getChildren('desktop')
              const itemIds = desktopItems.map(i => i.id)

              organizeIcons(itemIds, maxRows, currentGridSize, currentGridPadding)
              hideMenu()
            }
          },
          { type: 'separator' },
          {
            label: t('menu.personalize'),
            icon: Palette,
            action: () => handleOpenSettings('appearance')
          },
          {
            label: t('menu.displaysettings'),
            icon: Monitor,
            action: () => handleOpenSettings('display')
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
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /></svg>
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
          className="fixed z-[20000] min-w-[220px] bg-[#1e1e1e]/85 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl py-1.5 overflow-hidden select-none font-sans"
          style={getMenuStyle()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {menuItems.map((item, index) => {
            if (item.type === 'separator') {
              return <div key={index} className="h-px bg-white/10 my-1 mx-3" />
            }

            const Icon = item.icon

            return (
              <div className="px-1" key={index}>
                <button
                  onClick={() => {
                    if (item.action) item.action()
                    hideMenu()
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-[13px] font-medium transition-all rounded-lg group
                    ${item.danger
                      ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                      : 'text-gray-200 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {Icon && <Icon size={15} className={item.danger ? 'opacity-90' : "opacity-70 group-hover:opacity-100 transition-opacity"} />}
                    <span>{item.label}</span>
                  </div>
                  {(item as any).checked && <Check size={14} className="opacity-80" />}
                </button>
              </div>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
