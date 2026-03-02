/**
 * 桌面交互 Hook
 * 处理桌面图标的点击、双击、拖拽等交互
 */

import { useCallback, useState } from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import { AppManifest } from '@/os/registry/types'

export function useDesktopInteraction() {
  const [splashingApp, setSplashingApp] = useState<AppManifest | null>(null)
  const { openWindow, launchApp, focusWindow } = useWindowStore()

  /**
   * 处理图标双击
   */
  const handleDoubleClick = useCallback(async (
    item: FileNode,
    readFileContent: (id: string) => Promise<string>
  ) => {
    // 应用快捷方式
    if (item.appId) {
      const app = APPS_REGISTRY[item.appId]
      if (!app) return

      if (app.externalUrl) {
        window.open(app.externalUrl, '_blank')
        return
      }

      const isWindowOpen = useWindowStore.getState().windows[item.appId]?.isOpen
      if (isWindowOpen && !app.multiInstance) {
        focusWindow(item.appId)
        return
      }

      if (app.splashScreen) {
        setSplashingApp(app)
      } else {
        launchApp(
          app.id,
          app.title,
          app.id,
          app.icon,
          {
            ...app.defaultWindowOptions as any,
            isDefaultTitle: true,
            multiInstance: app.multiInstance
          }
        )
      }
      return
    }

    // 文件夹
    if (item.type === 'folder') {
      const fileExplorer = APPS_REGISTRY['file-explorer']
      if (fileExplorer) {
        launchApp(
          'file-explorer-' + item.id,
          item.name,
          fileExplorer.id,
          fileExplorer.icon,
          { ...fileExplorer.defaultWindowOptions, initialPath: item.id }
        )
      }
      return
    }

    // 文件
    if (item.type === 'file') {
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)
      const isWebApp = /\.web$/i.test(item.name)

      if (isImage) {
        const content = await readFileContent(item.id)

        launchApp(
          'preview-' + item.id,
          item.name,
          'image-viewer',
          undefined,
          { size: { width: 600, height: 400 }, src: content }
        )
      } else if (isWebApp) {
        try {
          const content = await readFileContent(item.id)
          const data = JSON.parse(content)
          if (data.url) {
            launchApp(
              'browser-' + item.id,
              data.name || item.name.replace('.web', ''),
              'browser',
              undefined, // Use default icon
              { url: data.url }
            )
          }
        } catch (e) {
          console.error('Failed to parse web app file', e)
        }
      } else {
        launchApp(
          'notepad-' + item.id,
          item.name,
          'notepad',
          undefined,
          { size: { width: 600, height: 450 }, fileId: item.id }
        )
      }
      return
    }
  }, [launchApp, focusWindow])

  /**
   * 处理 Splash 完成
   */
  const handleSplashComplete = useCallback(() => {
    if (splashingApp) {
      openWindow(
        splashingApp.id,
        splashingApp.title,
        splashingApp.id,
        splashingApp.icon,
        {
          ...splashingApp.defaultWindowOptions as any,
          isDefaultTitle: true
        }
      )
      setSplashingApp(null)
    }
  }, [splashingApp, openWindow])

  return {
    splashingApp,
    handleDoubleClick,
    handleSplashComplete
  }
}
