/**
 * 壁纸管理 Hook
 * 处理壁纸加载、过渡动画等逻辑
 */

import { useState, useEffect, useRef } from 'react'

export interface WallpaperConfig {
  type: 'image' | 'video' | 'gradient' | 'preset' | 'solid' | 'daily'
  value: string
}

export interface WallpaperState {
  activeWallpaper: string | null
  loadedWallpaper: string | null
  isLoading: boolean
  transitionType: 'fade' | 'zoom-in' | 'zoom-out' | 'blur'
}

export function useWallpaper(wallpaper: WallpaperConfig | null) {
  const [activeWallpaper, setActiveWallpaper] = useState<string | null>(null)
  const [loadedWallpaper, setLoadedWallpaper] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [transitionType, setTransitionType] = useState<WallpaperState['transitionType']>('fade')

  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstImageLoad = useRef(true)
  const [dailyRefreshKey, setDailyRefreshKey] = useState(new Date().toDateString())

  // Check for day change every minute if using daily wallpaper
  useEffect(() => {
    if (wallpaper?.type !== 'daily') return

    const checkDate = () => {
      const today = new Date().toDateString()
      if (today !== dailyRefreshKey) {
        setDailyRefreshKey(today)
      }
    }

    const interval = setInterval(checkDate, 60000)
    return () => clearInterval(interval)
  }, [wallpaper?.type, dailyRefreshKey])

  useEffect(() => {
    if (!wallpaper) return

    let isCancelled = false

    // 清理之前的过渡
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
      transitionTimeoutRef.current = null
    }

    const load = async () => {
      let targetValue = wallpaper.value

      // 如果是每日壁纸，先获取 URL
      if (wallpaper.type === 'daily') {
        setIsLoading(true)
        try {
          // Add timestamp to prevent browser caching
          const res = await fetch(`/api/wallpaper?t=${Date.now()}`)
          const data = await res.json()
          if (isCancelled) return
          if (data.url) {
            targetValue = data.url
          }
        } catch (error) {
          console.error('Failed to load daily wallpaper:', error)
          if (isCancelled) return
          setIsLoading(false)
          return
        }
      }

      // 图片类型壁纸 (daily 也是图片)
      if (wallpaper.type === 'image' || wallpaper.type === 'preset' || wallpaper.type === 'daily') {
        // 首次加载直接显示
        if (isFirstImageLoad.current) {
          isFirstImageLoad.current = false
          setActiveWallpaper(targetValue)
          setLoadedWallpaper(null)
          setIsLoading(false)
          return
        }

        // 已经是当前壁纸，跳过
        if (loadedWallpaper === targetValue && activeWallpaper === targetValue) {
          setIsLoading(false)
          return
        }
        
        // 如果当前已经在显示这个壁纸（可能之前是 null，现在加载完了）
        if (activeWallpaper === targetValue) {
            setIsLoading(false)
            return
        }

        // 随机选择过渡效果
        const transitions: WallpaperState['transitionType'][] = ['fade', 'zoom-in', 'zoom-out', 'blur']
        setTransitionType(transitions[Math.floor(Math.random() * transitions.length)])

        // 预加载新壁纸
        setIsLoading(true)
        const img = new Image()
        img.src = targetValue

        img.onload = () => {
          if (isCancelled) return
          setLoadedWallpaper(targetValue)
          setIsLoading(false)

          // 延迟切换以显示过渡动画
          transitionTimeoutRef.current = setTimeout(() => {
            if (!isCancelled) {
              setActiveWallpaper(targetValue)
            }
          }, 1000)
        }

        img.onerror = () => {
          if (isCancelled) {
            return
          }
          setIsLoading(false)
        }
      } else {
        // 视频或渐变直接切换
        if (isCancelled) return
        setLoadedWallpaper(null)
        setActiveWallpaper(targetValue)
        setIsLoading(false)
      }
    }

    load()

    // 清理函数
    return () => {
      isCancelled = true
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [wallpaper?.value, wallpaper?.type, dailyRefreshKey])

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
