import React, { useState, useEffect } from 'react'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import { Trash2, RotateCcw, Ban, FileText, Folder, Image as ImageIcon, StickyNote, RefreshCw } from 'lucide-react'
import { AppIcon } from '@/os/ui/AppIcon'
import { APPS_REGISTRY } from '@/os/registry/config'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { motion, AnimatePresence } from 'framer-motion'
import { soundManager } from '@/lib/sound'

const RecycleBin: React.FC = () => {
  const [deletedFiles, setDeletedFiles] = useState<FileNode[]>([])
  const { files, restoreItems, emptyTrash } = useFileSystemStore()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { t } = useLanguage()

  // Sync deleted files from store
  useEffect(() => {
    const trashItems = Object.values(files).filter(f => f.parentId === 'trash')
    setDeletedFiles(trashItems)
  }, [files])

  const handleSelect = (id: string, multi: boolean) => {
    if (multi) {
      const newSet = new Set(selectedIds)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      setSelectedIds(newSet)
    } else {
      setSelectedIds(new Set([id]))
    }
  }

  const handleRestore = () => {
    if (selectedIds.size === 0) return
    soundManager.playClick()
    restoreItems(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handleEmpty = async () => {
    const confirmed = await useDialogStore.getState().openConfirm(t('recycle.confirm'))
    if (confirmed) {
      soundManager.playClick()
      emptyTrash()
      setSelectedIds(new Set())
    }
  }

  const getDisplayName = (node?: FileNode) => {
      if (!node) return t('recycle.unknown')
      if (node.appId) return t(`app.${node.appId}`)
      if (['root', 'desktop', 'documents', 'pictures', 'downloads'].includes(node.id)) {
          return t(`explorer.${node.id}`)
      }
      return node.name
  }

  return (
    <div className="h-full w-full flex flex-col bg-white pt-10">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-gray-50 shrink-0">
        <button 
          onClick={handleEmpty}
          disabled={deletedFiles.length === 0}
          className="px-3 py-1.5 rounded bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-2 text-sm disabled:opacity-50 transition-colors"
        >
          <Ban size={16} /> {t('recycle.empty')}
        </button>
        <div className="w-px h-6 bg-gray-300 mx-2" />
        <button 
          onClick={handleRestore}
          disabled={selectedIds.size === 0}
          className="px-3 py-1.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-2 text-sm disabled:opacity-50 transition-colors"
        >
          <RotateCcw size={16} /> {t('recycle.restore')}
        </button>
        <div className="flex-1" />
        <span className="text-gray-500 text-sm">{deletedFiles.length} {t('recycle.items')}</span>
      </div>

      {/* Content Area */}
      <div 
        className="flex-1 p-4 overflow-auto bg-white"
        onClick={() => setSelectedIds(new Set())}
      >
        <AnimatePresence mode="popLayout">
            {deletedFiles.length === 0 ? (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="h-full flex flex-col items-center justify-center text-gray-400 select-none"
            >
                <div className="relative mb-4">
                    <Trash2 size={64} className="opacity-20 text-green-500" />
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="absolute -right-2 -bottom-2 bg-green-100 text-green-600 rounded-full p-1"
                    >
                        <RefreshCw size={16} />
                    </motion.div>
                </div>
                <p>{t('recycle.empty.msg')}</p>
            </motion.div>
            ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
                {deletedFiles.map(file => {
                // Determine Icon Logic
                const manifest = file.appId ? APPS_REGISTRY[file.appId] : undefined
                let Icon = FileText
                let backgroundColor = '#3b82f6'

                if (manifest) {
                    Icon = manifest.icon
                    backgroundColor = manifest.theme?.backgroundColor || '#3b82f6'
                } else if (file.type === 'folder') {
                    Icon = Folder
                    backgroundColor = '#facc15'
                } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
                    Icon = ImageIcon
                    backgroundColor = '#a855f7'
                } else if (/\.(txt|md|json)$/i.test(file.name)) {
                    Icon = StickyNote
                    backgroundColor = '#eab308'
                } else {
                    backgroundColor = '#94a3b8'
                }

                return (
                <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                    key={file.id}
                    onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(file.id, e.ctrlKey || e.metaKey)
                    }}
                    className={`
                    flex flex-col items-center p-2 rounded cursor-pointer border transition-colors
                    ${selectedIds.has(file.id) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'border-transparent hover:bg-gray-50'}
                    `}
                >
                    <div className="relative">
                        <AppIcon 
                            manifest={manifest}
                            icon={Icon}
                            size={48}
                            backgroundColor={backgroundColor}
                            className="mb-2 drop-shadow-sm"
                        />
                        {/* Overlay to show it's deleted */}
                        <div className="absolute -bottom-1 -right-1 bg-red-100 text-red-500 rounded-full p-0.5 border border-white">
                            <Trash2 size={12} />
                        </div>
                    </div>
                    <div className="text-xs text-center break-all px-1 line-clamp-2 select-none">
                    {getDisplayName(file)}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 select-none">
                    {t('recycle.from')} {getDisplayName(files[file.originalParentId || ''])}
                    </div>
                </motion.div>
                )})}
            </div>
            )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default RecycleBin
