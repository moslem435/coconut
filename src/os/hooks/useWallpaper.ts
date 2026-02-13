/**
 * 壁纸管理 Hook
 * 处理壁纸加载、过渡动画等逻辑
 */

import { useState, useEffect, useRef } from 'react'

export interface WallpaperConfig {
  type: 'image' | 'video' | 'gradient'
  value: string
}

export interface WallpaperState {
  activeWallpaper: string | null
  loadedWallpaper: string | null
  isLoading: boolean
  transitionType: 'fade' | 'zoom-in' | 'zoom-out' | 'blur'
}

export function useWallpaper(wallpaper: WallpaperConfig | null) {
  const [activeWallpaper, setActiveWallpaper] = useState<string | null>(wallpaper?.value || null)
  const [loadedWallpaper, setLoadedWallpaper] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [transitionType, setTransitionType] = useState<WallpaperState['transitionType']>('fade')

  const currentWallpaperRef = useRef<string | null>(wallpaper?.value || null)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstImageLoad = useRef(true)

  useEffect(() => {
    if (!wallpaper) return
    currentWallpaperRef.current = wallpaper.value

    // 清理之前的过渡
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
      transitionTimeoutRef.current = null
    }

    // 图片类型壁纸
    if (wallpaper.type === 'image') {
      // 首次加载直接显示
      if (isFirstImageLoad.current) {
        isFirstImageLoad.current = false
        setActiveWallpaper(wallpaper.value)
        setLoadedWallpaper(null)
        setIsLoading(false)
        return
      }

      // 已经是当前壁纸，跳过
      if (loadedWallpaper === wallpaper.value && activeWallpaper === wallpaper.value) {
        return
      }

      // 随机选择过渡效果
      const transitions: WallpaperState['transitionType'][] = ['fade', 'zoom-in', 'zoom-out', 'blur']
      setTransitionType(transitions[Math.floor(Math.random() * transitions.length)])

      // 预加载新壁纸
      setIsLoading(true)
      const img = new Image()
      img.src = wallpaper.value

      img.onload = () => {
        if (currentWallpaperRef.current !== wallpaper.value) return
        setLoadedWallpaper(wallpaper.value)
        setIsLoading(false)

        // 延迟切换以显示过渡动画
        transitionTimeoutRef.current = setTimeout(() => {
          if (currentWallpaperRef.current === wallpaper.value) {
            setActiveWallpaper(wallpaper.value)
          }
        }, 1000)
      }

      img.onerror = () => {
        if (currentWallpaperRef.current === wallpaper.value) {
          setIsLoading(false)
        }
      }
    } else {
      // 视频或渐变直接切换
      setLoadedWallpaper(null)
      setActiveWallpaper(wallpaper.value)
      setIsLoading(false)
    }

    // 清理函数
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [wallpaper?.value, wallpaper?.type])

  /**
   * 获取过渡样式
   */
  const getTransitionStyle = (isVisible: boolean) => {
    const base = {
      transition: 'all 1000ms cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: isVisible ? 1 : 0,
    }

    if (isVisible) {
      return { ...base, transform: 'none', filter: 'none' }
    }

    switch (transitionType) {
      case 'zoom-in':
        return { ...base, transform: 'scale(1.1)' }
      case 'zoom-out':
        return { ...base, transform: 'scale(0.95)' }
      case 'blur':
        return { ...base, filter: 'blur(10px)', transform: 'scale(1.05)' }
      default:
        return base // fade
    }
  }

  return {
    activeWallpaper,
    loadedWallpaper,
    isLoading,
    transitionType,
    getTransitionStyle
  }
}
