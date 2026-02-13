import React from 'react'
import { FileCode, Layout, Box, FileText, Image, Music, Film, FileJson, FileType, Code, GitMerge, Settings, Terminal, Database } from 'lucide-react'

export const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    const filename = name.toLowerCase()

    // Special Files
    if (filename === 'package.json') return <Box size={14} className="text-red-400" />
    if (filename === 'tsconfig.json') return <FileCode size={14} className="text-blue-500" />
    if (filename === 'readme.md') return <FileText size={14} className="text-purple-300" />
    if (filename.startsWith('.git')) return <GitMerge size={14} className="text-red-500" />

    switch (ext) {
        case 'ts':
        case 'tsx':
            return <FileCode size={14} className="text-blue-400" />
        case 'js':
        case 'jsx':
            return <FileCode size={14} className="text-yellow-400" />
        case 'css':
        case 'scss':
        case 'less':
            return <Layout size={14} className="text-blue-300" />
        case 'html':
            return <Layout size={14} className="text-orange-400" />
        case 'json':
            return <FileJson size={14} className="text-yellow-400" />
        case 'md':
            return <FileText size={14} className="text-blue-200" />
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
        case 'webp':
            return <Image size={14} className="text-purple-400" />
        case 'mp3':
        case 'wav':
        case 'ogg':
            return <Music size={14} className="text-pink-400" />
        case 'mp4':
        case 'webm':
            return <Film size={14} className="text-red-400" />
        case 'sql':
            return <Database size={14} className="text-blue-300" />
        case 'yaml':
        case 'yml':
            return <Settings size={14} className="text-purple-400" />
        case 'sh':
            return <Terminal size={14} className="text-green-400" />
        default:
            return <FileText size={14} className="text-gray-400" />
    }
}
