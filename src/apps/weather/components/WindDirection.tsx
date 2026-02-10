import React from 'react'
import { Navigation } from 'lucide-react'

const getDirectionText = (degree: number) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(degree / 45) % 8
  return directions[index]
}

export function WindDirection({ degree }: { degree: number }) {
  // Navigation icon points North (0deg) by default (arrow head up)
  // Wind direction is where it comes FROM.
  // We want arrow to point where wind is going TO.
  // So we add 180 degrees.
  const rotation = degree + 180

  return (
    <div className="flex items-center gap-1">
      <Navigation size={10} style={{ transform: `rotate(${rotation}deg)` }} />
      <span>{getDirectionText(degree)}</span>
    </div>
  )
}
