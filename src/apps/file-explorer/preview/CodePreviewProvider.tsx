import React, { useState, useEffect } from 'react'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { IPreviewProvider } from '@/os/services/PreviewService'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'

const CodePreview = ({ fileId, name }: { fileId: string; name: string }) => {
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [highlightedCode, setHighlightedCode] = useState<string>('')

    // Detect language from extension
    const getLanguage = (filename: string): string => {
        const ext = filename.split('.').pop()?.toLowerCase()
        const langMap: Record<string, string> = {
            'js': 'javascript',
            'jsx': 'jsx',
            'ts': 'typescript',
            'tsx': 'tsx',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'go': 'go',
            'rs': 'rust',
            'html': 'markup',
            'xml': 'markup'
        }
        return langMap[ext || ''] || 'javascript'
    }

    useEffect(() => {
        const load = async () => {
            try {
                const store = useFileSystemStore.getState()
                const path = store.resolvePath(fileId)
                if(!path) throw new Error('File not found')
                
                const buffer = await fs.readFile(path)
                const text = new TextDecoder().decode(buffer)
                
                // Large file protection
                if (text.length > 500000) {
                    setContent(text.slice(0, 500000) + '\n\n...[File too large, truncated]...')
                } else {
                    setContent(text)
                }

                // Highlight code
                const language = getLanguage(name)
                const highlighted = Prism.highlight(
                    text.length > 500000 ? text.slice(0, 500000) : text,
                    Prism.languages[language] || Prism.languages.javascript,
                    language
                )
                setHighlightedCode(highlighted)
            } catch (e) {
                console.error(e)
                setError('Failed to load code content')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [fileId, name])

    if (loading) return (
        <div className="h-full flex items-center justify-center text-white/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
        </div>
    )

    if (error) return <div className="p-4 text-red-400">{error}</div>

    return (
        <div className="h-full w-full bg-[#1e1e1e] text-[#d4d4d4] overflow-auto selection:bg-blue-500/30">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#252526]">
                <span className="text-sm text-white/70">{name}</span>
                <span className="text-xs text-white/40">{content.length} characters</span>
            </div>
            <pre className="p-4 min-w-full inline-block text-sm leading-relaxed">
                <code 
                    className={`language-${getLanguage(name)}`}
                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                />
            </pre>
        </div>
    )
}

export const CodePreviewProvider: IPreviewProvider = {
    id: 'code-preview',
    name: 'Code Editor',
    priority: 60,
    canHandle: (file, stat) => {
        const ext = file.name.split('.').pop()?.toLowerCase()
        return !!(ext && ['js', 'jsx', 'ts', 'tsx', 'css', 'json', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'html', 'xml'].includes(ext))
    },
    render: (ctx) => <CodePreview fileId={ctx.fileId} name={ctx.name} />
}
