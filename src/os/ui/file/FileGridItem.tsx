import React from 'react'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { AppIcon } from '@/os/ui/AppIcon'
import { RenameInput } from '@/os/ui/RenameInput'
import { useFileDisplay } from '@/os/hooks/useFileDisplay'
import { cn } from '@/lib/utils'

export interface FileGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  item: FileNode
  selected?: boolean
  renaming?: boolean
  onRename?: (newName: string) => void
  onCancelRename?: () => void
  iconSize?: number
  iconClassName?: string
  textClassName?: string
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
  ...props
}: FileGridItemProps) {
  const { displayName, iconTheme, thumbnail } = useFileDisplay(item)
  const { Icon, backgroundColor, useAppIcon, manifest } = iconTheme
  const IconComponent = Icon as any

  return (
    <div
      className={cn("flex flex-col items-center gap-2 select-none", className)}
      {...props}
    >
      <div className="relative group">
        {useAppIcon && manifest ? (
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
        <span className={cn(
          "text-xs text-center drop-shadow-sm break-words w-full px-1 select-none",
          textClassName || "text-[var(--os-text-primary)]"
        )}>
          {displayName}
        </span>
      )}
    </div>
  )
}

