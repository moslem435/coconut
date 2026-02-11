import { useState, useEffect, useMemo, useCallback } from 'react'
import { useFileSelection } from '@/os/hooks/useFileSelection'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { useUIStore } from '@/os/kernel/useUIStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import { StickyNote, Eye, Upload, FolderPlus } from 'lucide-react'
import PreviewContainer from './preview/PreviewContainer'
import Notepad from '@/apps/notepad'
import Fuse from 'fuse.js'

// Components
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import FileList from './components/FileList'
import StatusBar from './components/StatusBar'
import FileUploadZone from './components/FileUploadZone'
import BatchProgressDialog, { BatchOperation } from './components/BatchProgressDialog'

interface FileExplorerProps {
  initialPath?: string
}

export type SortField = 'name' | 'date' | 'type' | 'size'
export type SortOrder = 'asc' | 'desc'

export default function FileExplorer({ initialPath = 'root' }: FileExplorerProps) {
  // State
  const [currentPathId, setCurrentPathId] = useState(initialPath)
  const [history, setHistory] = useState<string[]>([initialPath])
  const [historyIndex, setHistoryIndex] = useState(0)
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortConfig, setSortConfig] = useState<{ field: SortField, order: SortOrder }>({ field: 'name', order: 'asc' })
  const [searchQuery, setSearchQuery] = useState('')
  const [batchProgress, setBatchProgress] = useState<{
    isOpen: boolean
    title: string
    operations: BatchOperation[]
    cancelRequested: boolean
  }>({
    isOpen: false,
    title: '',
    operations: [],
    cancelRequested: false
  })
  
  // Stores
  const { 
    files, getChildren, getPath, isLoading, loadFolderContent,
    setClipboard, pasteItems, deleteItem, createItem, moveItem
  } = useFileSystemStore()
  const { setRenamingId } = useUIStore()
  const launchApp = useWindowStore(state => state.launchApp)
  const focusWindow = useWindowStore(state => state.focusWindow)
  const { showMenu } = useContextMenuStore()
  const { t } = useLanguage()

  // Effects
  useEffect(() => {
    if (initialPath) {
      setCurrentPathId(initialPath)
      setHistory([initialPath])
      setHistoryIndex(0)
    }
  }, [initialPath])

  useEffect(() => {
    loadFolderContent(currentPathId)
  }, [currentPathId, loadFolderContent])

  // Search with Fuse.js
  const children = getChildren(currentPathId)
  
  // Sorting Logic
  const sortedChildren = useMemo(() => {
    const items = [...children]
    return items.sort((a, b) => {
      let comparison = 0
      switch (sortConfig.field) {
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
           const sizeA = a.size ?? (a.content?.length || 0)
           const sizeB = b.size ?? (b.content?.length || 0)
           comparison = sizeA - sizeB
           break
      }
      return sortConfig.order === 'asc' ? comparison : -comparison
    })
  }, [children, sortConfig])

  const filteredChildren = useMemo(() => {
    if (!searchQuery.trim()) return sortedChildren

    const fuse = new Fuse(sortedChildren, {
      keys: ['name'],
      threshold: 0.3,
      includeScore: true
    })

    return fuse.search(searchQuery).map(result => result.item)
  }, [sortedChildren, searchQuery])

  // Selection Hook
  const { selectedIds, setSelectedIds, handleSelect, clearSelection } = useFileSelection(filteredChildren)

  // Keyboard Shortcuts (Extended)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if input is active
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault()
            setSelectedIds(filteredChildren.map(c => c.id))
            break
          case 'd':
            e.preventDefault()
            clearSelection()
            break
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
          case 'n':
            e.preventDefault()
            handleCreateFolder()
            break
        }
      } else {
        switch (e.key) {
          case 'F2':
            e.preventDefault()
            if (selectedIds.length === 1) {
              setRenamingId(selectedIds[0])
            }
            break
          case 'Delete':
            if (selectedIds.length > 0) {
              handleBatchDelete()
            }
            break
          case 'Backspace':
            handleUp() // Or handleBack? Windows Explorer does Up on Backspace usually, or Back. Let's stick to Up for now or switch to Back.
            // Modern browsers use Alt+Left for Back. Backspace is often mapped to Back in old managers, but Up in some.
            // Let's keep Up for Backspace as it was.
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds, currentPathId, children, setClipboard, pasteItems, loadFolderContent, t])

  // Navigation Handlers
  const handleNavigate = async (id: string) => {
    if (files[id]?.type === 'folder') {
      const targetPath = useFileSystemStore.getState().resolvePath(id)
      const needsPermission = await fs.verifyPermission(targetPath)
      
      if (!needsPermission) {
        const granted = await fs.requestPermission(targetPath)
        if (!granted) {
          useDialogStore.getState().openAlert(
            t('explorer.permission_denied') || 'Permission denied',
            'error'
          )
          return
        }
      }
      
      // Update History
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(id)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
      
      setCurrentPathId(id)
      clearSelection() // Clear selection on navigate
    }
  }

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setCurrentPathId(history[newIndex])
      clearSelection()
    }
  }

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setCurrentPathId(history[newIndex])
      clearSelection()
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

  const handleSortChange = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }))
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
      const isText = /\.(txt|md|json|js|jsx|ts|tsx|css|html|log|xml|ini|conf|gitignore|env)$/i.test(item.name)
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg|ico|bmp)$/i.test(item.name)

      if (isText && !isImage) {
         launchApp(
          'notepad-' + item.id,
          item.name,
          <Notepad fileId={item.id} />,
          StickyNote,
          { size: { width: 600, height: 450 } }
        )
      } else {
        launchApp(
          'preview-' + item.id,
          item.name,
          <PreviewContainer fileId={item.id} />,
          Eye,
          { size: { width: 800, height: 600 } }
        )
      }
      return
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

  // Batch Delete with Progress
  const handleBatchDelete = async () => {
    const confirmed = await useDialogStore.getState().openConfirm(
      t('explorer.delete_confirm') || `Delete ${selectedIds.length} item(s)?`
    )
    
    if (!confirmed) return

    const operations: BatchOperation[] = selectedIds.map(id => ({
      id,
      name: files[id]?.name || 'Unknown',
      status: 'pending' as const
    }))

    setBatchProgress({
      isOpen: true,
      title: 'Deleting Files',
      operations,
      cancelRequested: false
    })

    for (let i = 0; i < operations.length; i++) {
      if (batchProgress.cancelRequested) break

      setBatchProgress(prev => ({
        ...prev,
        operations: prev.operations.map((op, idx) =>
          idx === i ? { ...op, status: 'processing' } : op
        )
      }))

      try {
        await deleteItem(operations[i].id)
        setBatchProgress(prev => ({
          ...prev,
          operations: prev.operations.map((op, idx) =>
            idx === i ? { ...op, status: 'success' } : op
          )
        }))
      } catch (error) {
        setBatchProgress(prev => ({
          ...prev,
          operations: prev.operations.map((op, idx) =>
            idx === i ? { ...op, status: 'error', error: String(error) } : op
          )
        }))
      }
    }

    setSelectedIds([])
    loadFolderContent(currentPathId)
  }

  // Create Folder
  const handleCreateFolder = async () => {
    const name = await useDialogStore.getState().openPrompt(
      'New Folder',
      'Enter folder name:'
    )
    if (name) {
      await createItem(currentPathId, name, 'folder')
      loadFolderContent(currentPathId)
    }
  }

  // File Upload Handler
  const handleUploadComplete = () => {
    loadFolderContent(currentPathId)
  }

  // Manual Upload Handler
  const handleManualUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files) return

      const operations: BatchOperation[] = Array.from(files).map(file => ({
        id: file.name,
        name: file.name,
        status: 'pending' as const
      }))

      setBatchProgress({
        isOpen: true,
        title: 'Uploading Files',
        operations,
        cancelRequested: false
      })

      for (let i = 0; i < files.length; i++) {
        if (batchProgress.cancelRequested) break

        setBatchProgress(prev => ({
          ...prev,
          operations: prev.operations.map((op, idx) =>
            idx === i ? { ...op, status: 'processing' } : op
          )
        }))

        try {
          const file = files[i]
          let content = ''
          
          // Check if file is an image
          if (file.type.startsWith('image/')) {
            content = await new Promise((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(file)
            })
          } else {
            content = await file.text()
          }

          await createItem(currentPathId, file.name, 'file', content)
          
          setBatchProgress(prev => ({
            ...prev,
            operations: prev.operations.map((op, idx) =>
              idx === i ? { ...op, status: 'success' } : op
            )
          }))
        } catch (error) {
          setBatchProgress(prev => ({
            ...prev,
            operations: prev.operations.map((op, idx) =>
              idx === i ? { ...op, status: 'error', error: String(error) } : op
            )
          }))
        }
      }

      loadFolderContent(currentPathId)
    }
    input.click()
  }

  // Drag and Drop Handler
  const handleFileDrop = async (draggedIds: string[], targetId: string) => {
    const operations: BatchOperation[] = draggedIds.map(id => ({
      id,
      name: files[id]?.name || 'Unknown',
      status: 'pending' as const
    }))

    setBatchProgress({
      isOpen: true,
      title: 'Moving Files',
      operations,
      cancelRequested: false
    })

    for (let i = 0; i < operations.length; i++) {
      if (batchProgress.cancelRequested) break

      setBatchProgress(prev => ({
        ...prev,
        operations: prev.operations.map((op, idx) =>
          idx === i ? { ...op, status: 'processing' } : op
        )
      }))

      try {
        await moveItem(operations[i].id, targetId)
        setBatchProgress(prev => ({
          ...prev,
          operations: prev.operations.map((op, idx) =>
            idx === i ? { ...op, status: 'success' } : op
          )
        }))
      } catch (error) {
        setBatchProgress(prev => ({
          ...prev,
          operations: prev.operations.map((op, idx) =>
            idx === i ? { ...op, status: 'error', error: String(error) } : op
          )
        }))
      }
    }

    loadFolderContent(currentPathId)
  }

  // Derived State
  const path = getPath(currentPathId)
  const currentFolder = files[currentPathId] || files['root']

  return (
    <div 
      className="h-full flex flex-col bg-[#191919] text-white pt-10 relative"
      onContextMenu={handleBackgroundContextMenu}
    >
      {/* Top Toolbar */}
      <Toolbar 
        currentPath={path}
        onNavigate={handleNavigate}
        onUp={handleUp}
        onBack={handleBack}
        onForward={handleForward}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < history.length - 1}
        onRefresh={handleRefresh}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
        canGoUp={!!currentFolder.parentId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewFolder={handleCreateFolder}
        onUpload={handleManualUpload}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar 
          currentPathId={currentPathId}
          onNavigate={handleNavigate}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
          {/* File Upload Drop Zone */}
          <FileUploadZone
            targetFolderId={currentPathId}
            onUploadComplete={handleUploadComplete}
          />

          {isLoading ? (
             <div className="h-full flex flex-col items-center justify-center text-white/30">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50 mb-4" />
               <span className="text-sm">Loading...</span>
             </div>
          ) : (
            <FileList 
              items={filteredChildren}
              viewMode={viewMode}
              sortConfig={sortConfig}
              onSortChange={handleSortChange}
              onNavigate={handleNavigate}
              onDoubleClick={handleDoubleClick}
              onContextMenu={handleItemContextMenu}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onDrop={handleFileDrop}
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar 
        totalItems={children.length}
        selectedItems={children.filter(c => selectedIds.includes(c.id))}
      />

      {/* Batch Progress Dialog */}
      <BatchProgressDialog
        isOpen={batchProgress.isOpen}
        title={batchProgress.title}
        operations={batchProgress.operations}
        onCancel={() => setBatchProgress(prev => ({ ...prev, cancelRequested: true }))}
        onClose={() => setBatchProgress({ isOpen: false, title: '', operations: [], cancelRequested: false })}
      />
    </div>
  )
}
