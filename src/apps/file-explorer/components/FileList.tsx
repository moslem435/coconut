import React from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { cn } from '@/lib/utils'
import { 
  Folder, FileText, Image as ImageIcon, Music, Video, Code, 
  File, Layout, PlayCircle, MoreVertical, ArrowUp, ArrowDown
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useLanguage } from '@/os/kernel/LanguageContext'

interface FileListProps {
  items: FileNode[]
  viewMode: 'grid' | 'list'
  onNavigate: (id: string) => void
  onDoubleClick: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
  selectedIds: string[]
  onSelect: (id: string, multi: boolean) => void
}

type SortField = 'name' | 'date' | 'type' | 'size'
type SortOrder = 'asc' | 'desc'

// Helper to get file icon
const getFileIcon = (node: FileNode) => {
  if (node.type === 'folder') return Folder
  const ext = node.name.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return ImageIcon
  if (['mp3', 'wav', 'ogg'].includes(ext || '')) return Music
  if (['mp4', 'webm', 'mov'].includes(ext || '')) return Video
  if (['js', 'ts', 'tsx', 'css', 'html', 'json'].includes(ext || '')) return Code
  return FileText
}

// Helper to format file size
const formatSize = (bytes?: number) => {
  if (bytes === undefined) return '--'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Simple relative time formatter
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function FileList({ 
  items, viewMode, onNavigate, onDoubleClick, onContextMenu, 
  selectedIds, onSelect 
}: FileListProps) {
  const { t } = useLanguage()
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison = a.updatedAt - b.updatedAt
          break
        case 'type':
          if (a.type === b.type) {
             const extA = a.name.split('.').pop() || ''
             const extB = b.name.split('.').pop() || ''
             comparison = extA.localeCompare(extB)
          } else {
            comparison = a.type === 'folder' ? -1 : 1
          }
          break
        case 'size':
           // Folders don't have size usually, treat as 0 or separate
           const sizeA = (a.content?.length || 0)
           const sizeB = (b.content?.length || 0)
           comparison = sizeA - sizeB
           break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [items, sortField, sortOrder])

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    // Basic selection logic
    e.stopPropagation()
    const isMulti = e.ctrlKey || e.metaKey
    onSelect(id, isMulti)
  }

  if (viewMode === 'grid') {
    return (
      <div 
        className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 p-4 pb-20 overflow-y-auto h-full content-start"
        onClick={() => onSelect('', false)} // Clear selection on background click
      >
        {sortedItems.map(node => {
          const Icon = getFileIcon(node)
          const isSelected = selectedIds.includes(node.id)
          
          return (
            <div
              key={node.id}
              onClick={(e) => handleMouseDown(e, node.id)}
              onDoubleClick={() => onDoubleClick(node.id)}
              onContextMenu={(e) => onContextMenu(e, node.id)}
              className={cn(
                "group flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 border border-transparent cursor-default",
                isSelected 
                  ? "bg-blue-500/20 border-blue-500/30 shadow-inner" 
                  : "hover:bg-white/5 hover:border-white/5"
              )}
            >
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
                node.type === 'folder' ? "text-yellow-400" : "text-blue-400"
              )}>
                <Icon 
                  size={40} 
                  strokeWidth={1.5} 
                  fill={node.type === 'folder' ? "currentColor" : "none"} 
                  fillOpacity={0.2}
                />
              </div>
              <span className="text-xs text-center text-white/80 line-clamp-2 break-all w-full px-1 group-hover:text-white">
                {node.name}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // List View
  return (
    <div 
      className="flex flex-col h-full overflow-hidden"
      onClick={() => onSelect('', false)}
    >
      {/* Table Header */}
      <div className="flex items-center px-4 py-2 text-xs font-medium text-white/40 border-b border-white/5 select-none">
        <div 
          className="flex-[2] min-w-[200px] flex items-center gap-1 cursor-pointer hover:text-white transition-colors"
          onClick={() => handleSort('name')}
        >
          {t('common.name') || 'Name'}
          {sortField === 'name' && (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
        </div>
        <div 
          className="flex-1 min-w-[100px] flex items-center gap-1 cursor-pointer hover:text-white transition-colors"
          onClick={() => handleSort('date')}
        >
          Date
          {sortField === 'date' && (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
        </div>
        <div 
          className="flex-1 min-w-[80px] flex items-center gap-1 cursor-pointer hover:text-white transition-colors"
          onClick={() => handleSort('type')}
        >
          {t('common.type') || 'Type'}
          {sortField === 'type' && (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
        </div>
        <div 
          className="w-[80px] text-right flex items-center justify-end gap-1 cursor-pointer hover:text-white transition-colors"
          onClick={() => handleSort('size')}
        >
          Size
          {sortField === 'size' && (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto p-1 pb-20 custom-scrollbar">
        {sortedItems.map(node => {
          const Icon = getFileIcon(node)
          const isSelected = selectedIds.includes(node.id)

          return (
            <div
              key={node.id}
              onClick={(e) => handleMouseDown(e, node.id)}
              onDoubleClick={() => onDoubleClick(node.id)}
              onContextMenu={(e) => onContextMenu(e, node.id)}
              className={cn(
                "flex items-center px-3 py-1.5 rounded-md text-sm text-white/80 transition-colors cursor-default group",
                isSelected 
                  ? "bg-blue-500/20" 
                  : "hover:bg-white/5 odd:bg-white/[0.02]"
              )}
            >
              <div className="flex-[2] min-w-[200px] flex items-center gap-3">
                <Icon 
                  size={18} 
                  className={cn(
                    "shrink-0",
                    node.type === 'folder' ? "text-yellow-400 fill-yellow-400/20" : "text-blue-400"
                  )} 
                />
                <span className="truncate">{node.name}</span>
              </div>
              <div className="flex-1 min-w-[100px] text-xs text-white/40">
                {formatTime(node.updatedAt)}
              </div>
              <div className="flex-1 min-w-[80px] text-xs text-white/40 capitalize">
                {node.type}
              </div>
              <div className="w-[80px] text-right text-xs text-white/40 font-mono">
                {formatSize(node.content?.length)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
