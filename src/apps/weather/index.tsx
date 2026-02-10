'use client'

import { useState, useEffect, useMemo } from 'react'
import { Cloud, CloudRain, Sun, CloudLightning, Wind, Thermometer, MapPin, CloudSnow, CloudFog, CloudDrizzle, Loader2, Calendar, Droplets, Eye, Gauge, Settings, LayoutTemplate, TrendingUp, Navigation, ArrowUp, ArrowDown } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'

// Types
interface WeatherState {
  current: {
    temp: number
    code: number
    humidity: number
    windSpeed: number
    pressure: number
    visibility: number
    feelsLike: number
  }
  forecast: Array<{
    date: string
    maxTemp: number
    minTemp: number
    code: number
    precipitationProbability?: number
  }>
  hourly: Array<{
    time: string
    temp: number
    code: number
  }>
  location: string
  loading: boolean
  error: boolean
}

// WMO Weather Code Interpretation (0-99)
const getWeatherInfo = (code: number) => {
  // Clear Sky
  if (code === 0) return { icon: Sun, label: { en: 'Clear Sky', zh: '晴朗' }, color: 'text-yellow-400', bg: 'from-blue-400 to-blue-600' }
  // Mainly Clear, Partly Cloudy, Overcast
  if ([1, 2, 3].includes(code)) return { icon: Cloud, label: { en: 'Cloudy', zh: '多云' }, color: 'text-gray-200', bg: 'from-gray-400 to-gray-600' }
  // Fog
  if ([45, 48].includes(code)) return { icon: CloudFog, label: { en: 'Foggy', zh: '雾' }, color: 'text-gray-300', bg: 'from-gray-500 to-gray-700' }
  // Drizzle
  if ([51, 53, 55].includes(code)) return { icon: CloudDrizzle, label: { en: 'Drizzle', zh: '毛毛雨' }, color: 'text-blue-300', bg: 'from-blue-500 to-gray-600' }
  // Freezing Drizzle
  if ([56, 57].includes(code)) return { icon: CloudDrizzle, label: { en: 'Freezing Drizzle', zh: '冻雨' }, color: 'text-cyan-300', bg: 'from-cyan-600 to-blue-800' }
  // Rain
  if ([61, 63, 65].includes(code)) return { icon: CloudRain, label: { en: 'Rain', zh: '下雨' }, color: 'text-blue-400', bg: 'from-blue-600 to-gray-800' }
  // Freezing Rain
  if ([66, 67].includes(code)) return { icon: CloudRain, label: { en: 'Freezing Rain', zh: '冻雨' }, color: 'text-cyan-400', bg: 'from-cyan-700 to-blue-900' }
  // Snow Fall
  if ([71, 73, 75].includes(code)) return { icon: CloudSnow, label: { en: 'Snow', zh: '下雪' }, color: 'text-white', bg: 'from-blue-300 to-gray-400' }
  // Snow Grains
  if (code === 77) return { icon: CloudSnow, label: { en: 'Snow Grains', zh: '雪粒' }, color: 'text-white', bg: 'from-blue-300 to-gray-400' }
  // Rain Showers
  if ([80, 81, 82].includes(code)) return { icon: CloudRain, label: { en: 'Showers', zh: '阵雨' }, color: 'text-blue-400', bg: 'from-blue-500 to-gray-700' }
  // Snow Showers
  if ([85, 86].includes(code)) return { icon: CloudSnow, label: { en: 'Snow Showers', zh: '阵雪' }, color: 'text-white', bg: 'from-blue-300 to-gray-500' }
  // Thunderstorm
  if (code === 95) return { icon: CloudLightning, label: { en: 'Thunderstorm', zh: '雷暴' }, color: 'text-purple-400', bg: 'from-gray-700 to-purple-900' }
  // Thunderstorm with Hail
  if ([96, 99].includes(code)) return { icon: CloudLightning, label: { en: 'Thunderstorm', zh: '雷暴伴冰雹' }, color: 'text-purple-500', bg: 'from-gray-800 to-purple-950' }

  return { icon: Sun, label: { en: 'Unknown', zh: '未知' }, color: 'text-gray-400', bg: 'from-gray-500 to-gray-700' }
}

// Default Location (Shanghai)
const DEFAULT_LOCATION = {
  lat: 31.2304,
  lon: 121.4737,
  city: 'Shanghai'
}

export default function WeatherApp() {
  const { language } = useLanguage()
  const { showWeatherWidget, setShowWeatherWidget } = useSystemSettings()
  const [weather, setWeather] = useState<WeatherState>({
    current: { temp: 0, code: 0, humidity: 0, windSpeed: 0, pressure: 0, visibility: 0, feelsLike: 0 },
    forecast: [],
    hourly: [],
    location: 'Loading...',
    loading: true,
    error: false
  })

  useEffect(() => {
    fetchWeatherData()
  }, [])

  const fetchWeatherData = async () => {
    try {
      let latitude = DEFAULT_LOCATION.lat
      let longitude = DEFAULT_LOCATION.lon
      let city = DEFAULT_LOCATION.city

      // 1. Try Get Location via IP (Multi-source Fallback)
      try {
        const fetchLocation = async (url: string) => {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000)
          const res = await fetch(url, { signal: controller.signal })
          clearTimeout(timeoutId)
          if (!res.ok) throw new Error(`Fetch failed: ${url}`)
          return res.json()
        }

        try {
          const locData = await fetchLocation('https://ipapi.co/json/')
          if (locData.latitude && locData.longitude) {
            latitude = locData.latitude
            longitude = locData.longitude
            city = locData.city || locData.region || city
          }
        } catch (e) {
          const locData = await fetchLocation('https://get.geojs.io/v1/ip/geo.json')
          if (locData.latitude && locData.longitude) {
            latitude = parseFloat(locData.latitude)
            longitude = parseFloat(locData.longitude)
            city = locData.city || locData.region || city
          }
        }
      } catch (locErr) {
        console.warn('Location auto-detect failed, using default:', locErr)
      }

      // 2. Get Weather via Open-Meteo
      // Added hourly=temperature_2m,weather_code for the chart
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,surface_pressure,visibility&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
      
      const weatherRes = await fetch(weatherUrl)
      if (!weatherRes.ok) throw new Error('Weather fetch failed')
      const weatherData = await weatherRes.json()

      // 3. Transform Data
      // Get current hour index to slice the next 24 hours correctly
      const currentHour = new Date().getHours()
      
      setWeather({
        current: {
          temp: Math.round(weatherData.current.temperature_2m),
          code: weatherData.current.weather_code,
          humidity: weatherData.current.relative_humidity_2m,
          windSpeed: Math.round(weatherData.current.wind_speed_10m),
          pressure: Math.round(weatherData.current.surface_pressure),
          visibility: Math.round(weatherData.current.visibility / 1000), // Convert to km
          feelsLike: Math.round(weatherData.current.apparent_temperature)
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
        location: city || 'Unknown Location',
        loading: false,
        error: false
      })

    } catch (err) {
      console.error('Weather app error:', err)
      setWeather(prev => ({ ...prev, loading: false, error: true }))
    }
  }

  if (weather.loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black/90 text-white">
        <Loader2 className="animate-spin mb-4 text-blue-400" size={48} />
        <p className="text-white/50 animate-pulse">{language === 'zh' ? '正在获取天气数据...' : 'Fetching weather data...'}</p>
      </div>
    )
  }

  if (weather.error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black/90 text-white p-8 text-center">
        <CloudRain size={64} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">{language === 'zh' ? '获取数据失败' : 'Failed to load weather'}</h2>
        <button 
          onClick={() => {
            setWeather(prev => ({ ...prev, loading: true, error: false }))
            fetchWeatherData()
          }}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          {language === 'zh' ? '重试' : 'Retry'}
        </button>
      </div>
    )
  }

  const currentInfo = getWeatherInfo(weather.current.code)
  const CurrentIcon = currentInfo.icon

  return (
    <div className={`h-full w-full flex flex-col text-white bg-gradient-to-br ${currentInfo.bg} transition-all duration-1000 overflow-hidden`}>
      
      {/* Settings Toggle */}
      <div className="absolute top-12 right-6 z-20">
        <button
          onClick={() => setShowWeatherWidget(!showWeatherWidget)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md transition-all border border-white/10 ${
            showWeatherWidget 
              ? 'bg-white/20 hover:bg-white/30 text-white' 
              : 'bg-black/20 hover:bg-black/30 text-white/70'
          }`}
        >
          <LayoutTemplate size={14} />
          {language === 'zh' ? (showWeatherWidget ? '桌面组件: 开' : '桌面组件: 关') : (showWeatherWidget ? 'Widget: On' : 'Widget: Off')}
        </button>
      </div>

      <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header Section */}
          <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-2">
            <div>
              <div className="flex items-center gap-2 text-white/80 mb-1">
                <MapPin size={18} />
                <span className="text-xl font-medium tracking-wide">{weather.location}</span>
              </div>
              <div className="flex items-end gap-4">
                <h1 className="text-8xl md:text-9xl font-thin tracking-tighter leading-none">
                  {weather.current.temp}°
                </h1>
                <div className="pb-4">
                  <p className="text-2xl md:text-3xl font-light">{language === 'zh' ? currentInfo.label.zh : currentInfo.label.en}</p>
                  <p className="text-white/60">
                    H:{weather.forecast[0]?.maxTemp}° L:{weather.forecast[0]?.minTemp}°
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden md:block opacity-80">
              <CurrentIcon size={120} className="drop-shadow-lg" />
            </div>
          </header>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Hourly Forecast (Wide Card) */}
            <div className="col-span-2 md:col-span-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 relative overflow-hidden group hover:bg-white/15 transition-all duration-300">
               <div className="flex items-center gap-2 text-white/60 mb-4 text-sm font-medium uppercase tracking-wider">
                  <TrendingUp size={16} />
                  {language === 'zh' ? '24小时预报' : '24-Hour Forecast'}
               </div>
               <div className="h-32 w-full">
                 <HourlyChart data={weather.hourly} language={language} />
               </div>
            </div>

            {/* Details Cards */}
            <BentoCard 
              icon={Thermometer}
              title={language === 'zh' ? '体感温度' : 'Feels Like'}
              value={`${weather.current.feelsLike}°`}
              desc={weather.current.feelsLike < weather.current.temp ? (language === 'zh' ? '较凉爽' : 'Cooler') : (language === 'zh' ? '较温暖' : 'Warmer')}
            />
            
            <BentoCard 
              icon={Droplets}
              title={language === 'zh' ? '湿度' : 'Humidity'}
              value={`${weather.current.humidity}%`}
              desc={language === 'zh' ? `露点: ${Math.round(weather.current.temp - (100 - weather.current.humidity)/5)}°` : `Dew Point: ${Math.round(weather.current.temp - (100 - weather.current.humidity)/5)}°`}
            />
            
            <BentoCard 
              icon={Wind}
              title={language === 'zh' ? '风速' : 'Wind'}
              value={`${weather.current.windSpeed}`}
              unit="km/h"
              desc={<WindDirection />}
            />
            
            <BentoCard 
              icon={Eye}
              title={language === 'zh' ? '能见度' : 'Visibility'}
              value={`${weather.current.visibility}`}
              unit="km"
              desc={language === 'zh' ? '视野良好' : 'Good View'}
            />

            <BentoCard 
              icon={Gauge}
              title={language === 'zh' ? '气压' : 'Pressure'}
              value={`${weather.current.pressure}`}
              unit="hPa"
              desc={language === 'zh' ? '相对稳定' : 'Stable'}
            />

             {/* 5-Day Forecast List (Spans 2 cols on mobile, 3 on desktop) */}
             <div className="col-span-2 md:col-span-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-all duration-300">
               <div className="flex items-center gap-2 text-white/60 mb-4 text-sm font-medium uppercase tracking-wider">
                  <Calendar size={16} />
                  {language === 'zh' ? '5天预报' : '5-Day Forecast'}
               </div>
               <div className="grid grid-cols-5 gap-2">
                  {weather.forecast.map((day, i) => {
                    const dayInfo = getWeatherInfo(day.code)
                    const DayIcon = dayInfo.icon
                    const dateObj = new Date(day.date)
                    const dayName = dateObj.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short' })
                    
                    return (
                      <div key={i} className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors">
                        <span className="text-sm font-medium opacity-80">{dayName}</span>
                        <DayIcon size={24} className="my-1" />
                        <div className="flex flex-col items-center text-sm">
                          <span className="font-bold">{day.maxTemp}°</span>
                          <span className="opacity-50 text-xs">{day.minTemp}°</span>
                        </div>
                      </div>
                    )
                  })}
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function BentoCard({ icon: Icon, title, value, unit, desc }: { icon: any, title: string, value: string, unit?: string, desc?: React.ReactNode }) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 flex flex-col justify-between hover:bg-white/15 transition-all duration-300 group hover:scale-[1.02]">
      <div className="flex items-center gap-2 text-white/60 mb-2 text-xs font-medium uppercase tracking-wider">
        <Icon size={14} />
        {title}
      </div>
      <div>
        <div className="text-3xl font-light tracking-tight flex items-baseline gap-1">
          {value}
          {unit && <span className="text-base text-white/50 font-normal">{unit}</span>}
        </div>
        {desc && <div className="text-xs text-white/50 mt-1">{desc}</div>}
      </div>
    </div>
  )
}

function WindDirection() {
  return (
    <div className="flex items-center gap-1">
      <Navigation size={10} className="rotate-45" />
      <span>NW</span>
    </div>
  )
}

function HourlyChart({ data, language }: { data: any[], language: string }) {
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
