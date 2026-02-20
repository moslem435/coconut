import { useMemo } from 'react'
import { RefreshCw, FolderPlus, Terminal, ArrowDownAZ, Grid3X3, Palette, Monitor, Info } from 'lucide-react'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useDesktopStore } from '@/os/kernel/useDesktopStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import { findFreePosition, GRID_SIZE, GRID_PADDING } from '@/os/utils/grid'
import { ContextMenuData, Position } from '@/os/kernel/useContextMenuStore'
import { MenuItem } from './types'

export function useDesktopMenuItems(
    visible: boolean,
    isVisibleType: boolean, // type === 'desktop'
    position: Position,
    hideMenu: () => void
): MenuItem[] {
    const { t } = useLanguage()
    const { displayScale } = useSystemSettings()
    const { createItem, getChildren } = useFileSystemStore()
    const { organizeIcons, iconPositions, updateIconPosition } = useDesktopStore()
    const { openWindow } = useWindowStore()

    return useMemo(() => {
        if (!visible || !isVisibleType) return []

        const handleOpenSettings = (categoryId = 'display') => {
            const app = APPS_REGISTRY['settings']
            if (app) {
                openWindow(app.id, t('start.settings'), app.id, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true, initialCategory: categoryId })
            }
            hideMenu()
        }

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
                    createItem('desktop', 'New Folder', 'folder').then((id) => {
                        const scaleFactor = displayScale / 100
                        const currentGridSize = GRID_SIZE * scaleFactor
                        const currentGridPadding = GRID_PADDING * scaleFactor

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
                    if (app) openWindow(app.id, t('app.terminal'), app.id, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
                    hideMenu()
                }
            },
            { type: 'separator' },
            {
                label: t('menu.sort'),
                icon: ArrowDownAZ,
                action: () => {
                    const desktopItems = getChildren('desktop')
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
                    const scaleFactor = displayScale / 100
                    const currentGridSize = GRID_SIZE * scaleFactor
                    const currentGridPadding = GRID_PADDING * scaleFactor

                    const maxRows = Math.floor((window.innerHeight - 150) / currentGridSize)
                    const desktopItems = getChildren('desktop')
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
            }
        ]
    }, [visible, isVisibleType, t, displayScale, position, iconPositions, createItem, getChildren, organizeIcons, updateIconPosition, openWindow, hideMenu])
}
