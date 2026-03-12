/**
 * @fileoverview 文件系统 Store - 基于 Slice 模式的文件系统核心
 * 
 * 架构设计：
 * - Slice 模式：将状态拆分为 CoreSlice/ActionSlice/MountSlice，真序分离
 * - CoreSlice: 纯状态管理（增删改查）
 * - ActionSlice: 业务操作（重命名、移动、复制）
 * - MountSlice: 外部文件夹挂载管理
 * - SyncMiddleware: 副作用同步（自动重试、回滚）
 * 
 * 为什么用 Slice 模式：
 * - 文件系统逻辑远比其他 Store 复杂，单文件会超过500行
 * - 拆分后每个 Slice 可以独立测试，提高可维护性
 * 
 * @author yume
 * @created 2026-02-09
 * @lastModified 2026-03-06
 * @module src/os/kernel/useFileSystemStore
 */

/**
 * FileSystem Store - 优化版
 * 使用 Slice Pattern 架构，职责分离
 * 
 * 架构：
 * - CoreSlice: 纯状态管理
 * - ActionSlice: 业务操作
 * - MountSlice: 挂载管理
 * - SyncMiddleware: 副作用同步（自动重试、回滚）
 * - FileSystem Worker: 大文件夹 Diffing 性能优化
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createCoreSlice, type CoreSlice } from './filesystem/slices/coreSlice'
import { createActionSlice, type ActionSlice } from './filesystem/slices/actionSlice'
import { createMountSlice, type MountSlice } from './filesystem/slices/mountSlice'
import { createSyncMiddleware } from './filesystem/middleware/syncMiddleware'

// 导出类型（汇聚导出，方便外部一次引入）
export type { FileType, FileNode } from './initialFileTree'
export { INITIAL_FILES, INITIAL_ROOT_ID } from './initialFileTree'

// 组合所有 Slices（使用交叉类型确保完整性）
export type FileSystemStore = CoreSlice & ActionSlice & MountSlice

// 创建 Store
// 为什么使用 skipHydration: 文件系统数据量大，延迟水合避免页面刷新时白屏
// 需手动调用 useFileSystemStore.persist.rehydrate() 触发水合
export const useFileSystemStore = create<FileSystemStore>()(
  persist(
    (...args) => ({
      ...createCoreSlice(...args),
      ...createActionSlice(...args),
      ...createMountSlice(...args)
    }),
    {
      name: 'filesystem-storage',
      skipHydration: true,
      partialize: (state) => {
        const persisted = {
          files: state.files,
          rootId: state.rootId,
          tombstoneEntries: state.tombstoneEntries
        };
        const fileCount = Object.keys(persisted.files).length;
        const userNode = state.getNodeByPath('/home/user');
        const userChildren = userNode ? state.getChildren(userNode.id).map(f => f.name) : [];
        
        console.log('[FileSystem] Partializing state for persistence:', fileCount, 'files');
        console.log('[FileSystem] /home/user children being saved:', userChildren);
        return persisted;
      },
      onRehydrateStorage: () => {
        console.log('[FileSystem] onRehydrateStorage callback triggered');
        return (state) => {
          if (state) {
            const fileCount = Object.keys(state.files).length;
            const fileNames = Object.values(state.files).map((f: any) => f.name).slice(0, 20);
            console.log('[FileSystem] Rehydration complete, files count:', fileCount);
            console.log('[FileSystem] First 20 file names:', fileNames);
            console.log('[FileSystem] Root children after rehydration:', state.getChildren(state.rootId).map((f: any) => f.name));
            
            // Check /home/user children
            const userNode = state.getNodeByPath('/home/user');
            if (userNode) {
              const userChildren = state.getChildren(userNode.id).map((f: any) => f.name);
              console.log('[FileSystem] /home/user children after rehydration:', userChildren);
            }
            
            state._setHydrated(true);
          } else {
            console.warn('[FileSystem] Rehydration returned null state');
          }
        };
      }
    }
  )
)

// 初始化同步中间件
// 为什么在这里初始化而非在Store内部：同步中间件需要访问 Store 实例，必须在 Store 创建完成后初始化
let syncMiddleware: ReturnType<typeof createSyncMiddleware> | null = null

if (typeof window !== 'undefined') {
  syncMiddleware = createSyncMiddleware(
    () => useFileSystemStore.getState(),
    {
      maxRetries: 3,
      retryDelay: 1000,
      queueSize: 100
    }
  )
}

/**
 * 清理文件系统 Store资源
 * 
 * 用于测试环境重置状态，或热重载时防止重复订阅
 */
export function cleanupFileSystemStore() {
}

/** 向后兼容：导出旧或接口类型 */
export type FileSystemState = FileSystemStore
