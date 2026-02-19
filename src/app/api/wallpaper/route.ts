import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const res = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        })

        if (!res.ok) {
            throw new Error(`Bing API responded with ${res.status}`)
        }

        const data = await res.json()

        // Helper to construct proxy URL
        const getProxyUrl = (url: string) => {
            const origin = request.nextUrl.origin
            return `${origin}/api/proxy?url=${encodeURIComponent(url)}`
        }

        if (data && data.images && data.images.length > 0) {
            const image = data.images[0]
            const bingUrl = `https://www.bing.com${image.url}`

            return NextResponse.json(
                { url: getProxyUrl(bingUrl) },
                {
                    headers: {
                        'Cache-Control': 'public, max-age=3600, must-revalidate'
                    }
                }
            )
        }

        throw new Error('Invalid Bing API response')
    } catch (error) {
        console.error('Error fetching daily wallpaper:', error)

        const origin = request.nextUrl.origin
        const fallbackUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=90&w=1920&auto=format&fit=crop'
        // Construct proxy URL manually since we might be in the catch block
        const proxyFallback = `${origin}/api/proxy?url=${encodeURIComponent(fallbackUrl)}`

        return NextResponse.json(
            { url: proxyFallback },
            { status: 200 }
        )
    }
}
