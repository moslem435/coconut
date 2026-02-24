/**
 * 桌面背景组件
 * 处理壁纸显示和过渡动画
 */

import { WallpaperConfig, WallpaperState } from '@/os/hooks/useWallpaper'

interface DesktopBackgroundProps {
  wallpaper: WallpaperConfig | null
  isVisible: boolean
  activeWallpaper: string | null
  loadedWallpaper: string | null
  isLoading: boolean
  getTransitionStyle: (isVisible: boolean) => React.CSSProperties
}

export function DesktopBackground({ 
  wallpaper, 
  isVisible,
  activeWallpaper,
  loadedWallpaper,
  isLoading,
  getTransitionStyle
}: DesktopBackgroundProps) {
  return (
    <div
      className="absolute inset-0 transition-opacity duration-1000 ease-out"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {/* 视频壁纸 */}
      {wallpaper?.type === 'video' && (
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-all duration-1000"
          src={wallpaper.value}
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {/* 图片壁纸 */}
      {(wallpaper?.type === 'image' || wallpaper?.type === 'daily' || wallpaper?.type === 'dynamic-time') && (
        <>
          {/* 当前显示的壁纸 */}
          <div
            className="absolute inset-0 transition-all duration-1000 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: activeWallpaper ? `url(${activeWallpaper})` : undefined,
              opacity: 1,
              backgroundColor: !activeWallpaper ? 'var(--os-bg-base)' : undefined
            }}
          />
          
          {/* 预加载的新壁纸（用于过渡） */}
          <div
            className="absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: loadedWallpaper ? `url(${loadedWallpaper})` : undefined,
              ...getTransitionStyle(!isLoading && !!loadedWallpaper)
            }}
          />
        </>
      )}

      {/* 渐变壁纸 */}
      {(wallpaper?.type === 'gradient' || wallpaper?.type === 'solid' || wallpaper?.type === 'preset') && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000 opacity-50"
          style={{ background: wallpaper.value || 'var(--os-bg-base)' }}
        />
      )}

      {/* 遮罩层 */}
      <div className="absolute inset-0 pointer-events-none bg-black/10" />
    </div>
  )
}
