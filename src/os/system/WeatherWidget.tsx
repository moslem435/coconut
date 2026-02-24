'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wind, Thermometer, MapPin, Loader2 } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import { readWeatherCache, writeWeatherCache, WEATHER_CACHE_TTL } from '@/apps/weather/utils/cache'
import { WeatherCachePayload, WeatherState as AppWeatherState, getWeatherInfo } from '@/apps/weather/utils/types'

// Default Location (Shanghai)
const DEFAULT_LOCATION = {
  lat: 31.2304,
  lon: 121.4737,
  city: 'Shanghai'
}

interface WeatherWidgetProps {
  dragConstraintsRef?: React.RefObject<HTMLDivElement | null>
}

export default function WeatherWidget({ dragConstraintsRef }: WeatherWidgetProps) {
  const { language } = useLanguage()
  const { launchApp } = useWindowStore()
  const { showMenu } = useContextMenuStore()
  const [mounted, setMounted] = useState(false)
  
  // Use App's WeatherState type
  const [weather, setWeather] = useState<AppWeatherState>({
    current: { 
      temp: 0, code: 0, humidity: 0, windSpeed: 0, 
      windDirection: 0, pressure: 0, visibility: 0, feelsLike: 0, isDay: 1 
    },
    forecast: [],
    hourly: [],
    location: 'Loading...',
    loading: true,
    error: false,
    lastUpdated: null,
    stale: false
  })

  useEffect(() => {
    setMounted(true)
    
    // Initial Load
    loadFromCache()
    
    // Listen for cache updates from App
    const handleCacheUpdate = () => {
      loadFromCache()
    }
    
    window.addEventListener('weather-cache-update', handleCacheUpdate)
    window.addEventListener('storage', handleCacheUpdate)

    // Fetch if cache is missing or stale
    const cached = readWeatherCache()
    if (!cached || Date.now() - cached.timestamp > WEATHER_CACHE_TTL) {
       fetchWeatherData()
    }

    return () => {
      window.removeEventListener('weather-cache-update', handleCacheUpdate)
      window.removeEventListener('storage', handleCacheUpdate)
    }
  }, [])

  const loadFromCache = () => {
    const cached = readWeatherCache()
    if (cached) {
      const isStale = Date.now() - cached.timestamp > WEATHER_CACHE_TTL
      setWeather(prev => ({
        ...prev,
        ...cached.data,
        loading: false,
        error: false,
        lastUpdated: cached.timestamp,
        stale: isStale
      }))
    }
  }

  const fetchWeatherData = async (force = false) => {
    const cached = readWeatherCache()
    const now = Date.now()
    
    if (!force && cached && now - cached.timestamp < WEATHER_CACHE_TTL) {
      loadFromCache()
      return
    }

    try {
      setWeather(prev => ({ ...prev, loading: true }))

      // 1. Get Location
      let latitude = cached?.latitude ?? DEFAULT_LOCATION.lat
      let longitude = cached?.longitude ?? DEFAULT_LOCATION.lon
      let city = cached?.city ?? DEFAULT_LOCATION.city

      if (!cached) {
          try {
            const locRes = await fetch('/api/weather?type=location')
            if (locRes.ok) {
              const locData = await locRes.json()
              if (locData.latitude && locData.longitude) {
                latitude = locData.latitude
                longitude = locData.longitude
                city = locData.city || city
              }
            }
          } catch (e) {
             console.warn('Location fetch failed', e)
          }
      }

      // 2. Get Weather via API (Now returns full data compatible with App)
      const weatherRes = await fetch(`/api/weather?type=forecast&lat=${latitude}&lon=${longitude}`)
      if (!weatherRes.ok) throw new Error('Weather fetch failed')
      const weatherData = await weatherRes.json()

      // 3. Transform Data (Replicating App logic for consistency)
      const currentHour = new Date().getHours()
      const locationName = city || 'Unknown Location'
      
      const nextData: WeatherCachePayload = {
        current: {
          temp: Math.round(weatherData.current.temperature_2m),
          code: weatherData.current.weather_code,
          humidity: weatherData.current.relative_humidity_2m,
          windSpeed: Math.round(weatherData.current.wind_speed_10m),
          windDirection: weatherData.current.wind_direction_10m,
          pressure: Math.round(weatherData.current.surface_pressure),
          visibility: Math.round(weatherData.current.visibility / 1000),
          feelsLike: Math.round(weatherData.current.apparent_temperature),
          isDay: weatherData.current.is_day
        },
        forecast: weatherData.daily.time.slice(1, 6).map((date: string, index: number) => ({
          date,
          maxTemp: Math.round(weatherData.daily.temperature_2m_max[index + 1]),
          minTemp: Math.round(weatherData.daily.temperature_2m_min[index + 1]),
          code: weatherData.daily.weather_code[index + 1],
          precipitationProbability: weatherData.daily.precipitation_probability_max?.[index + 1] || 0
        })),
        hourly: weatherData.hourly.time.slice(currentHour, currentHour + 24).map((time: string, index: number) => ({
          time,
          temp: Math.round(weatherData.hourly.temperature_2m[currentHour + index]),
          code: weatherData.hourly.weather_code[currentHour + index]
        })),
        location: locationName
      }

      const updatedAt = Date.now()
      
      setWeather({
        ...nextData,
        loading: false,
        error: false,
        lastUpdated: updatedAt,
        stale: false
      })
      
      writeWeatherCache({
        timestamp: updatedAt,
        data: nextData,
        latitude,
        longitude,
        city: locationName
      })

    } catch (err) {
      console.error('Weather widget error:', err)
      if (cached) {
         loadFromCache()
         setWeather(prev => ({ ...prev, stale: true, loading: false }))
      } else {
         setWeather(prev => ({ ...prev, loading: false, error: true }))
      }
    }
  }

  if (!mounted) return null

  // Loading State
  if (weather.loading && !weather.current.temp) {
    return (
      <div className="absolute top-6 right-6 z-10 p-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 w-64 h-48 flex items-center justify-center">
        <Loader2 className="animate-spin text-white/50" />
      </div>
    )
  }

  // Error State
  if (weather.error) {
    return null
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
          onRefresh: () => fetchWeatherData(true)
        })
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        const app = APPS_REGISTRY['weather']
        if (app) {
          launchApp(
            app.id,
            app.title,
            app.id,
            app.icon,
            app.defaultWindowOptions
          )
        }
      }}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.5, type: "spring", stiffness: 100, damping: 20 }}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
      className="absolute top-6 right-6 z-10 flex flex-col items-end pointer-events-auto cursor-grab rounded-2xl overflow-hidden"
    >
      {/* Main Card Content */}
      <div className="p-4 w-64 text-white hover:bg-white/5 transition-colors group">

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
            {weather.lastUpdated && (
              <span className="text-[10px] text-white/40">
                {language === 'zh'
                  ? `更新于 ${new Date(weather.lastUpdated).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
                  : `Updated ${new Date(weather.lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                {weather.stale ? (language === 'zh' ? ' · 离线' : ' · Offline') : ''}
              </span>
            )}
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

        {/* Mini Forecast - Limit to 4 items */}
        <div className="flex justify-between border-t border-white/10 pt-3">
          {weather.forecast.slice(0, 4).map((day, i) => {
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
