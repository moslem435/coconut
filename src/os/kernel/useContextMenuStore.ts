/**
 * @fileoverview 右键菜单显示状态 Store - 控制菜单展开位置与内容
 * 
 * 为什么展示状态和菜单项内容分离为两个 Store：
 * - 此 Store 只管理菜单的显示/隐藏状态和坐标
 * - useContextMenuRegistry 管理菜单项内容（表现与逻辑分离）
 * 
 * @author yume
 * @created 2026-02-06
 * @lastModified 2026-03-05
 * @module src/os/kernel/useContextMenuStore
 */

import { create } from 'zustand'

/** 菜单类型标识符，支持自定义字符串（如 'file', 'folder', 'desktop'） */
export type MenuType = string
/** 屏幕坐标位置 */
export type Position = { x: number, y: number }
/** 菜单上下文数据，由提供者解析 */
export type ContextMenuData = any

/**
 * 右键菜单状态接口
 */
interface ContextMenuState {
    /** 菜单是否展开 */
    visible: boolean
    /** 菜单展开的屏幕坐标 */
    position: Position
    /** 当前菜单类型 */
    type: MenuType
    /** 传递给菜单项的上下文数据 */
    data?: ContextMenuData

    /**
     * 在指定位置展开菜单
     * @param x - 屏幕X坐标
     * @param y - 屏幕Y坐标
     * @param type - 菜单类型
     * @param data - 上下文数据
     */
    showMenu: (x: number, y: number, type: MenuType, data?: any) => void
    /** 关闭菜单 */
    hideMenu: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
    visible: false,
    position: { x: 0, y: 0 },
    type: 'default',
    data: undefined,
    showMenu: (x, y, type, data) => set({ visible: true, position: { x, y }, type, data }),
    hideMenu: () => set({ visible: false })
}))
