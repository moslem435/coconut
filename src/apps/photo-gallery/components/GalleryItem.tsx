
import React, { useState, useEffect } from 'react'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import { Image as ImageIcon } from 'lucide-react'

interface GalleryItemProps {
    file: FileNode
    getDisplayName: (file: FileNode) => string
}

export const GalleryItem: React.FC<GalleryItemProps> = ({ file, getDisplayName }) => {
    const { getFileBlob } = useFileSystemStore()
    const [src, setSrc] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        let objectUrl: string | null = null
        let retryCount = 0
        const maxRetries = 3

        const load = () => {
            if (!mounted) return
            
            getFileBlob(file.id).then(blob => {
                if (!mounted) return
                if (blob) {
                    objectUrl = URL.createObjectURL(blob)
                    setSrc(objectUrl)
                    setLoading(false)
                } else {
                    // If blob is null, it might be syncing. Retry.
                    if (retryCount < maxRetries) {
                        retryCount++
                        setTimeout(load, 1000)
                    } else {
                        setLoading(false)
                    }
                }
            }).catch(() => {
                if (!mounted) return
                if (retryCount < maxRetries) {
                    retryCount++
                    setTimeout(load, 1000)
                } else {
                    setLoading(false)
                }
            })
        }

        setLoading(true)
        load()

        return () => { 
            mounted = false
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [file.id, getFileBlob])

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-white/5">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        )
    }

    if (src && src.startsWith('http')) {
        return (
            <img
                src={src}
                alt={getDisplayName(file)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
        )
    }

    if (src) {
        // Assume blob url or base64
        return (
            <img
                src={src}
                alt={getDisplayName(file)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
        )
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
            <ImageIcon className="text-white/20 mb-2" />
            <span className="text-xs text-white/40 truncate w-full text-center px-2">{getDisplayName(file)}</span>
        </div>
    )
}
