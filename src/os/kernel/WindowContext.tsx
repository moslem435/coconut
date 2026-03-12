/**
 * @fileoverview 窗口上下文 - 向子组件传递窗口ID和拖揽控制器
 * 
 * 为什么使用 React Context 而非 Props：
 * - 窗口内深层子组件需要访问窗口ID，避免 props drilling
 * - 拖揽控制器需要在窗口控件和标题栏之间传递
 * 
 * @author yume
 * @created 2026-02-10
 * @lastModified 2026-02-13
 * @module src/os/kernel/WindowContext
 */

import { createContext, useContext } from 'react'
import { DragControls } from 'framer-motion'

/** 窗口上下文数据类型 */
interface WindowContextType {
    /** 窗口全局唯一ID */
    windowId: string
    /** framer-motion 拖揽控制器，由标题栏控制窗口拖动 */
    dragControls?: DragControls
}

/** 窗口上下文，默认为 null 表示未在窗口内部 */
export const WindowContext = createContext<WindowContextType | null>(null)

/**
 * 获取窗口上下文，包括 windowId 和 dragControls
 * @returns 窗口上下文对象，在窗口外则为 null
 */
export const useWindowContext = () => {
    return useContext(WindowContext)
}

/**
 * 获取当前窗口ID
 * @returns 窗口ID字符串，在窗口外返回 null
 */
export const useWindowId = () => {
    const context = useContext(WindowContext)
    return context?.windowId || null
}
