import React from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { File, Folder, Clock } from 'lucide-react'

interface StatusBarProps {
  totalItems: number
  selectedItems: FileNode[]
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const Divider = () => (
  <div className="w-px h-3" style={{ background: 'var(--os-border)' }} />
)

export default function StatusBar({ totalItems, selectedItems }: StatusBarProps) {
  const selectedCount = selectedItems.length
  const fileCount = selectedItems.filter(i => i.type === 'file').length
  const folderCount = selectedItems.filter(i => i.type === 'folder').length
  const fileItems = selectedItems.filter(i => i.type === 'file')
  const hasUnknownSize = fileItems.some(i => i.size === undefined)
  const selectedSize = fileItems.reduce((a, i) => a + (i.size ?? 0), 0)

  return (
    <div className="shrink-0 flex items-center gap-2.5 px-4 h-6 text-[10px] select-none"
      style={{
        borderTop: '1px solid var(--os-border)',
        background: 'var(--os-bg-panel)',
        color: 'var(--os-text-muted)'
      }}>
      {/* Total */}
      <span>{totalItems} 项</span>

      {selectedCount > 0 && (
        <>
          <Divider />

          {/* Selected breakdown */}
          <div className="flex items-center gap-1.5">
            {fileCount > 0 && (
              <span className="flex items-center gap-1">
                <File size={9} />
                {fileCount} 文件
              </span>
            )}
            {folderCount > 0 && fileCount > 0 && <span className="opacity-30">·</span>}
            {folderCount > 0 && (
              <span className="flex items-center gap-1">
                <Folder size={9} />
                {folderCount} 文件夹
              </span>
            )}
          </div>

          {fileCount > 0 && (
            <>
              <Divider />
              <span>{hasUnknownSize ? '—' : formatSize(selectedSize)}</span>
            </>
          )}

          <Divider />
          <span style={{ color: 'var(--os-accent)' }}>已选 {selectedCount} 项</span>
        </>
      )}
    </div>
  )
}
