/**
 * @fileoverview UI 交互状态 Store - 文件重命名等全局交互状态
 * 
 * 为什么单独建立而非添加到其他 Store：
 * - 交互状态属于短期 UI 状态，与文件系统、窗口等持久化数据分离
 * - 独立 Store 项防止不相关组件生善订阅
 * 
 * @author yume
 * @created 2026-02-11
 * @lastModified 2026-02-11
 * @module src/os/kernel/useUIStore
 */

import { create } from 'zustand'

/**
 * UI 交互状态接口
 */
interface UIStore {
  /** 正在被重命名的文件ID， null 表示当前无重命名 */
  renamingId: string | null
  /** 设置重命名目标 ID */
  setRenamingId: (id: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  renamingId: null,
  setRenamingId: (id) => set({ renamingId: id }),
}))
