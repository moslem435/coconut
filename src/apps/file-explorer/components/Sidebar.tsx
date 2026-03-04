import React from 'react'
import {
  Home, Monitor, FileText, Image, Download,
  HardDrive, Cloud, Star, ChevronRight, Disc, Plus, AlertTriangle
} from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { SYSTEM_PATHS, FILE_IDS } from '@/os/config/paths'
import { cn } from '@/lib/utils'

import { useStorageInfo } from '../hooks/useStorageInfo'

interface SidebarProps {
  currentPathId: string
  onNavigate: (id: string) => void
}

const formatSize = (bytes: number) => {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)}GB`
  
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(0)}MB`
  
  return `${(bytes / 1024).toFixed(0)}KB`
}

export default function Sidebar({ currentPathId, onNavigate }: SidebarProps) {
  const { files, mountLocalFolder } = useFileSystemStore()
  const { t } = useLanguage()
  const { usage, quota, usagePercent } = useStorageInfo()

  // Group 1: This System
  const systemItems = [
    { id: FILE_IDS.ROOT, icon: Disc, label: 'explorer.root', path: SYSTEM_PATHS.ROOT },
    { id: FILE_IDS.DESKTOP, icon: Monitor, label: 'explorer.desktop', path: SYSTEM_PATHS.DESKTOP },
    { id: FILE_IDS.DOCUMENTS, icon: FileText, label: 'explorer.documents', path: SYSTEM_PATHS.DOCUMENTS },
    { id: FILE_IDS.DOWNLOADS, icon: Download, label: 'explorer.downloads', path: SYSTEM_PATHS.DOWNLOADS },
    { id: FILE_IDS.PICTURES, icon: Image, label: 'explorer.pictures', path: SYSTEM_PATHS.PICTURES },
  ]

  // Group 2: Libraries (Virtual/System Mounts)
  const libraries = Object.values(files).filter(node => node.isMount && node.isSystem)

  // Group 3: User Mounts (External Drives)
  const userMounts = Object.values(files).filter(node => node.isMount && !node.isSystem)

  const SidebarItem = ({ id, icon: Icon, label, isActive, onClick, node }: any) => (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative select-none",
        isActive
          ? "bg-[var(--os-accent)]/10 text-[var(--os-accent)] font-medium"
          : "text-[var(--os-text-secondary)] hover:bg-[var(--os-hover-bg)] hover:text-[var(--os-text-primary)]"
      )}
      title={label}
    >
      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={cn("opacity-70 group-hover:opacity-100 transition-opacity", isActive && "opacity-100")} />
      <span className="truncate flex-1 text-left text-xs tracking-wide">{label}</span>
      
      {/* Permission Warning */}
      {/* @ts-ignore - needsPermission added in store but type might not be inferred here yet in some setups */}
      {node?.needsPermission && (
        <AlertTriangle size={12} className="text-amber-400 animate-pulse" />
      )}
    </button>
  )

  return (
    <div className="w-56 flex flex-col h-full bg-[var(--os-hover-bg)]/30 border-r border-[var(--os-border)]/50 pt-4 pb-4 select-none backdrop-blur-md">
      <div className="flex-1 overflow-y-auto px-3 space-y-6 file-manager-scrollbar">

        {/* This System Section */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-[var(--os-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
            <Monitor size={10} />
            {t('explorer.this_system') || 'This System'}
          </h3>
          <div className="space-y-0.5">
            {systemItems.map(item => (
              <SidebarItem
                key={item.id}
                id={item.id}
                icon={item.icon}
                label={t(item.label)} // Use t() if available or fallback label
                isActive={currentPathId === item.id}
                onClick={onNavigate}
              />
            ))}
          </div>
        </div>

        {/* Libraries Section */}
        {libraries.length > 0 && (
          <div>
            <h3 className="px-3 text-xs font-semibold text-[var(--os-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
              <Star size={10} />
              {t('explorer.libraries') || 'Libraries'}
            </h3>
            <div className="space-y-0.5">
              {libraries.map(node => (
                <SidebarItem
                  key={node.id}
                  id={node.id}
                  icon={node.icon === 'images' ? Image : node.icon === 'disc' ? Disc : HardDrive}
                  label={node.name}
                  isActive={currentPathId === node.id}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Mounted Drives Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <h3 className="text-xs font-semibold text-[var(--os-text-muted)] uppercase tracking-wider flex items-center gap-1">
              <HardDrive size={10} />
              {t('explorer.mounted_drives') || 'Mounted Drives'}
            </h3>
            <button
              onClick={() => mountLocalFolder()}
              className="text-[var(--os-text-muted)] hover:text-[var(--os-text-primary)] transition-colors p-0.5 rounded hover:bg-[var(--os-hover-bg)]"
              title="Mount Local Folder"
            >
              <Plus size={12} />
            </button>
          </div>
          <div className="space-y-0.5">
            {userMounts.length > 0 ? (
              userMounts.map(node => (
                <SidebarItem
                  key={node.id}
                  id={node.id}
                  icon={HardDrive}
                  label={node.name}
                  isActive={currentPathId === node.id}
                  // Pass node to component to check permission
                  // @ts-ignore
                  node={node}
                  onClick={onNavigate}
                />
              ))
            ) : (
              <div className="px-3 py-1.5 text-xs text-[var(--os-text-muted)] italic">
                {t('explorer.empty') || 'No drives mounted'}
              </div>
            )}
          </div>
        </div>

        {/* Cloud Section (Placeholder) */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-[var(--os-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
            <Cloud size={10} />
            {t('explorer.cloud') || 'Cloud'}
          </h3>
          <div className="px-3 py-2 text-xs text-[var(--os-text-muted)] italic">
            No cloud drives connected
          </div>
        </div>

      </div>

      {/* Storage Indicator */}
      <div className="mt-auto px-4 py-4 border-t border-[var(--os-border)]">
        <div className="flex items-center gap-2 text-xs text-[var(--os-text-muted)] mb-1">
          <HardDrive size={12} />
          <span>Storage</span>
        </div>
        <div className="h-1 bg-[var(--os-border)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[var(--os-accent)]/50 rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, Math.max(1, usagePercent))}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--os-text-muted)] mt-1">
          <span>{formatSize(usage)} used</span>
          <span>{formatSize(quota)} total</span>
        </div>
      </div>
    </div>
  )
}
