import React, { useState, useEffect } from 'react'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { IPreviewProvider } from '@/os/services/PreviewService'

const VideoPreview = ({ fileId }: { fileId: string }) => {
    const [src, setSrc] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let objectUrl: string | null = null
        const load = async () => {
            try {
                const store = useFileSystemStore.getState()
                const path = store.resolvePath(fileId)
                if(!path) return
                
                // Note: Loading entire video into memory is bad for large files.
                // Future upgrade: Use fs.createReadStream or getFile() to get Blob directly.
                const buffer = await fs.readFile(path)
                
                // Try to guess mime type from extension
                const ext = path.split('.').pop()?.toLowerCase()
                let mime = 'video/mp4'
                if (ext === 'webm') mime = 'video/webm'
                if (ext === 'ogg') mime = 'video/ogg'
                
                const blob = new Blob([buffer], { type: mime })
                objectUrl = URL.createObjectURL(blob)
                setSrc(objectUrl)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [fileId])

    if (loading) return (
        <div className="h-full flex items-center justify-center text-white/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
        </div>
    )

    return (
        <div className="h-full w-full bg-black flex items-center justify-center">
            <video src={src} controls className="max-w-full max-h-full" />
        </div>
    )
}

export const VideoPreviewProvider: IPreviewProvider = {
    id: 'video-preview',
    name: 'Video Player',
    priority: 80,
    canHandle: (file, stat) => {
        if (stat?.mimeType?.startsWith('video/')) return true
        return /\.(mp4|webm|ogg|mov)$/i.test(file.name)
    },
    render: (ctx) => <VideoPreview fileId={ctx.fileId} />
}
