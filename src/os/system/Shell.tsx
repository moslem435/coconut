/**
 * @fileoverview Shell 组件 - 操作系统外壳与初始化入口
 * 
 * 功能：
 * - 系统初始化（内核、文件系统、进程管理）
 * - 窗口管理（创建、销毁、层级控制）
 * - 任务栏（应用启动、窗口切换、系统托盘）
 * - 桌面环境（图标、壁纸、小部件）
 * - 全局快捷键
 * - 上下文菜单
 * - 全局对话框（提示、确认、输入）
 * 
 * 架构层次（从下到上）：
 * 1. Desktop Layer (z-0)：桌面背景和图标
 * 2. Window Layer (z-100~5000)：应用窗口
 * 3. Taskbar Layer (z-200)：任务栏
 * 4. Dialog Layer (z-99999)：全局对话框
 * 
 * 性能优化：
 * - 使用 useShallow 只订阅窗口 ID 列表，避免窗口状态变化导致 Shell 重渲染
 * - AnimatePresence 管理窗口的进入/退出动画
 * - 进程管理采用定时器轮询（2 秒间隔）
 * 
 * @author yume
 * @created 2026-02-06
 * @lastModified 2026-03-04
 * @module src/os/system/Shell
 */

import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useSystemStore } from '@/os/kernel/useSystemStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useShallow } from 'zustand/react/shallow'
import { Kernel } from '@/os/kernel/Kernel'
import { useProcessStore } from '@/os/kernel/useProcessStore'
import { logger } from '@/os/utils/logger'
import { useWebContainerStore } from '@/os/kernel/useWebContainerStore'
import { useSystemSettingsStore } from '@/os/kernel/useSystemSettingsStore'

// 组件
import Taskbar from './Taskbar'
import ContextMenu from './ContextMenu'
import Desktop from './Desktop'
import Window from './Window'
import GlobalShortcuts from './GlobalShortcuts'
import GlobalDialogs from './GlobalDialogs'
import { ToastContainer } from '@/os/components/Toast'
import { LucideIconPickerDialog } from '@/os/ui/dialogs/LucideIconPickerDialog'

/**
 * Shell 组件属性
 */
interface ShellProps {
  /** 关机回调函数 */
  onShutdown?: () => void
}

/**
 * Shell 主组件
 * 
 * 负责协调桌面、窗口、任务栏和全局功能
 */
export default function Shell({ onShutdown }: ShellProps) {
  /**
   * 性能优化：只订阅窗口 ID 列表
   * Shell 只在窗口添加或删除时重新渲染，窗口内部状态变化不会触发
   */
  const windowIds = useWindowStore(useShallow(state => Object.keys(state.windows)))

  // 文件系统初始化
  const { initialize } = useFileSystemStore()

  /**
   * 系统初始化
   * 
   * 流程：
   * 1. 启动内核（事件总线、系统服务）
   * 2. 初始化虚拟文件系统（VFS）
   * 3. 启动进程管理器定时器（2 秒轮询）
   */
  useEffect(() => {
    // 初始化内核
    Kernel.init()
    
    // 初始化文件系统
    initialize().catch(logger.error)

    const shouldWarmup = () => {
      const s = useSystemSettingsStore.getState()
      if (!s.warmupWebContainer) return false
      const nav: any = typeof navigator === 'undefined' ? null : navigator
      const conn = nav?.connection
      if (conn?.saveData) return false
      const effectiveType = conn?.effectiveType
      if (effectiveType === 'slow-2g' || effectiveType === '2g') return false
      const deviceMemory = nav?.deviceMemory
      if (typeof deviceMemory === 'number' && deviceMemory > 0 && deviceMemory < 4) return false
      return true
    }

    const warmup = async () => {
      const wc = useWebContainerStore.getState()
      if (wc.instance || wc.isBooting) return
      try {
        await wc.boot()
      } catch (e) {
        logger.warn(e)
      }
    }

    if (shouldWarmup()) {
      const ric: any = (globalThis as any).requestIdleCallback
      if (typeof ric === 'function') {
        ric(() => { void warmup() }, { timeout: 3000 })
      } else {
        setTimeout(() => { void warmup() }, 1500)
      }
    }

    // 启动进程管理器定时器
    const interval = setInterval(() => {
      useProcessStore.getState().tick()
    }, 2000)

    return () => clearInterval(interval)
  }, [initialize])

  // 开始菜单状态
  const { isStartMenuOpen, toggleStartMenu, setStartMenuOpen } = useSystemStore()

  /**
   * 开始按钮点击处理
   */
  const handleStartClick = () => {
    toggleStartMenu()
  }

  return (
    <>
      {/* 1. 桌面层（始终存在，z-0） */}
      <div className="fixed inset-0 z-0">
        <Desktop />
      </div>

      {/* 2. 窗口管理层（z-100~5000） */}
      <AnimatePresence>
        {windowIds.map(id => (
          <Window key={id} id={id} />
        ))}
      </AnimatePresence>

      {/* 3. 任务栏（z-200） */}
      <Taskbar
        onStartClick={handleStartClick}
        isStartMenuOpen={isStartMenuOpen}
        onCloseStartMenu={() => setStartMenuOpen(false)}
        onShutdown={onShutdown}
      />

      {/* 4. 右键菜单 */}
      <ContextMenu />

      {/* 5. 全局对话框（z-99999） */}
      <GlobalDialogs />

      <LucideIconPickerDialog />
      
      {/* 6. Toast 通知（z-10000） */}
      <ToastContainer />
      
      {/* 7. 全局快捷键 */}
      <GlobalShortcuts />
    </>
  )
}
