import { useState, useCallback } from 'react'
import { ImageStorage } from '../services/ImageStorage'

export function useImageDownloader() {
    const [progress, setProgress] = useState(0)
    const [isDownloading, setIsDownloading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const downloadImage = useCallback(async (url: string, filename: string) => {
        setIsDownloading(true)
        setProgress(0)
        setError(null)

        try {
            // Use local API proxy to bypass CORS
            // The browser will fetch from our own /api/proxy endpoint, which then fetches the remote URL server-side
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`
            
            const response = await fetch(proxyUrl)
            if (!response.ok) throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
            
            const contentLength = response.headers.get('content-length')
            const total = contentLength ? parseInt(contentLength, 10) : 0
            
            if (!response.body) throw new Error('ReadableStream not supported')

            await ImageStorage.saveStream(filename, response.body, (received) => {
                if (total > 0) {
                    setProgress(Math.round((received / total) * 100))
                }
            })

            return true
        } catch (err: any) {
            console.error('Download failed:', err)
            setError(err.message || 'Download failed')
            return false
        } finally {
            setIsDownloading(false)
        }
    }, [])

    return {
        progress,
        isDownloading,
        error,
        downloadImage
    }
}
