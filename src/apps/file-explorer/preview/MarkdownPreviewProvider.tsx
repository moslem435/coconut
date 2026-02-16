import React, { useState, useEffect } from 'react'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { IPreviewProvider } from '@/os/services/PreviewService'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css' // We might need to add this to global styles or import here

const MarkdownPreview = ({ fileId }: { fileId: string }) => {
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
                    setContent(text.slice(0, 500000) + '\n\n> ⚠️ **File truncated due to size limit**')
                } else {
                    setContent(text)
                }
            } catch (e) {
                console.error(e)
                setError('Failed to load markdown content')
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
        <div className="h-full w-full bg-[#0d1117] text-[#c9d1d9] overflow-auto selection:bg-blue-500/30">
            <div className="max-w-4xl mx-auto p-8 prose prose-invert prose-sm md:prose-base max-w-none">
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                        code({node, inline, className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            ) : (
                                <code className={`${className} bg-white/10 rounded px-1 py-0.5 text-sm`} {...props}>
                                    {children}
                                </code>
                            )
                        },
                        a: ({node, ...props}) => <a className="text-blue-400 hover:underline" target="_blank" rel="noreferrer" {...props} />,
                        img: ({node, ...props}) => <img className="max-w-full rounded-lg border border-white/10" {...props} />
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    )
}

export const MarkdownPreviewProvider: IPreviewProvider = {
    id: 'markdown-preview',
    name: 'Markdown Viewer',
    priority: 70, // Higher than Code/Text
    canHandle: (file, stat) => {
        return /\.(md|markdown)$/i.test(file.name)
    },
    render: (ctx) => <MarkdownPreview fileId={ctx.fileId} />
}
