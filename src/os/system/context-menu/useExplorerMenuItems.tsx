import { useMemo } from 'react'
import { RefreshCw, FolderPlus, Terminal, FileText } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
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
            }
        ]
    }, [visible, isVisibleType, data, t, getItem, createItem, openWindow, hideMenu])
}
