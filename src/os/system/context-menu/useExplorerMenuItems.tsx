import { useMemo } from 'react'
import { RefreshCw, FolderPlus, Terminal, FileText, Clipboard, FilePlus } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useClipboardStore } from '@/os/kernel/useClipboardStore'
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
    const { clipboard, pasteItems } = useClipboardStore()

    return useMemo(() => {
        if (!visible || !isVisibleType) return []

        const menuItems: MenuItem[] = [
            {
                label: t('menu.refresh'),
                icon: RefreshCw,
                action: () => {
                    hideMenu()
                }
            },
            { type: 'separator' },
            {
                label: t('menu.paste'),
                icon: Clipboard,
                disabled: clipboard.items.length === 0,
                action: async () => {
                    if (data?.pathId) {
                        await pasteItems(data.pathId)
                    }
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
                label: t('menu.newfile'),
                icon: FilePlus,
                action: () => {
                    if (data?.pathId) {
                        createItem(data.pathId, 'New Text Document.txt', 'file', '').catch(console.error)
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

        return menuItems
    }, [visible, isVisibleType, data, t, getItem, createItem, openWindow, hideMenu, clipboard, pasteItems])
}
