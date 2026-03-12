/**
 * @fileoverview 系统对话框 Store - 异步模态对话框管理
 * 
 * 为什么使用Promise模式而非回调：
 * - 允许 async/await 语法等待用户确认，逻辑更清晰
 * - 避免回调地狱，就像原生 window.confirm() 的体验一样
 * 
 * @author yume
 * @created 2026-02-11
 * @lastModified 2026-02-24
 * @module src/os/kernel/useDialogStore
 */

import { create } from 'zustand'

/** 对话框类型 */
export type DialogType = 'alert' | 'confirm' | 'prompt' | 'action-sheet'

/** 操作表单选项 */
interface ActionSheetOption {
  /** 选项文本 */
  label: string
  /** 点击回调 */
  onClick: () => void
  /** 是否为危险操作（红色显示） */
  isDestructive?: boolean
  /** 是否为取消项 */
  isCancel?: boolean
}

/** 对话框请求对象 */
interface DialogRequest {
  type: DialogType
  title: string
  message?: string
  defaultValue?: string
  placeholder?: string
  options?: ActionSheetOption[]
  /** 内部Promise连接函数，由UI调用submit/cancel解决 */
  resolve: (value: any) => void
}

/**
 * 对话框 Store 接口
 */
interface DialogStore {
  /** 当前待展示的对话框请求 */
  request: DialogRequest | null
  
  /**
   * 展示警告对话框
   * @returns 用户点击确认后 resolve
   */
  openAlert: (title: string, message?: string) => Promise<void>
  /**
   * 展示确认对话框
   * @returns 确认返回 true，取消返回 false
   */
  openConfirm: (title: string, message?: string) => Promise<boolean>
  /**
   * 展示输入对话框
   * @returns 确认返回输入内容，取消返回 null
   */
  openPrompt: (title: string, defaultValue?: string, placeholder?: string) => Promise<string | null>
  /**
   * 展示操作表单
   * @param options - 操作选项列表
   */
  openActionSheet: (title: string, message: string, options: ActionSheetOption[]) => void

  /** UI 调用：提交对话框结果 */
  submit: (value?: any) => void
  /** UI 调用：取消对话框 */
  cancel: () => void
}

export const useDialogStore = create<DialogStore>((set, get) => ({
  request: null,

  openAlert: (title, message) => {
    return new Promise((resolve) => {
      set({
        request: {
          type: 'alert',
          title,
          message,
          resolve: (val) => {
            resolve()
            set({ request: null })
          }
        }
      })
    })
  },

  openConfirm: (title, message) => {
    return new Promise((resolve) => {
      set({
        request: {
          type: 'confirm',
          title,
          message,
          resolve: (val) => {
            resolve(val)
            set({ request: null })
          }
        }
      })
    })
  },

  openPrompt: (title, defaultValue = '', placeholder = '') => {
    return new Promise((resolve) => {
      set({
        request: {
          type: 'prompt',
          title,
          defaultValue,
          placeholder,
          resolve: (val) => {
            resolve(val)
            set({ request: null })
          }
        }
      })
    })
  },

  openActionSheet: (title, message, options) => {
    set({
      request: {
        type: 'action-sheet',
        title,
        message,
        options,
        resolve: () => set({ request: null })
      }
    })
  },

  submit: (value) => {
    const { request } = get()
    if (request) {
      request.resolve(value ?? true)
    }
  },

  cancel: () => {
    const { request } = get()
    if (request) {
      if (request.type === 'confirm') {
        request.resolve(false)
      } else if (request.type === 'prompt') {
        request.resolve(null)
      } else {
        request.resolve(undefined)
      }
      set({ request: null })
    }
  }
}))
