import React, { useEffect, useState } from 'react'
import { PreviewService, IPreviewProvider } from '@/os/services/PreviewService'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'

// Import and Register Providers (Side-effect)
import { ImagePreviewProvider } from './ImagePreviewProvider'
import { TextPreviewProvider } from './TextPreviewProvider'
import { VideoPreviewProvider } from './VideoPreviewProvider'
import { DocPreviewProvider } from './DocPreviewProvider'
import { CodePreviewProvider } from './CodePreviewProvider'
import { DefaultPreviewProvider } from './DefaultPreviewProvider'

// Initialize Registry (Idempotent-ish)
// In a real app, this might be in a system boot script
const registerAll = () => {
    PreviewService.register(ImagePreviewProvider)
    PreviewService.register(VideoPreviewProvider)
    PreviewService.register(DocPreviewProvider)
    PreviewService.register(CodePreviewProvider)
    PreviewService.register(TextPreviewProvider)
    PreviewService.register(DefaultPreviewProvider)
}
registerAll()

interface PreviewContainerProps {
    fileId: string
}

export default function PreviewContainer({ fileId }: PreviewContainerProps) {
    const [provider, setProvider] = useState<IPreviewProvider | null>(null)
    const [loading, setLoading] = useState(true)
    const fileNode = useFileSystemStore(s => s.files[fileId])

    useEffect(() => {
        const detect = async () => {
            if (!fileNode) return
            
            setLoading(true)
            try {
                // Get Stat to help detection
                const path = useFileSystemStore.getState().resolvePath(fileId)
                let stat = undefined
                if (path) {
                    try {
                        stat = await fs.stat(path)
                    } catch (e) {
                        // ignore stat error, might be virtual
                    }
                }

                const p = PreviewService.getProvider(fileNode, stat)
                setProvider(p || null)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        detect()
    }, [fileId, fileNode])

    if (!fileNode) return <div className="p-4 text-white">File not found</div>
    
    if (loading) {
        return (
             <div className="h-full flex items-center justify-center text-white/50">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
             </div>
        )
    }

    if (!provider) {
        return <div className="p-4 text-white">No preview provider found</div>
    }

    return provider.render({
        fileId,
        name: fileNode.name,
        // stat passed via context if needed, but provider already selected
    })
}
