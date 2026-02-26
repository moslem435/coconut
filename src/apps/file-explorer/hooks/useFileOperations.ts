/**
 * 文件操作 Hook
 * 处理复制、粘贴、删除、重命名等操作
 */

import { useCallback } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useClipboardStore } from '@/os/kernel/useClipboardStore'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { useLanguage } from '@/os/kernel/LanguageContext'

export function useFileOperations() {
  const { deleteItem, moveItem } = useFileSystemStore()
  const { clipboard, setClipboard, pasteItems } = useClipboardStore()
  const { openConfirm } = useDialogStore()
  const { t } = useLanguage()

  const handleCopy = useCallback((selectedIds: string[]) => {
    if (selectedIds.length > 0) {
      setClipboard(selectedIds, 'copy')
    }
  }, [setClipboard])

  const handleCut = useCallback((selectedIds: string[]) => {
    if (selectedIds.length > 0) {
      setClipboard(selectedIds, 'cut')
    }
  }, [setClipboard])

  const handlePaste = useCallback(async (targetFolderId: string) => {
    if (clipboard.items.length > 0) {
      try {
        await pasteItems(targetFolderId)
      } catch (error) {
        console.error('Paste failed:', error)
      }
    }
  }, [clipboard, pasteItems])

  const handleDelete = useCallback(async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return

    const confirmed = await openConfirm(
      t('file_explorer.delete_confirm_title'),
      t('file_explorer.delete_confirm_message', { count: selectedIds.length })
    )

    if (confirmed) {
      try {
        await Promise.all(selectedIds.map(id => deleteItem(id)))
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }, [deleteItem, openConfirm, t])

  const handleMove = useCallback(async (itemIds: string[], targetFolderId: string) => {
    try {
      await Promise.all(itemIds.map(id => moveItem(id, targetFolderId)))
    } catch (error) {
      console.error('Move failed:', error)
      throw error
    }
  }, [moveItem])

  return {
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    handleMove,
    clipboard
  }
}
