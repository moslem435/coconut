/**
 * 文件操作 Hook
 * 处理复制、粘贴、删除、重命名等操作
 */

import { useCallback } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useClipboardStore } from '@/os/kernel/useClipboardStore'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { toast } from '@/os/components/Toast'

export function useFileOperations() {
  const { deleteItem, moveItem, files } = useFileSystemStore()
  const { clipboard, setClipboard, pasteItems } = useClipboardStore()
  const { openConfirm, openAlert } = useDialogStore()
  const { t } = useLanguage()

  const handleCopy = useCallback((selectedIds: string[]) => {
    if (selectedIds.length > 0) {
      setClipboard(selectedIds, 'copy')
      toast.success('Copied', `${selectedIds.length} item(s) copied to clipboard`)
    }
  }, [setClipboard])

  const handleCut = useCallback((selectedIds: string[]) => {
    if (selectedIds.length > 0) {
      // Check if any selected item is a system folder
      const hasSystemItem = selectedIds.some(id => files[id]?.isSystem)
      if (hasSystemItem) {
        toast.warning(
          'Operation Denied',
          'Cannot cut system folders.'
        )
        return
      }
      setClipboard(selectedIds, 'cut')
      toast.success('Cut', `${selectedIds.length} item(s) ready to move`)
    }
  }, [setClipboard, files])

  const handlePaste = useCallback(async (targetFolderId: string) => {
    if (clipboard.items.length > 0) {
      try {
        await pasteItems(targetFolderId)
        toast.success('Pasted', `${clipboard.items.length} item(s) pasted successfully`)
      } catch (error) {
        console.error('Paste failed:', error)
        toast.error('Paste Failed', String(error))
      }
    }
  }, [clipboard, pasteItems])

  const handleDelete = useCallback(async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return

    // Check if any selected item is a system folder
    const systemItems = selectedIds.filter(id => files[id]?.isSystem)
    if (systemItems.length > 0) {
      toast.error(
        'Cannot Delete System Folders',
        'System folders are protected and cannot be deleted.'
      )
      return
    }

    const confirmed = await openConfirm(
      t('file_explorer.delete_confirm_title'),
      t('file_explorer.delete_confirm_message', { count: selectedIds.length })
    )

    if (confirmed) {
      try {
        await Promise.all(selectedIds.map(id => deleteItem(id)))
        toast.success('Deleted', `${selectedIds.length} item(s) deleted successfully`)
      } catch (error) {
        console.error('Delete failed:', error)
        toast.error('Delete Failed', String(error))
      }
    }
  }, [deleteItem, openConfirm, files, t])

  const handleMove = useCallback(async (itemIds: string[], targetFolderId: string) => {
    // Check if any item is a system folder
    const hasSystemItem = itemIds.some(id => files[id]?.isSystem)
    if (hasSystemItem) {
      toast.warning(
        'Cannot Move System Folders',
        'System folders are protected and cannot be moved.'
      )
      return
    }

    try {
      await Promise.all(itemIds.map(id => moveItem(id, targetFolderId)))
      toast.success('Moved', `${itemIds.length} item(s) moved successfully`)
    } catch (error) {
      console.error('Move failed:', error)
      toast.error('Move Failed', String(error))
      throw error
    }
  }, [moveItem, files])

  return {
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    handleMove,
    clipboard
  }
}
