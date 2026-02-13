'use client'

import React, { useState } from 'react'
import { Search, File } from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useEditorState } from '../hooks/useEditorState'

export const SearchPanel: React.FC = () => {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<{ id: string, name: string, line: string, lineNum: number }[]>([])
    const { files, readFileContent } = useFileSystemStore()
    const { openFile } = useEditorState()

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        const newResults: typeof results = []
        const fileList = Object.values(files).filter(f => f.type === 'file')

        // Simple text search (naive)
        // In real app, consider using a worker or index
        for (const file of fileList) {
            try {
                const content = await readFileContent(file.id)
                const lines = content.split('\n')
                lines.forEach((line, index) => {
                    if (line.toLowerCase().includes(query.toLowerCase())) {
                        newResults.push({
                            id: file.id,
                            name: file.name,
                            line: line.trim(),
                            lineNum: index + 1
                        })
                    }
                })
            } catch (e) {
                // ignore read error
            }
        }
        setResults(newResults)
    }

    return (
        <div className="h-full w-full flex flex-col bg-[#252526] text-[#cccccc]">
            <div className="p-4">
                <div className="text-xs font-bold uppercase mb-2 tracking-wider">Search</div>
                <form onSubmit={handleSearch}>
                    <div className="relative">
                        <input
                            className="w-full bg-[#3c3c3c] border border-transparent focus:border-blue-500 outline-none text-sm px-2 py-1 placeholder-gray-500 text-white"
                            placeholder="Search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        <Search size={14} className="absolute right-2 top-1.5 text-gray-400" />
                    </div>
                </form>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col">
                    {results.length > 0 ? (
                        results.map((res, idx) => (
                            <div
                                key={`${res.id}-${idx}`}
                                className="px-4 py-2 hover:bg-[#2a2d2e] cursor-pointer group"
                                onClick={() => openFile(res.id)}
                            >
                                <div className="flex items-center gap-2 text-sm text-blue-300">
                                    <File size={12} />
                                    <span>{res.name}</span>
                                    <span className="text-gray-500 text-xs ml-auto">{res.lineNum}</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1 truncate font-mono bg-[#1e1e1e] p-1 opacity-80 group-hover:opacity-100">
                                    {res.line}
                                </div>
                            </div>
                        ))
                    ) : (
                        query && <div className="p-4 text-xs text-center text-gray-500">No results found</div>
                    )}
                </div>
            </div>
        </div>
    )
}
