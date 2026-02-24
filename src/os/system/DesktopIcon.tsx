import { useRef } from 'react'
import { motion } from 'framer-motion'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { FileGridItem } from '@/os/ui/file/FileGridItem'
import { snapToGridPos } from '@/os/utils/grid'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/os/kernel/useUIStore'
import { useFileSystemStore } from '@/os/kernel/useFileSystemStore'
import { useContextMenuStore } from '@/os/kernel/useContextMenuStore'

interface DesktopIconProps {
    item: FileNode
    pos: { x: number, y: number }
    isSelected: boolean
    scaleFactor: number
    currentGridSize: number
    currentGridPadding: number
    snapToGrid: boolean
    textColor: string
    onSelect: (id: string, multi?: boolean) => void
    onDragEnd: (id: string, x: number, y: number) => void
    onDragPreview: (preview: { x: number, y: number } | null) => void
    onClick: (id: string, e: React.MouseEvent) => void
    onDoubleClick: (id: string) => void
}

export function DesktopIcon({
    item,
    pos,
    isSelected,
    scaleFactor,
    currentGridSize,
    currentGridPadding,
    snapToGrid,
    textColor,
    onSelect,
    onDragEnd,
    onDragPreview,
    onClick,
    onDoubleClick
}: DesktopIconProps) {
    const isDragging = useRef(false)
    const { renamingId, setRenamingId } = useUIStore()
    const { renameItem } = useFileSystemStore()
    const { showMenu } = useContextMenuStore()

    return (
        <motion.div
            drag={renamingId !== item.id}
            dragMomentum={false}
            dragElastic={0}
            onDragStart={() => {
                isDragging.current = true
                if (!isSelected) {
                    onSelect(item.id)
                }
            }}
            onDrag={(_, info) => {
                if (!isSelected /* || selectedIcons.length <= 1 */) { // Implementation detail: Simplification for now
                    if (snapToGrid) {
                        const currentX = pos.x + info.offset.x
                        const currentY = pos.y + info.offset.y
                        const preview = snapToGridPos(currentX, currentY, currentGridSize, currentGridPadding)
                        onDragPreview(preview)
                    }
                }
            }}
            onDragEnd={(_, info) => {
                // Small delay to prevent click event triggering
                setTimeout(() => {
                    isDragging.current = false
                    onDragPreview(null)
                }, 50)

                const finalX = pos.x + info.offset.x
                const finalY = pos.y + info.offset.y
                onDragEnd(item.id, finalX, finalY)
            }}
            initial={{ x: pos.x, y: pos.y }}
            animate={{ x: pos.x, y: pos.y }}
            transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                // Disable animation when dragging to feel responsive
                x: { duration: isDragging.current ? 0 : undefined },
                y: { duration: isDragging.current ? 0 : undefined }
            }}
            style={{
                width: currentGridSize,
                height: currentGridSize,
                zIndex: isDragging.current ? 50 : 1,
                position: 'absolute'
            }}
        >
            <FileGridItem
                item={item}
                selected={isSelected}
                renaming={renamingId === item.id}
                onRename={(newName) => {
                    if (newName && newName !== item.name) {
                        renameItem(item.id, newName).catch(console.error)
                    }
                    setRenamingId(null)
                }}
                onCancelRename={() => setRenamingId(null)}
                className={cn(
                    "w-full h-full p-2 rounded-lg transition-colors",
                    isSelected ? "bg-white/20 ring-1 ring-white/30 backdrop-blur-sm" : "hover:bg-white/10"
                )}
                iconSize={48 * scaleFactor}
                onClick={(e) => onClick(item.id, e)}
                onDoubleClick={() => onDoubleClick(item.id)}
                onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    showMenu(e.clientX, e.clientY, 'desktop-item', { id: item.id, appId: item.appId })
                }}
                textClassName={cn(textColor, "drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]")}
            />
        </motion.div>
    )
}
