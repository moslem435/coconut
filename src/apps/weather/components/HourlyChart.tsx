import React, { useRef, useEffect } from 'react'
import { getWeatherInfo } from '../utils/types'

export function HourlyChart({ data, language }: { data: any[], language: string }) {
  if (!data || data.length === 0) return null

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [startX, setStartX] = React.useState(0)
  const [scrollLeft, setScrollLeft] = React.useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft)
    setScrollLeft(scrollContainerRef.current.scrollLeft)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX) * 2 // Scroll-fast
    scrollContainerRef.current.scrollLeft = scrollLeft - walk
  }

  // Configuration
  const ITEM_WIDTH = 80 // Width per hour slot in pixels
  const CHART_HEIGHT = 200 // Fixed height for the internal SVG coordinate system
  const TOP_PADDING = 60 // Space for Icon + Temp
  const BOTTOM_PADDING = 30 // Space for Time
  const GRAPH_HEIGHT = CHART_HEIGHT - TOP_PADDING - BOTTOM_PADDING
  
  const totalWidth = data.length * ITEM_WIDTH

  // Calculate Range
  const temps = data.map(d => d.temp)
  const maxTemp = Math.max(...temps, 10) + 1
  const minTemp = Math.min(...temps, 0) - 1
  const range = maxTemp - minTemp || 1

  // Calculate Points
  const points = data.map((d, i) => {
    const x = i * ITEM_WIDTH + ITEM_WIDTH / 2
    // Normalize temp to 0-1 (0 is min, 1 is max)
    const normalized = (d.temp - minTemp) / range
    // Map to Y: Higher temp -> Smaller Y (top)
    const y = TOP_PADDING + GRAPH_HEIGHT - (normalized * GRAPH_HEIGHT)
    return { x, y, ...d }
  })

  // Generate Path
  const getPath = (pts: typeof points) => {
    if (pts.length === 0) return ''
    let d = `M ${pts[0].x},${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i]
      const p1 = pts[i + 1]
      const cp1x = p0.x + (p1.x - p0.x) * 0.5
      const cp1y = p0.y
      const cp2x = p1.x - (p1.x - p0.x) * 0.5
      const cp2y = p1.y
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`
    }
    return d
  }

  const linePath = getPath(points)
  // Close the path for the area fill
  const areaPath = `${linePath} L ${totalWidth},${CHART_HEIGHT} L 0,${CHART_HEIGHT} Z`

  return (
    <div 
      ref={scrollContainerRef}
      className={`w-full h-full overflow-x-auto overflow-y-hidden hide-scrollbar ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar for Firefox/IE
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <style>{`
        /* Hide scrollbar for Chrome/Safari/Opera */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div 
        className="relative" 
        style={{ width: totalWidth, height: '100%' }}
      >
        {/* SVG Graph */}
        <svg 
          width={totalWidth} 
          height="100%" 
          viewBox={`0 0 ${totalWidth} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute top-0 left-0 overflow-visible"
        >
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.3" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#tempGradient)" />
          <path 
            d={linePath} 
            fill="none" 
            stroke="white" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="drop-shadow-md"
          />
        </svg>

        {/* Data Points & Labels */}
        {points.map((p, i) => {
          const weatherInfo = getWeatherInfo(p.code)
          const Icon = weatherInfo.icon
          const date = new Date(p.time)
          const hour = date.getHours()
          const timeStr = `${hour}:00`

          // Scale Y to percentage for absolute positioning if container height varies, 
          // but since we map logic to CHART_HEIGHT, we can use pixels if container is fixed aspect or just use percentage.
          // Safer to use percentage relative to CHART_HEIGHT.
          const topPct = (p.y / CHART_HEIGHT) * 100

          return (
            <div 
              key={i} 
              className="absolute top-0 flex flex-col items-center pointer-events-none group"
              style={{ 
                left: p.x, 
                width: ITEM_WIDTH, 
                height: '100%',
                transform: 'translateX(-50%)' 
              }}
            >
              {/* Top Group: Icon + Temp */}
              <div 
                className="absolute flex flex-col items-center gap-1 transition-all duration-300"
                style={{ top: `${topPct}%`, transform: 'translateY(-100%) translateY(-12px)' }}
              >
                <Icon size={16} className="text-white/80 drop-shadow-md" />
                <span className="text-sm font-bold text-white drop-shadow-md">{p.temp}°</span>
              </div>

              {/* Dot on Line */}
              <div 
                className="absolute w-2 h-2 bg-white rounded-full shadow-md z-10"
                style={{ top: `${topPct}%`, transform: 'translateY(-50%)' }}
              />

              {/* Dashed Line */}
              <div 
                className="absolute border-l border-dashed border-white/20 transition-opacity duration-300"
                style={{ 
                  top: `${topPct}%`, 
                  bottom: `${(BOTTOM_PADDING / CHART_HEIGHT) * 100}%`, 
                  left: '50%' 
                }}
              />

              {/* Time Label */}
              <div 
                className="absolute bottom-0 text-xs text-white/50 font-medium flex items-center justify-center"
                style={{ height: `${(BOTTOM_PADDING / CHART_HEIGHT) * 100}%`, width: '100%' }}
              >
                {timeStr}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
