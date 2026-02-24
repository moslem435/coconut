import { NextRequest, NextResponse } from 'next/server'

// 缓存配置
const CACHE_TTL = 5 * 60 * 1000 // 5 分钟
const cache = new Map<string, { data: unknown; timestamp: number }>()

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') // 'location' | 'forecast'
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  try {
    // 1. 获取地理位置（基于 IP）
    if (type === 'location') {
      const cacheKey = 'location'
      const cached = cache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data)
      }

      // 尝试多个地理位置 API（避免单点故障）
      let locationData = null
      
      // 方案 1: geojs.io (无限制，免费)
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        if (res.ok) {
          const data = await res.json()
          locationData = {
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            city: data.city || data.region || 'Unknown'
          }
        }
      } catch (e) {
        console.warn('geojs.io failed:', e)
      }

      // 方案 2: ip-api.com (备用，45 req/min 限制)
      if (!locationData) {
        try {
          const res = await fetch('http://ip-api.com/json/', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          })
          if (res.ok) {
            const data = await res.json()
            locationData = {
              latitude: data.lat,
              longitude: data.lon,
              city: data.city || data.regionName || 'Unknown'
            }
          }
        } catch (e) {
          console.warn('ip-api.com failed:', e)
        }
      }

      // 默认位置（上海）
      if (!locationData) {
        locationData = {
          latitude: 31.2304,
          longitude: 121.4737,
          city: 'Shanghai'
        }
      }

      cache.set(cacheKey, { data: locationData, timestamp: Date.now() })
      return NextResponse.json(locationData)
    }

    // 2. 获取天气预报
    if (type === 'forecast' && lat && lon) {
      const cacheKey = `forecast-${lat}-${lon}`
      const cached = cache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data)
      }

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature,surface_pressure,visibility,is_day&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
      
      const res = await fetch(weatherUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })

      if (!res.ok) {
        throw new Error(`Weather API failed: ${res.status}`)
      }

      const data = await res.json()
      cache.set(cacheKey, { data, timestamp: Date.now() })
      
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
