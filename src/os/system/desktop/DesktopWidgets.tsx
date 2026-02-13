/**
 * 桌面小部件容器组件
 * 管理桌面上的各种小部件
 */

import { RefObject } from 'react'
import WeatherWidget from '@/os/system/WeatherWidget'

interface DesktopWidgetsProps {
  showWeatherWidget: boolean
  dragConstraintsRef: RefObject<HTMLDivElement | null>
}

export function DesktopWidgets({
  showWeatherWidget,
  dragConstraintsRef
}: DesktopWidgetsProps) {
  if (!showWeatherWidget) return null

  return (
    <>
      <WeatherWidget dragConstraintsRef={dragConstraintsRef} />
      {/* 未来可以添加更多小部件 */}
    </>
  )
}
