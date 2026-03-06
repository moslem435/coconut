import { useMemo } from 'react'
import { ExternalLink, FileEdit, Download, FileText, Trash2, Copy, Scissors, Clipboard } from 'lucide-react'
import JSZip from 'jszip'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useUIStore } from '@/os/kernel/useUIStore'
import { useTrashStore } from '@/os/kernel/useTrashStore'
import { useClipboardStore } from '@/os/kernel/useClipboardStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import { ContextMenuData } from '@/os/kernel/useContextMenuStore'
import { toast } from '@/os/components/Toast'

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
    const { getItem, readFileContent, deleteItem, getChildren, getFileBlob, loadFolderContent } = useFileSystemStore()
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
                label: data?.selectedIds?.length && data.selectedIds.length > 1 
                    ? t('menu.download.zip') 
                    : (data?.id && getItem(data.id)?.type === 'folder' ? t('menu.download.zip') : t('menu.download')),
                icon: Download,
                action: async () => {
                    hideMenu()
                    
                    const ids = data?.selectedIds || (data?.id ? [data.id] : [])
                    if (ids.length === 0) return

                    // Check if we need to zip (folder or multiple files)
                    const items = ids.map(id => getItem(id)).filter(Boolean)
                    const hasFolder = items.some(item => item?.type === 'folder')
                    const isMultiple = items.length > 1
                    
                    if (hasFolder || isMultiple) {
                        const zip = new JSZip()
                        const toastId = toast.loading(t('menu.downloading'))
                        
                        try {
                            // Recursive function to add files to zip
                            const addFilesToZip = async (folderId: string, currentPath: string) => {
                                // 1. Ensure folder content is loaded into memory store
                                try {
                                    await loadFolderContent(folderId)
                                } catch (e) {
                                    console.warn(`Failed to load content for folder ${folderId}`, e)
                                }

                                // 2. Get children from store
                                const children = getChildren(folderId)
                                
                                for (const child of children) {
                                    if (child.type === 'folder') {
                                        await addFilesToZip(child.id, `${currentPath}${child.name}/`)
                                    } else {
                                        // Try to get blob first for binary support
                                        try {
                                            const blob = await getFileBlob(child.id)
                                            if (blob) {
                                                zip.file(`${currentPath}${child.name}`, blob)
                                            } else {
                                                const content = await readFileContent(child.id)
                                                if (content) {
                                                    zip.file(`${currentPath}${child.name}`, content)
                                                }
                                            }
                                        } catch (e) {
                                            console.warn(`Failed to add file ${child.name} to zip`, e)
                                        }
                                    }
                                }
                            }

                            // Process selected items
                            for (const item of items) {
                                if (!item) continue
                                
                                if (item.type === 'folder') {
                                    // Root items also need to be loaded first
                                    try {
                                        await loadFolderContent(item.id)
                                    } catch (e) {
                                        console.warn(`Failed to load root folder ${item.name}`, e)
                                    }
                                    await addFilesToZip(item.id, `${item.name}/`)
                                } else {
                                    try {
                                        const blob = await getFileBlob(item.id)
                                        if (blob) {
                                            zip.file(item.name, blob)
                                        } else {
                                            const content = await readFileContent(item.id)
                                            if (content) {
                                                zip.file(item.name, content)
                                            }
                                        }
                                    } catch (e) {
                                        console.warn(`Failed to add root file ${item.name} to zip`, e)
                                    }
                                }
                            }

                            const content = await zip.generateAsync({ type: 'blob' })
                            const url = URL.createObjectURL(content)
                            const a = document.createElement('a')
                            a.href = url
                            // Use the first item name + .zip or "archive.zip"
                            a.download = items.length === 1 ? `${items[0]?.name}.zip` : 'archive.zip'
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                            URL.revokeObjectURL(url)
                            
                            toast.dismiss(toastId)
                            // toast.success(t('menu.download'), 'Download started')
                        } catch (e) {
                            console.error('Failed to download zip', e)
                            toast.dismiss(toastId)
                            toast.error(t('menu.download.error'), 'Failed to create zip archive')
                        }
                    } else {
                        // Single file download (existing logic)
                        const file = items[0]
                        if (file && file.type === 'file') {
                            try {
                                const blob = await getFileBlob(file.id)
                                let url: string
                                
                                if (blob) {
                                    url = URL.createObjectURL(blob)
                                } else {
                                    const content = await readFileContent(file.id)
                                    const textBlob = new Blob([content], { type: 'text/plain' })
                                    url = URL.createObjectURL(textBlob)
                                }
                                
                                const a = document.createElement('a')
                                a.href = url
                                a.download = file.name
                                document.body.appendChild(a)
                                a.click()
                                document.body.removeChild(a)
                                URL.revokeObjectURL(url)
                            } catch (e) {
                                console.error('Failed to download file', e)
                                toast.error(t('menu.download.error'))
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
