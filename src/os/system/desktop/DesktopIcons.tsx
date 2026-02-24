/**
 * 桌面图标容器组件
 * 处理图标布局和交互
 */

import { FileNode } from '@/os/kernel/useFileSystemStore'
import { DesktopIcon } from '@/os/system/DesktopIcon'
import { GRID_PADDING } from '@/os/utils/grid'

interface DesktopIconsProps {
  items: FileNode[]
  iconPositions: Record<string, { x: number; y: number }>
  selectedIds: string[]
  isLayoutReady: boolean
  scaleFactor: number
  currentGridSize: number
  currentGridPadding: number
  snapToGrid: boolean
  dragPreview: { x: number; y: number } | null
  textColor: string
  onSelect: (id: string, e?: React.MouseEvent) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onDragPreview: (preview: { x: number; y: number } | null) => void
  onClick: (id: string, e: React.MouseEvent) => void
  onDoubleClick: (id: string) => void
}

export function DesktopIcons({
  items,
  iconPositions,
  selectedIds,
  isLayoutReady,
  scaleFactor,
  currentGridSize,
  currentGridPadding,
  snapToGrid,
  dragPreview,
  textColor,
  onSelect,
  onDragEnd,
  onDragPreview,
  onClick,
  onDoubleClick
}: DesktopIconsProps) {
  if (!isLayoutReady) return null

  return (
    <>
      {/* 图标 */}
      {items.map((item) => {
        const pos = iconPositions[item.id] || { x: GRID_PADDING, y: GRID_PADDING }
        const isSelected = selectedIds.includes(item.id)

        return (
          <DesktopIcon
            key={item.id}
            item={item}
            pos={pos}
            isSelected={isSelected}
            scaleFactor={scaleFactor}
            currentGridSize={currentGridSize}
            currentGridPadding={currentGridPadding}
            snapToGrid={snapToGrid}
            textColor={textColor}
            onSelect={(id) => {
              if (!isSelected) onSelect(id)
            }}
            onDragEnd={onDragEnd}
            onDragPreview={onDragPreview}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
          />
        )
      })}

      {/* 拖拽预览网格 */}
      {dragPreview && snapToGrid && (
        <div
          className="absolute border-2 border-white/30 rounded bg-white/5 pointer-events-none z-0 transition-all duration-150"
          style={{
            left: dragPreview.x,
            top: dragPreview.y,
            width: currentGridSize,
            height: currentGridSize
          }}
        />
      )}
    </>
  )
}
