import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RainCanvas } from './RainCanvas'

interface WeatherBackgroundProps {
  code: number
  isDay: number
  windSpeed?: number
  windDirection?: number
}

export function WeatherBackground({ code, isDay, windSpeed = 0, windDirection = 0 }: WeatherBackgroundProps) {
  // Determine weather type
  const isClear = code === 0 || code === 1
  const isCloudy = [2, 3].includes(code)
  const isFoggy = [45, 48].includes(code)
  const isDrizzle = [51, 53, 55, 56, 57].includes(code)
  const isRain = [61, 63, 65, 66, 67, 80, 81, 82].includes(code)
  const isSnow = [71, 73, 75, 77, 85, 86].includes(code)
  const isThunder = [95, 96, 99].includes(code)

  // Background Gradients
  const getGradient = () => {
    if (isDay) {
      if (isClear) return 'bg-gradient-to-b from-[#29B6F6] to-[#0288D1]'
      if (isCloudy) return 'bg-gradient-to-b from-[#78909C] to-[#546E7A]'
      if (isFoggy) return 'bg-gradient-to-b from-[#B0BEC5] to-[#78909C]'
      if (isRain || isDrizzle) return 'bg-gradient-to-b from-[#455A64] to-[#263238]'
      if (isSnow) return 'bg-gradient-to-b from-[#90A4AE] to-[#607D8B]'
      if (isThunder) return 'bg-gradient-to-b from-[#212121] to-[#0D47A1]'
      return 'bg-gradient-to-b from-[#29B6F6] to-[#0288D1]'
    } else {
      // Night
      if (isClear) return 'bg-gradient-to-b from-[#0D47A1] to-[#000000]'
      if (isCloudy) return 'bg-gradient-to-b from-[#263238] to-[#102027]'
      if (isFoggy) return 'bg-gradient-to-b from-[#37474F] to-[#263238]'
      if (isRain || isDrizzle) return 'bg-gradient-to-b from-[#263238] to-[#000000]'
      if (isSnow) return 'bg-gradient-to-b from-[#37474F] to-[#102027]'
      if (isThunder) return 'bg-gradient-to-b from-[#000000] to-[#1A237E]'
      return 'bg-gradient-to-b from-[#0D47A1] to-[#000000]'
    }
  }

  return (
    <div className={`absolute inset-0 z-0 overflow-hidden transition-all duration-1000 ${getGradient()}`}>
      
      {/* Day: Sun / Night: Stars */}
      {isClear && isDay && <SunElement />}
      {isClear && !isDay && <StarsElement />}
      
      {/* Clouds - Visible for Cloudy, Rain, Snow, Thunder */}
      {(isCloudy || isRain || isDrizzle || isSnow || isThunder || isFoggy) && (
        <CloudsElement intensity={isCloudy ? 'light' : 'heavy'} isDay={isDay} />
      )}

      {/* Rain with Canvas Collision */}
      {(isRain || isDrizzle || isThunder) && (
        <>
          <RainCanvas intensity={isDrizzle ? 'light' : 'heavy'} layer="back" windSpeed={windSpeed} windDirection={windDirection} />
          <RainCanvas intensity={isDrizzle ? 'light' : 'heavy'} layer="front" windSpeed={windSpeed} windDirection={windDirection} />
        </>
      )}

      {/* Snow */}
      {isSnow && <SnowElement />}

      {/* Thunder */}
      {isThunder && <ThunderElement />}

      {/* Fog Overlay */}
      {isFoggy && <div className="absolute inset-0 bg-white/20 animate-pulse" style={{ animationDuration: '5s' }} />}
    </div>
  )
}

// --- Sub Components for Effects ---

function SunElement() {
  return (
    <div className="absolute top-10 right-10 w-24 h-24 bg-yellow-300 rounded-full blur-2xl opacity-80 animate-pulse" 
         style={{ animationDuration: '4s' }} 
    />
  )
}

function StarsElement() {
  // Generate static stars for performance
  return (
    <div className="absolute inset-0">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute bg-white rounded-full opacity-80 animate-pulse"
          style={{
            top: `${Math.random() * 60}%`,
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${Math.random() * 3 + 2}s`
          }}
        />
      ))}
    </div>
  )
}

function CloudsElement({ intensity, isDay }: { intensity: 'light' | 'heavy', isDay: number }) {
  const cloudColor = isDay ? 'bg-white/20' : 'bg-white/5'
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className={`absolute top-[10%] -left-[20%] w-[40%] h-[20%] rounded-full blur-3xl ${cloudColor} animate-cloud-move`} style={{ animationDuration: '60s' }} />
      <div className={`absolute top-[20%] -right-[10%] w-[50%] h-[25%] rounded-full blur-3xl ${cloudColor} animate-cloud-move`} style={{ animationDuration: '45s', animationDirection: 'reverse' }} />
      {intensity === 'heavy' && (
         <div className={`absolute top-[5%] left-[20%] w-[60%] h-[30%] rounded-full blur-3xl ${cloudColor} opacity-60 animate-cloud-move`} style={{ animationDuration: '50s' }} />
      )}
    </div>
  )
}



function SnowElement() {
  const [snowflakes, setSnowflakes] = useState<{id: number, left: string, duration: number, delay: number, size: number}[]>([])

  useEffect(() => {
    const flakes = [...Array(60)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: 4 + Math.random() * 6, // Slower fall for snow
      delay: Math.random() * 5,
      size: Math.random() * 3 + 2 // 2px to 5px
    }))
    setSnowflakes(flakes)
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
       {snowflakes.map((flake) => (
         <motion.div 
            key={flake.id}
            className="absolute bg-white rounded-full opacity-90"
            initial={{ y: -20, x: 0, opacity: 0 }}
            animate={{ 
              y: '100vh', 
              x: [-20, 20, -20], // Gentle sway
              opacity: [0, 1, 1, 0] 
            }}
            transition={{
              y: { duration: flake.duration, repeat: Infinity, delay: flake.delay, ease: "linear" },
              x: { duration: 3, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" },
              opacity: { duration: flake.duration, repeat: Infinity, delay: flake.delay, times: [0, 0.1, 0.9, 1] }
            }}
            style={{
              left: flake.left,
              width: flake.size,
              height: flake.size
            }}
         />
       ))}
    </div>
  )
}

function ThunderElement() {
  const [flash, setFlash] = useState(false)
  
  useEffect(() => {
    const loop = () => {
      const delay = 2000 + Math.random() * 5000
      setTimeout(() => {
        setFlash(true)
        setTimeout(() => setFlash(false), 200) // Flash duration
        loop()
      }, delay)
    }
    loop()
  }, [])

  return (
    <div className={`absolute inset-0 bg-white transition-opacity duration-100 pointer-events-none ${flash ? 'opacity-30' : 'opacity-0'}`} />
  )
}
