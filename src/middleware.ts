import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEFAULT_CSP_CONFIG, CSP_COOKIE_NAME } from './os/config/csp'

export function middleware(request: NextRequest) {
    const response = NextResponse.next()
    
    // Skip security headers for test page
    if (request.nextUrl.pathname.includes('/test-webcontainer-iframe.html')) {
        return response;
    }
    
    // Clone default config
    const cspConfig = JSON.parse(JSON.stringify(DEFAULT_CSP_CONFIG))
    
    // Read allowed domains from cookie
    const allowedDomainsCookie = request.cookies.get(CSP_COOKIE_NAME)
    if (allowedDomainsCookie) {
        try {
            const allowedDomains = decodeURIComponent(allowedDomainsCookie.value).split(',').filter(Boolean)
            
            // Add to relevant directives
            if (allowedDomains.length > 0) {
                // frame-src: for iframes
                cspConfig['frame-src'].push(...allowedDomains)
                // img-src: for images
                cspConfig['img-src'].push(...allowedDomains)
                // connect-src: for fetch/xhr
                cspConfig['connect-src'].push(...allowedDomains)
            }
        } catch (e) {
            console.error('Middleware: Failed to parse allowed domains', e)
        }
    }
    
    // Build CSP string
    const cspString = Object.entries(cspConfig)
        .map(([key, values]) => {
            // @ts-ignore
            return `${key} ${values.join(' ')}`
        })
        .join('; ')
        
    // Set headers
    response.headers.set('Content-Security-Policy', cspString)
    
    // Security Headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    // X-Frame-Options removed to allow WebContainer iframes
    // response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    // WebContainer requires SharedArrayBuffer, which requires Cross-Origin Isolation.
    // This means both COOP and COEP must be set.
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
