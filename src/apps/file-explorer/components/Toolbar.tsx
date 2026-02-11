import React, { useState } from 'react'
import { 
  ArrowLeft, ArrowRight, ArrowUp, RotateCw, Search, 
  LayoutGrid, List as ListIcon, ChevronRight, Home, HardDrive 
} from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { cn } from '@/lib/utils'

interface ToolbarProps {
  currentPath: FileNode[]
  onNavigate: (id: string) => void
  onUp: () => void
  onRefresh: () => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  canGoUp: boolean
}

export default function Toolbar({ 
  currentPath, onNavigate, onUp, onRefresh, 
  viewMode, onViewModeChange, canGoUp 
}: ToolbarProps) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')

  // Helper to get display name
  const getDisplayName = (node: FileNode) => {
    if (node.id === 'root') return t('explorer.root') || 'Root'
    // Simple translation fallback for now, ideally passed from parent or context
    return node.name
  }

  return (
    <div className="h-12 flex items-center gap-3 px-4 border-b border-white/5 bg-[rgba(var(--os-bg-panel-rgb),0.5)] backdrop-blur-md shrink-0">
      
      {/* Navigation Controls */}
      <div className="flex items-center gap-1 text-white/70">
        <button 
          onClick={onUp}
          disabled={!canGoUp}
          className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ArrowUp size={16} />
        </button>
        {/* Placeholder for Back/Forward history */}
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button 
          onClick={onRefresh}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        >
          <RotateCw size={14} />
        </button>
      </div>

      {/* Address Bar / Breadcrumbs */}
      <div className="flex-1 flex items-center gap-1 px-3 py-1.5 bg-black/20 hover:bg-black/30 border border-white/5 hover:border-white/10 rounded-md transition-all group cursor-text">
        <Home size={14} className="text-white/40 group-hover:text-white/60 transition-colors" />
        
        <div className="flex items-center text-sm overflow-hidden mask-linear-fade">
          {currentPath.map((node, i) => (
            <React.Fragment key={node.id}>
              {i > 0 && <ChevronRight size={12} className="text-white/20 mx-1" />}
              <button
                onClick={() => onNavigate(node.id)}
                className={cn(
                  "px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors truncate max-w-[150px]",
                  i === currentPath.length - 1 ? "text-white font-medium" : "text-white/70"
                )}
              >
                {getDisplayName(node)}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-48 group">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors" />
        <input 
          type="text" 
          placeholder={t('common.search') || "Search"}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-black/20 border border-white/5 rounded-md py-1.5 pl-8 pr-3 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:bg-black/40 focus:border-white/20 transition-all"
        />
      </div>

      {/* View Switcher */}
      <div className="flex bg-black/20 rounded-md p-0.5 border border-white/5">
        <button
          onClick={() => onViewModeChange('grid')}
          className={cn(
            "p-1.5 rounded transition-all",
            viewMode === 'grid' ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white/80"
          )}
          title="Grid View"
        >
          <LayoutGrid size={14} />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className={cn(
            "p-1.5 rounded transition-all",
            viewMode === 'list' ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white/80"
          )}
          title="List View"
        >
          <ListIcon size={14} />
        </button>
      </div>

    </div>
  )
}
