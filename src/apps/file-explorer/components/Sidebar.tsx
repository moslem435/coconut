import React from 'react'
import {
  Home, Monitor, FileText, Image, Download,
  HardDrive, Star, Disc, Plus, AlertTriangle,
  Folder, Trash2, X, ChevronRight, ChevronDown, Cloud
} from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { SYSTEM_PATHS, FILE_IDS } from '@/os/config/paths'
import { cn } from '@/lib/utils'
import { useStorageInfo } from '../hooks/useStorageInfo'

import { useFavoritesStore } from '@/os/kernel/useFavoritesStore'

interface SidebarProps {
  currentPathId: string
  onNavigate: (id: string) => void
}

const formatSize = (bytes: number) => {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(0)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

interface SidebarItemProps {
  id: string
  icon: any
  label: string
  isActive: boolean
  onClick: (id: string) => void
  onRemove?: (id: string) => void
  iconColor?: string
  iconBg?: string
  badge?: React.ReactNode
}

const SidebarItem = ({ id, icon: Icon, label, isActive, onClick, onRemove, iconColor, iconBg, badge }: SidebarItemProps) => (
  <button
    onClick={() => onClick(id)}
    className={cn(
      "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[12px] transition-all duration-150 select-none group relative",
      isActive
        ? "font-medium"
        : "text-[var(--os-text-secondary)]"
    )}
    style={{
      background: isActive ? 'var(--os-accent, rgba(99,102,241,1))' + '1a' : 'transparent',
      color: isActive ? 'var(--os-accent)' : undefined
    }}
    title={label}
    onMouseEnter={e => {
      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--os-hover-bg)'
    }}
    onMouseLeave={e => {
      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
    }}
  >
    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all"
      style={{
        background: isActive ? 'var(--os-accent)' : (iconBg || 'var(--os-hover-bg)'),
        color: isActive ? '#fff' : (iconColor || 'var(--os-text-muted)')
      }}>
      {React.createElement(Icon as any, { size: 13, strokeWidth: 2 })}
    </div>

    <span className="truncate flex-1 text-left">{label}</span>

    {badge && <div className="shrink-0">{badge}</div>}

    {onRemove && (
      <div
        className="shrink-0 w-5 h-5 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(id)
        }}
        title="从侧边栏移除"
      >
        <X size={10} style={{ color: 'var(--os-text-muted)' }} />
      </div>
    )}
  </button>
)

interface SectionHeaderProps {
  title: string
  collapsed: boolean
  onToggle: () => void
  action?: React.ReactNode
}

const SectionHeader = ({ title, collapsed, onToggle, action }: SectionHeaderProps) => (
  <div className="flex items-center justify-between px-2 pt-3 pb-1 group">
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest select-none hover:text-[var(--os-text-primary)] transition-colors"
      style={{ color: 'var(--os-text-muted)' }}
    >
      {collapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
      <span>{title}</span>
    </button>
    {action && <div className="opacity-0 group-hover:opacity-100 transition-opacity">{action}</div>}
  </div>
)

export default function Sidebar({ currentPathId, onNavigate }: SidebarProps) {
  const { files, mountLocalFolder, unmountLocalFolder } = useFileSystemStore()
  const { hiddenIds, hideFavorite } = useFavoritesStore()
  const { t } = useLanguage()
  const { usage, quota, usagePercent } = useStorageInfo()

  const [collapsed, setCollapsed] = React.useState({
    favorites: false,
    cloud: false,
    mounted: false
  })

  const toggle = (key: keyof typeof collapsed) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const systemItems = [
    { id: FILE_IDS.ROOT, icon: Disc, label: t('explorer.root') || 'Root', iconBg: 'rgba(99,102,241,0.15)', iconColor: '#818cf8' },
    { id: FILE_IDS.DESKTOP, icon: Monitor, label: t('explorer.desktop') || 'Desktop', iconBg: 'rgba(59,130,246,0.15)', iconColor: '#60a5fa' },
    { id: FILE_IDS.DOCUMENTS, icon: FileText, label: t('explorer.documents') || 'Documents', iconBg: 'rgba(245,158,11,0.15)', iconColor: '#fbbf24' },
    { id: FILE_IDS.DOWNLOADS, icon: Download, label: t('explorer.downloads') || 'Downloads', iconBg: 'rgba(16,185,129,0.15)', iconColor: '#34d399' },
    { id: FILE_IDS.PICTURES, icon: Image, label: t('explorer.pictures') || 'Pictures', iconBg: 'rgba(168,85,247,0.15)', iconColor: '#c084fc' },
  ].filter(item => {
    // 1. Check if manually hidden by user
    if (hiddenIds.includes(item.id)) return false

    // 2. Check if the folder exists and is NOT in Trash
    const node = files[item.id]
    if (!node) return false
    if (node.parentId === FILE_IDS.TRASH) return false

    return true
  })

  const userMounts = Object.values(files).filter(node => node?.isMount && !node.isSystem)

  const usedPct = Math.max(1, Math.min(100, usagePercent))
  const isStorageCritical = usagePercent > 80

  return (
    <div className="w-52 shrink-0 flex flex-col h-full select-none"
      style={{
        background: 'var(--os-bg-panel)',
        borderRight: '1px solid var(--os-border)'
      }}>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 file-manager-scrollbar">

        {/* Favorites */}
        <SectionHeader
          title="收藏夹"
          collapsed={collapsed.favorites}
          onToggle={() => toggle('favorites')}
        />
        {!collapsed.favorites && (
          <div className="space-y-0.5 animate-in slide-in-from-left-1 duration-200">
            {systemItems.map(item => (
              <SidebarItem
                key={item.id}
                id={item.id}
                icon={item.icon}
                label={item.label}
                isActive={currentPathId === item.id}
                onClick={onNavigate}
                onRemove={item.id !== FILE_IDS.ROOT ? hideFavorite : undefined} // Root cannot be hidden
                iconColor={item.iconColor}
                iconBg={item.iconBg}
              />
            ))}
          </div>
        )}

        {/* Cloud */}
        <SectionHeader
          title="云端"
          collapsed={collapsed.cloud}
          onToggle={() => toggle('cloud')}
          action={
            <button
              className="w-4 h-4 rounded flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="添加云服务"
              style={{ color: 'var(--os-text-muted)' }}
            >
              <Plus size={10} />
            </button>
          }
        />
        {!collapsed.cloud && (
          <div className="space-y-0.5 animate-in slide-in-from-left-1 duration-200 mb-2">
            <div className="px-8 py-1.5 text-[11px] italic opacity-60" style={{ color: 'var(--os-text-muted)' }}>
              暂无服务
            </div>
          </div>
        )}

        {/* Mounted Drives */}
        <SectionHeader
          title="已挂载"
          collapsed={collapsed.mounted}
          onToggle={() => toggle('mounted')}
          action={
            <button
              onClick={() => mountLocalFolder()}
              className="w-4 h-4 rounded flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="挂载本地文件夹"
              style={{ color: 'var(--os-text-muted)' }}>
              <Plus size={10} />
            </button>
          }
        />
        {!collapsed.mounted && (
          <div className="space-y-0.5 animate-in slide-in-from-left-1 duration-200">
            {userMounts.length > 0 ? userMounts.map(node => (
              <SidebarItem
                key={node.id}
                id={node.id}
                icon={HardDrive}
                label={node.name}
                isActive={currentPathId === node.id}
                onClick={onNavigate}
                onRemove={unmountLocalFolder}
                iconBg="rgba(156,163,175,0.1)"
                iconColor="#9ca3af"
                badge={(node as any).needsPermission ? (
                  <AlertTriangle size={11} className="text-amber-400 animate-pulse" />
                ) : undefined}
              />
            )) : (
              <p className="px-8 py-1.5 text-[11px] italic"
                style={{ color: 'var(--os-text-muted)' }}>
                暂无挂载
              </p>
            )}
          </div>
        )}
      </div>

      {/* Storage Info */}
      <div className="shrink-0 px-3 py-3" style={{ borderTop: '1px solid var(--os-border)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--os-text-muted)' }}>
            <HardDrive size={11} />
            <span>存储空间</span>
          </div>
          <span className="text-[10px]" style={{ color: isStorageCritical ? 'rgb(248,113,113)' : 'var(--os-text-muted)' }}>
            {usedPct.toFixed(0)}%
          </span>
        </div>

        {/* Progress track */}
        <div className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--os-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${usedPct}%`,
              background: isStorageCritical
                ? 'linear-gradient(90deg, rgb(239,68,68), rgb(248,113,113))'
                : 'linear-gradient(90deg, var(--os-accent), var(--os-accent)aa)'
            }}
          />
        </div>

        <div className="flex justify-between mt-1 text-[9px]" style={{ color: 'var(--os-text-muted)' }}>
          <span>{formatSize(usage)}</span>
          <span>{formatSize(quota)}</span>
        </div>
      </div>
    </div>
  )
}
