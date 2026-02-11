import React from 'react'
import { 
  Home, Monitor, FileText, Image, Download, 
  HardDrive, Cloud, Star, ChevronRight, Disc, Plus
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

  const SidebarItem = ({ id, icon: Icon, label, isActive, onClick }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-all duration-200 group",
        isActive 
          ? "bg-white/10 text-white font-medium shadow-sm" 
          : "text-white/70 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon size={16} className={cn("opacity-80 group-hover:opacity-100", isActive && "text-blue-400 opacity-100")} />
      <span className="truncate">{label}</span>
    </button>
  )

  return (
    <div className="w-56 flex flex-col h-full bg-[rgba(var(--os-bg-panel-rgb),0.3)] backdrop-blur-xl border-r border-white/5 pt-4 pb-4 select-none">
      <div className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar">
        
        {/* This System Section */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1">
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
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1">
              <HardDrive size={10} />
              {t('explorer.mounted_drives') || 'Mounted Drives'}
            </h3>
            <button
              onClick={() => mountLocalFolder()}
              className="text-white/40 hover:text-white transition-colors p-0.5 rounded hover:bg-white/10"
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
                  onClick={() => onNavigate(node.id)}
                />
              ))
            ) : (
              <div className="px-3 py-1.5 text-xs text-white/30 italic">
                {t('explorer.empty') || 'No drives mounted'}
              </div>
            )}
          </div>
        </div>

        {/* Cloud Section (Placeholder) */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Cloud size={10} />
            {t('explorer.cloud') || 'Cloud'}
          </h3>
          <div className="px-3 py-2 text-xs text-white/30 italic">
            No cloud drives connected
          </div>
        </div>

      </div>
      
      {/* Storage Indicator (Optional) */}
      <div className="mt-auto px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
          <HardDrive size={12} />
          <span>Storage</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full w-[45%] bg-blue-500/50 rounded-full" />
        </div>
        <div className="flex justify-between text-[10px] text-white/30 mt-1">
          <span>24GB used</span>
          <span>64GB total</span>
        </div>
      </div>
    </div>
  )
}
