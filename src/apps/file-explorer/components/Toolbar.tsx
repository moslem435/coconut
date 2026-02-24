import React, { useState, useRef, useEffect } from 'react'
import { 
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RotateCw, Search, 
  LayoutGrid, List as ListIcon, ChevronRight, Home, Upload, FolderPlus,
  ArrowDownWideNarrow, Check, ChevronDown
} from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { cn } from '@/lib/utils'
import { SortField, SortOrder } from '../index'

interface ToolbarProps {
  currentPath: FileNode[]
  onNavigate: (id: string) => void
  onUp: () => void
  onBack: () => void
  onForward: () => void
  canGoBack: boolean
  canGoForward: boolean
  onRefresh: () => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  sortConfig: { field: SortField, order: SortOrder }
  onSortChange: (field: SortField) => void
  canGoUp: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onUpload?: () => void
  onNewFolder?: () => void
}

export default function Toolbar({ 
  currentPath, onNavigate, onUp, onBack, onForward,
  canGoBack, canGoForward, onRefresh, 
  viewMode, onViewModeChange, sortConfig, onSortChange, canGoUp,
  searchQuery, onSearchChange, onUpload, onNewFolder
}: ToolbarProps) {
  const { t } = useLanguage()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)

  // Focus search on Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close sort menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isSortMenuOpen && !(e.target as Element).closest('.sort-menu-container')) {
        setIsSortMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [isSortMenuOpen])

  // Helper to get display name
  const getDisplayName = (node: FileNode) => {
    if (node.id === 'root') return t('explorer.root') || 'Root'
    return node.name
  }

  const sortOptions: { label: string, value: SortField }[] = [
    { label: t('common.name') || 'Name', value: 'name' },
    { label: t('common.date') || 'Date', value: 'date' },
    { label: t('common.type') || 'Type', value: 'type' },
    { label: t('common.size') || 'Size', value: 'size' },
  ]

  return (
    <div className="relative z-20 h-14 flex items-center gap-4 px-4 border-b border-[var(--os-border)]/50 shrink-0">
      
      {/* Navigation Controls */}
      <div className="flex items-center gap-1 text-[var(--os-text-secondary)]">
        <button 
          onClick={onBack}
          disabled={!canGoBack}
          className="p-1.5 rounded-md hover:bg-[var(--os-hover-bg)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Back (Alt+Left)"
        >
          <ArrowLeft size={16} />
        </button>
        <button 
          onClick={onForward}
          disabled={!canGoForward}
          className="p-1.5 rounded-md hover:bg-[var(--os-hover-bg)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Forward (Alt+Right)"
        >
          <ArrowRight size={16} />
        </button>
        <button 
          onClick={onUp}
          disabled={!canGoUp}
          className="p-1.5 rounded-md hover:bg-[var(--os-hover-bg)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Up"
        >
          <ArrowUp size={16} />
        </button>
        
        <div className="w-px h-4 bg-[var(--os-border)] mx-1" />
        
        <button 
          onClick={onRefresh}
          className="p-1.5 rounded-md hover:bg-[var(--os-hover-bg)] transition-colors"
          title="Refresh"
        >
          <RotateCw size={14} />
        </button>
      </div>

      {/* Address Bar / Breadcrumbs */}
      <div className="flex-1 flex items-center gap-1 px-3 py-1.5 bg-[var(--os-bg-selection)] hover:bg-[var(--os-hover-bg)] border border-[var(--os-border)] hover:border-[var(--os-border-active)] rounded-md transition-all group cursor-text">
        <Home size={14} className="text-[var(--os-text-muted)] group-hover:text-[var(--os-text-secondary)] transition-colors" />
        
        <div className="flex items-center text-sm overflow-hidden mask-linear-fade">
          {currentPath.map((node, i) => (
            <React.Fragment key={node.id}>
              {i > 0 && <ChevronRight size={12} className="text-[var(--os-text-muted)] mx-1" />}
              <button
                onClick={() => onNavigate(node.id)}
                className={cn(
                  "px-1.5 py-0.5 rounded hover:bg-[var(--os-hover-bg)] transition-colors truncate max-w-[150px]",
                  i === currentPath.length - 1 ? "text-[var(--os-text-primary)] font-medium" : "text-[var(--os-text-secondary)]"
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
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--os-text-muted)] group-focus-within:text-[var(--os-text-secondary)] transition-colors" />
        <input 
          ref={searchInputRef}
          type="text" 
          placeholder={t('common.search') || "Search (Ctrl+F)"}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-[var(--os-bg-selection)] border border-[var(--os-border)] rounded-md py-1.5 pl-8 pr-3 text-sm text-[var(--os-text-primary)] placeholder:text-[var(--os-text-muted)] focus:outline-none focus:bg-[var(--os-hover-bg)] focus:border-[var(--os-border-active)] transition-all"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onNewFolder}
          className="p-1.5 rounded-md hover:bg-[var(--os-hover-bg)] transition-colors text-[var(--os-text-secondary)] hover:text-[var(--os-text-primary)]"
          title="New Folder (Ctrl+N)"
        >
          <FolderPlus size={16} />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-md hover:bg-[var(--os-hover-bg)] transition-colors text-[var(--os-text-secondary)] hover:text-[var(--os-text-primary)]"
          title="Upload Files"
        >
          <Upload size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && onUpload) {
              onUpload()
            }
          }}
        />
      </div>

      {/* View Switcher & Sort */}
      <div className="flex items-center gap-2">
        <div className="flex bg-[var(--os-bg-selection)] rounded-md p-0.5 border border-[var(--os-border)]">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              "p-1.5 rounded transition-all",
              viewMode === 'grid' ? "bg-[var(--os-bg-window)] text-[var(--os-text-primary)] shadow-sm" : "text-[var(--os-text-muted)] hover:text-[var(--os-text-secondary)]"
            )}
            title="Grid View"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              "p-1.5 rounded transition-all",
              viewMode === 'list' ? "bg-[var(--os-bg-window)] text-[var(--os-text-primary)] shadow-sm" : "text-[var(--os-text-muted)] hover:text-[var(--os-text-secondary)]"
            )}
            title="List View"
          >
            <ListIcon size={14} />
          </button>
        </div>

        {/* Sort Menu */}
        <div className="relative sort-menu-container">
          <button
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            className={cn(
              "p-1.5 rounded-md hover:bg-[var(--os-hover-bg)] transition-colors text-[var(--os-text-secondary)] hover:text-[var(--os-text-primary)] flex items-center gap-1",
              isSortMenuOpen && "bg-[var(--os-bg-selection)] text-[var(--os-text-primary)]"
            )}
            title="Sort Options"
          >
            <ArrowDownWideNarrow size={16} />
          </button>

          {isSortMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--os-bg-panel)]/95 backdrop-blur-xl border border-[var(--os-border)] rounded-lg shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right ring-1 ring-black/5">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--os-text-muted)] uppercase tracking-wider select-none mb-1">
                {t('common.sort_by') || 'Sort by'}
              </div>
              {sortOptions.map(option => {
                const isSelected = sortConfig.field === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value)
                      setIsSortMenuOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                      isSelected ? "text-[var(--os-text-primary)] bg-[var(--os-bg-selection)]" : "text-[var(--os-text-secondary)] hover:bg-[var(--os-hover-bg)] hover:text-[var(--os-text-primary)]"
                    )}
                  >
                    {/* Check Icon Container */}
                    <div className="w-4 flex items-center justify-center shrink-0">
                      {isSelected && <Check size={14} className="text-[var(--os-accent)]" />}
                    </div>
                    
                    <span className="flex-1 truncate">{option.label}</span>
                    
                    {/* Sort Direction Icon */}
                    {isSelected && (
                      <div className="text-[var(--os-text-muted)] shrink-0">
                        {sortConfig.order === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
