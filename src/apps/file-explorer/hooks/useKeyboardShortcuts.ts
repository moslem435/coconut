/**
 * 键盘快捷键 Hook
 * 处理文件管理器的键盘快捷键
 */

import { useEffect } from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'

export interface KeyboardShortcutHandlers {
  onSelectAll: () => void
  onDeselectAll: () => void
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: () => void
  onRename: () => void
  onRefresh: () => void
  onNewFolder: () => void
  onNavigateUp?: () => void
  onNavigateBack?: () => void
  onNavigateForward?: () => void
}

export function useKeyboardShortcuts(
  handlers: KeyboardShortcutHandlers,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的快捷键
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return
      }

      const isCtrl = e.ctrlKey || e.metaKey

      // Ctrl/Cmd + 快捷键
      if (isCtrl) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault()
            handlers.onSelectAll()
            break
          case 'd':
            e.preventDefault()
            handlers.onDeselectAll()
            break
          case 'c':
            e.preventDefault()
            handlers.onCopy()
            break
          case 'x':
            e.preventDefault()
            handlers.onCut()
            break
          case 'v':
            e.preventDefault()
            handlers.onPaste()
            break
          case 'r':
            e.preventDefault()
            handlers.onRefresh()
            break
        }
        return
      }

      // 单键快捷键
      switch (e.key) {
        case 'Delete':
          e.preventDefault()
          handlers.onDelete()
          break
        case 'F2':
          e.preventDefault()
          handlers.onRename()
          break
        case 'F5':
          e.preventDefault()
          handlers.onRefresh()
          break
        case 'Backspace':
          if (handlers.onNavigateUp) {
            e.preventDefault()
            handlers.onNavigateUp()
          }
          break
      }

      // Alt + 快捷键
      if (e.altKey) {
        switch (e.key) {
          case 'ArrowLeft':
            if (handlers.onNavigateBack) {
              e.preventDefault()
              handlers.onNavigateBack()
            }
            break
          case 'ArrowRight':
            if (handlers.onNavigateForward) {
              e.preventDefault()
              handlers.onNavigateForward()
            }
            break
          case 'ArrowUp':
            if (handlers.onNavigateUp) {
              e.preventDefault()
              handlers.onNavigateUp()
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers, enabled])
}
