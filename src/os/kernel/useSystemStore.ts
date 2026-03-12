/**
 * @fileoverview 系统 UI 状态 Store - 系统层弹出组件的开关状态
 * 
 * 为什么不用 useSystemSettingsStore 一并管理：
 * - 弹出组件开关状态属于UI层，不需要持久化
 * - useSystemSettingsStore 用于用户偏好设置，两者职责不同
 * 
 * @author yume
 * @created 2026-02-10
 * @lastModified 2026-02-10
 * @module src/os/kernel/useSystemStore
 */

import { create } from 'zustand'

/**
 * 系统 UI 状态接口
 */
interface SystemState {
    /** 开始菜单是否开启 */
    isStartMenuOpen: boolean
    /** 切换开始菜单开关 */
    toggleStartMenu: () => void
    /** 设置开始菜单状态 */
    setStartMenuOpen: (isOpen: boolean) => void
    
    /** 操作中心是否开启 */
    isActionCenterOpen: boolean
    /** 切换操作中心开关 */
    toggleActionCenter: () => void
    /** 设置操作中心状态 */
    setActionCenterOpen: (isOpen: boolean) => void
    
    /** 快速设置面板是否开启 */
    isQuickSettingsOpen: boolean
    /** 切换快速设置开关 */
    toggleQuickSettings: () => void
    /** 设置快速设置状态 */
    setQuickSettingsOpen: (isOpen: boolean) => void
}

export const useSystemStore = create<SystemState>((set) => ({
    isStartMenuOpen: false,
    toggleStartMenu: () => set((state) => ({ isStartMenuOpen: !state.isStartMenuOpen })),
    setStartMenuOpen: (isOpen) => set({ isStartMenuOpen: isOpen }),

    isActionCenterOpen: false,
    toggleActionCenter: () => set((state) => ({ isActionCenterOpen: !state.isActionCenterOpen })),
    setActionCenterOpen: (isOpen) => set({ isActionCenterOpen: isOpen }),
    
    isQuickSettingsOpen: false,
    toggleQuickSettings: () => set((state) => ({ isQuickSettingsOpen: !state.isQuickSettingsOpen })),
    setQuickSettingsOpen: (isOpen) => set({ isQuickSettingsOpen: isOpen }),
}))
