import React, { useState } from 'react'
import { ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useEditorStateV2 } from '../hooks/useEditorStateV2'
import { useDialog } from '../hooks/useDialog'
import { VSCODE_COLORS } from '../constants'
import { SearchPanel } from './SearchPanel'
import { GitView } from './GitView'
import { ContextMenu } from './ContextMenu'
import { getFileIcon } from '../utils/fileIcons'

interface FileTreeItemProps {
  id: string
  depth?: number
  expandedFolders: Record<string, boolean>
  toggleFolder: (id: string) => void
  activeFileId: string | null
  onFileSelect: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  id,
  depth = 0,
  expandedFolders,
  toggleFolder,
  activeFileId,
  onFileSelect,
  onContextMenu
}) => {
  const { files, getChildren } = useFileSystemStore()
  const item = files[id]

  if (!item) return null

  const isFolder = item.type === 'folder'
  const isExpanded = expandedFolders[id]
  const paddingLeft = `${depth * 12 + 10}px`
  const isActive = activeFileId === id

  if (isFolder) {
    const children = getChildren(id)
    return (
      <div>
        <div
          className="flex items-center gap-1 py-1 hover:bg-[#2a2d2e] cursor-pointer text-gray-300 text-sm select-none"
          style={{ paddingLeft }}
          onClick={(e) => {
            e.stopPropagation()
            toggleFolder(id)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onContextMenu(e, id)
          }}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="font-bold text-xs truncate">{item.name.toUpperCase()}</span>
        </div>
        {isExpanded && children.map(child => (
          <FileTreeItem
            key={child.id}
            id={child.id}
            depth={depth + 1}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            activeFileId={activeFileId}
            onFileSelect={onFileSelect}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    )
  } else {
    return (
      <div
        className={`
          flex items-center gap-2 py-1 cursor-pointer text-sm select-none
          ${isActive ? 'bg-[#37373d] text-white' : 'text-gray-400 hover:bg-[#2a2d2e]'}
        `}
        style={{ paddingLeft }}
        onClick={(e) => {
          e.stopPropagation()
          onFileSelect(id)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onContextMenu(e, id)
        }}
      >
        {getFileIcon(item.name)}
        <span className="truncate">{item.name}</span>
      </div>
    )
  }
}

interface SidebarProps {
  activeView: 'explorer' | 'search' | 'git' | 'debug' | 'extensions'
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView }) => {
  const { rootId, createItem, renameItem, deleteItem, files, readFileContent } = useFileSystemStore()
  const { activeFileId, openFile: openFileInEditor, getFileContent } = useEditorStateV2()

  const onFileSelect = async (id: string) => {
    const cachedContent = getFileContent(id)
    if (cachedContent !== undefined) {
      openFileInEditor(id, cachedContent)
    } else {
      const content = await readFileContent(id)
      openFileInEditor(id, content)
    }
  }
  const { t } = useLanguage()
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ [rootId]: true })

  // Dialog
  const dialog = useDialog()

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, targetId: string } | null>(null)

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: id })
  }

  const handleMenuAction = async (action: string, targetId: string) => {
    // Implement actions
    if (action === 'new_file') {
      const name = await dialog.prompt('Enter file name:', 'Untitled.ts', 'New File')
      if (name) {
        const targetNode = files[targetId]
        const parentId = targetNode ? (targetNode.type === 'folder' ? targetId : targetNode.parentId) || rootId : rootId
        await createItem(parentId as string, name, 'file', '')
        // Auto expand
        if (targetNode?.type === 'folder') {
          setExpandedFolders(prev => ({ ...prev, [targetId]: true }))
        }
      }
    }
    if (action === 'new_folder') {
      const name = await dialog.prompt('Enter folder name:', 'New Folder', 'New Folder')
      if (name) {
        const targetNode = files[targetId]
        const parentId = targetNode ? (targetNode.type === 'folder' ? targetId : targetNode.parentId) || rootId : rootId
        await createItem(parentId as string, name, 'folder')
        if (targetNode?.type === 'folder') {
          setExpandedFolders(prev => ({ ...prev, [targetId]: true }))
        }
      }
    }
    if (action === 'rename') {
      const targetNode = files[targetId]
      if (!targetNode) return
      const newName = await dialog.prompt('Enter new name:', targetNode.name, 'Rename')
      if (newName && newName !== targetNode.name) {
        await renameItem(targetId, newName)
      }
    }
    if (action === 'delete') {
      const targetNode = files[targetId]
      if (!targetNode) return
      const confirmed = await dialog.confirm(`Are you sure you want to delete '${targetNode.name}'?`, 'Delete File')

      if (confirmed) {
        await deleteItem(targetId)
      }
    }
  }

  const getMenuItems = (targetId: string) => {
    // Basic items
    return [
      { label: 'New File', action: () => handleMenuAction('new_file', targetId) },
      { label: 'New Folder', action: () => handleMenuAction('new_folder', targetId) },
      { separator: true, label: '', action: () => { } },
      { label: 'Rename', action: () => handleMenuAction('rename', targetId) },
      { label: 'Delete', action: () => handleMenuAction('delete', targetId), danger: true },
    ]
  }

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (activeView === 'search') {
    return (
      <div
        className="w-full flex flex-col border-r border-[#2b2b2b] select-none h-full"
        style={{ backgroundColor: VSCODE_COLORS.sidebar }}
      >
        <SearchPanel />
      </div>
    )
  }

  if (activeView === 'git') {
    return (
      <div
        className="w-full flex flex-col border-r border-[#2b2b2b] select-none h-full"
        style={{ backgroundColor: VSCODE_COLORS.sidebar }}
      >
        <GitView />
      </div>
    )
  }

  if (activeView !== 'explorer') {
    return (
      <div
        className="w-full flex flex-col border-r border-[#2b2b2b] select-none h-full"
        style={{ backgroundColor: VSCODE_COLORS.sidebar }}
      >
        <div className="h-9 px-4 flex items-center text-xs uppercase tracking-wider text-gray-400 font-medium">
          {activeView}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-4 text-center">
          {activeView === 'debug' && 'Debugging is not configured.'}
          {activeView === 'extensions' && 'No extensions installed.'}
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full flex flex-col border-r border-[#2b2b2b] select-none h-full"
      style={{ backgroundColor: VSCODE_COLORS.sidebar }}
    >
      <div className="h-9 px-4 flex items-center justify-between text-xs uppercase tracking-wider text-gray-400 font-medium group shrink-0">
        <span>{t('vscode.explorer')}</span>
        <div title="More Actions...">
          <MoreHorizontal
            size={14}
            className="opacity-0 group-hover:opacity-100 cursor-pointer hover:text-white transition-opacity"
            onClick={() => console.log('Explorer actions - TODO')}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <FileTreeItem
          id={rootId}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          activeFileId={activeFileId}
          onFileSelect={onFileSelect}
          onContextMenu={handleContextMenu}
        />
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getMenuItems(contextMenu.targetId)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
