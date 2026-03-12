/**
 * 文件操作 Hook
 * 处理复制、粘贴、删除、重命名等操作
 */

import React, { useCallback } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useClipboardStore } from '@/os/kernel/useClipboardStore'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { toast } from '@/os/components/Toast'

export function useFileOperations() {
  const { deleteItem, deleteItems, moveItem, files } = useFileSystemStore()
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

  // Ref 记录当前的临时删除 timeout
  const pendingDeleteTimeouts = React.useRef<{ [toastId: string]: NodeJS.Timeout }>({})

  const handleDelete = useCallback((selectedIds: string[]) => {
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

    // 1. 软删除/预备删除 (将文件从当前视图先移走，暂时移入回收站)
    // 假设正常删除逻辑是将文件移入 trash，我们先进行一次乐观更新或暂存
    const trashId = 'trash'
    const originalParents = selectedIds.reduce((acc, id) => {
      acc[id] = files[id]?.parentId
      return acc
    }, {} as Record<string, string | null | undefined>)

    // 这里执行实名移动（把它送进回收站）
    selectedIds.forEach(id => moveItem(id, trashId))

    // 2. 抛出有撤销动作的 Toast
    const toastId = toast.custom({
      type: 'success',
      title: '已移至回收站',
      message: `${selectedIds.length} 个项目`,
      duration: 6000,
      action: {
        label: '撤回',
        onClick: () => {
          // 撤销操作：把它从回收站移回原来的目录
          if (pendingDeleteTimeouts.current[toastId]) {
            clearTimeout(pendingDeleteTimeouts.current[toastId])
            delete pendingDeleteTimeouts.current[toastId]
          }

          selectedIds.forEach(id => {
            if (originalParents[id]) {
              moveItem(id, originalParents[id] as string)
            }
          })
        }
      }
    })
  }, [moveItem, openConfirm, files, t])

  /**
   * 批量删除 (无撤销，直接删除)
   * 适用于清空回收站或批量删除大量文件
   */
  const handleDeleteBatch = useCallback(async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return

    // Check if any selected item is a system folder
    const systemItems = selectedIds.filter(id => files[id]?.isSystem)
    if (systemItems.length > 0) {
       toast.error('Cannot Delete', 'Contains system items.')
       return
    }

    try {
        await deleteItems(selectedIds)
        toast.success('Deleted', `${selectedIds.length} items deleted`)
    } catch (e) {
        toast.error('Delete Failed', String(e))
    }
  }, [deleteItems, files])

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
    handleDeleteBatch,
    handleMove,
    clipboard
  }
}
