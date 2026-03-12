'use client'

/**
 * @fileoverview 系统设置上下文兼容层 - 迁移到 Zustand Store 后的向后兼容 shim
 * 
 * 为什么保留这个文件：
 * - 原始代码使用 React Context + 多个 useEffect，现已迁移到 Zustand
 * - 保留接口避免改动全局消费者
 * - DOM 副作用已迁移到 useSystemSettingsStore.ts 的 Zustand subscribe
 * 
 * @author yume
 * @created 2026-02-06
 * @lastModified 2026-02-13
 * @module src/os/kernel/SystemSettingsContext
 */

import React, { ReactNode } from 'react'
import { useSystemSettingsStore } from './useSystemSettingsStore'

// Re-export types for backward compatibility
export type { ThemeMode, SystemSettings, Wallpaper } from './useSystemSettingsStore'

/**
 * 向后兼容 Hook: 封装 useSystemSettingsStore，保留原有接口
 * 现有消费者无需改动
 */
export function useSystemSettings() {
    return useSystemSettingsStore()
}

/**
 * 向后兼容 Provider: SystemSettingsProvider 现已是透传组件
 * DOM 副作用已通过 Zustand subscribe 在 Store 初始化时处理
 */
export function SystemSettingsProvider({ children }: { children: ReactNode }) {
    return <>{children}</>
}
