import { useState, useEffect } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { APPS_REGISTRY } from '@/os/registry/config'
import { Eye } from 'lucide-react'
import PreviewContainer from './preview/PreviewContainer'

// New Components
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import FileList from './components/FileList'
import StatusBar from './components/StatusBar'

interface FileExplorerProps {
  initialPath?: string
}

export default function FileExplorer({ initialPath = 'root' }: FileExplorerProps) {
  // State
  const [currentPathId, setCurrentPathId] = useState(initialPath)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Stores
  const { 
    files, getChildren, getPath, isLoading, loadFolderContent,
    setClipboard, pasteItems, deleteItem 
  } = useFileSystemStore()
  const launchApp = useWindowStore(state => state.launchApp)
  const focusWindow = useWindowStore(state => state.focusWindow)
  const { showMenu } = useContextMenuStore()
  const { t } = useLanguage()

  // Effects
  useEffect(() => {
    if (initialPath) setCurrentPathId(initialPath)
  }, [initialPath])

  useEffect(() => {
    loadFolderContent(currentPathId)
  }, [currentPathId, loadFolderContent])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if input is active
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault()
            if (selectedIds.length > 0) {
              setClipboard(selectedIds, 'copy')
            }
            break
          case 'x':
            e.preventDefault()
            if (selectedIds.length > 0) {
              setClipboard(selectedIds, 'cut')
            }
            break
          case 'v':
            e.preventDefault()
            await pasteItems(currentPathId)
            loadFolderContent(currentPathId)
            break
        }
      } else {
        switch (e.key) {
          case 'Delete':
            if (selectedIds.length > 0) {
              // TODO: Add confirmation dialog?
              if (confirm(t('explorer.delete_confirm') || 'Are you sure you want to delete these items?')) {
                for (const id of selectedIds) {
                  await deleteItem(id)
                }
                setSelectedIds([])
                loadFolderContent(currentPathId)
              }
            }
            break
          case 'Backspace':
            handleUp()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds, currentPathId, setClipboard, pasteItems, deleteItem, loadFolderContent, t])

  // Handlers
  const handleNavigate = async (id: string) => {
    if (files[id]?.type === 'folder') {
      const targetPath = useFileSystemStore.getState().resolvePath(id)
      const needsPermission = await fs.verifyPermission(targetPath)
      
      if (!needsPermission) {
        const granted = await fs.requestPermission(targetPath)
        if (!granted) {
          alert(t('explorer.permission_denied') || 'Permission denied')
          return
        }
      }
      
      setCurrentPathId(id)
      setSelectedIds([]) // Clear selection on navigate
    }
  }

  const handleUp = () => {
    const current = files[currentPathId] || files['root']
    if (current.parentId) {
      handleNavigate(current.parentId)
    }
  }

  const handleRefresh = () => {
    loadFolderContent(currentPathId)
  }

  const handleDoubleClick = (id: string) => {
    const item = files[id]
    if (!item) return

    if (item.appId) {
      const isWindowOpen = useWindowStore.getState().windows[item.appId]?.isOpen
      if (isWindowOpen) {
        focusWindow(item.appId)
        return
      }
      const app = APPS_REGISTRY[item.appId]
      if (app) {
        launchApp(app.id, t(`app.${app.id}`), <app.component />, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
      }
      return
    }

    if (item.type === 'folder') {
      handleNavigate(item.id)
      return
    }

    if (item.type === 'file') {
      launchApp(
        'preview-' + item.id,
        item.name,
        <PreviewContainer fileId={item.id} />,
        Eye,
        { size: { width: 800, height: 600 } }
      )
      return
    }
  }

  const handleSelect = (id: string, multi: boolean) => {
    if (!id) {
      setSelectedIds([])
      return
    }
    if (multi) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    } else {
      setSelectedIds([id])
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
    // Select the item if not already selected
    if (!selectedIds.includes(id)) {
      setSelectedIds([id])
    }
    showMenu(e.clientX, e.clientY, 'desktop-item', { id })
  }

  // Derived State
  const children = getChildren(currentPathId)
  const path = getPath(currentPathId)
  const currentFolder = files[currentPathId] || files['root']

  return (
    <div 
      className="h-full flex flex-col bg-[#191919] text-white pt-10" // pt-10 for window controls
      onContextMenu={handleBackgroundContextMenu}
    >
      {/* Top Toolbar */}
      <Toolbar 
        currentPath={path}
        onNavigate={handleNavigate}
        onUp={handleUp}
        onRefresh={handleRefresh}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        canGoUp={!!currentFolder.parentId}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          currentPathId={currentPathId}
          onNavigate={handleNavigate}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {isLoading ? (
             <div className="h-full flex flex-col items-center justify-center text-white/30">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50 mb-4" />
               <span className="text-sm">Loading...</span>
             </div>
          ) : (
            <FileList 
              items={children}
              viewMode={viewMode}
              onNavigate={handleNavigate}
              onDoubleClick={handleDoubleClick}
              onContextMenu={handleItemContextMenu}
              selectedIds={selectedIds}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar 
        totalItems={children.length}
        selectedItems={children.filter(c => selectedIds.includes(c.id))}
      />
    </div>
  )
}
