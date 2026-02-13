import React, { useState } from 'react'
import { ChevronRight, ChevronDown, FileCode, Search, MoreHorizontal, FileText, Image, Music, Film, Box, Layout } from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { VSCODE_COLORS } from '../constants'

// --- Icon Helper ---
const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode size={14} className="text-blue-400" />
    case 'css':
    case 'scss':
      return <Layout size={14} className="text-blue-300" />
    case 'html':
      return <Layout size={14} className="text-orange-400" />
    case 'json':
      return <Box size={14} className="text-yellow-400" />
    case 'md':
      return <FileText size={14} className="text-blue-200" />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <Image size={14} className="text-purple-400" />
    case 'mp3':
    case 'wav':
      return <Music size={14} className="text-pink-400" />
    case 'mp4':
      return <Film size={14} className="text-red-400" />
    default:
      return <FileText size={14} className="text-gray-400" />
  }
}

interface FileTreeItemProps {
  id: string
  depth?: number
  expandedFolders: Record<string, boolean>
  toggleFolder: (id: string) => void
  activeFileId: string | null
  onFileSelect: (id: string) => void
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ 
  id, 
  depth = 0, 
  expandedFolders, 
  toggleFolder, 
  activeFileId, 
  onFileSelect 
}) => {
  const { files, getChildren } = useFileSystemStore()
  const item = files[id]
  
  if (!item) return null

  const isFolder = item.type === 'folder'
  const isExpanded = expandedFolders[id]
  const paddingLeft = `${depth * 12 + 10}px`
  const isActive = activeFileId === id

  if (isFolder) {
    const children = getChildren(id)
    return (
      <div>
        <div
          className="flex items-center gap-1 py-1 hover:bg-[#2a2d2e] cursor-pointer text-gray-300 text-sm select-none"
          style={{ paddingLeft }}
          onClick={(e) => {
            e.stopPropagation()
            toggleFolder(id)
          }}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="font-bold text-xs truncate">{item.name.toUpperCase()}</span>
        </div>
        {isExpanded && children.map(child => (
          <FileTreeItem 
            key={child.id} 
            id={child.id} 
            depth={depth + 1}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            activeFileId={activeFileId}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    )
  } else {
    return (
      <div
        className={`
          flex items-center gap-2 py-1 cursor-pointer text-sm select-none
          ${isActive ? 'bg-[#37373d] text-white' : 'text-gray-400 hover:bg-[#2a2d2e]'}
        `}
        style={{ paddingLeft }}
        onClick={(e) => {
          e.stopPropagation()
          onFileSelect(id)
        }}
      >
        {getFileIcon(item.name)}
        <span className="truncate">{item.name}</span>
      </div>
    )
  }
}

interface SidebarProps {
  activeView: 'explorer' | 'search' | 'git' | 'debug' | 'extensions'
  activeFileId: string | null
  onFileSelect: (fileId: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, activeFileId, onFileSelect }) => {
  const { rootId } = useFileSystemStore()
  const { t } = useLanguage()
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ [rootId]: true })

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (activeView !== 'explorer') {
    return (
      <div 
        className="w-60 flex flex-col border-r border-[#2b2b2b] select-none h-full"
        style={{ backgroundColor: VSCODE_COLORS.sidebar }}
      >
        <div className="h-9 px-4 flex items-center text-xs uppercase tracking-wider text-gray-400 font-medium">
          {activeView}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-4 text-center">
          {activeView === 'search' && 'Search functionality is coming soon.'}
          {activeView === 'git' && 'Source Control is not available in this demo.'}
          {activeView === 'debug' && 'Debugging is not configured.'}
          {activeView === 'extensions' && 'No extensions installed.'}
        </div>
      </div>
    )
  }

  return (
    <div 
      className="w-60 flex flex-col border-r border-[#2b2b2b] select-none h-full"
      style={{ backgroundColor: VSCODE_COLORS.sidebar }}
    >
      <div className="h-9 px-4 flex items-center justify-between text-xs uppercase tracking-wider text-gray-400 font-medium group shrink-0">
        <span>{t('vscode.explorer')}</span>
        <MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer hover:text-white" />
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <FileTreeItem 
          id={rootId} 
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          activeFileId={activeFileId}
          onFileSelect={onFileSelect}
        />
      </div>
    </div>
  )
}
