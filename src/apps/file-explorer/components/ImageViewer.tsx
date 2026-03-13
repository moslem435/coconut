
import { useState, useEffect } from 'react'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { ZoomIn, ZoomOut, RotateCw, RefreshCcw, Maximize } from 'lucide-react'
import { eventBus } from '@/os/kernel/EventBus'

interface ImageViewerProps {
    src?: string
    fileId?: string
    alt?: string
}

export default function ImageViewer({ src: initialSrc, fileId, alt = 'Image' }: ImageViewerProps) {
    const [src, setSrc] = useState<string | undefined>(initialSrc)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [rotation, setRotation] = useState(0)

    useEffect(() => {
        let objectUrl: string | null = null
        let disposed = false
        let seq = 0

        const getMimeType = (path: string) => {
            const ext = path.split('.').pop()?.toLowerCase()
            if (ext === 'png') return 'image/png'
            if (ext === 'gif') return 'image/gif'
            if (ext === 'webp') return 'image/webp'
            if (ext === 'svg') return 'image/svg+xml'
            if (ext === 'ico') return 'image/x-icon'
            if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
            return 'application/octet-stream'
        }

        const applyBlobType = (blob: Blob, mimeType: string) => {
            const t = (blob as any)?.type || ''
            if (!t || t === 'application/octet-stream') {
                try {
                    return blob.slice(0, blob.size, mimeType)
                } catch {
                    return blob
                }
            }
            return blob
        }

        // If we have a direct src (e.g. http url), use it
        if (initialSrc) {
            setSrc(initialSrc)
            setError(null)
            setLoading(false)
            return () => { }
        }

        // If we have a fileId, we need to load it from the FS
        if (fileId) {
            setLoading(true)
            setError(null)
            setSrc(undefined)

            const loadFile = async (mySeq: number) => {
                try {
                    const store = useFileSystemStore.getState()
                    const path = store.resolvePath(fileId)

                    if (!path) throw new Error('File not found')
                    const mimeType = getMimeType(path)

                    try {
                        const blob = await store.getFileBlob(fileId)
                        if (disposed || mySeq !== seq) return
                        if (blob) {
                            const nextUrl = URL.createObjectURL(applyBlobType(blob, mimeType))
                            objectUrl = nextUrl
                            setSrc(nextUrl)
                            setError(null)
                            return
                        }
                    } catch { }

                    const content = await fs.readFile(path)
                    if (disposed || mySeq !== seq) return
                    const blob = new Blob([content as any], { type: mimeType })
                    const nextUrl = URL.createObjectURL(blob)
                    objectUrl = nextUrl
                    setSrc(nextUrl)
                    setError(null)
                } catch (err) {
                    console.error('Failed to load image:', err)
                    if (!disposed) setError('Failed to load image')
                } finally {
                    if (!disposed) setLoading(false)
                }
            }

            const store = useFileSystemStore.getState()
            const path = store.resolvePath(fileId)

            const schedule = () => {
                seq += 1
                const mySeq = seq
                setLoading(true)
                void loadFile(mySeq)
            }

            const retrySchedule = (attempt: number) => {
                if (disposed) return
                if (attempt <= 0) return
                setTimeout(() => {
                    if (disposed) return
                    schedule()
                    retrySchedule(attempt - 1)
                }, 250)
            }

            schedule()

            const subs = path
                ? [
                    eventBus.on('fs:file:created', (e) => {
                        if (e.path !== path) return
                        schedule()
                    }),
                    eventBus.on('fs:file:updated', (e) => {
                        if (e.path !== path) return
                        schedule()
                    })
                ]
                : []

            retrySchedule(6)

            return () => {
                disposed = true
                for (const s of subs) s.unsubscribe()
                if (objectUrl) URL.revokeObjectURL(objectUrl)
            }
        }

        return () => {
            disposed = true
            if (objectUrl) URL.revokeObjectURL(objectUrl)
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
        <div className="h-full w-full relative bg-black/95 overflow-hidden flex flex-col">
            {/* Main Canvas */}
            <div className="flex-1 w-full h-full relative">
                <TransformWrapper
                    initialScale={1}
                    minScale={0.5}
                    maxScale={8}
                    centerOnInit
                >
                    {({ zoomIn, zoomOut, resetTransform }) => (
                        <>
                            {/* Controls Bar */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 shadow-xl transition-opacity hover:opacity-100 opacity-80">
                                <button
                                    onClick={() => zoomOut()}
                                    className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
                                    title="Zoom Out"
                                >
                                    <ZoomOut size={18} />
                                </button>
                                <button
                                    onClick={() => resetTransform()}
                                    className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
                                    title="Reset"
                                >
                                    <Maximize size={18} />
                                </button>
                                <button
                                    onClick={() => zoomIn()}
                                    className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
                                    title="Zoom In"
                                >
                                    <ZoomIn size={18} />
                                </button>
                                <div className="w-px h-4 bg-white/20 mx-1" />
                                <button
                                    onClick={() => setRotation(r => r + 90)}
                                    className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
                                    title="Rotate"
                                >
                                    <RotateCw size={18} />
                                </button>
                            </div>

                            <TransformComponent
                                wrapperClass="w-full h-full flex items-center justify-center"
                                contentClass="w-full h-full flex items-center justify-center"
                            >
                                <img
                                    src={src}
                                    alt={alt}
                                    style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease' }}
                                    className="max-w-full max-h-full object-contain select-none"
                                    draggable={false}
                                />
                            </TransformComponent>
                        </>
                    )}
                </TransformWrapper>
            </div>

            {/* Background Grid Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />
        </div>
    )
}
