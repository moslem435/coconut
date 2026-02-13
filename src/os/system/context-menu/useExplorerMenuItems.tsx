import { useMemo } from 'react'
import { RefreshCw, FolderPlus, Terminal, FileText } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useNotificationStore } from '@/os/kernel/useNotificationStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import { ContextMenuData } from '@/os/kernel/useContextMenuStore'
import { MenuItem } from './types'

export function useExplorerMenuItems(
    visible: boolean,
    isVisibleType: boolean, // type === 'explorer-background'
    data: ContextMenuData,
    hideMenu: () => void
): MenuItem[] {
    const { t } = useLanguage()
    const { addNotification } = useNotificationStore()
    const { getItem, createItem } = useFileSystemStore()
    const { openWindow } = useWindowStore()

    return useMemo(() => {
        if (!visible || !isVisibleType) return []

        return [
            {
                label: t('menu.refresh'),
                icon: RefreshCw,
                action: () => {
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
                        openWindow(app.id, t('app.terminal'), app.id, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
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
    }, [visible, isVisibleType, data, t, addNotification, getItem, createItem, openWindow, hideMenu])
}
