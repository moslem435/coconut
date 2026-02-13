
import { useState, useEffect } from 'react'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'

interface ImageViewerProps {
    src?: string
    fileId?: string
    alt?: string
}

export default function ImageViewer({ src: initialSrc, fileId, alt = 'Image' }: ImageViewerProps) {
    const [src, setSrc] = useState<string | undefined>(initialSrc)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // If we have a direct src (e.g. http url), use it
        if (initialSrc) {
            setSrc(initialSrc)
            return
        }

        // If we have a fileId, we need to load it from the FS
        if (fileId) {
            let objectUrl: string | null = null
            setLoading(true)

            const loadFile = async () => {
                try {
                    const store = useFileSystemStore.getState()
                    const path = store.resolvePath(fileId)

                    if (!path) throw new Error('File not found')

                    const content = await fs.readFile(path)

                    // Detect mime type based on extension (simple version)
                    const ext = path.split('.').pop()?.toLowerCase()
                    let mimeType = 'image/jpeg'
                    if (ext === 'png') mimeType = 'image/png'
                    if (ext === 'gif') mimeType = 'image/gif'
                    if (ext === 'webp') mimeType = 'image/webp'
                    if (ext === 'svg') mimeType = 'image/svg+xml'

                    const blob = new Blob([content as any], { type: mimeType })
                    objectUrl = URL.createObjectURL(blob)
                    setSrc(objectUrl)
                } catch (err) {
                    console.error('Failed to load image:', err)
                    setError('Failed to load image')
                } finally {
                    setLoading(false)
                }
            }

            loadFile()

            // Cleanup
            return () => {
                if (objectUrl) URL.revokeObjectURL(objectUrl)
            }
        }
    }, [initialSrc, fileId])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-black/90 text-white/50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
            </div>
        )
    }

    if (error || !src) {
        return (
            <div className="h-full flex items-center justify-center bg-black/90 text-white/50">
                <span>{error || 'No image source'}</span>
            </div>
        )
    }

    return (
        <div className="h-full flex items-center justify-center bg-black/90 overflow-hidden">
            <img
                src={src}
                alt={alt}
                className="max-w-full max-h-full object-contain select-none"
                draggable={false}
            />
        </div>
    )
}
