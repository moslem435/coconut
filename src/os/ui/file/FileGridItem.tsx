import React from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { AppIcon } from '@/os/ui/AppIcon'
import { RenameInput } from '@/os/ui/RenameInput'
import { useFileDisplay } from '@/os/hooks/useFileDisplay'
import { cn } from '@/lib/utils'
import { AppWindow, Package } from 'lucide-react'

export interface FileGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  item: FileNode
  selected?: boolean
  renaming?: boolean
  onRename?: (newName: string) => void
  onCancelRename?: () => void
  iconSize?: number
  iconClassName?: string
  textClassName?: string
  noTruncate?: boolean
}

export function FileGridItem({
  item,
  selected,
  renaming,
  onRename,
  onCancelRename,
  className,
  iconSize = 48,
  iconClassName,
  textClassName,
  noTruncate,
  ...props
}: FileGridItemProps) {
  const { displayName, iconTheme, thumbnail } = useFileDisplay(item)
  const { Icon, backgroundColor, useAppIcon, manifest } = iconTheme
  const IconComponent = Icon as any
  
  // App Bundle Logic
  const isAppBundle = item.type === 'folder' && item.name.endsWith('.app')
  const appBundleName = isAppBundle ? item.name.replace(/\.app$/, '') : displayName
  const AppBundleIcon = AppWindow // or Package

  return (
    <div
      className={cn("flex flex-col items-center gap-2 select-none", className)}
      {...props}
    >
      <div className="relative group">
        {isAppBundle ? (
           <div
            className={cn(`flex items-center justify-center rounded-xl shadow-md transition-transform duration-200`, selected && 'scale-105', iconClassName)}
            style={{
              width: iconSize,
              height: iconSize,
              backgroundColor: '#3b82f6', // Blue for apps
              color: '#ffffff'
            }}
          >
            <AppBundleIcon
              size={iconSize * 0.6}
              strokeWidth={1.5}
            />
          </div>
        ) : useAppIcon && manifest ? (
          <AppIcon
            manifest={manifest}
            size={iconSize}
            className={cn(`drop-shadow-md transition-transform duration-200`, selected && 'scale-105', iconClassName)}
            backgroundColor={backgroundColor}
          />
        ) : thumbnail ? (
          <div
            className={cn(`flex items-center justify-center rounded-lg overflow-hidden shadow-sm bg-black/20 transition-transform duration-200`, selected && 'scale-105', iconClassName)}
            style={{ width: iconSize, height: iconSize }}
          >
            <img
              src={thumbnail}
              alt={displayName}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ) : (
          <div
            className={cn(`flex items-center justify-center rounded-xl shadow-md transition-transform duration-200`, selected && 'scale-105', iconClassName)}
            style={{
              width: iconSize,
              height: iconSize,
              backgroundColor: backgroundColor,
              color: '#ffffff'
            }}
          >
            <IconComponent
              size={iconSize * 0.6}
              strokeWidth={2}
              fill={item.type === 'folder' ? 'currentColor' : 'none'}
            />
          </div>
        )}
      </div>

      {renaming && onRename ? (
        <RenameInput
          initialValue={item.name}
          className="w-full text-center text-xs rounded px-1 py-0.5"
          onComplete={onRename}
          onCancel={onCancelRename || (() => { })}
        />
      ) : (
        <span 
          className={cn(
            "text-xs text-center drop-shadow-sm break-words w-full px-1 select-none",
            !noTruncate && "line-clamp-2 overflow-hidden text-ellipsis",
            textClassName || "text-[var(--os-text-primary)]"
          )}
          title={isAppBundle ? appBundleName : displayName}
          style={!noTruncate ? {
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          } : undefined}
        >
          {isAppBundle ? appBundleName : displayName}
        </span>
      )}
    </div>
  )
}

