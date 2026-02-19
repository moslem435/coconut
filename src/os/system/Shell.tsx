import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useSystemStore } from '@/os/kernel/useSystemStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useShallow } from 'zustand/react/shallow'
import { Kernel } from '@/os/kernel/Kernel'
import { useProcessStore } from '@/os/kernel/useProcessStore'
import { useDynamicIslandStore } from '@/os/kernel/useDynamicIslandStore'
import { logger } from '@/os/utils/logger'
import { Zap } from 'lucide-react'
import { useNotificationToIslandBridge } from '@/os/hooks/useNotificationToIslandBridge'

// Components
import Taskbar from './Taskbar'
import ContextMenu from './ContextMenu'
import Desktop from './Desktop'
import Window from './Window'
import GlobalShortcuts from './GlobalShortcuts'

import GlobalDialogs from './GlobalDialogs'
import CyberFeed from './CyberFeed'

interface ShellProps {
  onShutdown?: () => void
}

export default function Shell({ onShutdown }: ShellProps) {
  // Optimize: Only subscribe to the list of window IDs.
  // Shell will only re-render when a window is added or removed.
  const windowIds = useWindowStore(useShallow(state => Object.keys(state.windows)))

  // Bridge: Sync NotificationStore -> DynamicIslandStore (CyberFeed)
  useNotificationToIslandBridge()

  // VFS Sync
  const { initialize } = useFileSystemStore()
  const { showSuccess, showNotification } = useDynamicIslandStore()

  // 合并初始化逻辑
  useEffect(() => {
    Kernel.init()
    initialize().catch(logger.error)

    // Demo: Show Dynamic Island notification on startup
    setTimeout(() => {
        showSuccess('System Ready')
    }, 1500)

    setTimeout(() => {
        showNotification('Welcome to Coconut OS', 'Local First, AI Ready', <Zap size={24} className="text-yellow-400" />)
    }, 3500)

    const interval = setInterval(() => {
      useProcessStore.getState().tick()
    }, 2000)

    return () => clearInterval(interval)
  }, [initialize])

  const { isStartMenuOpen, toggleStartMenu, setStartMenuOpen } = useSystemStore()

  const handleStartClick = () => {
    toggleStartMenu()
  }

  return (
    <>
      <GlobalShortcuts />

      {/* 1. Desktop Layer (Always Present) */}
      <div className="fixed inset-0 z-0">
        <Desktop />
      </div>

      {/* 2. Window Manager / App Layer */}
      <AnimatePresence>
        {/* Windows */}
        {windowIds.map(id => (
          <Window key={id} id={id} />
        ))}
      </AnimatePresence>

      {/* 3. System UI Layer (Always Top) */}
      <CyberFeed />

      {/* Status Bar - z-[200] */}
      <Taskbar
        onStartClick={handleStartClick}
        isStartMenuOpen={isStartMenuOpen}
        onCloseStartMenu={() => setStartMenuOpen(false)}
        onShutdown={onShutdown}
      />

      {/* Context Menu */}
      <ContextMenu />

      {/* Notifications - Removed in favor of Dynamic Island */}
      {/* <Notifications /> */}

      {/* Global Dialogs - z-[99999] */}
      <GlobalDialogs />
    </>
  )
}