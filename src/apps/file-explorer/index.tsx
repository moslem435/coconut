import { useState, useEffect, useMemo, useCallback } from 'react'
import { useFileSelection } from '@/os/hooks/useFileSelection'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { useUIStore } from '@/os/kernel/useUIStore'
import { APPS_REGISTRY } from '@/os/registry/config'
import { StickyNote, Eye } from 'lucide-react'
import Fuse from 'fuse.js'

// Hooks
import { useFileOperations } from './hooks/useFileOperations'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useFileNavigation } from './hooks/useFileNavigation'
import { useBatchOperation } from './hooks/useBatchOperation'

// Components
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import FileList from './components/FileList'
import StatusBar from './components/StatusBar'
import FileUploadZone from './components/FileUploadZone'
import BatchProgressDialog from './components/BatchProgressDialog'

interface FileExplorerProps {
  initialPath?: string
}

export type SortField = 'name' | 'date' | 'type' | 'size'
export type SortOrder = 'asc' | 'desc'

export default function FileExplorer({ initialPath = 'root' }: FileExplorerProps) {
  // State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortConfig, setSortConfig] = useState<{ field: SortField, order: SortOrder }>({ field: 'name', order: 'asc' })
  const [searchQuery, setSearchQuery] = useState('')

  // Stores
  const {
    files, getChildren, getPath, isLoading, loadFolderContent,
    createItem
  } = useFileSystemStore()
  const { setRenamingId } = useUIStore()
  const launchApp = useWindowStore(state => state.launchApp)
  const focusWindow = useWindowStore(state => state.focusWindow)
  const { showMenu } = useContextMenuStore()
  const { t } = useLanguage()

  // Custom Hooks
  const {
    currentPathId,
    canGoBack,
    canGoForward,
    canGoUp,
    navigate: handleNavigate,
    goBack: handleBack,
    goForward: handleForward,
    goUp: handleUp
  } = useFileNavigation(initialPath)

  const {
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    handleMove
  } = useFileOperations()

  const {
    batchProgress,
    executeBatch,
    cancelBatch,
    closeBatch
  } = useBatchOperation()

  // Effects
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
          const sizeA = a.size || 0
          const sizeB = b.size || 0
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

  // Handlers
  const handleRefresh = useCallback(() => {
    loadFolderContent(currentPathId)
  }, [currentPathId, loadFolderContent])

  const handleSortChange = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  const handleCreateFolder = useCallback(async () => {
    const name = await useDialogStore.getState().openPrompt(
      'New Folder',
      'Enter folder name:'
    )
    if (name) {
      await createItem(currentPathId, name, 'folder')
      loadFolderContent(currentPathId)
    }
  }, [currentPathId, createItem, loadFolderContent])

  // Batch Delete with Progress
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return

    const items = selectedIds.map(id => ({
      id,
      name: files[id]?.name || 'Unknown'
    }))

    await executeBatch('Deleting Files', items, async (item) => {
      await handleDelete([item.id])
    })

    setSelectedIds([])
    loadFolderContent(currentPathId)
  }, [selectedIds, files, executeBatch, handleDelete, setSelectedIds, currentPathId, loadFolderContent])

  // Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    onSelectAll: () => setSelectedIds(filteredChildren.map(c => c.id)),
    onDeselectAll: clearSelection,
    onCopy: () => handleCopy(selectedIds),
    onCut: () => handleCut(selectedIds),
    onPaste: async () => {
      await handlePaste(currentPathId)
      loadFolderContent(currentPathId)
    },
    onDelete: () => handleBatchDelete(),
    onRename: () => {
      if (selectedIds.length === 1) {
        const id = selectedIds[0]
        if (id) {
          setRenamingId(id)
        }
      }
    },
    onRefresh: handleRefresh,
    onNewFolder: handleCreateFolder,
    onNavigateUp: handleUp,
    onNavigateBack: handleBack,
    onNavigateForward: handleForward
  })

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
        const appTitle = t(`app.${app.id}`)
        launchApp(app.id, appTitle || app.title, app.id, app.icon, { ...app.defaultWindowOptions, isDefaultTitle: true })
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
          'notepad',
          StickyNote,
          { size: { width: 600, height: 450 }, fileId: item.id }
        )
      } else {
        launchApp(
          'preview-' + item.id,
          item.name,
          'preview-container',
          Eye,
          { size: { width: 800, height: 600 }, fileId: item.id }
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

  // File Upload Handler
  const handleUploadComplete = useCallback(() => {
    loadFolderContent(currentPathId)
  }, [currentPathId, loadFolderContent])

  // Manual Upload Handler
  const handleManualUpload = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = async (e) => {
      const fileList = (e.target as HTMLInputElement).files
      if (!fileList) return

      const filesArray = Array.from(fileList)
      const items = filesArray.map(file => ({
        id: file.name,
        name: file.name
      }))

      await executeBatch('Uploading Files', items, async (item) => {
        const file = filesArray.find(f => f.name === item.name)
        if (!file) return

        let content = ''
        if (file.type.startsWith('image/')) {
          content = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
        } else {
          content = await file.text()
        }

        await createItem(currentPathId, file.name, 'file', content)
      })

      loadFolderContent(currentPathId)
    }
    input.click()
  }, [currentPathId, createItem, executeBatch, loadFolderContent])

  // Drag and Drop Handler
  const handleFileDrop = useCallback(async (draggedIds: string[], targetId: string) => {
    const items = draggedIds.map(id => ({
      id,
      name: files[id]?.name || 'Unknown'
    }))

    await executeBatch('Moving Files', items, async (item) => {
      await handleMove([item.id], targetId)
    })

    loadFolderContent(currentPathId)
  }, [files, executeBatch, handleMove, currentPathId, loadFolderContent])

  // Derived State
  const path = getPath(currentPathId)

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
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onRefresh={handleRefresh}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
        canGoUp={canGoUp}
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
        onCancel={cancelBatch}
        onClose={closeBatch}
      />
    </div>
  )
}
