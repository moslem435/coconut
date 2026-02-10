import React, { useState, useEffect } from 'react'
import { X, Folder, File, ChevronRight, Search, Upload, ArrowUp } from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'

interface FilePickerDialogProps {
    isOpen: boolean
    mode: 'open' | 'save'
    title?: string
    initialPath?: string
    defaultFileName?: string
    allowedExtensions?: string[]
    onConfirm: (path: string, fileName?: string) => void
    onCancel: () => void
}

export function FilePickerDialog({
    isOpen,
    mode,
    title,
    initialPath = 'desktop',
    defaultFileName = '',
    allowedExtensions,
    onConfirm,
    onCancel
}: FilePickerDialogProps) {
    const { fileSystem, getItem, getFolderContents } = useFileSystemStore()
    const { t } = useLanguage()
    
    const [currentPath, setCurrentPath] = useState(initialPath)
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
    const [fileName, setFileName] = useState(defaultFileName)
    const [history, setHistory] = useState<string[]>([initialPath])
    
    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentPath(initialPath)
            setFileName(defaultFileName)
            setSelectedFileId(null)
            setHistory([initialPath])
        }
    }, [isOpen, initialPath, defaultFileName])

    if (!isOpen) return null

    const currentFolder = getItem(currentPath)
    const contents = getFolderContents(currentPath)
    
    // Filter files based on extensions
    const filteredContents = contents.filter(item => {
        if (item.type === 'folder') return true
        if (!allowedExtensions || allowedExtensions.length === 0) return true
        // Simple extension check
        // Assuming file names don't strictly have extensions in this OS, but we can check content type or name suffix
        // For now, let's just show all files or filter by basic type if we had it
        return true 
    })

    const handleNavigate = (path: string) => {
        setCurrentPath(path)
        setSelectedFileId(null)
        setHistory(prev => [...prev, path])
    }

    const handleUp = () => {
        if (currentFolder?.parentId) {
            handleNavigate(currentFolder.parentId)
        }
    }

    const handleItemClick = (item: any) => {
        if (item.type === 'folder') {
            handleNavigate(item.id)
        } else {
            setSelectedFileId(item.id)
            setFileName(item.name)
        }
    }

    const handleConfirm = () => {
        if (mode === 'save') {
            if (!fileName) return
            onConfirm(currentPath, fileName)
        } else {
            if (!selectedFileId) return
            onConfirm(selectedFileId)
        }
    }

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-[#ffffff]/90 dark:bg-[#1e1e1e]/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 dark:border-white/10 flex flex-col h-[500px] overflow-hidden text-sm">
                
                {/* Header */}
                <div className="h-12 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-4 bg-white/50 dark:bg-black/20">
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                        {title || (mode === 'open' ? 'Open File' : 'Save As')}
                    </span>
                    <button onClick={onCancel} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="h-10 border-b border-black/5 dark:border-white/5 flex items-center px-2 gap-2 bg-white/30 dark:bg-black/10">
                    <button 
                        onClick={handleUp}
                        disabled={!currentFolder?.parentId}
                        className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30"
                    >
                        <ArrowUp size={16} />
                    </button>
                    
                    <div className="flex-1 h-7 bg-white/50 dark:bg-black/20 rounded border border-black/5 dark:border-white/5 px-2 flex items-center text-xs text-gray-600 dark:text-gray-400">
                        {currentPath.replace('root', 'System')}
                    </div>

                    <div className="relative w-48">
                        <Search size={14} className="absolute left-2 top-1.5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            className="w-full h-7 pl-8 pr-2 bg-white/50 dark:bg-black/20 rounded border border-black/5 dark:border-white/5 text-xs focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="grid grid-cols-4 gap-2">
                        {filteredContents.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className={`
                                    p-2 rounded flex flex-col items-center gap-2 cursor-pointer border border-transparent
                                    ${selectedFileId === item.id ? 'bg-blue-500/10 border-blue-500/30' : 'hover:bg-black/5 dark:hover:bg-white/5'}
                                `}
                            >
                                <div className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                    {item.type === 'folder' ? (
                                        <Folder size={32} className="text-yellow-400" fill="currentColor" fillOpacity={0.2} />
                                    ) : (
                                        <File size={28} className="text-blue-400" />
                                    )}
                                </div>
                                <span className="text-xs text-center truncate w-full px-1 text-gray-700 dark:text-gray-300">
                                    {item.name}
                                </span>
                            </div>
                        ))}
                        {filteredContents.length === 0 && (
                            <div className="col-span-4 flex flex-col items-center justify-center h-40 text-gray-400">
                                <span className="text-xs">No items found</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="h-14 border-t border-black/5 dark:border-white/5 flex items-center px-4 gap-3 bg-white/50 dark:bg-black/20">
                    <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs text-gray-500 whitespace-nowrap">File name:</span>
                        <input 
                            type="text" 
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className="flex-1 h-8 px-2 bg-white dark:bg-black/30 border border-gray-200 dark:border-gray-700 rounded text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onCancel}
                            className="px-4 h-8 text-xs font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={mode === 'open' && !selectedFileId}
                            className="px-4 h-8 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {mode === 'open' ? 'Open' : 'Save'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
