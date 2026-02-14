import React, { useEffect } from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { cn } from '@/lib/utils'
import { Folder, ArrowUp, ArrowDown } from 'lucide-react'
import { useState, useRef } from 'react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useUIStore } from '@/os/kernel/useUIStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useVirtualizer } from '@tanstack/react-virtual'
import { SortField, SortOrder } from '../index'
import { FileGridItem } from '@/os/ui/file/FileGridItem'
import { FileListItem } from '@/os/ui/file/FileListItem'

interface FileListProps {
  items: FileNode[]
  viewMode: 'grid' | 'list'
  onNavigate: (id: string) => void
  onDoubleClick: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
  selectedIds: string[]
  onSelect: (id: string, e?: React.MouseEvent) => void
  onDrop?: (draggedIds: string[], targetId: string) => void
  sortConfig: { field: SortField, order: SortOrder }
  onSortChange: (field: SortField) => void
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

// Helper to get file type label
const getFileTypeLabel = (node: FileNode) => {
  if (node.type === 'folder') return 'Folder'
  if (node.appId) return 'Shortcut'

  const ext = node.name.split('.').pop()?.toLowerCase()
  if (!ext || ext === node.name) return 'File'

  // Return uppercase extension as type
  return ext.toUpperCase()
}

// Simple relative time formatter
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function FileList({
  items, viewMode, onNavigate, onDoubleClick, onContextMenu,
  selectedIds, onSelect, onDrop, sortConfig, onSortChange
}: FileListProps) {
  const { t } = useLanguage()

  const { renamingId, setRenamingId } = useUIStore()
  const { renameItem } = useFileSystemStore()

  const [draggedIds, setDraggedIds] = useState<string[]>([])
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onSelect(id, e)
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

  // Virtual scrolling ref (only for list view)
  const listParentRef = useRef<HTMLDivElement>(null)

  // List virtualizer
  const listVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 36,
    overscan: 10,
    enabled: viewMode === 'list'
  })

  // Grid Virtualization Logic
  const gridParentRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!gridParentRef.current || viewMode !== 'grid') return
    
    const updateWidth = () => {
      if (gridParentRef.current) {
        setContainerWidth(gridParentRef.current.clientWidth)
      }
    }
    
    updateWidth()
    
    const observer = new ResizeObserver(updateWidth)
    observer.observe(gridParentRef.current)
    
    return () => observer.disconnect()
  }, [viewMode])

  const GRID_ITEM_WIDTH = 100
  const GRID_GAP = 16 // 1rem
  const GRID_PADDING = 32 // 1rem * 2 (left + right)

  const columns = Math.max(1, Math.floor((containerWidth - GRID_PADDING + GRID_GAP) / (GRID_ITEM_WIDTH + GRID_GAP)))
  const rowCount = Math.ceil(items.length / columns)

  const gridVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => gridParentRef.current,
    estimateSize: () => 140, // Item height + gap
    overscan: 5,
    enabled: viewMode === 'grid'
  })

  // Empty State
  if (items.length === 0) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center text-white/20 select-none"
        onClick={() => onSelect('')}
      >
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Folder size={48} strokeWidth={1.5} className="opacity-50" />
        </div>
        <span className="text-sm font-medium">{t('explorer.empty') || 'This folder is empty'}</span>
      </div>
    )
  }

  // Grid view - virtualized
  if (viewMode === 'grid') {
    const virtualRows = gridVirtualizer.getVirtualItems()
    
    return (
      <div
        ref={gridParentRef}
        className="h-full overflow-y-auto pb-20 custom-scrollbar"
        onClick={(e) => onSelect('', e)}
      >
        <div
          style={{
            height: `${gridVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualRows.map((virtualRow) => {
            const startIndex = virtualRow.index * columns
            const rowItems = items.slice(startIndex, Math.min(startIndex + columns, items.length))
            
            return (
              <div
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, 100px)`,
                  gap: '16px',
                  padding: '16px', // p-4
                }}
              >
                {rowItems.map(node => {
                  const isSelected = selectedIds.includes(node.id)

                  return (
                    <FileGridItem
                      key={node.id}
                      item={node}
                      selected={isSelected}
                      renaming={renamingId === node.id}
                      onRename={(newName) => {
                        if (newName && newName !== node.name) {
                          renameItem(node.id, newName).catch(console.error)
                        }
                        setRenamingId(null)
                      }}
                      onCancelRename={() => setRenamingId(null)}
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
                        "p-3 rounded-xl transition-[background-color,border-color,opacity,box-shadow] duration-200 border border-transparent cursor-default",
                        isSelected
                          ? "bg-blue-500/20 border-blue-500/30 shadow-inner"
                          : "",
                        dropTargetId === node.id && "bg-green-500/20 border-green-500/30",
                        draggedIds.includes(node.id) && "opacity-50"
                      )}
                    />
                  )
                })}
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
      onClick={() => onSelect('')}
    >
      {/* Table Header */}
      <div className="flex items-center px-4 py-2 text-xs font-medium text-white/40 border-b border-white/5 select-none shrink-0">
        <div
          className="flex-[2] min-w-[200px] flex items-center gap-1 cursor-pointer hover:text-white transition-colors"
          onClick={() => onSortChange('name')}
        >
          {t('common.name') || 'Name'}
          {sortConfig.field === 'name' && (sortConfig.order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
        </div>
        <div
          className="flex-1 min-w-[100px] flex items-center gap-1 cursor-pointer hover:text-white transition-colors"
          onClick={() => onSortChange('date')}
        >
          {t('common.date') || 'Date'}
          {sortConfig.field === 'date' && (sortConfig.order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
        </div>
        <div
          className="flex-1 min-w-[80px] flex items-center gap-1 cursor-pointer hover:text-white transition-colors"
          onClick={() => onSortChange('type')}
        >
          {t('common.type') || 'Type'}
          {sortConfig.field === 'type' && (sortConfig.order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
        </div>
        <div
          className="w-[80px] text-right flex items-center justify-end gap-1 cursor-pointer hover:text-white transition-colors"
          onClick={() => onSortChange('size')}
        >
          {t('common.size') || 'Size'}
          {sortConfig.field === 'size' && (sortConfig.order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
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
            const node = items[virtualItem.index]
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
                    : "odd:bg-white/[0.02]",
                  dropTargetId === node.id && "bg-green-500/20 border border-green-500/30",
                  draggedIds.includes(node.id) && "opacity-50"
                )}
              >
                <FileListItem
                  item={node}
                  className="flex-[2] min-w-[200px]"
                  renaming={renamingId === node.id}
                  onRename={(newName) => {
                    if (newName && newName !== node.name) {
                      renameItem(node.id, newName).catch(console.error)
                    }
                    setRenamingId(null)
                  }}
                  onCancelRename={() => setRenamingId(null)}
                />

                <div className="flex-1 min-w-[100px] text-xs text-white/40">
                  {formatTime(node.updatedAt)}
                </div>
                <div className="flex-1 min-w-[80px] text-xs text-white/40">
                  {getFileTypeLabel(node)}
                </div>
                <div className="w-[80px] text-right text-xs text-white/40 font-mono">
                  {formatSize(node.size)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}