import React from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'

interface StatusBarProps {
  totalItems: number
  selectedItems: FileNode[]
}

export default function StatusBar({ totalItems, selectedItems }: StatusBarProps) {
  const selectedCount = selectedItems.length
  
  // Calculate total size of selected files
  const selectedSize = selectedItems.reduce((acc, item) => {
    if (item.type === 'file') {
      return acc + (item.content?.length || 0)
    }
    return acc
  }, 0)

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="h-8 bg-[rgba(var(--os-bg-panel-rgb),0.5)] backdrop-blur-md border-t border-white/5 flex items-center px-4 text-xs text-white/50 select-none gap-4">
      <div>
        {totalItems} items
      </div>
      {selectedCount > 0 && (
        <>
          <div className="w-px h-3 bg-white/10" />
          <div>
            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div>
            {formatSize(selectedSize)}
          </div>
        </>
      )}
    </div>
  )
}
