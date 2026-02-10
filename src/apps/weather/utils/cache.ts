import { WeatherCache, WeatherCachePayload, WeatherState } from './types'

const WEATHER_CACHE_KEY = 'weather-app-cache'
export const WEATHER_CACHE_TTL = 5 * 60 * 1000

export const readWeatherCache = (): WeatherCache | null => {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(WEATHER_CACHE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.timestamp || !parsed?.data) return null
    return parsed as WeatherCache
  } catch {
    return null
  }
}

export const writeWeatherCache = (cache: WeatherCache) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache))
}
