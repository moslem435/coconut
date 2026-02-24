'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, MapPin, Loader2, RefreshCw, AlertCircle, X, LayoutTemplate, Thermometer, Droplets, Wind, Eye, Gauge, Calendar, Bug } from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { WeatherState, WeatherCachePayload, getWeatherInfo } from './utils/types'
import { readWeatherCache, writeWeatherCache, WEATHER_CACHE_TTL } from './utils/cache'
import { HourlyChart } from './components/HourlyChart'
import { BentoCard } from './components/BentoCard'
import { WindDirection } from './components/WindDirection'

import { WeatherBackground } from './components/WeatherBackground'

// Default Location (Shanghai)
const DEFAULT_LOCATION = {
  lat: 31.2304,
  lon: 121.4737,
  city: 'Shanghai'
}

export default function WeatherApp() {
  const { language } = useLanguage()
  const { showWeatherWidget, setShowWeatherWidget, devMode } = useSystemSettings()
  const [weather, setWeather] = useState<WeatherState>({
    current: { temp: 0, code: 0, humidity: 0, windSpeed: 0, windDirection: 0, pressure: 0, visibility: 0, feelsLike: 0, isDay: 1 },
    forecast: [],
    hourly: [],
    location: 'Loading...',
    loading: true,
    error: false,
    lastUpdated: null,
    stale: false
  })
  
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDebug, setShowDebug] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const simulateWeather = (code: number, isDay: number) => {
    setWeather(prev => ({
      ...prev,
      current: {
        ...prev.current,
        code,
        isDay
      }
    }))
  }

  const updateWind = (speed: number, direction: number) => {
    setWeather(prev => ({
      ...prev,
      current: {
        ...prev.current,
        windSpeed: speed,
        windDirection: direction
      }
    }))
  }

  useEffect(() => {
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
    fetchWeatherData()
  }, [])

  useEffect(() => {
    if (isSearching && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearching])

  const fetchWeatherData = async (force = false, customLat?: number, customLon?: number, customCity?: string) => {
    const cached = readWeatherCache()
    const now = Date.now()
    
    // Use cached if available and not forced, AND we are not searching for a new location
    if (!force && !customLat && cached && now - cached.timestamp < WEATHER_CACHE_TTL) {
      setWeather(prev => ({
        ...prev,
        ...cached.data,
        loading: false,
        error: false,
        lastUpdated: cached.timestamp,
        stale: false
      }))
      return
    }

    try {
      setWeather(prev => ({ ...prev, loading: true, error: false }))

      let latitude = customLat ?? cached?.latitude ?? DEFAULT_LOCATION.lat
      let longitude = customLon ?? cached?.longitude ?? DEFAULT_LOCATION.lon
      let city = customCity ?? cached?.city ?? DEFAULT_LOCATION.city

      // If no custom location and no cache, try auto-detect
      if (!customLat && !cached) {
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
      }

      // 2. Get Weather via Open-Meteo
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature,surface_pressure,visibility,is_day&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
      
      const weatherRes = await fetch(weatherUrl)
      if (!weatherRes.ok) throw new Error('Weather fetch failed')
      const weatherData = await weatherRes.json()

      // 3. Transform Data
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
          visibility: Math.round(weatherData.current.visibility / 1000), // Convert to km
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
      console.error('Weather app error:', err)
      if (cached && !customLat) {
        setWeather(prev => ({
          ...prev,
          ...cached.data,
          loading: false,
          error: false,
          lastUpdated: cached.timestamp,
          stale: true
        }))
        return
      }
      setWeather(prev => ({ ...prev, loading: false, error: true }))
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      setWeather(prev => ({ ...prev, loading: true }))
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=${language === 'zh' ? 'zh' : 'en'}&format=json`)
      const data = await res.json()
      
      if (!data.results || data.results.length === 0) {
        alert(language === 'zh' ? '未找到该城市' : 'City not found')
        setWeather(prev => ({ ...prev, loading: false }))
        return
      }

      const location = data.results[0]
      setIsSearching(false)
      setSearchQuery('')
      
      await fetchWeatherData(true, location.latitude, location.longitude, location.name)
    } catch (err) {
      console.error('Search failed:', err)
      setWeather(prev => ({ ...prev, loading: false }))
      alert(language === 'zh' ? '搜索失败' : 'Search failed')
    }
  }

  const formattedUpdated = useMemo(() => {
    if (!weather.lastUpdated) return null
    return new Date(weather.lastUpdated).toLocaleTimeString(
      language === 'zh' ? 'zh-CN' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    )
  }, [weather.lastUpdated, language])

  if (weather.loading && !weather.current.temp) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[var(--os-bg-window)] text-[var(--os-text-primary)]">
        <Loader2 className="animate-spin mb-4 text-[var(--os-accent)]" size={48} />
        <p className="text-[var(--os-text-muted)] animate-pulse">{language === 'zh' ? '正在获取天气数据...' : 'Fetching weather data...'}</p>
      </div>
    )
  }

  if (weather.error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[var(--os-bg-window)] text-[var(--os-text-primary)] p-8 text-center">
        <AlertCircle size={64} className="text-[var(--os-danger)] mb-4" />
        <h2 className="text-xl font-bold mb-2">{language === 'zh' ? '获取数据失败' : 'Failed to load weather'}</h2>
        <button 
          onClick={() => {
            setWeather(prev => ({ ...prev, loading: true, error: false }))
            fetchWeatherData(true)
          }}
          className="px-4 py-2 bg-[var(--os-bg-selection)] hover:bg-[var(--os-hover-bg)] rounded-lg transition-colors"
        >
          {language === 'zh' ? '重试' : 'Retry'}
        </button>
      </div>
    )
  }

  const currentInfo = getWeatherInfo(weather.current.code)
  const CurrentIcon = currentInfo.icon

  return (
    <div className={`h-full w-full flex flex-col text-white relative transition-all duration-1000 overflow-hidden`}>
      <WeatherBackground 
          code={weather.current.code} 
          isDay={weather.current.isDay} 
          windSpeed={weather.current.windSpeed}
          windDirection={weather.current.windDirection}
        />
      
      {/* Settings Toggle */}
      <div className="absolute top-12 right-6 z-20 flex gap-2">
        <div className="relative">
          {devMode && (
            <button
                onClick={() => setShowDebug(!showDebug)}
                className={`flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-md transition-all border border-white/10 ${showDebug ? 'bg-white/30 text-white' : 'bg-black/20 hover:bg-black/30 text-white/70'}`}
                title="Debug"
            >
                <Bug size={14} />
            </button>
          )}
          
          {showDebug && devMode && (
            <div className="absolute top-full right-0 mt-2 p-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl w-48 z-50 flex flex-col gap-2 shadow-2xl">
              <div className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1">Time</div>
              <div className="flex gap-2">
                <button 
                  onClick={() => simulateWeather(weather.current.code, 1)}
                  className={`flex-1 py-1 text-xs rounded border border-white/10 transition-colors ${weather.current.isDay ? 'bg-white/20 text-white' : 'bg-transparent text-white/50 hover:bg-white/10'}`}
                >
                  Day
                </button>
                <button 
                  onClick={() => simulateWeather(weather.current.code, 0)}
                  className={`flex-1 py-1 text-xs rounded border border-white/10 transition-colors ${!weather.current.isDay ? 'bg-white/20 text-white' : 'bg-transparent text-white/50 hover:bg-white/10'}`}
                >
                  Night
                </button>
              </div>

              <div className="text-xs font-medium text-white/50 uppercase tracking-wider mt-2 mb-1">Weather</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => simulateWeather(0, weather.current.isDay)} className="py-1 text-xs rounded border border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white transition-colors">Sunny</button>
                <button onClick={() => simulateWeather(3, weather.current.isDay)} className="py-1 text-xs rounded border border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white transition-colors">Cloudy</button>
                <button onClick={() => simulateWeather(53, weather.current.isDay)} className="py-1 text-xs rounded border border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white transition-colors">Light Rain</button>
                <button onClick={() => simulateWeather(65, weather.current.isDay)} className="py-1 text-xs rounded border border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white transition-colors">Heavy Rain</button>
                <button onClick={() => simulateWeather(95, weather.current.isDay)} className="py-1 text-xs rounded border border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white transition-colors">Thunder</button>
                <button onClick={() => simulateWeather(71, weather.current.isDay)} className="py-1 text-xs rounded border border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white transition-colors">Snow</button>
              </div>

              <div className="text-xs font-medium text-white/50 uppercase tracking-wider mt-2 mb-1">Wind Speed: {weather.current.windSpeed} km/h</div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={weather.current.windSpeed} 
                onChange={(e) => updateWind(parseInt(e.target.value), weather.current.windDirection)}
                className="w-full accent-white/50 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />

              <div className="text-xs font-medium text-white/50 uppercase tracking-wider mt-2 mb-1">Wind Dir: {weather.current.windDirection}°</div>
              <input 
                type="range" 
                min="0" 
                max="360" 
                value={weather.current.windDirection} 
                onChange={(e) => updateWind(weather.current.windSpeed, parseInt(e.target.value))}
                className="w-full accent-white/50 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>

        <button
           onClick={() => fetchWeatherData(true)}
           className="flex items-center justify-center w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white/70 backdrop-blur-md transition-all border border-white/10"
           title={language === 'zh' ? '刷新' : 'Refresh'}
        >
          <RefreshCw size={14} className={weather.loading ? 'animate-spin' : ''} />
        </button>
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

      <div id="weather-scroll-container" className="relative z-10 flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header Section */}
          <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-2">
            <div>
              <div className="flex items-center gap-2 text-white/80 mb-1 h-9">
                <MapPin size={18} />
                
                {isSearching ? (
                  <form onSubmit={handleSearch} className="flex items-center">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={() => {
                        // Delay to allow form submission if clicking something else
                        setTimeout(() => {
                            if (!searchQuery) setIsSearching(false)
                        }, 200)
                      }}
                      placeholder={language === 'zh' ? '输入城市名...' : 'Enter city name...'}
                      className="bg-transparent border-b border-white/50 focus:border-white outline-none text-xl font-medium tracking-wide w-48 placeholder:text-white/30"
                    />
                    <button type="submit" className="ml-2 text-white/70 hover:text-white">
                      <Search size={18} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsSearching(false)}
                      className="ml-2 text-white/50 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </form>
                ) : (
                  <button 
                    onClick={() => setIsSearching(true)}
                    className="text-xl font-medium tracking-wide hover:bg-white/10 px-2 py-1 -ml-2 rounded transition-colors flex items-center gap-2 group"
                  >
                    {weather.location}
                    <Search size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                  </button>
                )}
              </div>

              {formattedUpdated && (
                <div className="text-xs text-white/50">
                  {language === 'zh' ? `更新于 ${formattedUpdated}` : `Updated ${formattedUpdated}`}
                  {weather.stale ? (language === 'zh' ? ' · 离线' : ' · Offline') : ''}
                </div>
              )}
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
            <div className="col-span-2 md:col-span-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 relative overflow-hidden group hover:bg-white/15 transition-all duration-300 weather-card-collision">
               <div className="flex items-center gap-2 text-white/60 mb-4 text-sm font-medium uppercase tracking-wider">
                  <Calendar size={16} />
                  {language === 'zh' ? '24小时预报' : '24-Hour Forecast'}
               </div>
               <div className="h-52 w-full -ml-2">
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
              desc={<WindDirection degree={weather.current.windDirection} />}
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
             <div className="col-span-2 md:col-span-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-all duration-300 weather-card-collision">
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
