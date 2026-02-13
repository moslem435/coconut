import React from 'react'
import { FileCode, X, Layout, Box, FileText, Image, Music, Film } from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
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

interface TabBarProps {
  openFiles: string[]
  activeFileId: string | null
  unsavedChanges: Record<string, boolean>
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export const TabBar: React.FC<TabBarProps> = ({ 
  openFiles, 
  activeFileId, 
  unsavedChanges, 
  onSelect, 
  onClose 
}) => {
  const { files } = useFileSystemStore()

  if (openFiles.length === 0) return null

  return (
    <div className="flex bg-[#252526] overflow-x-auto no-scrollbar h-9 items-end shrink-0">
      {openFiles.map(fid => {
        const file = files[fid]
        if (!file) return null // Should not happen if file exists

        const isActive = activeFileId === fid
        const isDirty = unsavedChanges[fid]
        
        return (
          <div
            key={fid}
            onClick={() => onSelect(fid)}
            className={`
              group flex items-center gap-2 px-3 h-9 min-w-[120px] max-w-[200px] border-r border-[#1e1e1e] cursor-pointer text-sm select-none relative
              ${isActive ? 'bg-[#1e1e1e] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#2a2d2e]'}
            `}
          >
            {/* Top Border for Active Tab */}
            {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500" />}
            
            {getFileIcon(file.name)}
            <span className={`truncate flex-1 ${isDirty ? 'italic' : ''}`}>{file.name}</span>
            
            <div
              onClick={(e) => {
                e.stopPropagation()
                onClose(fid)
              }}
              className={`opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-gray-600 ${isDirty ? 'opacity-100' : ''}`}
            >
              {isDirty ? (
                <div className="w-2 h-2 rounded-full bg-white mb-0.5 mx-1" />
              ) : (
                <X size={14} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
