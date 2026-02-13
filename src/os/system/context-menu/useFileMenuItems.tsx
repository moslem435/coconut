import { useMemo } from 'react'
import { ExternalLink, FileEdit, Download, FileText, Trash2 } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useNotificationStore } from '@/os/kernel/useNotificationStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useUIStore } from '@/os/kernel/useUIStore'
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
    const { addNotification } = useNotificationStore()
    const { getItem, readFileContent, deleteItem } = useFileSystemStore()
    const { setRenamingId } = useUIStore()
    const { openWindow } = useWindowStore()

    return useMemo<MenuItem[]>(() => {
        if (!visible || !isVisibleType) return []

        return [
            {
                label: t('menu.open'),
                icon: ExternalLink,
                action: () => {
                    if (data?.appId) {
                        const app = APPS_REGISTRY[data.appId]
                        if (app) openWindow(app.id, t(`app.${app.id}`), app.id, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
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
            {
                label: t('menu.properties'),
                icon: FileText,
                action: () => {
                    if (data?.id) {
                        const file = getItem(data.id)
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
                        deleteItem(data.id).catch(console.error)
                        addNotification({ type: 'success', message: 'Item deleted' })
                    }
                    hideMenu()
                }
            }
        ]
    }, [visible, isVisibleType, data, t, addNotification, getItem, readFileContent, deleteItem, setRenamingId, openWindow, hideMenu])
}
