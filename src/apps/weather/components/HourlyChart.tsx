import React from 'react'

export function HourlyChart({ data, language }: { data: any[], language: string }) {
  const temps = data.map(d => d.temp)
  const max = Math.max(...temps, 10) + 2
  const min = Math.min(...temps, 0) - 2
  const range = max - min
  
  // Generate smooth bezier curve path
  const getPath = (points: {x: number, y: number}[]) => {
    if (points.length === 0) return ''
    
    // First point
    let d = `M ${points[0].x},${points[0].y}`
    
    // Cubic bezier curves
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]
      const p1 = points[i + 1]
      
      // Control points
      const cp1x = p0.x + (p1.x - p0.x) * 0.5
      const cp1y = p0.y
      const cp2x = p1.x - (p1.x - p0.x) * 0.5
      const cp2y = p1.y
      
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`
    }
    
    return d
  }

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((d.temp - min) / range) * 100
    return { x, y }
  })
  
  const linePath = getPath(points)
  const areaPath = `${linePath} L 100,100 L 0,100 Z`

  return (
    <div className="w-full h-full flex flex-col justify-end">
      <div className="relative w-full h-20">
        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          {/* Gradient Area */}
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.3" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={areaPath}
            fill="url(#tempGradient)"
          />
          {/* Line */}
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
        
        {/* Data Points Labels (Every 3 hours) */}
        <div className="absolute top-0 left-0 w-full h-full flex justify-between items-end pointer-events-none">
          {data.map((d, i) => {
            if (i % 4 !== 0) return null // Show every 4th item (approx every 4 hours)
            const date = new Date(d.time)
            const hour = date.getHours()
            const timeStr = `${hour}:00`
            
            return (
              <div key={i} className="flex flex-col items-center pb-2 text-xs text-white/60" style={{ position: 'absolute', left: `${(i / (data.length - 1)) * 100}%`, transform: 'translateX(-50%)' }}>
                 <span className="mb-1 font-bold text-white drop-shadow-md">{d.temp}°</span>
                 <span className="text-[10px] opacity-60">{timeStr}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
