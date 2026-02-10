import { useState, useEffect } from 'react'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { Folder, FileText, ChevronRight, ArrowUp, Home, HardDrive, Image as ImageIcon, Download, StickyNote, LayoutGrid, List as ListIcon } from 'lucide-react'
import { APPS_REGISTRY } from '@/os/registry/config'
import Notepad from '@/apps/notepad'
import ImageViewer from '@/apps/file-explorer/components/ImageViewer'
import { AppIcon } from '@/os/ui/AppIcon'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'

// Helper: Get translated display name
const getDisplayName = (node: FileNode, t: (key: string) => string) => {
  // 1. App Shortcut
  if (node.appId) return t(`app.${node.appId}`)
  
  // 2. System Folders / Special IDs
  if (node.id === 'recycle-bin' || node.id === 'trash') return t('app.recycle-bin')
  if (['root', 'desktop', 'documents', 'pictures', 'downloads'].includes(node.id)) {
      return t(`explorer.${node.id}`)
  }

  // 3. Specific Files/Folders (mapped to translation keys)
  const idToKeyMap: Record<string, string> = {
      'welcome-txt': 'file.welcome',
      'about-md': 'file.about',
      'code-1': 'file.code.hello',
      'code-2': 'file.code.component',
      'music': 'folder.music',
      'code': 'folder.code'
  }
  
  if (idToKeyMap[node.id]) {
      return t(idToKeyMap[node.id])
  }

  return node.name
}

interface FileExplorerProps {
    initialPath?: string
}

export default function FileExplorer({ initialPath = 'root' }: FileExplorerProps) {
  const [currentPathId, setCurrentPathId] = useState(initialPath)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { files, getChildren, getPath } = useFileSystemStore()
  const { launchApp, focusWindow, windows } = useWindowStore()
  const { showMenu } = useContextMenuStore()
  const { t } = useLanguage()
  
  // Update path if initialPath changes (optional, but good for linking)
  useEffect(() => {
      if (initialPath) setCurrentPathId(initialPath)
  }, [initialPath])

  const currentFolder = files[currentPathId] || files['root']
  const children = getChildren(currentPathId)
  const path = getPath(currentPathId)

  const handleNavigate = (id: string) => {
    if (files[id]?.type === 'folder') {
        setCurrentPathId(id)
    }
  }

  const handleDoubleClick = (id: string) => {
      const item = files[id]
      if (!item) return

      // 1. If it's an app shortcut
      if (item.appId) {
          if (windows[item.appId]?.isOpen) {
              focusWindow(item.appId)
              return
          }

          const app = APPS_REGISTRY[item.appId]
          if (!app) return

          launchApp(
              app.id,
              t(`app.${app.id}`),
              <app.component />,
              app.icon,
              { ...app.defaultWindowOptions, isDefaultTitle: true }
          )
          return
      }

      // 2. If it's a folder
      if (item.type === 'folder') {
          handleNavigate(item.id)
          return
      }

      // 3. If it's a file
      if (item.type === 'file') {
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)

          if (isImage) {
              launchApp(
                  'preview-' + item.id,
                  item.name,
                  <ImageViewer src={item.content || ''} />,
                  ImageIcon,
                  { size: { width: 600, height: 400 } }
              )
          } else {
                launchApp(
                    'notepad-' + item.id,
                    item.name,
                    <Notepad fileId={item.id} />,
                    StickyNote,
                    { size: { width: 600, height: 450 } }
                )
            }
          return
      }
  }

  const handleUp = () => {
    if (currentFolder.parentId) {
      setCurrentPathId(currentFolder.parentId)
    }
  }

  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      showMenu(e.clientX, e.clientY, 'explorer-background', { pathId: currentPathId })
  }

  const handleItemContextMenu = (e: React.MouseEvent, id: string) => {
      e.preventDefault()
      e.stopPropagation()
      showMenu(e.clientX, e.clientY, 'desktop-item', { id })
  }

  return (
    <div className="h-full flex flex-col bg-[var(--os-bg-base)] text-[var(--os-text-primary)]" onContextMenu={handleBackgroundContextMenu}>
      {/* Toolbar / Address Bar */}
      <div className="h-12 shrink-0 flex items-center gap-2 px-4 border-b border-[var(--os-border)]">
        <div className="flex gap-1">
          <button 
            onClick={handleUp} 
            disabled={!currentFolder.parentId}
            className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30 transition-colors"
          >
            <ArrowUp size={16} />
          </button>
        </div>
        
        {/* Breadcrumb */}
        <div className="flex-1 flex items-center gap-1 px-3 py-1.5 bg-[var(--os-bg-secondary)] rounded border border-[var(--os-border)] text-sm overflow-hidden">
           <Home size={14} className="text-[var(--os-text-secondary)] shrink-0" />
           {path.map((node, i) => (
             <div key={node.id} className="flex items-center min-w-0">
                <ChevronRight size={14} className="text-[var(--os-text-muted)] mx-1 shrink-0" />
                <button 
                  onClick={() => handleNavigate(node.id)}
                  className="hover:bg-white/10 px-1 rounded transition-colors truncate max-w-[150px]"
                >
                  {getDisplayName(node, t)}
                </button>
             </div>
           ))}
        </div>

        {/* View Switcher */}
        <div className="flex bg-[var(--os-bg-secondary)] rounded border border-[var(--os-border)] p-0.5">
            <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white/10 text-[var(--os-accent)]' : 'text-[var(--os-text-secondary)] hover:text-[var(--os-text-primary)]'}`}
                title="Grid View"
            >
                <LayoutGrid size={16} />
            </button>
            <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white/10 text-[var(--os-accent)]' : 'text-[var(--os-text-secondary)] hover:text-[var(--os-text-primary)]'}`}
                title="List View"
            >
                <ListIcon size={16} />
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 shrink-0 border-r border-[var(--os-border)] flex flex-col p-2 gap-1 bg-[var(--os-bg-secondary)]/30">
           <SidebarItem icon={HardDrive} label={t('explorer.root')} active={currentPathId === 'root'} onClick={() => handleNavigate('root')} />
           <div className="h-px bg-[var(--os-border)] my-1" />
           <SidebarItem icon={Folder} label={t('explorer.desktop')} active={currentPathId === 'desktop'} onClick={() => handleNavigate('desktop')} />
           <SidebarItem icon={FileText} label={t('explorer.documents')} active={currentPathId === 'documents'} onClick={() => handleNavigate('documents')} />
           <SidebarItem icon={ImageIcon} label={t('explorer.pictures')} active={currentPathId === 'pictures'} onClick={() => handleNavigate('pictures')} />
           <SidebarItem icon={Download} label={t('explorer.downloads')} active={currentPathId === 'downloads'} onClick={() => handleNavigate('downloads')} />
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          {children.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-[var(--os-text-muted)]">
                <Folder size={48} strokeWidth={1} className="mb-2 opacity-20" />
                <span className="text-sm">{t('explorer.empty')}</span>
             </div>
          ) : (
            viewMode === 'grid' ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
                {children.map(child => (
                    <FileItem 
                    key={child.id} 
                    node={child} 
                    onDoubleClick={() => handleDoubleClick(child.id)} 
                    onContextMenu={(e) => handleItemContextMenu(e, child.id)}
                    t={t}
                    />
                ))}
                </div>
            ) : (
                <div className="flex flex-col">
                    {/* List Header */}
                    <div className="flex items-center px-4 py-2 text-xs text-[var(--os-text-muted)] border-b border-[var(--os-border)] select-none sticky top-0 bg-[var(--os-bg-base)] z-10">
                        <div className="w-8 shrink-0"></div>
                        <div className="flex-1 min-w-[200px]">{t('common.name')}</div>
                        <div className="w-32 hidden sm:block">{t('common.type')}</div>
                    </div>
                    {/* List Items */}
                    {children.map(child => (
                        <FileListItem 
                            key={child.id} 
                            node={child} 
                            onDoubleClick={() => handleDoubleClick(child.id)} 
                            onContextMenu={(e) => handleItemContextMenu(e, child.id)}
                            t={t}
                        />
                    ))}
                </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

function SidebarItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors w-full text-left ${active ? 'bg-[var(--os-accent)]/10 text-[var(--os-accent)]' : 'hover:bg-white/5 text-[var(--os-text-secondary)] hover:text-[var(--os-text-primary)]'}`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  )
}

function FileItem({ node, onDoubleClick, onContextMenu, t }: { node: FileNode, onDoubleClick: () => void, onContextMenu: (e: React.MouseEvent) => void, t: (key: string) => string }) {
   // Determine Icon Properties
   const manifest = node.appId ? APPS_REGISTRY[node.appId] : undefined
   let Icon = FileText
   let backgroundColor = '#3b82f6' // Default blue

   if (manifest) {
       Icon = manifest.icon
       backgroundColor = manifest.theme?.backgroundColor || '#3b82f6'
   } else if (node.type === 'folder') {
       Icon = Folder
       backgroundColor = '#facc15' // yellow-400
   } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(node.name)) {
       Icon = ImageIcon
       backgroundColor = '#a855f7' // purple-500
   } else if (/\.(txt|md|json)$/i.test(node.name)) {
       Icon = StickyNote
       backgroundColor = '#eab308' // yellow-500
   } else {
       // Default file
       backgroundColor = '#94a3b8' // slate-400
   }

   const displayName = getDisplayName(node, t)

   return (
     <button 
       onDoubleClick={onDoubleClick}
       onContextMenu={onContextMenu}
       className="group flex flex-col items-center gap-2 p-2 rounded hover:bg-white/5 focus:bg-white/10 outline-none transition-colors text-center cursor-default"
     >
       <AppIcon 
          manifest={manifest}
          icon={Icon}
          size={48}
          backgroundColor={backgroundColor}
          className="drop-shadow-sm group-hover:scale-105 transition-transform"
       />
       <span className="text-xs truncate w-full px-1 select-none">{displayName}</span>
     </button>
   )
}

function FileListItem({ node, onDoubleClick, onContextMenu, t }: { node: FileNode, onDoubleClick: () => void, onContextMenu: (e: React.MouseEvent) => void, t: (key: string) => string }) {
    // Determine Icon Properties
    const manifest = node.appId ? APPS_REGISTRY[node.appId] : undefined
    let Icon = FileText
    let color = 'text-blue-400'
 
    if (manifest) {
        Icon = manifest.icon
        // Use manifest color if available, or default
    } else if (node.type === 'folder') {
        Icon = Folder
        color = 'text-yellow-400'
    } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(node.name)) {
        Icon = ImageIcon
        color = 'text-purple-400'
    } else if (/\.(txt|md|json)$/i.test(node.name)) {
        Icon = StickyNote
        color = 'text-yellow-500'
    } else {
        color = 'text-slate-400'
    }
 
    const displayName = getDisplayName(node, t)
 
    return (
      <div 
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        className="flex items-center px-4 py-2 hover:bg-white/5 cursor-default group border-b border-[var(--os-border)]/50 last:border-0"
      >
        <div className="w-8 shrink-0 flex justify-center">
            {manifest ? (
                 <AppIcon manifest={manifest} size={20} className="drop-shadow-sm" />
            ) : (
                <Icon size={20} className={color} />
            )}
        </div>
        <div className="flex-1 min-w-[200px] text-sm truncate select-none">{displayName}</div>
        <div className="w-32 hidden sm:block text-xs text-[var(--os-text-muted)] select-none capitalize">{node.type}</div>
      </div>
    )
 }
