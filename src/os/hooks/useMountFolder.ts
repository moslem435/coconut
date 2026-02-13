/**
 * 挂载文件夹 Hook
 * 处理本地文件夹挂载逻辑
 */

import { useCallback } from 'react'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'

export function useMountFolder() {
  /**
   * 挂载本地文件夹
   */
  const mountLocalFolder = useCallback(async () => {
    try {
      // 1. 请求用户选择文件夹
      // @ts-ignore - showDirectoryPicker missing in TS
      const handle = await window.showDirectoryPicker()

      // 2. 在文件系统客户端中挂载
      const mountPath = fs.mount(handle)
      const mountId = mountPath.split('/').pop()!

      // 3. 持久化挂载句柄
      const { NativeDriver } = await import('@/os/kernel/filesystem/NativeDriver')
      await NativeDriver.persistMount(mountId, handle)

      // 4. 添加到 Store 状态
      const mountNode: FileNode = {
        id: mountId,
        parentId: 'root',
        name: handle.name,
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        icon: 'hard-drive',
        isMount: true
      }

      useFileSystemStore.setState(state => ({
        files: { ...state.files, [mountId]: mountNode }
      }))

      return mountId
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to mount folder:', error)
        throw error
      }
      return null
    }
  }, [])

  /**
   * 卸载文件夹
   */
  const unmountFolder = useCallback(async (mountId: string) => {
    try {
      // 1. 从文件系统客户端卸载
      fs.unmount(`/mnt/${mountId}`)

      // 2. 删除持久化的句柄
      const { NativeDriver } = await import('@/os/kernel/filesystem/NativeDriver')
      await NativeDriver.removeMount(mountId)

      // 3. 从 Store 中移除
      useFileSystemStore.setState(state => {
        const { [mountId]: removed, ...remaining } = state.files
        return { files: remaining }
      })
    } catch (error) {
      console.error('Failed to unmount folder:', error)
      throw error
    }
  }, [])

  return {
    mountLocalFolder,
    unmountFolder
  }
}
