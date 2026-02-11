import React from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { cn } from '@/lib/utils'
import { 
  Folder, FileText, Image as ImageIcon, Music, Video, Code, 
  File, ArrowUp, ArrowDown, StickyNote,
  FileJson, FileCode2, FileSpreadsheet, Archive, Database,
  Braces, FileType2, Hash, Palette, Box, Package, Settings
} from 'lucide-react'
import { useState, useMemo, useRef } from 'react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useUIStore } from '@/os/kernel/useUIStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { RenameInput } from '@/os/ui/RenameInput'
import { useVirtualizer } from '@tanstack/react-virtual'
import { APPS_REGISTRY } from '@/os/registry/config'
import { AppIcon } from '@/os/ui/AppIcon'

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

// Helper to get file icon and theme
const getFileIconAndTheme = (node: FileNode) => {
  // Check if it's an app shortcut
  const manifest = node.appId ? APPS_REGISTRY[node.appId] : undefined
  
  if (manifest) {
    return {
      Icon: manifest.icon,
      backgroundColor: manifest.theme?.backgroundColor || '#3b82f6',
      useAppIcon: true,
      manifest
    }
  }
  
  // Folder
  if (node.type === 'folder') {
    return {
      Icon: Folder,
      backgroundColor: '#facc15', // yellow-400
      useAppIcon: false
    }
  }
  
  // Files by extension
  const ext = node.name.split('.').pop()?.toLowerCase()
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext || '')) {
    return {
      Icon: ImageIcon,
      backgroundColor: '#a855f7', // purple-500
      useAppIcon: false
    }
  }
  
  // Documents
  if (['txt', 'md', 'doc', 'docx'].includes(ext || '')) {
    return {
      Icon: FileText,
      backgroundColor: '#3b82f6', // blue-500
      useAppIcon: false
    }
  }
  
  // Notes
  if (['note'].includes(ext || '')) {
    return {
      Icon: StickyNote,
      backgroundColor: '#eab308', // yellow-500
      useAppIcon: false
    }
  }
  
  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext || '')) {
    return {
      Icon: Music,
      backgroundColor: '#ec4899', // pink-500
      useAppIcon: false
    }
  }
  
  // Video
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv'].includes(ext || '')) {
    return {
      Icon: Video,
      backgroundColor: '#8b5cf6', // violet-500
      useAppIcon: false
    }
  }
  
  // JSON
  if (['json', 'jsonc'].includes(ext || '')) {
    return {
      Icon: Braces,
      backgroundColor: '#10b981', // emerald-500
      useAppIcon: false
    }
  }
  
  // JavaScript/TypeScript
  if (['js', 'jsx', 'mjs', 'cjs'].includes(ext || '')) {
    return {
      Icon: FileCode2,
      backgroundColor: '#f59e0b', // amber-500
      useAppIcon: false
    }
  }
  
  if (['ts', 'tsx'].includes(ext || '')) {
    return {
      Icon: FileCode2,
      backgroundColor: '#3b82f6', // blue-500
      useAppIcon: false
    }
  }
  
  // Web
  if (['html', 'htm'].includes(ext || '')) {
    return {
      Icon: Code,
      backgroundColor: '#f97316', // orange-500
      useAppIcon: false
    }
  }
  
  if (['css', 'scss', 'sass', 'less'].includes(ext || '')) {
    return {
      Icon: Palette,
      backgroundColor: '#06b6d4', // cyan-500
      useAppIcon: false
    }
  }
  
  // Python
  if (['py', 'pyc', 'pyw'].includes(ext || '')) {
    return {
      Icon: FileCode2,
      backgroundColor: '#3b82f6', // blue-500
      useAppIcon: false
    }
  }
  
  // Java/C/C++
  if (['java', 'class', 'jar'].includes(ext || '')) {
    return {
      Icon: FileCode2,
      backgroundColor: '#dc2626', // red-600
      useAppIcon: false
    }
  }
  
  if (['c', 'h'].includes(ext || '')) {
    return {
      Icon: FileCode2,
      backgroundColor: '#6366f1', // indigo-500
      useAppIcon: false
    }
  }
  
  if (['cpp', 'cc', 'cxx', 'hpp'].includes(ext || '')) {
    return {
      Icon: FileCode2,
      backgroundColor: '#8b5cf6', // violet-500
      useAppIcon: false
    }
  }
  
  // Go/Rust
  if (['go'].includes(ext || '')) {
    return {
      Icon: FileCode2,
      backgroundColor: '#06b6d4', // cyan-500
      useAppIcon: false
    }
  }
  
  if (['rs'].includes(ext || '')) {
    return {
      Icon: FileCode2,
      backgroundColor: '#f97316', // orange-500
      useAppIcon: false
    }
  }
  
  // Spreadsheets
  if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
    return {
      Icon: FileSpreadsheet,
      backgroundColor: '#10b981', // emerald-500
      useAppIcon: false
    }
  }
  
  // PDFs
  if (['pdf'].includes(ext || '')) {
    return {
      Icon: FileText,
      backgroundColor: '#dc2626', // red-600
      useAppIcon: false
    }
  }
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext || '')) {
    return {
      Icon: Archive,
      backgroundColor: '#78716c', // stone-500
      useAppIcon: false
    }
  }
  
  // Database
  if (['db', 'sqlite', 'sql'].includes(ext || '')) {
    return {
      Icon: Database,
      backgroundColor: '#0891b2', // cyan-600
      useAppIcon: false
    }
  }
  
  // Config files
  if (['xml', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config'].includes(ext || '')) {
    return {
      Icon: Settings,
      backgroundColor: '#64748b', // slate-500
      useAppIcon: false
    }
  }
  
  // Package files
  if (['pkg', 'deb', 'rpm', 'dmg', 'exe', 'msi'].includes(ext || '')) {
    return {
      Icon: Package,
      backgroundColor: '#7c3aed', // violet-600
      useAppIcon: false
    }
  }
  
  // Markdown
  if (['md', 'markdown'].includes(ext || '')) {
    return {
      Icon: Hash,
      backgroundColor: '#6366f1', // indigo-500
      useAppIcon: false
    }
  }
  
  // 3D Models
  if (['obj', 'fbx', 'gltf', 'glb', 'stl'].includes(ext || '')) {
    return {
      Icon: Box,
      backgroundColor: '#a855f7', // purple-500
      useAppIcon: false
    }
  }
  
  // Default file
  return {
    Icon: File,
    backgroundColor: '#94a3b8', // slate-400
    useAppIcon: false
  }
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

  // Virtual scrolling ref (only for list view)
  const listParentRef = useRef<HTMLDivElement>(null)

  // List virtualizer
  const listVirtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  })

  // Grid view - simple non-virtualized
  if (viewMode === 'grid') {
    return (
      <div 
        className="h-full overflow-y-auto pb-20"
        onClick={() => onSelect('', false)}
      >
        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 p-4">
          {sortedItems.map(node => {
            const { Icon, backgroundColor, useAppIcon, manifest } = getFileIconAndTheme(node)
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
                {useAppIcon && manifest ? (
                  <AppIcon
                    manifest={manifest}
                    size={48}
                    className="drop-shadow-md"
                  />
                ) : (
                  <div 
                    className="flex items-center justify-center rounded-xl shadow-md transition-transform duration-200 group-hover:scale-105"
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: backgroundColor,
                      color: '#ffffff'
                    }}
                  >
                    <Icon 
                      size={28} 
                      strokeWidth={2}
                    />
                  </div>
                )}
                
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
            const { Icon, backgroundColor, useAppIcon, manifest } = getFileIconAndTheme(node)
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
                  {useAppIcon && manifest ? (
                    <AppIcon
                      manifest={manifest}
                      size={20}
                      className="shrink-0"
                    />
                  ) : (
                    <div 
                      className="flex items-center justify-center rounded-md shrink-0"
                      style={{
                        width: 20,
                        height: 20,
                        backgroundColor: backgroundColor,
                        color: '#ffffff'
                      }}
                    >
                      <Icon size={12} strokeWidth={2} />
                    </div>
                  )}
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
                <div className="flex-1 min-w-[80px] text-xs text-white/40">
                  {getFileTypeLabel(node)}
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
