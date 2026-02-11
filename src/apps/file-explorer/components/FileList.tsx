import React from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { cn } from '@/lib/utils'
import { 
  Folder, FileText, Image as ImageIcon, Music, Video, Code, 
  File, Layout, PlayCircle, MoreVertical, ArrowUp, ArrowDown
} from 'lucide-react'
import { useState, useMemo, useRef } from 'react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useUIStore } from '@/os/kernel/useUIStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { RenameInput } from '@/os/ui/RenameInput'
import { useVirtualizer } from '@tanstack/react-virtual'

interface FileListProps {
  items: FileNode[]
  viewMode: 'grid' | 'list'
  onNavigate: (id: string) => void
  onDoubleClick: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
  selectedIds: string[]
  onSelect: (id: string, multi: boolean) => void
  onDrop?: (draggedIds: string[], targetId: string) => void
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
  selectedIds, onSelect, onDrop
}: FileListProps) {
  const { t } = useLanguage()
  const { renamingId, setRenamingId } = useUIStore()
  const { renameItem } = useFileSystemStore()
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [draggedIds, setDraggedIds] = useState<string[]>([])
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

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
    e.stopPropagation()
    const isMulti = e.ctrlKey || e.metaKey
    onSelect(id, isMulti)
  }

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    const itemsToDrag = selectedIds.includes(id) ? selectedIds : [id]
    setDraggedIds(itemsToDrag)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemsToDrag.join(','))
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    const node = items.find(item => item.id === id)
    if (node?.type === 'folder' && !draggedIds.includes(id)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDropTargetId(id)
    }
  }

  const handleDragLeave = () => {
    setDropTargetId(null)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const node = items.find(item => item.id === targetId)
    if (node?.type === 'folder' && !draggedIds.includes(targetId)) {
      onDrop?.(draggedIds, targetId)
    }
    
    setDraggedIds([])
    setDropTargetId(null)
  }

  const handleDragEnd = () => {
    setDraggedIds([])
    setDropTargetId(null)
  }

  // Virtual scrolling refs
  const gridParentRef = useRef<HTMLDivElement>(null)
  const listParentRef = useRef<HTMLDivElement>(null)

  // Grid virtualizer (estimate 120px per row with ~8 items per row)
  const gridVirtualizer = useVirtualizer({
    count: Math.ceil(sortedItems.length / 8),
    getScrollElement: () => gridParentRef.current,
    estimateSize: () => 120,
    overscan: 3,
  })

  // List virtualizer
  const listVirtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  })

  if (viewMode === 'grid') {
    // For grid view, only use virtual scrolling if there are many items
    if (sortedItems.length < 100) {
      // Simple grid without virtualization for small lists
      return (
        <div 
          className="h-full overflow-y-auto pb-20"
          onClick={() => onSelect('', false)}
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 p-4">
            {sortedItems.map(node => {
              const Icon = getFileIcon(node)
              const isSelected = selectedIds.includes(node.id)
              
              return (
                <div
                  key={node.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, node.id)}
                  onDragOver={(e) => handleDragOver(e, node.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, node.id)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => handleMouseDown(e, node.id)}
                  onDoubleClick={() => onDoubleClick(node.id)}
                  onContextMenu={(e) => onContextMenu(e, node.id)}
                  className={cn(
                    "group flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 border border-transparent cursor-default",
                    isSelected 
                      ? "bg-blue-500/20 border-blue-500/30 shadow-inner" 
                      : "hover:bg-white/5 hover:border-white/5",
                    dropTargetId === node.id && "bg-green-500/20 border-green-500/30",
                    draggedIds.includes(node.id) && "opacity-50"
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
                  
                  {renamingId === node.id ? (
                    <RenameInput
                      initialValue={node.name}
                      className="w-full text-center text-xs rounded px-1"
                      onComplete={(newName) => {
                        if (newName && newName !== node.name) {
                          renameItem(node.id, newName).catch(console.error)
                        }
                        setRenamingId(null)
                      }}
                      onCancel={() => setRenamingId(null)}
                    />
                  ) : (
                    <span className="text-xs text-center text-white/80 line-clamp-2 break-all w-full px-1 group-hover:text-white">
                      {node.name}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    // Virtual scrolling for large lists
    const virtualRows = gridVirtualizer.getVirtualItems()
    
    return (
      <div 
        ref={gridParentRef}
        className="h-full overflow-y-auto pb-20"
        onClick={() => onSelect('', false)}
      >
        <div
          style={{
            height: `${gridVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
            padding: '16px',
          }}
        >
          {virtualRows.map((virtualRow) => {
            const startIdx = virtualRow.index * 8
            const rowItems = sortedItems.slice(startIdx, startIdx + 8)
            
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: `${virtualRow.start}px`,
                  left: '16px',
                  right: '16px',
                  height: `${virtualRow.size}px`,
                }}
              >
                <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 h-full">
                  {rowItems.map(node => {
                    const Icon = getFileIcon(node)
                    const isSelected = selectedIds.includes(node.id)
                    
                    return (
                      <div
                        key={node.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, node.id)}
                        onDragOver={(e) => handleDragOver(e, node.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, node.id)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => handleMouseDown(e, node.id)}
                        onDoubleClick={() => onDoubleClick(node.id)}
                        onContextMenu={(e) => onContextMenu(e, node.id)}
                        className={cn(
                          "group flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 border border-transparent cursor-default",
                          isSelected 
                            ? "bg-blue-500/20 border-blue-500/30 shadow-inner" 
                            : "hover:bg-white/5 hover:border-white/5",
                          dropTargetId === node.id && "bg-green-500/20 border-green-500/30",
                          draggedIds.includes(node.id) && "opacity-50"
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
                        
                        {renamingId === node.id ? (
                          <RenameInput
                            initialValue={node.name}
                            className="w-full text-center text-xs rounded px-1"
                            onComplete={(newName) => {
                              if (newName && newName !== node.name) {
                                renameItem(node.id, newName).catch(console.error)
                              }
                              setRenamingId(null)
                            }}
                            onCancel={() => setRenamingId(null)}
                          />
                        ) : (
                          <span className="text-xs text-center text-white/80 line-clamp-2 break-all w-full px-1 group-hover:text-white">
                            {node.name}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // List View with virtual scrolling
  const virtualItems = listVirtualizer.getVirtualItems()
  
  return (
    <div 
      className="flex flex-col h-full overflow-hidden"
      onClick={() => onSelect('', false)}
    >
      {/* Table Header */}
      <div className="flex items-center px-4 py-2 text-xs font-medium text-white/40 border-b border-white/5 select-none shrink-0">
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
          {t('common.date') || 'Date'}
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
          {t('common.size') || 'Size'}
          {sortField === 'size' && (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
        </div>
      </div>

      {/* Table Body with Virtual Scrolling */}
      <div ref={listParentRef} className="flex-1 overflow-y-auto p-1 pb-20 custom-scrollbar">
        <div
          style={{
            height: `${listVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const node = sortedItems[virtualItem.index]
            const Icon = getFileIcon(node)
            const isSelected = selectedIds.includes(node.id)

            return (
              <div
                key={node.id}
                data-index={virtualItem.index}
                ref={listVirtualizer.measureElement}
                draggable
                onDragStart={(e) => handleDragStart(e, node.id)}
                onDragOver={(e) => handleDragOver(e, node.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, node.id)}
                onDragEnd={handleDragEnd}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                onClick={(e) => handleMouseDown(e, node.id)}
                onDoubleClick={() => onDoubleClick(node.id)}
                onContextMenu={(e) => onContextMenu(e, node.id)}
                className={cn(
                  "flex items-center px-3 py-1.5 rounded-md text-sm text-white/80 transition-colors cursor-default group",
                  isSelected 
                    ? "bg-blue-500/20" 
                    : "hover:bg-white/5 odd:bg-white/[0.02]",
                  dropTargetId === node.id && "bg-green-500/20 border border-green-500/30",
                  draggedIds.includes(node.id) && "opacity-50"
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
                  {renamingId === node.id ? (
                    <RenameInput
                      initialValue={node.name}
                      className="w-full text-sm rounded px-1 py-0.5"
                      onComplete={(newName) => {
                        if (newName && newName !== node.name) {
                          renameItem(node.id, newName).catch(console.error)
                        }
                        setRenamingId(null)
                      }}
                      onCancel={() => setRenamingId(null)}
                    />
                  ) : (
                    <span className="truncate">{node.name}</span>
                  )}
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
    </div>
  )
}
