import React, { useState, useEffect, useMemo } from 'react'
import { useFileSystemStore, FileNode } from '@/os/kernel/useFileSystemStore'
import { useTrashStore } from '@/os/kernel/useTrashStore'
import {
  Trash2, RotateCcw, Eraser, FileText, Folder, Image as ImageIcon,
  StickyNote, LayoutGrid, List, Search, X, ChevronRight,
  Clock, FolderOpen, FileType, HardDrive, Info
} from 'lucide-react'
import { AppIcon } from '@/os/ui/AppIcon'
import { APPS_REGISTRY } from '@/os/registry/config'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { motion, AnimatePresence } from 'framer-motion'
import { soundManager } from '@/lib/sound'
import { cn } from '@/lib/utils'
import { toast } from '@/os/components/Toast'

import { useWindowContext } from '@/os/kernel/WindowContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts?: number) {
  if (!ts) return '—'
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800_000) return `${Math.floor(diff / 86400000)} 天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatFullDate(ts?: number) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('zh-CN')
}

function formatSize(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function getFileInfo(file: FileNode) {
  const manifest = file.appId ? APPS_REGISTRY[file.appId] : undefined
  let Icon: any = FileText
  let color = '#64748b'
  let typeLabel = '文件'

  if (manifest) {
    Icon = manifest.icon || FileText
    color = manifest.theme?.backgroundColor || '#3b82f6'
    typeLabel = '应用'
  } else if (file.type === 'folder') {
    Icon = Folder; color = '#f59e0b'; typeLabel = '文件夹'
  } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)) {
    Icon = ImageIcon; color = '#a855f7'; typeLabel = '图片'
  } else if (/\.(txt|md)$/i.test(file.name)) {
    Icon = StickyNote; color = '#eab308'; typeLabel = '文本'
  } else if (/\.json$/i.test(file.name)) {
    Icon = FileType; color = '#22c55e'; typeLabel = 'JSON'
  }

  return { Icon, color, manifest, typeLabel }
}

// ─── Component ────────────────────────────────────────────────────────────────

const RecycleBin: React.FC = () => {
  const [deletedFiles, setDeletedFiles] = useState<FileNode[]>([])
  const { files } = useFileSystemStore()
  const { restoreItems, emptyTrash } = useTrashStore()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [search, setSearch] = useState('')
  const { t } = useLanguage()

  const pendingEmpty = React.useRef<NodeJS.Timeout | null>(null)
  const [isPendingEmpty, setIsPendingEmpty] = useState(false)

  useEffect(() => {
    const items = Object.values(files).filter(f => f?.parentId === 'trash') as FileNode[]
    setDeletedFiles(items)
  }, [files])

  const filtered = useMemo(() => {
    if (isPendingEmpty) return []
    return search.trim()
      ? deletedFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
      : deletedFiles
  }, [deletedFiles, search, isPendingEmpty])

  const lastSelected = useMemo(() => {
    if (selectedIds.size !== 1) return null
    const id = Array.from(selectedIds)[0]
    return deletedFiles.find(f => f.id === id) ?? null
  }, [selectedIds, deletedFiles])

  const handleSelect = (id: string, multi: boolean, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (multi) {
      const s = new Set(selectedIds)
      s.has(id) ? s.delete(id) : s.add(id)
      setSelectedIds(s)
    } else {
      setSelectedIds(prev => {
        if (prev.size === 1 && prev.has(id)) return new Set()
        return new Set([id])
      })
    }
  }

  const handleRestore = () => {
    if (!selectedIds.size) return
    soundManager.playClick()
    restoreItems(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handleEmpty = () => {
    if (filtered.length === 0) return
    soundManager.playClick()
    setIsPendingEmpty(true)
    setSelectedIds(new Set())

    const toastId = toast.custom({
      type: 'warning',
      title: '已清空回收站',
      duration: 2500,
      action: {
        label: '撤回',
        onClick: () => {
          if (pendingEmpty.current) {
            clearTimeout(pendingEmpty.current)
            pendingEmpty.current = null
          }
          setIsPendingEmpty(false)
        }
      }
    })

    pendingEmpty.current = setTimeout(() => {
      // Execute the actual physical deletion
      useTrashStore.getState().emptyTrash()
      setIsPendingEmpty(false)
    }, 2000)
  }

  const getDisplayName = (node?: FileNode) => {
    if (!node) return t('recycle.unknown')
    if (node.appId) return t(`app.${node.appId}`)
    if (['root', 'desktop', 'documents', 'pictures', 'downloads'].includes(node.id))
      return t(`explorer.${node.id}`)
    return node.name
  }

  const allSelected = filtered.length > 0 && filtered.every(f => selectedIds.has(f.id))
  const { dragControls } = useWindowContext() || {}

  return (
    <div className="h-full w-full flex flex-col overflow-hidden"
      style={{ background: 'var(--os-bg-window)', color: 'var(--os-text-primary)' }}>

      {/* ══ TOP BAR ══════════════════════════════════════════════════════ */}
      <div className="shrink-0 flex flex-col border-b"
        style={{ borderColor: 'var(--os-border)', background: 'var(--os-bg-panel)' }}>
        
        {/* Immersive Title Bar Placeholder & Drag Handle */}
        <div 
          onPointerDown={e => dragControls?.start(e)}
          className="h-8 shrink-0 flex items-center px-3 select-none"
        />

        {/* Toolbar actions */}
        <div className="flex items-center gap-2 px-3 h-11">
          {/* Actions */}
          <button onClick={handleEmpty} disabled={!deletedFiles.length}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'rgb(248,113,113)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Eraser size={12} />{t('recycle.empty')}
          </button>

          <button onClick={handleRestore} disabled={!selectedIds.size}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'rgba(52,211,153,0.1)', color: 'rgb(52,211,153)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <RotateCcw size={12} />{t('recycle.restore')}
            {selectedIds.size > 0 &&
              <span className="ml-0.5 px-1 rounded-full text-[9px]"
                style={{ background: 'rgba(52,211,153,0.2)' }}>{selectedIds.size}</span>}
          </button>

          {/* Divider */}
          <div className="w-px h-5 mx-1" style={{ background: 'var(--os-border)' }} />

          {/* Search */}
          <div className="flex items-center gap-1.5 flex-1 max-w-56 h-7 px-2.5 rounded-md text-[11px]"
            style={{ background: 'var(--os-bg-window)', border: '1px solid var(--os-border)' }}>
            <Search size={11} style={{ color: 'var(--os-text-muted)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索回收站…"
              className="flex-1 bg-transparent outline-none placeholder:opacity-40 text-[11px]"
              style={{ color: 'var(--os-text-primary)' }} />
            {search && <button onClick={() => setSearch('')}><X size={10} style={{ color: 'var(--os-text-muted)' }} /></button>}
          </div>

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center rounded-md overflow-hidden" style={{ border: '1px solid var(--os-border)' }}>
            {(['list', 'grid'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className="flex items-center justify-center w-7 h-7 transition-all"
                style={{
                  background: viewMode === m ? 'var(--os-accent)' : 'var(--os-bg-window)',
                  color: viewMode === m ? '#fff' : 'var(--os-text-muted)'
                }}>
                {m === 'list' ? <List size={13} /> : <LayoutGrid size={13} />}
              </button>
            ))}
          </div>

          {/* Count */}
          <span className="text-[10px] tabular-nums px-2" style={{ color: 'var(--os-text-muted)' }}>
            {deletedFiles.length} 项
          </span>
        </div>
      </div>

      {/* ══ BODY ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* List header (list mode only) */}
          {viewMode === 'list' && filtered.length > 0 && (
            <div className="shrink-0 flex items-center gap-0 h-7 px-3 text-[10px] font-medium select-none"
              style={{ borderBottom: '1px solid var(--os-border)', color: 'var(--os-text-muted)', background: 'var(--os-bg-panel)' }}>
              <button onClick={() => {
                if (allSelected) setSelectedIds(new Set())
                else setSelectedIds(new Set(filtered.map(f => f.id)))
              }} className="w-8 flex items-center justify-center shrink-0">
                <div className="w-3.5 h-3.5 rounded border flex items-center justify-center transition-all"
                  style={{ borderColor: allSelected ? 'var(--os-accent)' : 'var(--os-border)', background: allSelected ? 'var(--os-accent)' : 'transparent' }}>
                  {allSelected && <span className="text-white text-[8px]">✓</span>}
                </div>
              </button>
              <span className="flex-[3] pl-2">名称</span>
              <span className="flex-[2]">原始位置</span>
              <span className="flex-[2]">删除时间</span>
              <span className="w-16 text-right pr-3">类型</span>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-auto" onClick={() => setSelectedIds(new Set())}>
            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                // ── Empty State ──────────────────────────────
                <motion.div key="empty"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center gap-5 select-none p-8">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-3xl opacity-20"
                      style={{ background: 'var(--os-accent)', transform: 'scale(2)' }} />
                    <div className="relative w-28 h-28 rounded-3xl flex items-center justify-center"
                      style={{ background: 'var(--os-bg-panel)', border: '1px solid var(--os-border)' }}>
                      <Trash2 size={52} style={{ color: 'var(--os-text-muted)', opacity: 0.3 }} />
                    </div>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ delay: 0.25, type: 'spring', stiffness: 300 }}
                      className="absolute -bottom-3 -right-3 w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-xl"
                      style={{ background: 'var(--os-bg-window)', border: '1px solid var(--os-border)' }}>
                      ✨
                    </motion.div>
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="font-semibold text-sm"
                      style={{ color: 'var(--os-text-primary)' }}>
                      {search ? `未找到 "${search}"` : t('recycle.empty.msg')}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--os-text-muted)' }}>
                      {search ? '尝试其他关键词' : '删除的文件会暂存在这里'}
                    </p>
                  </div>
                </motion.div>
              ) : viewMode === 'list' ? (
                // ── List View ─────────────────────────────────
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col py-1 px-1">
                  {filtered.map((file, i) => {
                    const { Icon, color, manifest, typeLabel } = getFileInfo(file)
                    const isSelected = selectedIds.has(file.id)
                    const parent = files[file.originalParentId || '']
                    return (
                      <motion.div key={file.id} layout
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8, transition: { duration: 0.12 } }}
                        transition={{ delay: i * 0.025 }}
                        onClick={e => { e.stopPropagation(); handleSelect(file.id, e.ctrlKey || e.metaKey, e) }}
                        className="flex items-center gap-0 h-9 px-1 rounded-lg cursor-pointer transition-all group"
                        style={{
                          background: isSelected ? 'var(--os-bg-selection)' : 'transparent',
                          outline: isSelected ? '1px solid var(--os-accent-muted, rgba(99,102,241,0.3))' : 'none',
                        }}>
                        {/* Checkbox */}
                        <div className="w-8 flex items-center justify-center shrink-0">
                          <div onClick={e => { e.stopPropagation(); handleSelect(file.id, true, e) }}
                            className="w-3.5 h-3.5 rounded border transition-all"
                            style={{
                              borderColor: isSelected ? 'var(--os-accent)' : 'var(--os-border)',
                              background: isSelected ? 'var(--os-accent)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                            {isSelected && <span className="text-white text-[8px]">✓</span>}
                          </div>
                        </div>

                        {/* Icon + Name */}
                        <div className="flex items-center gap-2 flex-[3] min-w-0">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 relative"
                            style={{ background: color + '22', border: `1px solid ${color}33` }}>
                            <AppIcon manifest={manifest} icon={Icon} size={18}
                              backgroundColor="transparent" className="!shadow-none" />
                          </div>
                          <span className="text-[12px] truncate" style={{ color: 'var(--os-text-primary)' }}>
                            {getDisplayName(file)}
                          </span>
                        </div>

                        {/* Original path */}
                        <div className="flex items-center gap-1 flex-[2] min-w-0">
                          <FolderOpen size={10} style={{ color: 'var(--os-text-muted)', flexShrink: 0 }} />
                          <span className="text-[11px] truncate" style={{ color: 'var(--os-text-muted)' }}>
                            {parent ? getDisplayName(parent) : '—'}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-1 flex-[2] min-w-0">
                          <Clock size={10} style={{ color: 'var(--os-text-muted)', flexShrink: 0 }} />
                          <span className="text-[11px] truncate" style={{ color: 'var(--os-text-muted)' }}>
                            {formatDate(file.updatedAt)}
                          </span>
                        </div>

                        {/* Type badge */}
                        <div className="w-16 flex justify-end pr-3">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                            style={{ background: color + '22', color: color, border: `1px solid ${color}33` }}>
                            {typeLabel}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              ) : (
                // ── Grid View ─────────────────────────────────
                <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 p-3">
                  {filtered.map((file, i) => {
                    const { Icon, color, manifest } = getFileInfo(file)
                    const isSelected = selectedIds.has(file.id)
                    return (
                      <motion.div key={file.id} layout
                        initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.75, transition: { duration: 0.12 } }}
                        transition={{ delay: i * 0.03 }}
                        onClick={e => { e.stopPropagation(); handleSelect(file.id, e.ctrlKey || e.metaKey, e) }}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl cursor-pointer transition-all group relative select-none"
                        style={{
                          background: isSelected ? 'var(--os-bg-selection)' : 'transparent',
                          outline: isSelected ? '1px solid var(--os-accent-muted, rgba(99,102,241,0.3))' : 'none',
                        }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: 14,
                          background: color + '22', border: `1px solid ${color}33`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                        }}>
                          <AppIcon manifest={manifest} icon={Icon} size={32}
                            backgroundColor="transparent" className="!shadow-none opacity-90" />
                          <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--os-bg-window)', border: '1px solid var(--os-border)' }}>
                            <Trash2 size={9} style={{ color: 'rgb(248,113,113)' }} />
                          </div>
                        </div>
                        <span className="text-[11px] text-center break-all line-clamp-2 leading-tight w-full px-0.5"
                          style={{ color: 'var(--os-text-primary)' }}>
                          {getDisplayName(file)}
                        </span>
                        <span className="text-[9px]" style={{ color: 'var(--os-text-muted)' }}>
                          {formatDate(file.updatedAt)}
                        </span>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Detail Panel ───────────────────────────────────────── */}
        <AnimatePresence>
          {lastSelected && (
            <motion.div key="detail"
              initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 188 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 flex flex-col overflow-hidden"
              style={{ borderLeft: '1px solid var(--os-border)', background: 'var(--os-bg-panel)' }}>
              <DetailPanel file={lastSelected} files={files} getDisplayName={getDisplayName} onRestore={handleRestore} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══ STATUS BAR ═══════════════════════════════════════════════════ */}
      <div className="shrink-0 flex items-center justify-between px-3 h-6 text-[10px]"
        style={{ borderTop: '1px solid var(--os-border)', background: 'var(--os-bg-panel)', color: 'var(--os-text-muted)' }}>
        <span>
          {selectedIds.size > 0
            ? `已选 ${selectedIds.size} / ${filtered.length} 项`
            : `${filtered.length} 个项目${search ? ` · 筛选自 ${deletedFiles.length} 项` : ''}`
          }
        </span>
        {selectedIds.size > 0 && (
          <button onClick={() => setSelectedIds(new Set())}
            className="hover:underline transition-all"
            style={{ color: 'var(--os-accent)' }}>取消选择</button>
        )}
      </div>
    </div>
  )
}

// ── Detail Panel Component ────────────────────────────────────────────────────
const DetailPanel: React.FC<{
  file: FileNode
  files: Record<string, FileNode>
  getDisplayName: (n?: FileNode) => string
  onRestore: () => void
}> = ({ file, files, getDisplayName, onRestore }) => {
  const { Icon, color, manifest, typeLabel } = getFileInfo(file)
  const parent = files[file.originalParentId || '']

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-4">
      {/* Icon */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: color + '22', border: `2px solid ${color}44` }}>
          <AppIcon manifest={manifest} icon={Icon} size={40}
            backgroundColor="transparent" className="!shadow-none" />
        </div>
        <div className="text-center">
          <p className="text-[12px] font-semibold break-all line-clamp-2 leading-tight"
            style={{ color: 'var(--os-text-primary)' }}>{file.name}</p>
          <span className="text-[9px] mt-0.5 px-1.5 py-0.5 rounded-full inline-block"
            style={{ background: color + '22', color, border: `1px solid ${color}33` }}>{typeLabel}</span>
        </div>
      </div>

      {/* Info rows */}
      <div className="flex flex-col gap-2">
        {[
          { icon: <FolderOpen size={10} />, label: '原始位置', value: parent ? getDisplayName(parent) : '—' },
          { icon: <Clock size={10} />, label: '删除时间', value: formatFullDate(file.updatedAt) },
          { icon: <HardDrive size={10} />, label: '大小', value: formatSize(file.size) },
        ].map(row => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[9px]"
              style={{ color: 'var(--os-text-muted)' }}>
              {row.icon}{row.label}
            </div>
            <p className="text-[11px] break-words pl-0.5"
              style={{ color: 'var(--os-text-primary)' }}>{row.value}</p>
          </div>
        ))}
      </div>

      {/* Restore button */}
      <button onClick={onRestore}
        className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11px] font-medium transition-all mt-auto"
        style={{ background: 'rgba(52,211,153,0.12)', color: 'rgb(52,211,153)', border: '1px solid rgba(52,211,153,0.25)' }}>
        <RotateCcw size={12} />还原此文件
      </button>
    </div>
  )
}

export default RecycleBin
