import React, { useState, useEffect } from 'react'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { IPreviewProvider } from '@/os/services/PreviewService'
import JSZip from 'jszip'
import { Folder, File, Download, Archive } from 'lucide-react'

interface ZipEntry {
    name: string
    dir: boolean
    date: Date
    size: number
}

const ArchivePreview = ({ fileId, name }: { fileId: string; name: string }) => {
    const [entries, setEntries] = useState<ZipEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const store = useFileSystemStore.getState()
                const path = store.resolvePath(fileId)
                if(!path) throw new Error('File not found')
                
                const buffer = await fs.readFile(path)
                const zip = await JSZip.loadAsync(buffer)
                
                const loadedEntries: ZipEntry[] = []
                zip.forEach((relativePath, zipEntry) => {
                    loadedEntries.push({
                        name: zipEntry.name,
                        dir: zipEntry.dir,
                        date: zipEntry.date,
                        size: (zipEntry as any)._data.uncompressedSize || 0
                    })
                })
                
                // Sort directories first
                loadedEntries.sort((a, b) => {
                    if (a.dir === b.dir) return a.name.localeCompare(b.name)
                    return a.dir ? -1 : 1
                })

                setEntries(loadedEntries)
            } catch (e) {
                console.error(e)
                setError('Failed to load archive content')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [fileId])

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    if (loading) return (
        <div className="h-full flex items-center justify-center text-white/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
        </div>
    )

    if (error) return <div className="p-4 text-red-400">{error}</div>

    return (
        <div className="h-full w-full bg-[#1e1e1e] text-[#d4d4d4] flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#252526]">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Archive size={20} className="text-yellow-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{name}</span>
                    <span className="text-xs text-white/40">{entries.length} items</span>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-white/40 uppercase bg-white/5 sticky top-0 backdrop-blur-sm">
                        <tr>
                            <th className="px-4 py-2 font-medium">Name</th>
                            <th className="px-4 py-2 font-medium w-32">Size</th>
                            <th className="px-4 py-2 font-medium w-48">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {entries.map((entry) => (
                            <tr key={entry.name} className="hover:bg-white/5 transition-colors group">
                                <td className="px-4 py-2 flex items-center gap-2">
                                    {entry.dir ? (
                                        <Folder size={16} className="text-blue-400 shrink-0" />
                                    ) : (
                                        <File size={16} className="text-white/40 shrink-0" />
                                    )}
                                    <span className="truncate text-white/80 group-hover:text-white">{entry.name}</span>
                                </td>
                                <td className="px-4 py-2 text-white/40 font-mono text-xs">
                                    {entry.dir ? '-' : formatSize(entry.size)}
                                </td>
                                <td className="px-4 py-2 text-white/40 text-xs">
                                    {entry.date.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export const ArchivePreviewProvider: IPreviewProvider = {
    id: 'archive-preview',
    name: 'Archive Viewer',
    priority: 60,
    canHandle: (file, stat) => {
        return /\.(zip|jar|apk)$/i.test(file.name)
    },
    render: (ctx) => <ArchivePreview fileId={ctx.fileId} name={ctx.name} />
}
