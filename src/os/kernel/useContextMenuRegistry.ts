/**
 * @fileoverview 右键菜单提供者注册表 - 插件式菜单项解耦架构
 * 
 * 为什么使用注册表模式：
 * - 不同应用需要为同一文件类型注册不同菜单项
 * - 插件式设计：应用加载时注册、卸载时自动取消注册
 * - 避免不同应用间的半耦和循环依赖
 * 
 * @author yume
 * @created 2026-03-05
 * @lastModified 2026-03-05
 * @module src/os/kernel/useContextMenuRegistry
 */

import { create } from 'zustand'
import { MenuItem } from '../system/context-menu/types'

/** 菜单项提供者函数类型：接收上下文数据，返回菜单项列表 */
type MenuProvider = (data: any) => MenuItem[]

/**
 * 右键菜单注册表状态接口
 */
interface ContextMenuRegistryState {
    /** 按菜单类型分组的提供者列表 */
    providers: Record<string, MenuProvider[]>
    /**
     * 注册菜单项提供者
     * @param type - 菜单类型（如 'file'/'folder'）
     * @param provider - 提供者函数
     * @returns 取消注册的函数
     */
    register: (type: string, provider: MenuProvider) => () => void
    /**
     * 获取指定类型和数据的所有菜单项
     * @param type - 菜单类型
     * @param data - 上下文数据
     * @returns 合并所有提供者的菜单项列表
     */
    getMenuItems: (type: string, data: any) => MenuItem[]
}

export const useContextMenuRegistry = create<ContextMenuRegistryState>((set, get) => ({
    providers: {},
    
    register: (type, provider) => {
        set((state) => {
            const currentProviders = state.providers[type] || []
            return {
                providers: {
                    ...state.providers,
                    [type]: [...currentProviders, provider]
                }
            }
        })

        // 返回取消注册的函数，应用卸载时调用以防止内存泄漏
        return () => {
            set((state) => {
                const currentProviders = state.providers[type] || []
                return {
                    providers: {
                        ...state.providers,
                        [type]: currentProviders.filter(p => p !== provider)
                    }
                }
            })
        }
    },

    getMenuItems: (type, data) => {
        const state = get()
        const providers = state.providers[type] || []
        
        return providers.flatMap(provider => {
            try {
                return provider(data)
            } catch (e) {
                console.error(`Error generating menu items for type ${type}:`, e)
                return []
            }
        })
    }
}))
