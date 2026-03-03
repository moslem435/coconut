/**
 * 桌面背景组件
 * 处理壁纸显示和过渡动画
 */

import { WallpaperConfig, WallpaperState } from '@/os/hooks/useWallpaper'

interface DesktopBackgroundProps {
  wallpaper: WallpaperConfig | null
  isVisible: boolean
  activeWallpaper: string | null
  activeType: WallpaperConfig['type'] | null
  loadedWallpaper: string | null
  isLoading: boolean
  getTransitionStyle: (isVisible: boolean) => React.CSSProperties
}

export function DesktopBackground({ 
  wallpaper, 
  isVisible,
  activeWallpaper,
  activeType,
  loadedWallpaper,
  isLoading,
  getTransitionStyle
}: DesktopBackgroundProps) {
  
  const isVideo = (type: string | null) => type === 'video'
  const isImage = (type: string | null) => ['image', 'daily', 'dynamic-time'].includes(type || '')
  const isCSS = (type: string | null) => ['gradient', 'solid', 'preset'].includes(type || '')

  return (
    <div
      className="absolute inset-0 transition-opacity duration-1000 ease-out"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {/* 1. Active Wallpaper Layer (based on activeType) */}
      {isVideo(activeType) && activeWallpaper && (
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-all duration-1000"
          src={activeWallpaper}
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {isImage(activeType) && (
        <div
          className="absolute inset-0 transition-all duration-1000 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: activeWallpaper ? `url(${activeWallpaper})` : undefined,
            opacity: 1,
            backgroundColor: !activeWallpaper ? 'var(--os-bg-base)' : undefined
          }}
        />
      )}

      {isCSS(activeType) && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000 opacity-50"
          style={{ background: activeWallpaper || 'var(--os-bg-base)' }}
        />
      )}

      {/* 2. Loading Wallpaper Layer (for transition) */}
      {/* This layer is only for images currently, as useWallpaper handles others instantly */}
      {loadedWallpaper && (
        <div
          className="absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${loadedWallpaper})`,
            ...getTransitionStyle(!isLoading)
          }}
        />
      )}

      {/* 遮罩层 */}
      <div className="absolute inset-0 pointer-events-none bg-black/10" />
    </div>
  )
}
