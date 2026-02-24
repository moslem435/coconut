import React from 'react'
import {
  Home, Monitor, FileText, Image, Download,
  HardDrive, Cloud, Star, ChevronRight, Disc, Plus, AlertTriangle
} from 'lucide-react'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { cn } from '@/lib/utils'

interface SidebarProps {
  currentPathId: string
  onNavigate: (id: string) => void
}

export default function Sidebar({ currentPathId, onNavigate }: SidebarProps) {
  const { files, mountLocalFolder } = useFileSystemStore()
  const { t } = useLanguage()

  // Group 1: This System
  const systemItems = [
    { id: 'root', icon: Disc, label: 'explorer.root' }, // Moved Root here
    { id: 'desktop', icon: Monitor, label: 'explorer.desktop' },
    { id: 'documents', icon: FileText, label: 'explorer.documents' },
    { id: 'downloads', icon: Download, label: 'explorer.downloads' },
    { id: 'pictures', icon: Image, label: 'explorer.pictures' },
  ]

  // Group 2: Mounted Drives
  const mounts = Object.values(files).filter(node => node.isMount)

  const SidebarItem = ({ id, icon: Icon, label, isActive, onClick, node }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-all duration-200 group relative",
        isActive
          ? "bg-[var(--os-bg-selection)] text-[var(--os-text-primary)] font-medium shadow-sm"
          : "text-[var(--os-text-secondary)] hover:bg-[var(--os-hover-bg)] hover:text-[var(--os-text-primary)]"
      )}
    >
      <Icon size={16} className={cn("opacity-80 group-hover:opacity-100", isActive && "text-[var(--os-accent)] opacity-100")} />
      <span className="truncate flex-1 text-left">{label}</span>
      
      {/* Selection Dot (Purple) */}
      {isActive && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[var(--os-accent)] shadow-[0_0_8px_var(--os-accent)]" />
      )}

      {/* Permission Warning */}
      {/* @ts-ignore - needsPermission added in store but type might not be inferred here yet in some setups */}
      {node?.needsPermission && (
        <AlertTriangle size={12} className="text-amber-400 animate-pulse" />
      )}
    </button>
  )

  return (
    <div className="w-56 flex flex-col h-full bg-[var(--os-bg-panel)] border-r border-[var(--os-border)] pt-4 pb-4 select-none">
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
                label={t(item.label)}
                isActive={currentPathId === item.id}
                onClick={() => onNavigate(item.id)}
              />
            ))}
          </div>
        </div>

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
            {mounts.length > 0 ? (
              mounts.map(node => (
                <SidebarItem
                  key={node.id}
                  id={node.id}
                  icon={HardDrive}
                  label={node.name}
                  isActive={currentPathId === node.id}
                  // Pass node to component to check permission
                  // @ts-ignore
                  node={node}
                  onClick={() => onNavigate(node.id)}
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

      {/* Storage Indicator (Optional) */}
      <div className="mt-auto px-4 py-4 border-t border-[var(--os-border)]">
        <div className="flex items-center gap-2 text-xs text-[var(--os-text-muted)] mb-1">
          <HardDrive size={12} />
          <span>Storage</span>
        </div>
        <div className="h-1 bg-[var(--os-border)] rounded-full overflow-hidden">
          <div className="h-full w-[45%] bg-[var(--os-accent)]/50 rounded-full" />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--os-text-muted)] mt-1">
          <span>24GB used</span>
          <span>64GB total</span>
        </div>
      </div>
    </div>
  )
}
