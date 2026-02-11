import { useMemo } from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { getFileIconAndTheme } from '@/apps/file-explorer/utils/fileIcons'

export function useFileDisplay(item: FileNode) {
  const { t } = useLanguage()

  const displayName = useMemo(() => {
    // 1. App Shortcut
    if (item.appId) return t(`app.${item.appId}`)

    // 2. System Folders / Special IDs
    if (item.id === 'recycle-bin' || item.id === 'trash') return t('app.recycle-bin')
    if (['root', 'desktop', 'documents', 'pictures', 'downloads', 'music', 'code'].includes(item.id)) {
      return t(`explorer.${item.id}`)
    }

    // 3. Everything else: use the real file name
    return item.name
  }, [item.id, item.name, item.appId, t])

  const iconTheme = useMemo(() => {
    return getFileIconAndTheme(item)
  }, [item])

  const thumbnail = useMemo(() => {
    const ext = item.name.split('.').pop()?.toLowerCase()
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext || '')
    if (isImage && item.content && (item.content.startsWith('http') || item.content.startsWith('data:'))) {
        return item.content
    }
    return null
 }, [item.name, item.content])

  return { displayName, iconTheme, thumbnail }
}
