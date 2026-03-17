import { useMemo } from 'react'
import { ExternalLink, FileEdit, Download, FileText, Trash2, Copy, Scissors, Clipboard, FolderPlus, ImagePlus, Sparkles, Monitor, Star } from 'lucide-react'
import JSZip from 'jszip'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useUIStore } from '@/os/kernel/useUIStore'
import { useTrashStore } from '@/os/kernel/useTrashStore'
import { useClipboardStore } from '@/os/kernel/useClipboardStore'
import { useSystemSettingsStore } from '@/os/kernel/useSystemSettingsStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import { ContextMenuData } from '@/os/kernel/useContextMenuStore'
import { toast } from '@/os/components/Toast'
import { useLucideIconPickerStore } from '@/os/kernel/useLucideIconPickerStore'
import { useFavoritesStore } from '@/os/kernel/useFavoritesStore'
import { FILE_IDS } from '@/os/config/paths'

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
    const { pinnedIds, pinFavorite, unpinFavorite } = useFavoritesStore()

    return useMemo<MenuItem[]>(() => {
        if (!visible || !isVisibleType) return []

        const ids = data.selectedIds || (data.id ? [data.id] : [])
        const firstItem = ids.length === 1 ? getItem(ids[0]) : null
        const canFavoriteFolder = !!firstItem
            && ids.length === 1
            && firstItem.type === 'folder'
            && !firstItem.isSystem
            && firstItem.parentId !== FILE_IDS.TRASH
        const isPinnedFavorite = canFavoriteFolder ? pinnedIds.includes(firstItem.id) : false
        const favoriteMenuItem: MenuItem | null = canFavoriteFolder ? {
            label: isPinnedFavorite ? t('menu.favorites.remove') : t('menu.favorites.add'),
            icon: Star,
            action: () => {
                if (!firstItem) return
                if (isPinnedFavorite) {
                    unpinFavorite(firstItem.id)
                } else {
                    pinFavorite(firstItem.id)
                }
                hideMenu()
            }
        } : null

        // App Bundle Detection
        const isAppBundle = firstItem?.type === 'folder' && (firstItem.name.endsWith('.app') || (firstItem as any).isAppBundle)

        // Helper for ZIP download (reusable)
        const handleDownloadZip = async (ids: string[]) => {
            hideMenu()
            const items = ids.map((id: string) => getItem(id)).filter(Boolean)
            if (items.length === 0) return

            const zip = new JSZip()
            const toastId = toast.loading(t('menu.downloading'))

            try {
                const addFilesToZip = async (folderId: string, currentPath: string) => {
                    try { await loadFolderContent(folderId) } catch (e) { console.warn(`Failed to load content for folder ${folderId}`, e) }
                    const children = getChildren(folderId)
                    for (const child of children) {
                        if (child.type === 'folder') {
                            await addFilesToZip(child.id, `${currentPath}${child.name}/`)
                        } else {
                            try {
                                const blob = await getFileBlob(child.id)
                                if (blob) { zip.file(`${currentPath}${child.name}`, blob) }
                                else {
                                    const content = await readFileContent(child.id)
                                    if (content) zip.file(`${currentPath}${child.name}`, content)
                                }
                            } catch (e) { console.warn(`Failed to add file ${child.name} to zip`, e) }
                        }
                    }
                }

                for (const item of items) {
                    if (!item) continue
                    if (item.type === 'folder') {
                        try { await loadFolderContent(item.id) } catch (e) { console.warn(`Failed to load root folder ${item.name}`, e) }
                        await addFilesToZip(item.id, `${item.name}/`)
                    } else {
                        try {
                            const blob = await getFileBlob(item.id)
                            if (blob) { zip.file(item.name, blob) }
                            else {
                                const content = await readFileContent(item.id)
                                if (content) zip.file(item.name, content)
                            }
                        } catch (e) { console.warn(`Failed to add root file ${item.name} to zip`, e) }
                    }
                }

                const content = await zip.generateAsync({ type: 'blob' })
                const url = URL.createObjectURL(content)
                const a = document.createElement('a')
                a.href = url
                a.download = items.length === 1 ? `${items[0]?.name}.zip` : 'archive.zip'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                toast.dismiss(toastId)
            } catch (e) {
                console.error('Failed to download zip', e)
                toast.dismiss(toastId)
                toast.error(t('menu.download.error'), 'Failed to create zip archive')
            }
        }

        if (isAppBundle && firstItem) {
            return [
                {
                    label: t('menu.open'),
                    icon: ExternalLink,
                    action: () => {
                        const explorerApp = APPS_REGISTRY['file-explorer']
                        if (explorerApp) {
                            openWindow(
                                `${explorerApp.id}-${Date.now()}`,
                                firstItem.name,
                                explorerApp.id,
                                explorerApp.icon,
                                { ...explorerApp.defaultWindowOptions, initialPath: firstItem.id }
                            )
                        }
                        hideMenu()
                    }
                },
                {
                    label: 'Show Package Contents',
                    icon: FolderPlus,
                    action: () => {
                        const explorerApp = APPS_REGISTRY['file-explorer']
                        if (explorerApp) {
                            openWindow(
                                `${explorerApp.id}-${Date.now()}`,
                                firstItem.name,
                                explorerApp.id,
                                explorerApp.icon,
                                { ...explorerApp.defaultWindowOptions, initialPath: firstItem.id }
                            )
                        }
                        hideMenu()
                    }
                },
                ...(favoriteMenuItem ? [favoriteMenuItem] : []),
                { type: 'separator' },
                {
                    label: t('menu.download'),
                    icon: Download,
                    action: () => handleDownloadZip([firstItem.id])
                },
                {
                    label: t('menu.rename'),
                    icon: FileEdit,
                    action: () => {
                        setRenamingId(firstItem.id)
                        hideMenu()
                    }
                },
                {
                    label: t('menu.changeIcon'),
                    icon: ImagePlus,
                    action: () => {
                        hideMenu()
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/svg+xml,image/png'
                        input.onchange = async () => {
                            const file = input.files?.[0]
                            if (!file) return
                            const fsStore = useFileSystemStore.getState()
                            const children = fsStore.getChildren(firstItem.id)
                            const pkg = children.find(c => c.name === 'package.json')
                            if (!pkg) {
                                toast.error(t('menu.changeIcon'), 'package.json not found')
                                return
                            }

                            const isPng = file.type === 'image/png' || /\.png$/i.test(file.name)
                            const iconName = isPng ? 'icon.png' : 'icon.svg'
                            const existingIcon = children.find(c => c.name === iconName)
                            const content = isPng ? new Uint8Array(await file.arrayBuffer()) : await file.text()

                            try {
                                if (existingIcon) {
                                    fsStore.updateFileContent(existingIcon.id, content, { source: 'ui' })
                                } else {
                                    await fsStore.createItem(firstItem.id, iconName, 'file', content, undefined, { source: 'ui' })
                                }

                                const pkgText = await fsStore.readFileContent(pkg.id)
                                const json = JSON.parse(pkgText || '{}')
                                json.cocount = { ...(json.cocount || {}), icon: `./${iconName}` }
                                fsStore.updateFileContent(pkg.id, JSON.stringify(json, null, 2), { source: 'ui' })
                                toast.success(t('menu.changeIcon'))
                            } catch (e: any) {
                                toast.error(t('menu.changeIcon'), e?.message || String(e))
                            }
                        }
                        input.click()
                    }
                },
                {
                    label: t('menu.changeIcon.lucide'),
                    icon: Sparkles,
                    action: () => {
                        hideMenu()
                        void (async () => {
                            const fsStore = useFileSystemStore.getState()
                            const children = fsStore.getChildren(firstItem.id)
                            const pkg = children.find(c => c.name === 'package.json')
                            if (!pkg) {
                                toast.error(t('menu.changeIcon.lucide'), 'package.json not found')
                                return
                            }
                            const pkgText = await fsStore.readFileContent(pkg.id)
                            const json = JSON.parse(pkgText || '{}')
                            const currentIcon = typeof json?.cocount?.icon === 'string' ? json.cocount.icon : ''
                            const initial = currentIcon.startsWith('lucide:') ? currentIcon.replace(/^lucide:/i, '') : ''
                            const picked = await useLucideIconPickerStore.getState().open({ title: t('menu.changeIcon.lucide'), initial })
                            if (!picked) return
                            json.cocount = { ...(json.cocount || {}), icon: `lucide:${picked}` }
                            fsStore.updateFileContent(pkg.id, JSON.stringify(json, null, 2), { source: 'ui' })
                        })()
                    }
                },
                {
                    label: t('menu.delete'),
                    icon: Trash2,
                    danger: true,
                    action: () => {
                        trashItems([firstItem.id])
                        hideMenu()
                    }
                }
            ]
        }

        const isProtected = () => {
            if (!data) return false
            // const ids = data.selectedIds || (data.id ? [data.id] : []) // Already calculated above
            return ids.some((id: string) => {
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
                    } else if (firstItem?.type === 'folder') {
                        // Fallback for folder opening if not appId
                        const explorerApp = APPS_REGISTRY['file-explorer']
                        if (explorerApp) {
                            openWindow(
                                `${explorerApp.id}-${Date.now()}`,
                                firstItem.name,
                                explorerApp.id,
                                explorerApp.icon,
                                { ...explorerApp.defaultWindowOptions, initialPath: firstItem.id }
                            )
                        }
                    }
                    hideMenu()
                }
            },
            ...(favoriteMenuItem ? [favoriteMenuItem] : []),
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
                    const items = ids.map((id: string) => getItem(id)).filter(Boolean)
                    const hasFolder = items.some((item: any) => item?.type === 'folder')
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

        // Image Wallpaper Logic
        if (firstItem?.type === 'file' && /\.(png|jpg|jpeg|webp|gif)$/i.test(firstItem.name)) {
            menuItems.splice(1, 0, {
                label: t('menu.setAsWallpaper'),
                icon: Monitor,
                action: async () => {
                    hideMenu()
                    const toastId = toast.loading(t('menu.setAsWallpaper'))
                    try {
                        const blob = await getFileBlob(firstItem.id)
                        if (!blob) throw new Error('Failed to read image')

                        // Convert to base64 for persistence
                        const reader = new FileReader()
                        reader.onloadend = () => {
                            const base64 = reader.result as string
                            useSystemSettingsStore.getState().setWallpaper({
                                type: 'image',
                                value: base64
                            })
                            toast.dismiss(toastId)
                            toast.success(t('menu.setAsWallpaper'))
                        }
                        reader.onerror = () => {
                            throw new Error('Failed to read file')
                        }
                        reader.readAsDataURL(blob)
                    } catch (e) {
                        console.error('Failed to set wallpaper', e)
                        toast.dismiss(toastId)
                        toast.error(t('menu.setAsWallpaper'), 'Failed to set wallpaper')
                    }
                }
            })
        }

        return menuItems
    }, [visible, isVisibleType, data, t, getItem, readFileContent, deleteItem, setRenamingId, openWindow, hideMenu, trashItems, setClipboard, pinnedIds, pinFavorite, unpinFavorite])
}
