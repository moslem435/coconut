/**
 * Splash Screen Portal 组件
 * 处理应用启动画面的渲染
 */

import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { AppManifest } from '@/os/registry/types'

interface SplashScreenPortalProps {
  splashingApp: AppManifest | null
  mounted: boolean
  onComplete: () => void
}

export function SplashScreenPortal({
  splashingApp,
  mounted,
  onComplete
}: SplashScreenPortalProps) {
  if (!mounted || !splashingApp?.splashScreen) return null

  const SplashComponent = splashingApp.splashScreen

  return createPortal(
    <AnimatePresence>
      <SplashComponent onComplete={onComplete} />
    </AnimatePresence>,
    document.body
  )
}
