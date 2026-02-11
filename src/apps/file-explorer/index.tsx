import { useState, useEffect, useMemo, useCallback } from 'react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { fs } from '@/os/kernel/filesystem/FileSystemClient'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { useUIStore } from '@/os/kernel/useUIStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import { Eye, Upload, FolderPlus } from 'lucide-react'
import PreviewContainer from './preview/PreviewContainer'
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

export default function FileExplorer({ initialPath = 'root' }: FileExplorerProps) {
  // State
  const [currentPathId, setCurrentPathId] = useState(initialPath)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
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
    if (initialPath) setCurrentPathId(initialPath)
  }, [initialPath])

  useEffect(() => {
    loadFolderContent(currentPathId)
  }, [currentPathId, loadFolderContent])

  // Search with Fuse.js
  const children = getChildren(currentPathId)
  const filteredChildren = useMemo(() => {
    if (!searchQuery.trim()) return children

    const fuse = new Fuse(children, {
      keys: ['name'],
      threshold: 0.3,
      includeScore: true
    })

    return fuse.search(searchQuery).map(result => result.item)
  }, [children, searchQuery])

  // Keyboard Shortcuts (Extended)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if input is active
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault()
            setSelectedIds(children.map(c => c.id))
            break
          case 'd':
            e.preventDefault()
            setSelectedIds([])
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
            handleUp()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds, currentPathId, children, setClipboard, pasteItems, loadFolderContent, t])

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
          const content = await file.arrayBuffer()
          const textContent = new TextDecoder().decode(content)
          await createItem(currentPathId, file.name, 'file', textContent)
          
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
        onRefresh={handleRefresh}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
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
