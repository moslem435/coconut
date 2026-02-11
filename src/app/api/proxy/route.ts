import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 })
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        })

        if (!response.ok) {
            return new NextResponse(`Failed to fetch image: ${response.status}`, { status: response.status })
        }

        const contentType = response.headers.get('content-type')
        const buffer = await response.arrayBuffer()

        // Return with CORP header to allow loading in COEP environment
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=86400, mutable',
                'Cross-Origin-Resource-Policy': 'cross-origin'
            }
        })
    } catch (error) {
        console.error('Proxy error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
