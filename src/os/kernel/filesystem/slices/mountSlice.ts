/**
 * MountSlice - 文件系统挂载管理层
 * 职责：管理本地文件夹挂载和加载
 */

import type { StateCreator } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { CoreSlice } from './coreSlice'
import type { FileNode } from '../../initialFileTree'
import { INITIAL_FILES, INITIAL_ROOT_ID } from '../../initialFileTree'
import { fs } from '../FileSystemClient'
import { syncService } from '@/os/services/FileSystemSyncService'
import { syncService as initialSyncService } from '../../syncService'
import { logger } from '@/os/utils/logger'
import { fileSystemWorker } from '../utils/fileSystemWorkerClient'

// 文件数阈值：超过此数量使用 Worker
const WORKER_THRESHOLD = 100

export interface MountSlice {
  // 挂载操作
  mountLocalFolder: () => Promise<void>
  loadFolderContent: (folderId: string) => Promise<void>
  checkMountPermissions: () => Promise<void>
  initialize: () => Promise<void>
}

export const createMountSlice: StateCreator<
  CoreSlice & MountSlice,
  [],
  [],
  MountSlice
> = (set, get) => ({
  mountLocalFolder: async () => {
    try {
      // @ts-ignore - showDirectoryPicker missing in TS
      const handle = await window.showDirectoryPicker()

      // 1. Mount in FS Client
      const mountPath = fs.mount(handle)
      const mountId = mountPath.split('/').pop()!

      // 2. Persist Handle
      const { NativeDriver } = await import('../NativeDriver')
      await NativeDriver.persistMount(mountId, handle)

      // 3. Add to Store State
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

      get()._addFile(mountNode)
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        logger.error('Failed to mount folder:', error)
      }
    }
  },

  loadFolderContent: async (folderId) => {
    const folder = get().files[folderId]
    if (!folder || folder.type !== 'folder') return

    const state = get()
    const fullPath = state.resolvePath(folderId)
    logger.debug(`[loadFolderContent] Loading content for ${folderId}, path: ${fullPath}`)
    
    if (!fullPath || !fullPath.startsWith('/mnt/')) {
      logger.debug(`[loadFolderContent] Skipping non-mount path: ${fullPath}`)
      return
    }

    try {
      logger.debug(`[loadFolderContent] Calling syncService.readDirectory(${fullPath})`)
      const childrenNames = await syncService.readDirectory(fullPath)
      logger.debug(`[loadFolderContent] readDirectory returned:`, childrenNames)

      // 获取当前子节点
      const currentChildren = Object.values(get().files).filter(f => f.parentId === folderId)
      
      // 动态判断是否使用 Worker
      const useWorker = childrenNames.length > WORKER_THRESHOLD
      logger.debug(`[loadFolderContent] File count: ${childrenNames.length}, using Worker: ${useWorker}`)

      if (useWorker) {
        // 使用 Worker 计算 Diff
        await loadFolderContentWithWorker(folderId, fullPath, childrenNames, currentChildren, get)
      } else {
        // 直接计算（小文件夹）
        await loadFolderContentSync(folderId, fullPath, childrenNames, currentChildren, get)
      }
    } catch (e) {
      logger.error("Failed to load folder content:", e)
    }
  },

  checkMountPermissions: async () => {
    const state = get()
    const mounts = Object.values(state.files).filter(f => f.isMount)

    for (const mount of mounts) {
      const path = state.resolvePath(mount.id)
      try {
        const hasPerm = await fs.verifyPermission(path)

        if (mount.needsPermission === hasPerm) {
          const mountNode = get().files[mount.id]
          if (mountNode) {
            get()._updateFile(mount.id, { needsPermission: !hasPerm })
          }
        }
      } catch (e) {
        logger.warn('Failed to check permission for mount:', mount.id)
      }
    }
  },

  initialize: async () => {
    try {
      // @ts-ignore - syncToOPFS expects full store
      await initialSyncService.syncToOPFS(get(), set)

      const { NativeDriver } = await import('../NativeDriver')
      const mounts = await NativeDriver.restoreMounts()

      mounts.forEach((handle, id) => {
        fs.mount(handle, id)

        const newNode: FileNode = {
          id: id,
          parentId: 'root',
          name: handle.name,
          type: 'folder',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          icon: 'hard-drive',
          isMount: true
        }

        const existing = get().files[id]
        if (!existing) {
          get()._addFile(newNode)
        }
      })

      // Ensure System Shortcuts exist
      const newFiles = { ...get().files }
      let hasChanges = false

      Object.entries(INITIAL_FILES).forEach(([id, node]) => {
        if ((id.startsWith('shortcut-') || node.parentId === 'desktop') && !newFiles[id]) {
          newFiles[id] = node
          hasChanges = true
        }
      })

      if (hasChanges) {
        get()._setFiles(newFiles)
      }

      get().checkMountPermissions()
    } catch (e) {
      logger.error('Failed to restore mounts:', e)
    } finally {
      get()._setLoading(false)
    }
  }
})


/**
 * 使用 Worker 加载大文件夹内容
 */
async function loadFolderContentWithWorker(
  folderId: string,
  fullPath: string,
  childrenNames: string[],
  currentChildren: FileNode[],
  get: any
) {
  logger.debug(`[loadFolderContentWithWorker] Processing ${childrenNames.length} files`)
  
  // 1. 获取所有文件的 stats
  const statPromises = childrenNames.map(async (name) => {
    const childPath = fullPath.endsWith('/') ? `${fullPath}${name}` : `${fullPath}/${name}`
    try {
      const stats = await syncService.getStats(childPath)
      return {
        name,
        isDirectory: stats.isDirectory,
        mtime: stats.mtime,
        size: stats.size
      }
    } catch (e) {
      logger.warn(`Failed to stat ${childPath}`, e)
      return null
    }
  })
  
  const fsSnapshot = (await Promise.all(statPromises)).filter(Boolean) as Array<{
    name: string
    isDirectory: boolean
    mtime: number
    size?: number
  }>
  
  // 2. 使用 Worker 计算 Diff
  try {
    const patch = await fileSystemWorker.computeDiff({
      currentFiles: currentChildren,
      fsSnapshot,
      folderId,
      fullPath
    })
    
    logger.debug(`[loadFolderContentWithWorker] Patch: +${patch.toAdd.length} -${patch.toRemove.length} ~${patch.toUpdate.length}`)
    
    // 3. 应用 Patch
    if (patch.toAdd.length > 0 || patch.toRemove.length > 0 || patch.toUpdate.length > 0) {
      const newFiles = { ...get().files }
      
      // 删除
      patch.toRemove.forEach(id => {
        delete newFiles[id]
      })
      
      // 添加（替换临时 ID）
      patch.toAdd.forEach(file => {
        const realId = uuidv4()
        newFiles[realId] = { ...file, id: realId }
      })
      
      // 更新
      patch.toUpdate.forEach(({ id, updates }) => {
        if (newFiles[id]) {
          newFiles[id] = { ...newFiles[id], ...updates }
        }
      })
      
      get()._setFiles(newFiles)
    }
  } catch (error) {
    logger.error('[loadFolderContentWithWorker] Worker failed, falling back to sync:', error)
    // 回退到同步方法
    await loadFolderContentSync(folderId, fullPath, childrenNames, currentChildren, get)
  }
}

/**
 * 同步加载文件夹内容（小文件夹或 Worker 失败时使用）
 */
async function loadFolderContentSync(
  folderId: string,
  fullPath: string,
  childrenNames: string[],
  currentChildren: FileNode[],
  get: any
) {
  logger.debug(`[loadFolderContentSync] Processing ${childrenNames.length} files`)
  
  const currentChildrenMap = new Map(currentChildren.map(c => [c.name, c]))
  const fsNamesSet = new Set(childrenNames)
  
  const newFiles = { ...get().files }
  let hasChanges = false
  
  // 1. 删除不存在的文件
  for (const child of currentChildren) {
    if (!fsNamesSet.has(child.name)) {
      logger.debug(`[loadFolderContentSync] Removing phantom file: ${child.name}`)
      delete newFiles[child.id]
      hasChanges = true
    }
  }
  
  // 2. 添加新文件和更新现有文件
  const statPromises = childrenNames.map(async (name) => {
    const childPath = fullPath.endsWith('/') ? `${fullPath}${name}` : `${fullPath}/${name}`
    try {
      const stats = await syncService.getStats(childPath)
      return { name, stats, childPath }
    } catch (e) {
      logger.warn(`Failed to stat ${childPath}`, e)
      return null
    }
  })
  
  const results = await Promise.all(statPromises)
  
  for (const res of results) {
    if (!res || !res.stats) continue
    const { name, stats } = res
    const existingNode = currentChildrenMap.get(name)
    
    if (existingNode) {
      if (existingNode.updatedAt !== stats.mtime) {
        newFiles[existingNode.id] = {
          ...existingNode,
          updatedAt: stats.mtime,
          size: stats.size
        }
        hasChanges = true
      }
    } else {
      const childId = uuidv4()
      newFiles[childId] = {
        id: childId,
        parentId: folderId,
        name,
        type: stats.isDirectory ? 'folder' : 'file',
        createdAt: stats.ctime,
        updatedAt: stats.mtime,
        size: stats.size,
        isMount: false
      }
      hasChanges = true
    }
  }
  
  if (hasChanges) {
    logger.debug(`[loadFolderContentSync] Updating state with changes`)
    get()._setFiles(newFiles)
  } else {
    logger.debug(`[loadFolderContentSync] No changes detected`)
  }
}
