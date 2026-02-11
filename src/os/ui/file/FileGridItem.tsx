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
  ...props
}: FileGridItemProps) {
  const { displayName, iconTheme, thumbnail } = useFileDisplay(item)
  const { Icon, backgroundColor, useAppIcon, manifest } = iconTheme

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
            <Icon 
              size={iconSize * 0.6} 
              strokeWidth={2}
            />
          </div>
        )}
      </div>

      {renaming && onRename ? (
        <RenameInput
          initialValue={item.name}
          className="w-full text-center text-xs rounded px-1 py-0.5"
          onComplete={onRename}
          onCancel={onCancelRename}
        />
      ) : (
        <span className="text-xs text-center text-white/90 drop-shadow-md line-clamp-2 break-all w-full px-1 select-none">
          {displayName}
        </span>
      )}
    </div>
  )
}
