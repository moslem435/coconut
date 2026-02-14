import { useMemo, useState, useEffect } from 'react'
import { FileNode, useFileSystemStore } from '@/os/kernel/useFileSystemStore'
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

  const { readFileContent, getFileBlob } = useFileSystemStore()
  const [thumbnail, setThumbnail] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const ext = item.name.split('.').pop()?.toLowerCase()
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext || '')
    
    // Blob URL 清理函数
    let blobUrl: string | null = null;

    if (isImage) {
      // 优先尝试获取 Blob，避免 Base64 内存占用
      getFileBlob(item.id).then(blob => {
        if (!mounted) return;

        if (blob) {
          blobUrl = URL.createObjectURL(blob);
          setThumbnail(blobUrl);
        } else {
          // 回退到读取内容（可能已经是 Base64 或 URL）
          readFileContent(item.id).then(content => {
            if (mounted) {
              if (content.startsWith('http') || content.startsWith('data:')) {
                setThumbnail(content)
              } else {
                setThumbnail(null)
              }
            }
          }).catch(() => {
            if (mounted) setThumbnail(null)
          })
        }
      }).catch(() => {
         // Fallback if getFileBlob fails
          readFileContent(item.id).then(content => {
            if (mounted) {
              if (content.startsWith('http') || content.startsWith('data:')) {
                setThumbnail(content)
              } else {
                setThumbnail(null)
              }
            }
          }).catch(() => {
            if (mounted) setThumbnail(null)
          })
      })
    } else {
      setThumbnail(null)
    }

    return () => { 
      mounted = false 
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [item.id, item.name, readFileContent, getFileBlob])

  return { displayName, iconTheme, thumbnail }
}
