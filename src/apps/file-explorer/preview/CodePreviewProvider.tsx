import React, { useState, useEffect } from 'react'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { IPreviewProvider } from '@/os/services/PreviewService'
import { Copy, Check } from 'lucide-react'
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
    const [copied, setCopied] = useState(false)

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

    const handleCopy = () => {
        navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) return (
        <div className="h-full flex items-center justify-center text-white/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
        </div>
    )

    if (error) return <div className="p-4 text-red-400">{error}</div>

    return (
        <div className="h-full w-full bg-[#1e1e1e] text-[#d4d4d4] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#252526] shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-white/70 font-medium">{name}</span>
                    <span className="text-xs text-white/40">{content.length} chars</span>
                </div>
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 text-xs text-white/60 hover:text-white transition-colors"
                >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            
            <div className="flex-1 overflow-auto relative font-mono text-sm selection:bg-blue-500/30 flex">
                {/* Line Numbers */}
                <div className="sticky left-0 bg-[#1e1e1e] border-r border-white/5 px-3 py-4 text-right text-white/30 select-none shrink-0 min-w-[3rem]">
                    {content.split('\n').map((_, i) => (
                        <div key={i} className="leading-relaxed">{i + 1}</div>
                    ))}
                </div>
                
                {/* Code Content */}
                <pre className="p-4 leading-relaxed min-w-0 flex-1 tab-[4]">
                    <code 
                        dangerouslySetInnerHTML={{ __html: highlightedCode }}
                        className={`language-${getLanguage(name)}`}
                    />
                </pre>
            </div>
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
