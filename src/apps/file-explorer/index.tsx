import { useState, useEffect } from 'react'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { Folder, FileText, ChevronRight, ArrowUp, Home, HardDrive, Image as ImageIcon, Download, StickyNote } from 'lucide-react'
import { APPS_REGISTRY } from '@/os/registry/config'
import Notepad from '@/apps/notepad'
import ImageViewer from '@/apps/file-explorer/components/ImageViewer'
import { AppIcon } from '@/os/ui/AppIcon'

interface FileExplorerProps {
    initialPath?: string
}

export default function FileExplorer({ initialPath = 'root' }: FileExplorerProps) {
  const [currentPathId, setCurrentPathId] = useState(initialPath)
  const { files, getChildren, getPath } = useFileSystemStore()
  const { launchApp, focusWindow, windows } = useWindowStore()
  
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
              app.title,
              <app.component />,
              app.icon,
              app.defaultWindowOptions
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

  return (
    <div className="h-full flex flex-col bg-[var(--os-bg-base)] text-[var(--os-text-primary)]">
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
                  {node.name}
                </button>
             </div>
           ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 shrink-0 border-r border-[var(--os-border)] flex flex-col p-2 gap-1 bg-[var(--os-bg-secondary)]/30">
           <SidebarItem icon={HardDrive} label="Root" active={currentPathId === 'root'} onClick={() => handleNavigate('root')} />
           <div className="h-px bg-[var(--os-border)] my-1" />
           <SidebarItem icon={Folder} label="Desktop" active={currentPathId === 'desktop'} onClick={() => handleNavigate('desktop')} />
           <SidebarItem icon={FileText} label="Documents" active={currentPathId === 'documents'} onClick={() => handleNavigate('documents')} />
           <SidebarItem icon={ImageIcon} label="Pictures" active={currentPathId === 'pictures'} onClick={() => handleNavigate('pictures')} />
           <SidebarItem icon={Download} label="Downloads" active={currentPathId === 'downloads'} onClick={() => handleNavigate('downloads')} />
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          {children.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-[var(--os-text-muted)]">
                <Folder size={48} strokeWidth={1} className="mb-2 opacity-20" />
                <span className="text-sm">This folder is empty</span>
             </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
              {children.map(child => (
                <FileItem 
                  key={child.id} 
                  node={child} 
                  onDoubleClick={() => handleDoubleClick(child.id)} 
                />
              ))}
            </div>
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

function FileItem({ node, onDoubleClick }: { node: FileNode, onDoubleClick: () => void }) {
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

   return (
     <button 
       onDoubleClick={onDoubleClick}
       className="group flex flex-col items-center gap-2 p-2 rounded hover:bg-white/5 focus:bg-white/10 outline-none transition-colors text-center cursor-default"
     >
       <AppIcon 
          manifest={manifest}
          icon={Icon}
          size={48}
          backgroundColor={backgroundColor}
          className="drop-shadow-sm group-hover:scale-105 transition-transform"
       />
       <span className="text-xs truncate w-full px-1 select-none">{node.name}</span>
     </button>
   )
}
