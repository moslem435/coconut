import { Sun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning } from 'lucide-react'

export interface WeatherState {
  current: {
    temp: number
    code: number
    humidity: number
    windSpeed: number
    windDirection: number // Added windDirection
    pressure: number
    visibility: number
    feelsLike: number
    isDay: number // 0 or 1
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
  lastUpdated: number | null
  stale: boolean
}

export interface WeatherCachePayload {
  current: WeatherState['current']
  forecast: WeatherState['forecast']
  hourly: WeatherState['hourly']
  location: WeatherState['location']
}

export interface WeatherCache {
  timestamp: number
  data: WeatherCachePayload
  latitude: number
  longitude: number
  city: string
}

// WMO Weather Code Interpretation (0-99)
export const getWeatherInfo = (code: number) => {
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
