import React, { useState, useEffect } from 'react'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import { Trash2, RotateCcw, Ban, FileText, Folder } from 'lucide-react'

const RecycleBin: React.FC = () => {
  const [deletedFiles, setDeletedFiles] = useState<FileNode[]>([])
  const { files, restoreItems, emptyTrash } = useFileSystemStore()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Sync deleted files from store
  useEffect(() => {
    const trashItems = Object.values(files).filter(f => f.parentId === 'trash')
    setDeletedFiles(trashItems)
  }, [files])

  const handleSelect = (id: string, multi: boolean) => {
    if (multi) {
      const newSet = new Set(selectedIds)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      setSelectedIds(newSet)
    } else {
      setSelectedIds(new Set([id]))
    }
  }

  const handleRestore = () => {
    if (selectedIds.size === 0) return
    restoreItems(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handleEmpty = () => {
    if (confirm('Are you sure you want to permanently delete all items in the Recycle Bin?')) {
      emptyTrash()
      setSelectedIds(new Set())
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-white pt-10">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
        <button 
          onClick={handleEmpty}
          disabled={deletedFiles.length === 0}
          className="px-3 py-1.5 rounded bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Ban size={16} /> Empty Bin
        </button>
        <div className="w-px h-6 bg-gray-300 mx-2" />
        <button 
          onClick={handleRestore}
          disabled={selectedIds.size === 0}
          className="px-3 py-1.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <RotateCcw size={16} /> Restore Selected
        </button>
        <div className="flex-1" />
        <span className="text-gray-500 text-sm">{deletedFiles.length} items</span>
      </div>

      {/* Content Area */}
      <div 
        className="flex-1 p-4 overflow-auto bg-white"
        onClick={() => setSelectedIds(new Set())}
      >
        {deletedFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Trash2 size={48} className="mb-4 opacity-20" />
            <p>Recycle Bin is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
            {deletedFiles.map(file => (
              <div
                key={file.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelect(file.id, e.ctrlKey || e.metaKey)
                }}
                className={`
                  flex flex-col items-center p-2 rounded cursor-pointer border
                  ${selectedIds.has(file.id) ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-gray-50'}
                `}
              >
                <div className="w-12 h-12 mb-2 flex items-center justify-center text-gray-500">
                  {file.type === 'folder' ? <Folder size={32} /> : <FileText size={32} />}
                </div>
                <div className="text-xs text-center break-all px-1 line-clamp-2">
                  {file.name}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                   From: {files[file.originalParentId || '']?.name || 'Unknown'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RecycleBin
