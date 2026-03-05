import React, { useState, useEffect } from 'react'
import { X, Folder, File, ChevronRight, Search, Upload, ArrowUp } from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { FILE_IDS } from '@/os/config/paths'

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
    initialPath = FILE_IDS.DESKTOP,
    defaultFileName = '',
    allowedExtensions,
    onConfirm,
    onCancel
}: FilePickerDialogProps) {
    const { getItem, getChildren, loadFolderContent } = useFileSystemStore()
    const { t } = useLanguage()
    
    const [currentPath, setCurrentPath] = useState(initialPath)
    const [isLoading, setIsLoading] = useState(false)
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

    useEffect(() => {
        if (!isOpen) return
        
        const load = async () => {
            setIsLoading(true)
            try {
                await loadFolderContent(currentPath)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [isOpen, currentPath, loadFolderContent])

    if (!isOpen) return null

    const currentFolder = getItem(currentPath)
    const contents = getChildren(currentPath)
    
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
            <div className="w-full max-w-2xl bg-[var(--os-bg-window)]/90 backdrop-blur-md rounded-xl shadow-2xl border border-[var(--os-border)] flex flex-col h-[500px] overflow-hidden text-sm">
                
                {/* Header */}
                <div className="h-12 border-b border-[var(--os-border)] flex items-center justify-between px-4 bg-[var(--os-bg-panel)]/50">
                    <span className="font-medium text-[var(--os-text-primary)]">
                        {title || (mode === 'open' ? 'Open File' : 'Save As')}
                    </span>
                    <button onClick={onCancel} className="p-1 hover:bg-[var(--os-hover-bg)] rounded-full transition-colors">
                        <X size={18} className="text-[var(--os-text-muted)]" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="h-10 border-b border-[var(--os-border)] flex items-center px-2 gap-2 bg-[var(--os-bg-selection)]/30">
                    <button 
                        onClick={handleUp}
                        disabled={!currentFolder?.parentId}
                        className="p-1.5 rounded hover:bg-[var(--os-hover-bg)] disabled:opacity-30 text-[var(--os-text-secondary)]"
                    >
                        <ArrowUp size={16} />
                    </button>
                    
                    <div className="flex-1 h-7 bg-[var(--os-bg-input)] rounded border border-[var(--os-border)] px-2 flex items-center text-xs text-[var(--os-text-secondary)]">
                        {currentPath.replace('root', 'System')}
                    </div>

                    <div className="relative w-48">
                        <Search size={14} className="absolute left-2 top-1.5 text-[var(--os-text-muted)]" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            className="w-full h-7 pl-8 pr-2 bg-[var(--os-bg-input)] rounded border border-[var(--os-border)] text-xs focus:outline-none focus:border-[var(--os-accent)] text-[var(--os-text-primary)] placeholder-[var(--os-text-muted)]"
                        />
                    </div>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto p-2 relative">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--os-bg-window)]/50 z-10 backdrop-blur-sm">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--os-accent)]"></div>
                        </div>
                    )}
                    <div className="grid grid-cols-4 gap-2">
                        {filteredContents.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className={`
                                    p-2 rounded flex flex-col items-center gap-2 cursor-pointer border border-transparent
                                    ${selectedFileId === item.id ? 'bg-[var(--os-bg-selection)] border-[var(--os-accent)]/30' : 'hover:bg-[var(--os-hover-bg)]'}
                                `}
                            >
                                <div className="w-10 h-10 flex items-center justify-center text-[var(--os-text-secondary)]">
                                    {item.type === 'folder' ? (
                                        <Folder size={32} className="text-[var(--os-accent)]" fill="currentColor" fillOpacity={0.2} />
                                    ) : (
                                        <File size={28} className="text-[var(--os-text-primary)]" />
                                    )}
                                </div>
                                <span className="text-xs text-center truncate w-full px-1 text-[var(--os-text-primary)]">
                                    {item.name}
                                </span>
                            </div>
                        ))}
                        {filteredContents.length === 0 && (
                            <div className="col-span-4 flex flex-col items-center justify-center h-40 text-[var(--os-text-muted)]">
                                <span className="text-xs">No items found</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="h-14 border-t border-[var(--os-border)] flex items-center px-4 gap-3 bg-[var(--os-bg-panel)]/50">
                    <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs text-[var(--os-text-secondary)] whitespace-nowrap">File name:</span>
                        <input 
                            type="text" 
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className="flex-1 h-8 px-2 bg-[var(--os-bg-input)] border border-[var(--os-border)] rounded text-sm focus:outline-none focus:border-[var(--os-accent)] text-[var(--os-text-primary)]"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onCancel}
                            className="px-4 h-8 text-xs font-medium bg-[var(--os-bg-selection)] hover:bg-[var(--os-hover-bg)] text-[var(--os-text-primary)] rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={mode === 'open' && !selectedFileId}
                            className="px-4 h-8 text-xs font-medium bg-[var(--os-accent)] hover:bg-[var(--os-accent-dim)] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {mode === 'open' ? 'Open' : 'Save'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
