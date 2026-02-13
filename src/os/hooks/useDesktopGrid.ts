import { useState, useEffect, useCallback, useRef } from 'react'
import { useDesktopStore } from '@/os/kernel/useDesktopStore'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { FileNode } from '@/os/kernel/useFileSystemStore'
import { GRID_SIZE, GRID_PADDING, IconPosition, findFreePosition } from '@/os/utils/grid'
import { useShallow } from 'zustand/react/shallow'

interface UseDesktopGridProps {
    desktopItems: FileNode[]
    selectedIcons: string[]
}

export function useDesktopGrid({ desktopItems, selectedIcons }: UseDesktopGridProps) {
    const { displayScale, snapToGrid } = useSystemSettings()

    // Derived Grid Settings
    const scaleFactor = displayScale / 100
    const currentGridSize = GRID_SIZE * scaleFactor
    const currentGridPadding = GRID_PADDING * scaleFactor

    const { iconPositions, setIconPositions, organizeIcons } = useDesktopStore(
        useShallow(state => ({
            iconPositions: state.iconPositions,
            setIconPositions: state.setIconPositions,
            organizeIcons: state.organizeIcons
        }))
    )

    const [mounted, setMounted] = useState(false)
    const [isLayoutReady, setIsLayoutReady] = useState(false)

    // Initialize icon positions if empty
    useEffect(() => {
        setMounted(true)

        // Calculate max rows based on viewport
        const maxRows = typeof window !== 'undefined'
            ? Math.floor((window.innerHeight - 150) / currentGridSize)
            : 6

        // Check if any items are missing positions
        const itemIds = desktopItems.map(i => i.id)
        const missingPositionIds = itemIds.filter(id => !iconPositions[id])

        // 1. If NO positions exist at all (first run), organize everything
        if (Object.keys(iconPositions).length === 0) {
            organizeIcons(itemIds, maxRows, currentGridSize, currentGridPadding)
        }
        // 2. If SOME items are missing positions (newly added files), assign them free spots
        else if (missingPositionIds.length > 0) {
            let newPositions = { ...iconPositions }

            missingPositionIds.forEach(id => {
                // Find a free spot for this new item
                const pos = findFreePosition(GRID_PADDING, GRID_PADDING, id, newPositions, currentGridSize, currentGridPadding)
                newPositions[id] = pos
            })

            setIconPositions(newPositions)
        }

        setIsLayoutReady(true)
    }, [desktopItems, iconPositions, currentGridSize, currentGridPadding, organizeIcons, setIconPositions])

    // Handle Scale Changes
    useEffect(() => {
        if (!mounted) return
        // Re-organize when scale changes to ensure everything fits
        const maxRows = Math.floor((window.innerHeight - 150) / currentGridSize)
        const itemIds = desktopItems.map(i => i.id)
        organizeIcons(itemIds, maxRows, currentGridSize, currentGridPadding)
    }, [displayScale, currentGridSize, currentGridPadding, desktopItems, organizeIcons, mounted])

    const handleDragEnd = useCallback((id: string, x: number, y: number) => {
        const currentPositions = useDesktopStore.getState().iconPositions
        const initialPos = currentPositions[id] || { x: GRID_PADDING, y: GRID_PADDING }

        // Calculate delta
        const deltaX = x - initialPos.x
        const deltaY = y - initialPos.y

        // Determine which items to move
        const itemsToMove = selectedIcons.includes(id) ? selectedIcons : [id]

        // Create a copy of positions to update
        let newPositions = { ...currentPositions }

        // We process the primary dragged item LAST to ensure it lands exactly where dropped (if snapping allows)
        // Actually, order doesn't matter much for collision if we use findFreePosition carefully,
        // but separating them helps logic clarity.

        // First pass: Calculate target positions for all
        const moves = itemsToMove.map(movingId => {
            const oldPos = currentPositions[movingId] || { x: GRID_PADDING, y: GRID_PADDING }
            // Apply delta
            let targetX = oldPos.x + deltaX
            let targetY = oldPos.y + deltaY

            // For the primary dragged item, use the exact drop coordinates (mouse pos)
            if (movingId === id) {
                targetX = x
                targetY = y
            }
            return { id: movingId, x: targetX, y: targetY }
        })

        // Second pass: Finalize positions (snap or free)
        // We must update newPositions incrementally so subsequent items respect occupied spots
        moves.forEach(move => {
            let finalPos: IconPosition
            if (snapToGrid) {
                finalPos = findFreePosition(move.x, move.y, move.id, newPositions, currentGridSize, currentGridPadding)
            } else {
                // Free placement mode (ensure within bounds)
                finalPos = { x: Math.max(0, move.x), y: Math.max(0, move.y) }
            }
            newPositions[move.id] = finalPos
        })

        // Update with full state
        setIconPositions(newPositions)
    }, [selectedIcons, snapToGrid, currentGridSize, currentGridPadding, setIconPositions])

    return {
        iconPositions,
        isLayoutReady,
        handleDragEnd,
        currentGridSize,
        currentGridPadding,
        scaleFactor
    }
}
