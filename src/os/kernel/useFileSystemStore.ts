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

// 导出类型
export type { FileType, FileNode } from './initialFileTree'
export { INITIAL_FILES, INITIAL_ROOT_ID } from './initialFileTree'

// 组合所有 Slices
export type FileSystemStore = CoreSlice & ActionSlice & MountSlice

// 创建 Store
export const useFileSystemStore = create<FileSystemStore>()(
  persist(
    (...args) => ({
      ...createCoreSlice(...args),
      ...createActionSlice(...args),
      ...createMountSlice(...args)
    }),
    {
      name: 'filesystem-storage',
      skipHydration: true
    }
  )
)

// 初始化同步中间件
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

// 清理函数（用于测试或热重载）
export function cleanupFileSystemStore() {
  syncMiddleware?.cleanup()
}

// 向后兼容：导出旧的接口类型
export type FileSystemState = FileSystemStore
