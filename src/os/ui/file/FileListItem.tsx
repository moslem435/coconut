import React from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { AppIcon } from '@/os/ui/AppIcon'
import { RenameInput } from '@/os/ui/RenameInput'
import { useFileDisplay } from '@/os/hooks/useFileDisplay'
import { cn } from '@/lib/utils'
import { AppBundleIconView } from './AppBundleIconView'

export interface FileListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  item: FileNode
  selected?: boolean
  renaming?: boolean
  onRename?: (newName: string) => void
  onCancelRename?: () => void
  iconSize?: number
}

export function FileListItem({
  item,
  selected,
  renaming,
  onRename,
  onCancelRename,
  className,
  iconSize = 20,
  ...props
}: FileListItemProps) {
  const { displayName, iconTheme, thumbnail } = useFileDisplay(item)
  const { Icon, backgroundColor, useAppIcon, manifest, color, fill } = iconTheme
  const IconComponent = Icon as any

  // App Bundle Logic
  const isAppBundle = item.type === 'folder' && (item.name.endsWith('.app') || item.isAppBundle)
  const appBundleName = isAppBundle ? item.name.replace(/\.app$/, '') : displayName

  return (
    <div
      className={cn("flex items-center gap-3 select-none", className)}
      {...props}
    >
      <div className="relative shrink-0">
        {isAppBundle ? (
          <AppBundleIconView item={item} size={iconSize} variant="list" />
        ) : useAppIcon && manifest ? (
          <AppIcon
            manifest={manifest}
            size={iconSize}
            className="shrink-0"
            backgroundColor={backgroundColor}
          />
        ) : thumbnail ? (
          <div className="flex items-center justify-center rounded overflow-hidden shadow-sm bg-black/20" style={{ width: iconSize, height: iconSize }}>
            <img
              src={thumbnail}
              alt={displayName}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ) : (
          <div
            className={cn("flex items-center justify-center rounded-md", backgroundColor === 'transparent' ? '' : 'shadow-sm')}
            style={{
              width: iconSize,
              height: iconSize,
              backgroundColor: backgroundColor,
              color: backgroundColor === 'transparent' ? color || 'currentColor' : '#ffffff'
            }}
          >
            <IconComponent
              size={backgroundColor === 'transparent' ? iconSize : iconSize * 0.7}
              strokeWidth={2}
              fill={fill ? 'currentColor' : 'none'}
            />
          </div>
        )}
      </div>

      {renaming && onRename ? (
        <RenameInput
          initialValue={item.name}
          className="flex-1 h-6 text-sm rounded px-1"
          onComplete={onRename}
          onCancel={onCancelRename || (() => { })}
        />
      ) : (
        <span className="text-sm font-medium truncate text-[var(--os-text-primary)]">
          {isAppBundle ? appBundleName : displayName}
        </span>
      )}
    </div>
  )
}
