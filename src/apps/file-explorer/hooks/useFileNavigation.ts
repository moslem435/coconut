/**
 * 文件导航 Hook
 * 处理文件夹导航、历史记录、权限检查
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'

export function useFileNavigation(initialPath: string = 'root') {
  const [currentPathId, setCurrentPathId] = useState(initialPath)
  const [history, setHistory] = useState<string[]>([initialPath])
  const [historyIndex, setHistoryIndex] = useState(0)

  const { files } = useFileSystemStore()
  const { t } = useLanguage()

  // 使用 ref 缓存 files，避免 navigate 函数频繁重建
  const filesRef = useRef(files)
  useEffect(() => {
    filesRef.current = files
  }, [files])

  /**
   * 导航到指定文件夹
   */
  const navigate = useCallback(async (id: string) => {
    if (filesRef.current[id]?.type !== 'folder') return

    const targetPath = useFileSystemStore.getState().resolvePath(id)
    
    // 权限检查
    const needsPermission = await fs.verifyPermission(targetPath)
    if (!needsPermission) {
      const granted = await fs.requestPermission(targetPath)
      if (!granted) {
        useDialogStore.getState().openAlert(
          t('explorer.permission_denied') || 'Permission denied',
          'error'
        )
        return
      }
    }

    // 更新历史记录
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(id)
      return newHistory
    })
    setHistoryIndex(prev => prev + 1)

    setCurrentPathId(id)
  }, [historyIndex, t])

  /**
   * 后退
   */
  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const newPathId = history[newIndex]
      if (newPathId) {
        setHistoryIndex(newIndex)
        setCurrentPathId(newPathId)
      }
    }
  }, [history, historyIndex])

  /**
   * 前进
   */
  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const newPathId = history[newIndex]
      if (newPathId) {
        setHistoryIndex(newIndex)
        setCurrentPathId(newPathId)
      }
    }
  }, [history, historyIndex])

  /**
   * 向上一级
   */
  const goUp = useCallback(() => {
    const current = filesRef.current[currentPathId]
    if (current?.parentId) {
      navigate(current.parentId)
    }
  }, [currentPathId, navigate])

  return {
    currentPathId,
    history,
    historyIndex,
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < history.length - 1,
    canGoUp: !!files[currentPathId]?.parentId,
    navigate,
    goBack,
    goForward,
    goUp
  }
}
