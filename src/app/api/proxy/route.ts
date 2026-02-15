import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            return new NextResponse(`Failed to fetch upstream: ${response.statusText}`, { status: response.status });
        }

        const headers = new Headers();
        headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
        if (response.headers.has('Content-Length')) {
            headers.set('Content-Length', response.headers.get('Content-Length')!);
        }
        headers.set('Access-Control-Allow-Origin', '*');

        return new NextResponse(response.body, {
            status: 200,
            headers,
        });
    } catch (error: any) {
        console.error('Proxy error:', error);
        return new NextResponse(`Proxy Error: ${error.message}`, { status: 500 });
    }
}
