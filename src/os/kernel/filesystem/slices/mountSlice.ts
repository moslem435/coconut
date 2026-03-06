/**
 * MountSlice - 文件系统挂载管理层
 * 职责：管理本地文件夹挂载和加载
 */

import type { StateCreator } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { CoreSlice } from './coreSlice'
import type { FileNode } from '../../initialFileTree'
import { INITIAL_FILES, INITIAL_ROOT_ID } from '../../initialFileTree'
import { SYSTEM_PATHS, FILE_IDS } from '@/os/config/paths'
import { fs } from '../FileSystemClient'
import { syncService } from '@/os/services/FileSystemSyncService'
import { syncService as initialSyncService } from '../../syncService'
import { logger } from '@/os/utils/logger'
import { fileSystemWorker } from '../utils/fileSystemWorkerClient'
import { StaticHttpProvider } from '../providers/StaticHttpProvider'
import { VirtualFolderProvider } from '../providers/VirtualFolderProvider'
import { IFileSystemProvider } from '../IFileSystemProvider'
import { ReadOnlyWrapper } from '../wrappers/ReadOnlyWrapper'
import { PathNormalizationWrapper } from '../wrappers/PathNormalizationWrapper'
import { useFileSystemStore } from '../../useFileSystemStore'

// 文件数阈值：超过此数量使用 Worker
const WORKER_THRESHOLD = 100

export interface MountSlice {
  // 挂载操作
  mountLocalFolder: () => Promise<void>
  unmountLocalFolder: (mountId: string) => Promise<void>
  loadFolderContent: (folderId: string) => Promise<void>
  checkMountPermissions: () => Promise<void>
  initialize: () => Promise<void>
  mountStaticProvider: () => Promise<void>
  mountVirtualFolders: () => Promise<void>
}

export const createMountSlice: StateCreator<
  CoreSlice & MountSlice,
  [],
  [],
  MountSlice
> = (set, get) => ({
  mountStaticProvider: async () => {
    try {
      const provider = new StaticHttpProvider('/fs-manifest.json');
      await provider.init();

      // Wrap with ReadOnlyWrapper then PathNormalizationWrapper
      const wrappedProvider = new PathNormalizationWrapper(
        new ReadOnlyWrapper(provider)
      );

      // Register with FS Client
      fs.registerProvider(SYSTEM_PATHS.ROM, wrappedProvider);
      logger.info(`StaticHttpProvider mounted at ${SYSTEM_PATHS.ROM}`);

      // Add ROM node to Root if not exists (marked as system and mount)
      const romId = FILE_IDS.ROM;
      const existing = get().files[romId];
      if (!existing) {
        const romNode: FileNode = {
          id: romId,
          parentId: FILE_IDS.ROOT,
          name: 'rom',
          type: 'folder',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isMount: true,
          isSystem: true,
          isReadOnly: true,
          icon: 'disc'
        };
        get()._addFile(romNode);
      } else if (!existing.isSystem || !existing.isReadOnly) {
        // Update existing ROM node to ensure it has system flags
        get()._updateFile(romId, {
          isMount: true,
          isSystem: true,
          isReadOnly: true,
          icon: 'disc'
        });
      }

      // Trigger load
      await get().loadFolderContent(romId);

    } catch (e) {
      logger.error('Failed to mount StaticHttpProvider', e);
    }
  },

  mountLocalFolder: async () => {
    try {
      // @ts-ignore - showDirectoryPicker missing in TS
      const handle = await window.showDirectoryPicker()

      // 1. Mount in FS Client
      // Note: fs.mount returns path string, e.g. "/mnt/uuid"
      // Note: fs.mount internally uses NativeDriver, which might need wrapping if not handled there.
      // But NativeDriver handles its own normalization usually or we trust FSA.
      // However, to be consistent, we should probably update fs.mount to wrap NativeDriver too.
      // For now, let's leave fs.mount as is, or update FileSystemClient.mount to wrap.
      const mountPath = fs.mount(handle)
      const mountId = mountPath.split('/').pop()!

      // 2. Persist Handle
      // We need to import NativeDriver class dynamically or statically to call static methods
      // Since fs.mount uses NativeDriver internally, we can trust it works.
      // But we need NativeDriver class for persistMount.
      const { NativeDriver } = await import('../NativeDriver')
      await NativeDriver.persistMount(mountId, handle)

      // 3. Add to Store State (marked as mount but not system)
      const mountNode: FileNode = {
        id: mountId,
        parentId: FILE_IDS.ROOT,
        name: handle.name,
        type: 'folder',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        icon: 'hard-drive',
        isMount: true,
        isSystem: false, // User mounts are not system folders
        needsPermission: false
      }

      get()._addFile(mountNode)
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        logger.error('Failed to mount folder:', error)
      }
    }
  },

  unmountLocalFolder: async (mountId: string) => {
    try {
      // 1. Unmount in FS Client
      fs.unmount(`/mnt/${mountId}`)

      // 2. Remove from Persisted Mounts
      const { NativeDriver } = await import('../NativeDriver')
      await NativeDriver.removeMount(mountId)

      // 3. Remove from Store State
      const newFiles = { ...get().files }
      delete newFiles[mountId]

      // Remove all children of this mount from the store
      const childIds = Object.keys(newFiles).filter(id => {
        let currentId = id
        while (currentId !== INITIAL_ROOT_ID && newFiles[currentId]) {
          if (currentId === mountId) return true
          currentId = newFiles[currentId]?.parentId as string
        }
        return false
      })
      childIds.forEach(id => delete newFiles[id])

      get()._setFiles(newFiles)
    } catch (error) {
      logger.error('Failed to unmount folder:', error)
    }
  },

  loadFolderContent: async (folderId) => {
    const folder = get().files[folderId]
    if (!folder || folder.type !== 'folder') return

    const state = get()
    const fullPath = state.resolvePath(folderId)
    logger.debug(`[loadFolderContent] Loading content for ${folderId}, path: ${fullPath}`)

    if (!fullPath) {
      logger.debug(`[loadFolderContent] Skipping invalid path: ${fullPath}`)
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

  mountVirtualFolders: async () => {
    try {
      // Create "All Pictures" virtual folder
      const allPicturesProvider = new VirtualFolderProvider([
        { path: SYSTEM_PATHS.PICTURES, priority: 10 }, // User pictures first
        { path: SYSTEM_PATHS.ROM_GALLERY, priority: 5 }  // System gallery second
      ]);

      // Wrap with ReadOnlyWrapper then PathNormalizationWrapper
      const wrappedProvider = new PathNormalizationWrapper(
        new ReadOnlyWrapper(allPicturesProvider)
      );

      fs.registerProvider(SYSTEM_PATHS.VIRTUAL_ALL_PICTURES, wrappedProvider);
      logger.info(`VirtualFolderProvider mounted at ${SYSTEM_PATHS.VIRTUAL_ALL_PICTURES}`);

      // Add virtual folder node to Root
      const allPicturesId = FILE_IDS.VIRTUAL_ALL_PICTURES;
      const existing = get().files[allPicturesId];
      if (!existing) {
        const virtualNode: FileNode = {
          id: allPicturesId,
          parentId: FILE_IDS.ROOT,
          name: 'All Pictures',
          type: 'folder',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isMount: true,
          isSystem: true,
          isReadOnly: true,
          icon: 'images'
        };
        get()._addFile(virtualNode);
      }

      // Load content
      await get().loadFolderContent(allPicturesId);

    } catch (e) {
      logger.error('Failed to mount virtual folders', e);
    }
  },

  initialize: async () => {
    try {
      console.log('[FileSystem] 🚀 Starting initialization...');
      
      console.log('[FileSystem] 📊 Files BEFORE rehydrate:', Object.keys(get().files).length);
      
      // FIX: Access persist API from the store directly, not from get()
      // @ts-ignore - persist exists on the store
      const persistAPI = useFileSystemStore.persist;
      
      if (persistAPI) {
        const hasHydrated = persistAPI.hasHydrated();
        console.log('[FileSystem] Persist hasHydrated:', hasHydrated);
        
        if (!hasHydrated) {
          console.log('[FileSystem] ⏳ Calling rehydrate...');
          await persistAPI.rehydrate();
          console.log('[FileSystem] ✅ Rehydrate call complete');
          
          // Wait a bit for state to update
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          console.log('[FileSystem] ✅ Already hydrated');
        }
      } else {
        console.error('[FileSystem] ❌ No persist API found!');
      }
      
      // Log current file count after hydration
      const filesAfterHydration = get().files;
      console.log('[FileSystem] 📊 Files AFTER rehydrate:', Object.keys(filesAfterHydration).length);
      console.log('[FileSystem] 📁 Root children:', get().getChildren(get().rootId).map(f => f.name));

      // 0. Mount Static ROM
      await get().mountStaticProvider();

      // 0.1 Mount Virtual Folders
      await get().mountVirtualFolders();

      // Ensure intermediate system directories exist (home, user, trash)
      // This is crucial for migration from old structure
      // Moved BEFORE syncToOPFS to ensure folders exist for sync
      const systemDirs = [FILE_IDS.HOME, FILE_IDS.USER, FILE_IDS.TRASH];
      const currentFiles = get().files;
      const newFiles = { ...currentFiles };
      let hasChanges = false;

      systemDirs.forEach(dirId => {
        if (!newFiles[dirId] && INITIAL_FILES[dirId]) {
          newFiles[dirId] = INITIAL_FILES[dirId];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        get()._setFiles(newFiles);
      }

      // @ts-ignore - syncToOPFS expects full store
      await initialSyncService.syncToOPFS(get(), set)

      const { NativeDriver } = await import('../NativeDriver')
      const mounts = await NativeDriver.restoreMounts()

      mounts.forEach((handle, id) => {
        // Mount returns path, we just need to ensure it's mounted
        fs.mount(handle, id)

        const newNode: FileNode = {
          id: id,
          parentId: FILE_IDS.ROOT,
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
      const updatedFiles = { ...get().files }
      hasChanges = false

      // Update parentId for migrated folders if they are still pointing to root
      // This handles the migration from root->desktop to root->home->user->desktop
      const migratedFolders = [
        FILE_IDS.DESKTOP,
        FILE_IDS.DOCUMENTS,
        FILE_IDS.DOWNLOADS,
        FILE_IDS.MUSIC,
        FILE_IDS.PICTURES,
        FILE_IDS.CODE
      ];
      migratedFolders.forEach(folderId => {
        const folder = updatedFiles[folderId];
        if (folder && folder.parentId === FILE_IDS.ROOT) {
          updatedFiles[folderId] = {
            ...folder,
            parentId: FILE_IDS.USER
          };
          hasChanges = true;
        }
      });

      // Cleanup: Remove physical legacy folders from root if they exist
      // This prevents them from reappearing as new folders during sync
      const cleanupLegacyFolders = async () => {
        try {
          const rootChildren = await fs.readdir('/');
          for (const name of rootChildren) {
            // If we find a folder in root that matches a migrated system folder name
            if (migratedFolders.some(id => updatedFiles[id]?.name === name)) {
              // Check if it's empty or already migrated
              // For safety, we only hide it from store by not doing anything here
              // The actual physical cleanup should be done by syncService migration
              // But here we need to ensure we don't re-add them to store in loadFolderContent
            }
          }
        } catch (e) {
          console.warn('Failed to cleanup legacy folders', e);
        }
      };
      // We don't await this to not block initialization
      cleanupLegacyFolders();

      Object.entries(INITIAL_FILES).forEach(([id, node]) => {
        if ((id.startsWith('shortcut-') || node.parentId === FILE_IDS.DESKTOP) && !updatedFiles[id]) {
          updatedFiles[id] = node
          hasChanges = true
        }
      })

      if (hasChanges) {
        get()._setFiles(updatedFiles)
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
      if (!stats) return null
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

      // Helper to check if a file with the same name exists in Trash
      const existsInTrash = (name: string) => {
        return Object.values(newFiles).some((f: any) => (f as FileNode).parentId === FILE_IDS.TRASH && (f as FileNode).name === name)
      }

      const isRecentlyDeleted = (name: string) => {
        const path = fullPath.endsWith('/') ? `${fullPath}${name}` : `${fullPath}/${name}`
        const expiry = get().tombstoneEntries[path]
        return expiry && expiry > Date.now()
      }

      // 删除
      patch.toRemove.forEach(id => {
        delete newFiles[id]
      })

      // 添加（替换临时 ID）
      patch.toAdd.forEach(file => {
        // FIX: Check if ghost file
        if (existsInTrash(file.name) || isRecentlyDeleted(file.name)) {
          logger.debug(`[loadFolderContentWithWorker] Skipping ghost file: ${file.name}`)
          return
        }

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

  // Helper to check if a file with the same name exists in Trash
  const existsInTrash = (name: string) => {
    return Object.values(newFiles).some((f: any) => (f as FileNode).parentId === FILE_IDS.TRASH && (f as FileNode).name === name)
  }

  const isRecentlyDeleted = (name: string) => {
    const path = fullPath.endsWith('/') ? `${fullPath}${name}` : `${fullPath}/${name}`
    const expiry = get().tombstoneEntries[path]
    return expiry && expiry > Date.now()
  }

  // 1. 删除不存在的文件
  for (const child of currentChildren) {
    // Skip system/mount points which are not physical files in OPFS
    if (child.isMount || child.isSystem) continue;

    if (!fsNamesSet.has(child.name)) {
      logger.debug(`[loadFolderContentSync] Removing phantom file: ${child.name}`)
      delete newFiles[child.id]
      hasChanges = true
    }
  }

  // 2. 添加新文件和更新现有文件
  const statPromises = childrenNames.map(async (name) => {
    // Filter out legacy system folders that should be in /home/user now
    // If we are scanning root, ignore these names to prevent duplicates
    if (folderId === FILE_IDS.ROOT) {
      const legacyNames = ['Desktop', 'Documents', 'Downloads', 'Music', 'Pictures', 'Code'];
      if (legacyNames.includes(name)) {
        return null;
      }
    }

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
      // FIX: If it's not in memory but it's in Trash, it's a ghost from OPFS. Skip adding it.
      if (existsInTrash(name) || isRecentlyDeleted(name)) {
        logger.debug(`[loadFolderContentSync] Skipping ghost file (exists in trash or recently deleted): ${name}`)
        continue
      }

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
