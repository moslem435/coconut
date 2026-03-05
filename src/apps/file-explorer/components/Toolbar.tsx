import React, { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RotateCw, Search,
  LayoutGrid, List as ListIcon, ChevronRight, Home, Upload, FolderPlus,
  ArrowDownWideNarrow, Check, X, Columns3, Minus, Maximize2, Minimize2
} from 'lucide-react'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { cn } from '@/lib/utils'
import { SortField, SortOrder } from '../index'
import { useWindowContext } from '@/os/kernel/WindowContext'
import { useWindowStore } from '@/os/kernel/useWindowStore'

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
  showPreviewPanel?: boolean
  onTogglePreviewPanel?: () => void
}

export default function Toolbar({
  currentPath, onNavigate, onUp, onBack, onForward,
  canGoBack, canGoForward, onRefresh,
  viewMode, onViewModeChange, sortConfig, onSortChange, canGoUp,
  searchQuery, onSearchChange, onUpload, onNewFolder,
  showPreviewPanel, onTogglePreviewPanel
}: ToolbarProps) {
  const { t } = useLanguage()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  // Window context for immersive title bar
  const windowCtx = useWindowContext()
  const windowId = windowCtx?.windowId
  const dragControls = windowCtx?.dragControls

  const minimizeWindow = useWindowStore(s => s.minimizeWindow)
  const maximizeWindow = useWindowStore(s => s.maximizeWindow)
  const closeWindow = useWindowStore(s => s.closeWindow)
  const windowState = useWindowStore(s => windowId ? s.windows[windowId] : null)
  const isMaximized = windowState?.isMaximized ?? false

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isSortMenuOpen && !(e.target as Element).closest('.sort-menu-container')) {
        setIsSortMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [isSortMenuOpen])

  const getDisplayName = (node: FileNode) => {
    if (node.id === 'root') return t('explorer.root') || 'Root'
    return node.name
  }

  const sortOptions: { label: string, value: SortField }[] = [
    { label: t('common.name') || 'Name', value: 'name' },
    { label: t('common.date') || 'Date Modified', value: 'date' },
    { label: t('common.type') || 'Kind', value: 'type' },
    { label: t('common.size') || 'Size', value: 'size' },
  ]

  const NavBtn = ({ onClick, disabled, children, title }: any) => (
    <button onClick={onClick} disabled={disabled} title={title}
      className="w-7 h-7 flex items-center justify-center rounded-md transition-all disabled:opacity-25 disabled:cursor-not-allowed"
      style={{ color: 'var(--os-text-secondary)' }}
      onMouseEnter={e => { if (!(e.currentTarget as any).disabled) (e.currentTarget as HTMLElement).style.background = 'var(--os-hover-bg)' }}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
      {children}
    </button>
  )

  // Handle drag on the title bar area (pointer events for framer-motion drag)
  const handleDragAreaPointerDown = (e: React.PointerEvent) => {
    if (dragControls) {
      dragControls.start(e as any)
    }
  }

  return (
    <div className="shrink-0 flex flex-col select-none"
      style={{ background: 'var(--os-bg-panel)', borderBottom: '1px solid var(--os-border)' }}>

      {/* ── Row 1: Draggable title area + window controls ────────── */}
      <div
        className="flex items-center h-9 px-3 cursor-grab active:cursor-grabbing"
        onPointerDown={handleDragAreaPointerDown}
        onDoubleClick={() => windowId && maximizeWindow(windowId)}
      >
        {/* App icon + title */}
        <div className="flex items-center gap-2 select-none pointer-events-none">
          <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
            style={{ background: 'rgba(59,130,246,0.2)' }}>
            <Home size={9} style={{ color: '#60a5fa' }} />
          </div>
          <span className="text-[12px] font-medium"
            style={{ color: 'var(--os-text-primary)' }}>
            {currentPath.length > 0 ? getDisplayName(currentPath[currentPath.length - 1]) : 'Files'}
          </span>
        </div>

        {/* Drag zone — flex-1 allows dragging from anywhere */}
        <div className="flex-1 h-full" />

        {/* Window Controls — pointer-events intercepted, don't bubble to drag */}
        {windowId && (
          <div className="flex items-center gap-0.5" onPointerDown={e => e.stopPropagation()}>
            <button onClick={() => minimizeWindow(windowId)}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-[var(--os-hover-bg)] active:scale-90"
              title="最小化">
              <Minus size={14} style={{ color: 'var(--os-text-secondary)' }} />
            </button>
            <button onClick={() => maximizeWindow(windowId)}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-[var(--os-hover-bg)] active:scale-90"
              title={isMaximized ? '还原' : '最大化'}>
              {isMaximized
                ? <Minimize2 size={14} style={{ color: 'var(--os-text-secondary)' }} />
                : <Maximize2 size={14} style={{ color: 'var(--os-text-secondary)' }} />
              }
            </button>
            <button onClick={() => closeWindow(windowId)}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-red-500 hover:text-white active:scale-90 group"
              title="关闭">
              <X size={14} style={{ color: 'var(--os-text-secondary)' }} className="group-hover:!text-white" />
            </button>
          </div>
        )}
      </div>

      {/* ── Row 2: Navigation + address + search + actions ────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5">

        {/* Navigation */}
        <div className="flex items-center gap-0.5">
          <NavBtn onClick={onBack} disabled={!canGoBack} title="后退 (Alt+←)"><ArrowLeft size={14} /></NavBtn>
          <NavBtn onClick={onForward} disabled={!canGoForward} title="前进 (Alt+→)"><ArrowRight size={14} /></NavBtn>
          <NavBtn onClick={onUp} disabled={!canGoUp} title="向上"><ArrowUp size={14} /></NavBtn>
        </div>

        <div className="w-px h-4" style={{ background: 'var(--os-border)' }} />

        <NavBtn onClick={onRefresh} title="刷新"><RotateCw size={12} /></NavBtn>

        {/* Breadcrumbs */}
        <div className="flex-1 flex items-center gap-0.5 px-2 h-6 rounded-md text-xs cursor-text overflow-hidden"
          style={{ background: 'var(--os-bg-window)', border: '1px solid var(--os-border)' }}>
          <Home size={10} style={{ color: 'var(--os-text-muted)', flexShrink: 0 }} />
          <div className="flex items-center overflow-hidden ml-1">
            {currentPath.map((node, i) => (
              <React.Fragment key={node.id}>
                {i > 0 && <ChevronRight size={9} className="mx-0.5 shrink-0" style={{ color: 'var(--os-text-muted)', opacity: 0.4 }} />}
                <button onClick={() => onNavigate(node.id)}
                  className={cn(
                    "px-1 py-0.5 rounded transition-all truncate max-w-[130px]",
                    i === currentPath.length - 1
                      ? "font-medium"
                      : "opacity-50"
                  )}
                  style={{ color: 'var(--os-text-primary)', fontSize: 11 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--os-hover-bg)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  {getDisplayName(node)}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative flex items-center gap-1.5 h-6 px-2 rounded-md transition-all"
          style={{
            width: searchFocused ? 192 : 140,
            background: 'var(--os-bg-window)',
            border: `1px solid ${searchFocused ? 'var(--os-accent)' : 'var(--os-border)'}`,
            boxShadow: searchFocused ? '0 0 0 2px var(--os-accent-muted, rgba(99,102,241,0.15))' : 'none',
            transition: 'all 0.2s ease'
          }}>
          <Search size={10} style={{ color: 'var(--os-text-muted)', flexShrink: 0 }} />
          <input ref={searchInputRef} type="text" placeholder="搜索…"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent outline-none min-w-0 placeholder:opacity-40"
            style={{ color: 'var(--os-text-primary)', fontSize: 11 }}
          />
          {searchQuery && <button onClick={() => onSearchChange('')}><X size={9} style={{ color: 'var(--os-text-muted)' }} /></button>}
        </div>

        <div className="w-px h-4" style={{ background: 'var(--os-border)' }} />

        {/* Actions */}
        <NavBtn onClick={onNewFolder} title="新建文件夹"><FolderPlus size={14} /></NavBtn>
        <NavBtn onClick={onUpload} title="上传文件"><Upload size={14} /></NavBtn>

        {/* View toggle */}
        <div className="flex items-center rounded-md overflow-hidden" style={{ border: '1px solid var(--os-border)' }}>
          {(['grid', 'list'] as const).map(m => (
            <button key={m} onClick={() => onViewModeChange(m)}
              className="w-6 h-6 flex items-center justify-center transition-all"
              style={{
                background: viewMode === m ? 'var(--os-accent)' : 'transparent',
                color: viewMode === m ? '#fff' : 'var(--os-text-muted)'
              }}>
              {m === 'grid' ? <LayoutGrid size={12} /> : <ListIcon size={12} />}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative sort-menu-container">
          <button onClick={() => setIsSortMenuOpen(v => !v)}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-all"
            style={{
              background: isSortMenuOpen ? 'var(--os-accent)' : 'transparent',
              color: isSortMenuOpen ? '#fff' : 'var(--os-text-muted)'
            }}
            title="排序">
            <ArrowDownWideNarrow size={14} />
          </button>

          {isSortMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] w-44 rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden"
              style={{ background: 'var(--os-bg-panel)', border: '1px solid var(--os-border)', backdropFilter: 'blur(20px)' }}>
              <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-widest mb-0.5"
                style={{ color: 'var(--os-text-muted)' }}>排序方式</div>
              {sortOptions.map(opt => {
                const isActive = sortConfig.field === opt.value
                return (
                  <button key={opt.value}
                    onClick={() => { onSortChange(opt.value); setIsSortMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] transition-all"
                    style={{ color: isActive ? 'var(--os-accent)' : 'var(--os-text-secondary)', background: isActive ? 'var(--os-bg-selection)' : 'transparent' }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--os-hover-bg)' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <div className="w-4 flex items-center justify-center shrink-0">
                      {isActive && <Check size={12} />}
                    </div>
                    <span className="flex-1 text-left">{opt.label}</span>
                    {isActive && (sortConfig.order === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Preview panel toggle */}
        {onTogglePreviewPanel && (
          <NavBtn onClick={onTogglePreviewPanel} title="预览面板">
            <Columns3 size={14} style={{ color: showPreviewPanel ? 'var(--os-accent)' : undefined }} />
          </NavBtn>
        )}
      </div>
    </div>
  )
}
