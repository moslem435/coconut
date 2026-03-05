import { useMemo } from 'react'
import { ExternalLink, FileEdit, Download, FileText, Trash2, Copy, Scissors, Clipboard } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useUIStore } from '@/os/kernel/useUIStore'
import { useTrashStore } from '@/os/kernel/useTrashStore'
import { useClipboardStore } from '@/os/kernel/useClipboardStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import { ContextMenuData } from '@/os/kernel/useContextMenuStore'

interface MenuItem {
    label?: string
    icon?: any
    action?: () => void
    danger?: boolean
    disabled?: boolean
    checked?: boolean
    type?: 'separator'
}

export function useFileMenuItems(
    visible: boolean,
    isVisibleType: boolean, // type === 'desktop-item'
    data: ContextMenuData,
    hideMenu: () => void
): MenuItem[] {
    const { t } = useLanguage()
    const { getItem, readFileContent, deleteItem } = useFileSystemStore()
    const { setRenamingId } = useUIStore()
    const { openWindow } = useWindowStore()
    const { trashItems } = useTrashStore()
    const { setClipboard } = useClipboardStore()

    return useMemo<MenuItem[]>(() => {
        if (!visible || !isVisibleType) return []

        const isProtected = () => {
            if (!data) return false
            const ids = data.selectedIds || (data.id ? [data.id] : [])
            return ids.some(id => {
                const item = getItem(id)
                return item?.isSystem || item?.isReadOnly
            })
        }

        const menuItems: MenuItem[] = [
            {
                label: t('menu.open'),
                icon: ExternalLink,
                action: () => {
                    if (data?.appId) {
                        const app = APPS_REGISTRY[data.appId]
                        if (app) openWindow(app.id, t(`app.${app.id}`), app.id, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
                    }
                    hideMenu()
                }
            },
            { type: 'separator' },
            {
                label: t('menu.copy'),
                icon: Copy,
                action: () => {
                    const ids = data?.selectedIds || (data?.id ? [data.id] : [])
                    if (ids.length > 0) {
                        setClipboard(ids, 'copy')
                    }
                    hideMenu()
                }
            },
            {
                label: t('menu.cut'),
                icon: Scissors,
                disabled: isProtected(),
                action: () => {
                    const ids = data?.selectedIds || (data?.id ? [data.id] : [])
                    if (ids.length > 0) {
                        setClipboard(ids, 'cut')
                    }
                    hideMenu()
                }
            },
            { type: 'separator' },
            {
                label: t('menu.rename'),
                icon: FileEdit,
                disabled: isProtected(),
                action: () => {
                    hideMenu()
                    if (data?.id) {
                        setRenamingId(data.id)
                    }
                }
            },
            {
                label: t('menu.download'),
                icon: Download,
                action: async () => {
                    hideMenu()
                    if (data?.id) {
                        const file = getItem(data.id)
                        if (file && file.type === 'file') {
                            try {
                                const content = await readFileContent(data.id)
                                const blob = new Blob([content], { type: 'text/plain' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = file.name
                                document.body.appendChild(a)
                                a.click()
                                document.body.removeChild(a)
                                URL.revokeObjectURL(url)
                            } catch (e) {
                                console.error('Failed to download file', e)
                            }
                        }
                    }
                }
            },
            { type: 'separator' }
        ]

        if (!isProtected()) {
            menuItems.push({
                label: t('menu.delete'),
                icon: Trash2,
                danger: true,
                action: () => {
                    hideMenu()
                    const ids = data?.selectedIds || (data?.id ? [data.id] : [])
                    if (ids.length > 0) {
                        // 移至回收站而不是直接删除
                        trashItems(ids)
                    }
                }
            })
        }

        return menuItems
    }, [visible, isVisibleType, data, t, getItem, readFileContent, deleteItem, setRenamingId, openWindow, hideMenu, trashItems, setClipboard])
}
