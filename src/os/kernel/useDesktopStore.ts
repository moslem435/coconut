/**
 * @fileoverview 桌面图标 Store - 桌面图标位置持久化与整理管理
 * 
 * 为什么位置信息需要单独存储：
 * - 桌面图标位置独立于文件系统，属于UI层数据
 * - 持久化后页面刷新能恢复用户自定义的图标排列
 * 
 * @author yume
 * @created 2026-02-09
 * @lastModified 2026-02-09
 * @module src/os/kernel/useDesktopStore
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { APPS_REGISTRY } from '@/os/registry/config'

/** 图标坐标位置 */
interface IconPosition {
    x: number
    y: number
}

/**
 * 桌面 Store 状态接口
 */
interface DesktopState {
    /** 图标ID到坐标位置的映射表 */
    iconPositions: Record<string, IconPosition>
    /** 批量设置图标位置 */
    setIconPositions: (positions: Record<string, IconPosition>) => void
    /** 更新单个图标位置 */
    updateIconPosition: (id: string, pos: IconPosition) => void
    /**
     * 自动整理图标到网格内
     * @param itemIds - 图标ID列表
     * @param maxRows - 每列最大行数
     * @param gridSize - 网格大小（像素）
     * @param padding - 边距（像素）
     */
    organizeIcons: (itemIds: string[], maxRows: number, gridSize: number, padding: number) => void
}

export const useDesktopStore = create<DesktopState>()(
    persist(
        (set) => ({
            iconPositions: {},
            setIconPositions: (positions) => set({ iconPositions: positions }),
            updateIconPosition: (id, pos) => set((state) => ({
                iconPositions: { ...state.iconPositions, [id]: pos }
            })),
            organizeIcons: (itemIds, maxRows, gridSize, padding) => {
                const newPositions: Record<string, IconPosition> = {}

                itemIds.forEach((id, index) => {
                    const col = Math.floor(index / maxRows)
                    const row = index % maxRows
                    newPositions[id] = {
                        x: padding + col * gridSize,
                        y: padding + row * gridSize
                    }
                })

                set({ iconPositions: newPositions })
            }
        }),
        {
            name: 'desktop-storage',
            partialize: (state) => ({ iconPositions: state.iconPositions }),
        }
    )
)
