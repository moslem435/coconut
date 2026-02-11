import React, { useState, useEffect } from 'react'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { IPreviewProvider } from '@/os/services/PreviewService'

const TextPreview = ({ fileId }: { fileId: string }) => {
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const store = useFileSystemStore.getState()
                const path = store.resolvePath(fileId)
                if(!path) throw new Error('File not found')
                
                const buffer = await fs.readFile(path)
                const text = new TextDecoder().decode(buffer)
                
                // Simple Large File Protection
                if (text.length > 500000) {
                    setContent(text.slice(0, 500000) + '\n\n...[File too large, truncated]...')
                } else {
                    setContent(text)
                }
            } catch (e) {
                console.error(e)
                setError('Failed to load text content')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [fileId])

    if (loading) return (
        <div className="h-full flex items-center justify-center text-white/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
        </div>
    )

    if (error) return <div className="p-4 text-red-400">{error}</div>

    return (
        <div className="h-full w-full bg-[#1e1e1e] text-[#d4d4d4] overflow-auto font-mono text-sm selection:bg-blue-500/30">
            <pre className="p-4 min-w-full inline-block">
                {content}
            </pre>
        </div>
    )
}

export const TextPreviewProvider: IPreviewProvider = {
    id: 'text-preview',
    name: 'Text Editor',
    priority: 50,
    canHandle: (file, stat) => {
        if (stat?.mimeType?.startsWith('text/')) return true
        if (stat?.mimeType === 'application/json') return true
        if (stat?.mimeType === 'application/javascript') return true
        return /\.(txt|md|json|js|jsx|ts|tsx|css|html|log|xml|ini|conf|gitignore|env)$/i.test(file.name)
    },
    render: (ctx) => <TextPreview fileId={ctx.fileId} />
}
