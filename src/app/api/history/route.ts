
import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory cache
// Key: month (e.g., "01", "12")
// Value: { data: any, timestamp: number }
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const month = searchParams.get('month') // "01" - "12"

  if (!month || !/^\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month parameter' }, { status: 400 })
  }

  // Check cache
  const cached = cache.get(month)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    // Fetch from Baidu Baike
    // Note: Baidu might check User-Agent or Referer, so we should set them if needed.
    // Usually a standard User-Agent is enough.
    const response = await fetch(`https://baike.baidu.com/cms/home/eventsOnHistory/${month}.json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 86400 } // Next.js fetch caching
    })

    if (!response.ok) {
      throw new Error(`Baidu API failed with status: ${response.status}`)
    }

    const data = await response.json()
    
    // Update cache
    cache.set(month, { data, timestamp: Date.now() })
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch history events:', error)
    return NextResponse.json({ error: 'Failed to fetch history events' }, { status: 500 })
  }
}
