'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Cloud, CloudRain, Sun, CloudLightning, Wind, Thermometer, MapPin, CloudSnow, CloudFog, CloudDrizzle, Loader2 } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { APPS_REGISTRY } from '@/os/registry/config'

// Types
interface WeatherState {
  current: {
    temp: number
    code: number
    humidity: number
    windSpeed: number
  }
  forecast: Array<{
    date: string
    maxTemp: number
    minTemp: number
    code: number
  }>
  location: string
  loading: boolean
  error: boolean
}

// WMO Weather Code Interpretation (0-99)
const getWeatherInfo = (code: number) => {
  // Clear Sky
  if (code === 0) return { icon: Sun, label: { en: 'Clear Sky', zh: '晴朗' }, color: 'text-yellow-400' }
  // Mainly Clear, Partly Cloudy, Overcast
  if ([1, 2, 3].includes(code)) return { icon: Cloud, label: { en: 'Cloudy', zh: '多云' }, color: 'text-gray-300' }
  // Fog
  if ([45, 48].includes(code)) return { icon: CloudFog, label: { en: 'Foggy', zh: '雾' }, color: 'text-gray-400' }
  // Drizzle
  if ([51, 53, 55].includes(code)) return { icon: CloudDrizzle, label: { en: 'Drizzle', zh: '毛毛雨' }, color: 'text-blue-300' }
  // Freezing Drizzle
  if ([56, 57].includes(code)) return { icon: CloudDrizzle, label: { en: 'Freezing Drizzle', zh: '冻雨' }, color: 'text-cyan-300' }
  // Rain
  if ([61, 63, 65].includes(code)) return { icon: CloudRain, label: { en: 'Rain', zh: '下雨' }, color: 'text-blue-400' }
  // Freezing Rain
  if ([66, 67].includes(code)) return { icon: CloudRain, label: { en: 'Freezing Rain', zh: '冻雨' }, color: 'text-cyan-400' }
  // Snow Fall
  if ([71, 73, 75].includes(code)) return { icon: CloudSnow, label: { en: 'Snow', zh: '下雪' }, color: 'text-white' }
  // Snow Grains
  if (code === 77) return { icon: CloudSnow, label: { en: 'Snow Grains', zh: '雪粒' }, color: 'text-white' }
  // Rain Showers
  if ([80, 81, 82].includes(code)) return { icon: CloudRain, label: { en: 'Showers', zh: '阵雨' }, color: 'text-blue-400' }
  // Snow Showers
  if ([85, 86].includes(code)) return { icon: CloudSnow, label: { en: 'Snow Showers', zh: '阵雪' }, color: 'text-white' }
  // Thunderstorm
  if (code === 95) return { icon: CloudLightning, label: { en: 'Thunderstorm', zh: '雷暴' }, color: 'text-purple-400' }
  // Thunderstorm with Hail
  if ([96, 99].includes(code)) return { icon: CloudLightning, label: { en: 'Thunderstorm', zh: '雷暴伴冰雹' }, color: 'text-purple-500' }

  return { icon: Sun, label: { en: 'Unknown', zh: '未知' }, color: 'text-gray-400' }
}

// Default Location (Shanghai)
const DEFAULT_LOCATION = {
  lat: 31.2304,
  lon: 121.4737,
  city: 'Shanghai'
}

interface WeatherWidgetProps {
  dragConstraintsRef?: React.RefObject<HTMLDivElement>
}

export default function WeatherWidget({ dragConstraintsRef }: WeatherWidgetProps) {
  const { language } = useLanguage()
  const { launchApp } = useWindowStore()
  const { showMenu } = useContextMenuStore()
  const [mounted, setMounted] = useState(false)
  const [weather, setWeather] = useState<WeatherState>({
    current: { temp: 0, code: 0, humidity: 0, windSpeed: 0 },
    forecast: [],
    location: 'Loading...',
    loading: true,
    error: false
  })

  useEffect(() => {
    setMounted(true)
    fetchWeatherData()
  }, [])

  const fetchWeatherData = async () => {
    try {
      let latitude = DEFAULT_LOCATION.lat
      let longitude = DEFAULT_LOCATION.lon
      let city = DEFAULT_LOCATION.city

      // 1. Try Get Location via IP (Multi-source Fallback)
      try {
        // Strategy: Try Primary -> If fail, Try Backup
        const fetchLocation = async (url: string) => {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000)
          const res = await fetch(url, { signal: controller.signal })
          clearTimeout(timeoutId)
          if (!res.ok) throw new Error(`Fetch failed: ${url}`)
          return res.json()
        }

        try {
          // Attempt 1: ipapi.co
          const locData = await fetchLocation('https://ipapi.co/json/')
          if (locData.latitude && locData.longitude) {
            latitude = locData.latitude
            longitude = locData.longitude
            city = locData.city || locData.region || city
          }
        } catch (e) {
          console.warn('Primary geo-ip failed, trying backup...', e)
          // Attempt 2: geojs.io (Backup)
          const locData = await fetchLocation('https://get.geojs.io/v1/ip/geo.json')
          if (locData.latitude && locData.longitude) {
            latitude = parseFloat(locData.latitude)
            longitude = parseFloat(locData.longitude)
            city = locData.city || locData.region || city
          }
        }
      } catch (locErr) {
        console.warn('All location auto-detect sources failed, using default:', locErr)
        // Fallback silently to default
      }

      // 2. Get Weather via Open-Meteo
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
      
      const weatherRes = await fetch(weatherUrl)
      if (!weatherRes.ok) throw new Error('Weather fetch failed')
      const weatherData = await weatherRes.json()

      // 3. Transform Data
      setWeather({
        current: {
          temp: Math.round(weatherData.current.temperature_2m),
          code: weatherData.current.weather_code,
          humidity: weatherData.current.relative_humidity_2m,
          windSpeed: Math.round(weatherData.current.wind_speed_10m)
        },
        forecast: weatherData.daily.time.slice(1, 5).map((date: string, index: number) => ({
          date,
          maxTemp: Math.round(weatherData.daily.temperature_2m_max[index + 1]),
          minTemp: Math.round(weatherData.daily.temperature_2m_min[index + 1]),
          code: weatherData.daily.weather_code[index + 1]
        })),
        location: city || 'Unknown Location',
        loading: false,
        error: false
      })

    } catch (err) {
      console.error('Weather widget error:', err)
      // If critical error, maybe try fallback weather or show simple error
      setWeather(prev => ({ ...prev, loading: false, error: true }))
    }
  }

  if (!mounted) return null

  // Loading State
  if (weather.loading) {
    return (
      <div className="absolute top-6 right-6 z-10 p-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 w-64 h-48 flex items-center justify-center">
        <Loader2 className="animate-spin text-white/50" />
      </div>
    )
  }

  // Error State
  if (weather.error) {
    return null // Hide on error to not clutter UI
  }

  const currentInfo = getWeatherInfo(weather.current.code)
  const CurrentIcon = currentInfo.icon

  return (
    <motion.div
      drag
      dragConstraints={dragConstraintsRef}
      dragElastic={0.1}
      dragMomentum={false}
      whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        showMenu(e.clientX, e.clientY, 'weather-widget', {
          onRefresh: fetchWeatherData
        })
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        const app = APPS_REGISTRY['weather']
        if (app) {
          launchApp(
            app.id,
            app.title,
            <app.component />,
            app.icon,
            app.defaultWindowOptions
          )
        }
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="absolute top-6 right-6 z-10 flex flex-col items-end pointer-events-auto cursor-grab"
    >
      {/* Main Card */}
      <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-64 text-white hover:bg-black/30 transition-colors group">
        
        {/* Header: Location & Status */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-white/80 text-sm font-medium mb-0.5">
              <MapPin size={12} />
              <span className="truncate max-w-[120px]">{weather.location}</span>
            </div>
            <span className="text-xs text-white/50">
              {new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="p-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
             <CurrentIcon size={32} className={currentInfo.color} />
          </div>
        </div>

        {/* Big Temp */}
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-5xl font-light tracking-tighter">
            {weather.current.temp}°
          </span>
          <span className="text-lg text-white/60 font-medium">
            {language === 'zh' ? currentInfo.label.zh : currentInfo.label.en}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
            <Wind size={14} className="text-white/40" />
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40">{language === 'zh' ? '风速' : 'Wind'}</span>
              <span className="text-xs font-medium">{weather.current.windSpeed} km/h</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
            <Thermometer size={14} className="text-white/40" />
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40">{language === 'zh' ? '湿度' : 'Humidity'}</span>
              <span className="text-xs font-medium">{weather.current.humidity}%</span>
            </div>
          </div>
        </div>

        {/* Mini Forecast */}
        <div className="flex justify-between border-t border-white/10 pt-3">
          {weather.forecast.map((day, i) => {
            const dayInfo = getWeatherInfo(day.code)
            const DayIcon = dayInfo.icon
            const dateObj = new Date(day.date)
            const dayName = dateObj.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short' })
            
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-white/40">{dayName}</span>
                <DayIcon size={14} className="text-white/80" />
                <span className="text-xs font-medium">{Math.round((day.maxTemp + day.minTemp) / 2)}°</span>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
