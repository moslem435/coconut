/**
 * @fileoverview Next.js 主页面组件 - Coconut OS 入口
 * 
 * 功能：
 * - 系统启动/关机状态管理
 * - 关机动画效果
 * - Shell组件加载
 * 
 * 设计决策：
 * - 使用'use client'因为需要浏览器API(window, setTimeout)
 * - 关机后通过页面重载实现系统重启
 * 
 * @author yume
 * @created 2026-02-02
 * @lastModified 2026-02-24
 * @module src/app/page
 */

'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Shell from '@/os/system/Shell'
import { useWindowStore } from '@/os/kernel/useWindowStore'

/**
 * 主页组件 - Coconut OS 入口点
 * 
 * 状态说明：
 * - hasBooted: 系统是否已启动(保留用于后续扩展启动动画)
 * - isShuttingDown: 是否正在关机，控制关机动画显示
 * 
 * @returns JSX.Element
 */
export default function Home() {
  /** 系统启动状态 - 保留用于后续启动画面扩展 */
  const [hasBooted, setHasBooted] = useState(true)
  /** 关机状态 - 控制关机动画 */
  const [isShuttingDown, setIsShuttingDown] = useState(false)

  /** 从窗口Store获取关闭所有窗口的方法 */
  const closeAllWindows = useWindowStore(state => state.closeAllWindows)

  /**
   * 关机处理函数
   * 
   * 流程：
   * 1. 设置关机状态，显示关机动画
   * 2. 关闭所有打开的窗口
   * 3. 1秒后重载页面实现系统重启
   * 
   * 为什么使用页面重载：
   * - 完全重置所有状态，确保干净重启
   * - 比手动重置所有Store更简单可靠
   */
  const handleShutdown = useCallback(() => {
    setIsShuttingDown(true)
    // 先关闭所有窗口
    closeAllWindows?.()
    // 等待关机动画完成后重载页面
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }, [closeAllWindows])

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {/* 关机遮罩层 - 显示关机动画 */}
      <AnimatePresence>
        {isShuttingDown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-white/50 text-sm font-mono tracking-widest"
            >
              SHUTTING DOWN...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主内容区域 - 关机时隐藏 */}
      {!isShuttingDown && (
        <motion.div
          className="h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Shell />
        </motion.div>
      )}
    </main>
  )
}

