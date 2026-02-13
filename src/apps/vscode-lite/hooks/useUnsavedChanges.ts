import { useEffect } from 'react'
import { useEditorStateV2 } from './useEditorStateV2'
import { useDialog } from './useDialog'

export const useUnsavedChanges = () => {
  const { getDirtyFiles } = useEditorStateV2()
  const dialog = useDialog()

  // 监听页面刷新/关闭
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const dirtyFiles = getDirtyFiles()
      if (dirtyFiles.length > 0) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [getDirtyFiles])

  // 关闭文件前确认
  const confirmCloseFile = async (fileId: string, fileName: string): Promise<boolean> => {
    const confirmed = await dialog.confirm(
      `Do you want to save the changes you made to ${fileName}?`,
      'Unsaved Changes'
    )
    return confirmed
  }

  return { confirmCloseFile }
}
