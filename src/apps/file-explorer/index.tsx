/**
 * 文件资源管理器应用
 * 
 * 功能：
 * - 文件和文件夹浏览（网格/列表视图）
 * - 文件操作（复制、剪切、粘贴、删除、重命名）
 * - 文件搜索（Fuse.js 模糊搜索）
 * - 文件排序（按名称、日期、类型、大小）
 * - 文件上传（拖拽上传、手动选择）
 * - 批量操作进度显示
 * - 导航历史（前进、后退、向上）
 * - 键盘快捷键支持
 * 
 * 架构：
 * - Toolbar：工具栏（导航、视图切换、排序、搜索）
 * - Sidebar：侧边栏（快速访问、收藏夹）
 * - FileList：文件列表（网格/列表视图）
 * - StatusBar：状态栏（文件数量、选中项信息）
 * - FileUploadZone：文件上传区域
 * - BatchProgressDialog：批量操作进度对话框
 * 
 * 性能优化：
 * - 使用 useMemo 缓存排序和搜索结果
 * - 使用 useCallback 优化事件处理函数
 * - 文件夹内容按需加载
 * - 批量操作使用进度条反馈
 * 
 * @author System
 * @created 2024
 */

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

// 自定义 Hooks
import { useFileOperations } from './hooks/useFileOperations'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useFileNavigation } from './hooks/useFileNavigation'
import { useBatchOperation } from './hooks/useBatchOperation'

// 组件
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import FileList from './components/FileList'
import StatusBar from './components/StatusBar'
import FileUploadZone from './components/FileUploadZone'
import BatchProgressDialog from './components/BatchProgressDialog'

/**
 * 文件资源管理器组件属性
 */
interface FileExplorerProps {
  /** 初始路径 ID */
  initialPath?: string
}

/** 排序字段类型 */
export type SortField = 'name' | 'date' | 'type' | 'size'
/** 排序顺序类型 */
export type SortOrder = 'asc' | 'desc'

/**
 * 文件资源管理器主组件
 */
export default function FileExplorer({ initialPath = 'root' }: FileExplorerProps) {
  // 视图状态
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortConfig, setSortConfig] = useState<{ field: SortField, order: SortOrder }>({ field: 'name', order: 'asc' })
  const [searchQuery, setSearchQuery] = useState('')
  const [isFolderLoading, setIsFolderLoading] = useState(false)

  // Store 访问
  const {
    files,                  // 文件系统映射表
    getChildren,            // 获取子项
    getPath,                // 获取路径
    isLoading: isSystemLoading,  // 系统加载状态
    loadFolderContent,      // 加载文件夹内容
    createItem              // 创建文件/文件夹
  } = useFileSystemStore()
  const { setRenamingId } = useUIStore()
  const launchApp = useWindowStore(state => state.launchApp)
  const focusWindow = useWindowStore(state => state.focusWindow)
  const { showMenu } = useContextMenuStore()
  const { t } = useLanguage()

  // 自定义 Hooks
  const {
    currentPathId,    // 当前路径 ID
    canGoBack,        // 是否可以后退
    canGoForward,     // 是否可以前进
    canGoUp,          // 是否可以向上
    navigate: handleNavigate,  // 导航到指定路径
    goBack: handleBack,        // 后退
    goForward: handleForward,  // 前进
    goUp: handleUp             // 向上一级
  } = useFileNavigation(initialPath)

  const {
    handleCopy,    // 复制文件
    handleCut,     // 剪切文件
    handlePaste,   // 粘贴文件
    handleDelete,  // 删除文件
    handleMove     // 移动文件
  } = useFileOperations()

  const {
    batchProgress,   // 批量操作进度
    executeBatch,    // 执行批量操作
    cancelBatch,     // 取消批量操作
    closeBatch       // 关闭进度对话框
  } = useBatchOperation()

  /**
   * 加载文件夹内容
   * 当前路径变化时触发
   */
  useEffect(() => {
    const load = async () => {
      setIsFolderLoading(true)
      try {
        await loadFolderContent(currentPathId)
      } finally {
        setIsFolderLoading(false)
      }
    }
    load()
  }, [currentPathId, loadFolderContent])

  // 获取当前文件夹的子项
  const children = getChildren(currentPathId)

  /**
   * 排序逻辑
   * 
   * 支持按名称、日期、类型、大小排序，升序/降序
   */
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

  /**
   * 搜索过滤
   * 
   * 使用 Fuse.js 进行模糊搜索，支持拼音、首字母等
   */
  const filteredChildren = useMemo(() => {
    if (!searchQuery.trim()) return sortedChildren

    const fuse = new Fuse(sortedChildren, {
      keys: ['name'],
      threshold: 0.3,
      includeScore: true
    })

    return fuse.search(searchQuery).map(result => result.item)
  }, [sortedChildren, searchQuery])

  // 文件选择状态
  const { selectedIds, setSelectedIds, handleSelect, clearSelection } = useFileSelection(filteredChildren)

  /**
   * 刷新当前文件夹
   */
  const handleRefresh = useCallback(() => {
    loadFolderContent(currentPathId)
  }, [currentPathId, loadFolderContent])

  /**
   * 排序字段切换
   * 
   * 点击相同字段时切换升序/降序
   */
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

  /**
   * 批量删除文件
   * 
   * 显示进度对话框，逐个删除选中的文件
   */
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

  /**
   * 键盘快捷键
   * 
   * 支持：
   * - Ctrl+A：全选
   * - Ctrl+C：复制
   * - Ctrl+X：剪切
   * - Ctrl+V：粘贴
   * - Delete：删除
   * - F2：重命名
   * - F5：刷新
   * - Ctrl+Shift+N：新建文件夹
   * - Alt+↑：向上一级
   * - Alt+←：后退
   * - Alt+→：前进
   */
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

  /**
   * 文件/文件夹双击处理
   * 
   * - 文件夹：导航进入
   * - 应用快捷方式：启动应用
   * - 文本文件：使用记事本打开
   * - 图片文件：使用预览器打开
   * 
   * @param id - 文件/文件夹 ID
   */
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

  /**
   * 背景右键菜单
   */
  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    showMenu(e.clientX, e.clientY, 'explorer-background', { pathId: currentPathId })
  }

  /**
   * 文件项右键菜单
   * 
   * 如果右键的项未被选中，则先选中该项
   */
  const handleItemContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    // 如果右键的项未被选中，则先选中
    if (!selectedIds.includes(id)) {
      setSelectedIds([id])
    }
    showMenu(e.clientX, e.clientY, 'desktop-item', { id })
  }

  /**
   * 文件上传完成回调
   */
  const handleUploadComplete = useCallback(() => {
    loadFolderContent(currentPathId)
  }, [currentPathId, loadFolderContent])

  /**
   * 手动上传文件
   * 
   * 弹出文件选择对话框，支持多选，显示上传进度
   */
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

  /**
   * 文件拖拽处理
   * 
   * 支持将文件拖拽到文件夹中移动
   * 
   * @param draggedIds - 被拖拽的文件 ID 列表
   * @param targetId - 目标文件夹 ID
   */
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

  // 当前路径
  const path = getPath(currentPathId)

  return (
    <div
      className="h-full flex flex-col bg-transparent text-[var(--os-text-primary)] pt-10 relative"
      onContextMenu={handleBackgroundContextMenu}
    >
      {/* 顶部工具栏 */}
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
        {/* 侧边栏 */}
        <Sidebar
          currentPathId={currentPathId}
          onNavigate={handleNavigate}
        />

        {/* 主内容区域 */}
        <FileUploadZone
          targetFolderId={currentPathId}
          onUploadComplete={handleUploadComplete}
        >
          {isSystemLoading || isFolderLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--os-text-muted)]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--os-border-active)] mb-4" />
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
        </FileUploadZone>
      </div>

      {/* 状态栏 */}
      <StatusBar
        totalItems={children.length}
        selectedItems={children.filter(c => selectedIds.includes(c.id))}
      />

      {/* 批量操作进度对话框 */}
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
