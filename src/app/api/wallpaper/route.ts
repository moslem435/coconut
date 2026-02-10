import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const res = await fetch('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        })
        
        if (!res.ok) {
            throw new Error(`Bing API responded with ${res.status}`)
        }

        const data = await res.json()
        
        if (data && data.images && data.images.length > 0) {
            const image = data.images[0]
            let imageUrl = `https://cn.bing.com${image.url}` // Default HD (1920x1080)

            // Try to get UHD (4K) image if urlbase is available
            if (image.urlbase) {
                const uhdUrl = `https://cn.bing.com${image.urlbase}_UHD.jpg`
                try {
                    // Check if UHD version exists
                    const uhdCheck = await fetch(uhdUrl, { method: 'HEAD' })
                    if (uhdCheck.ok) {
                        imageUrl = uhdUrl
                    }
                } catch (e) {
                    console.warn('UHD check failed, falling back to HD')
                }
            }

            return NextResponse.json({ url: imageUrl })
        }
        
        throw new Error('Invalid Bing API response')
    } catch (error) {
        console.error('Error fetching daily wallpaper:', error)
        // Fallback to a static image if API fails (Updated to 4K quality)
        return NextResponse.json(
            { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=90&w=3840&auto=format&fit=crop' },
            { status: 200 } // Return 200 with fallback to avoid breaking UI
        )
    }
}
