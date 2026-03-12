import React, { useMemo } from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { AppIcon } from '@/os/ui/AppIcon'
import { APPS_REGISTRY } from '@/os/registry/config'
import { motion } from 'framer-motion'
import {
    Folder, FileText, Image, File, X, Clock, HardDrive,
    Info, Tag, Hash, Calendar
} from 'lucide-react'
import { useFileDisplay } from '@/os/hooks/useFileDisplay'

interface PreviewPanelProps {
    items: FileNode[]         // selected items
    allFiles: Record<string, FileNode>
    onClose: () => void
}

const formatDate = (ts: number) =>
    new Date(ts).toLocaleString('zh-CN', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })

const formatSize = (bytes?: number, isDirectory?: boolean) => {
    if (isDirectory) return '—'
    if (bytes === undefined || bytes === null) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
    return `${(bytes / 1073741824).toFixed(2)} GB`
}

// Single file preview
const SinglePreview = ({ item, allFiles }: { item: FileNode, allFiles: Record<string, FileNode> }) => {
    const { displayName, iconTheme, thumbnail } = useFileDisplay(item)
    const { Icon, backgroundColor, useAppIcon, manifest } = iconTheme
    const IconComp = Icon as any

    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(item.name)
    const isText = /\.(txt|md|json|js|ts|css|html)$/i.test(item.name)

    const ext = item.name.includes('.') ? item.name.split('.').pop() ?? undefined : undefined
    const parent = allFiles[item.parentId ?? '']

    const infoRows = [
        { icon: <Calendar size={11} />, label: '修改时间', value: formatDate(item.updatedAt) },
        { icon: <HardDrive size={11} />, label: '大小', value: formatSize(item.size, item.type === 'folder') },
        { icon: <Folder size={11} />, label: '位置', value: parent?.name || '—' },
        ...(ext ? [{ icon: <Tag size={11} />, label: '类型', value: ext.toUpperCase() + (item.type === 'folder' ? ' 文件夹' : ' 文件') }] : []),
    ]

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            {/* Preview area */}
            <div className="shrink-0 p-4 flex flex-col items-center gap-3 border-b"
                style={{ borderColor: 'var(--os-border)' }}>

                {/* Thumbnail or icon */}
                {thumbnail && isImage ? (
                    <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg"
                        style={{ background: 'var(--os-bg-window)' }}>
                        <img src={thumbnail} alt={displayName}
                            className="w-full h-full object-contain" draggable={false} />
                    </div>
                ) : (
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                        style={{ background: backgroundColor + '1a', border: `1.5px solid ${backgroundColor}33` }}>
                        {useAppIcon && manifest ? (
                            <AppIcon manifest={manifest} size={52} backgroundColor="transparent" className="!shadow-none" />
                        ) : (
                            <IconComp size={40} style={{ color: backgroundColor }} strokeWidth={1.5}
                                fill={item.type === 'folder' ? 'currentColor' : 'none'}
                                fillOpacity={item.type === 'folder' ? 0.15 : 0} />
                        )}
                    </div>
                )}

                <div className="text-center w-full">
                    <p className="text-[13px] font-semibold break-all line-clamp-3 leading-tight"
                        style={{ color: 'var(--os-text-primary)' }}>
                        {displayName}
                    </p>
                    {ext && item.type === 'file' && (
                        <span className="mt-1 inline-block text-[9px] px-1.5 py-0.5 rounded-full"
                            style={{
                                background: backgroundColor + '1a',
                                color: backgroundColor,
                                border: `1px solid ${backgroundColor}33`
                            }}>
                            {ext}
                        </span>
                    )}
                </div>
            </div>

            {/* Info rows */}
            <div className="flex-1 p-3 space-y-0 overflow-y-auto">
                <p className="text-[9px] font-semibold uppercase tracking-widest mb-2 px-1 pt-1"
                    style={{ color: 'var(--os-text-muted)' }}>文件信息</p>
                {infoRows.map((row, i) => (
                    <div key={i} className="flex items-start gap-2 px-1 py-1.5 rounded-lg"
                        style={{ borderBottom: i < infoRows.length - 1 ? '1px solid var(--os-border)' : 'none' }}>
                        <div className="mt-0.5 shrink-0" style={{ color: 'var(--os-text-muted)' }}>{row.icon}</div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px]" style={{ color: 'var(--os-text-muted)' }}>{row.label}</span>
                            <span className="text-[11px] break-all" style={{ color: 'var(--os-text-primary)' }}>{row.value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// Multi-select summary
const MultiPreview = ({ items }: { items: FileNode[] }) => {
    const fileCount = items.filter(i => i.type === 'file').length
    const folderCount = items.filter(i => i.type === 'folder').length
    const fileItems = items.filter(i => i.type === 'file')
    const hasUnknownSize = fileItems.some(i => i.size === undefined)
    const totalSize = fileItems.reduce((a, i) => a + (i.size ?? 0), 0)

    return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
            <div className="flex -space-x-3">
                {items.slice(0, 3).map((item, i) => {
                    const app = item.appId ? APPS_REGISTRY[item.appId] : undefined
                    const bg = app?.theme?.backgroundColor || (item.type === 'folder' ? '#f59e0b' : '#64748b')
                    const IconComp = item.type === 'folder' ? Folder : File
                    return (
                        <div key={item.id}
                            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md border-2"
                            style={{
                                background: bg + '22', borderColor: 'var(--os-bg-window)',
                                zIndex: 3 - i
                            }}>
                            <IconComp size={22} style={{ color: bg }} />
                        </div>
                    )
                })}
                {items.length > 3 && (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[11px] font-semibold shadow-md border-2"
                        style={{
                            background: 'var(--os-bg-panel)', borderColor: 'var(--os-bg-window)',
                            color: 'var(--os-text-muted)'
                        }}>
                        +{items.length - 3}
                    </div>
                )}
            </div>

            <div className="text-center space-y-1">
                <p className="font-semibold text-sm" style={{ color: 'var(--os-text-primary)' }}>
                    已选 {items.length} 项
                </p>
                <p className="text-[11px]" style={{ color: 'var(--os-text-muted)' }}>
                    {fileCount > 0 && `${fileCount} 个文件`}{fileCount > 0 && folderCount > 0 && ' · '}{folderCount > 0 && `${folderCount} 个文件夹`}
                </p>
                {fileCount > 0 && (
                    <p className="text-[11px]" style={{ color: 'var(--os-text-muted)' }}>
                        总计 {hasUnknownSize ? '—' : formatSize(totalSize)}
                    </p>
                )}
            </div>
        </div>
    )
}

// Empty state
const EmptyPreview = () => (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--os-hover-bg)' }}>
            <Info size={26} style={{ color: 'var(--os-text-muted)', opacity: 0.4 }} />
        </div>
        <p className="text-[11px]" style={{ color: 'var(--os-text-muted)' }}>选择文件即可查看详情</p>
    </div>
)

export default function PreviewPanel({ items, allFiles, onClose }: PreviewPanelProps) {
    return (
        <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 220 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="shrink-0 flex flex-col overflow-hidden relative"
            style={{
                borderLeft: '1px solid var(--os-border)',
                background: 'var(--os-bg-panel)',
            }}
        >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-3 h-9 border-b"
                style={{ borderColor: 'var(--os-border)' }}>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--os-text-primary)' }}>信息</span>
                <button onClick={onClose}
                    className="w-5 h-5 flex items-center justify-center rounded-md transition-all"
                    style={{ color: 'var(--os-text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--os-hover-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <X size={12} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {items.length === 0 ? <EmptyPreview /> :
                    items.length === 1 && items[0] ? <SinglePreview item={items[0]} allFiles={allFiles} /> :
                        <MultiPreview items={items} />}
            </div>
        </motion.div>
    )
}
