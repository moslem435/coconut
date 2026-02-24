import { useState, useRef } from 'react'
import { DragControls } from 'framer-motion'
import { SYSTEM_CONSTANTS } from '@/os/config/constants'

interface WindowDragState {
    isDragging: boolean
    isGhostDragging: boolean
    showSnapPreview: boolean
    restorePreview: { x: number; y: number; width: number; height: number } | null
    dragStartY: number
}

export function useWindowDrag() {
    const [isDragging, setIsDragging] = useState(false)
    const [isGhostDragging, setIsGhostDragging] = useState(false)
    const [showSnapPreview, setShowSnapPreview] = useState(false)
    const [restorePreview, setRestorePreview] = useState<{
        x: number
        y: number
        width: number
        height: number
    } | null>(null)
    const dragStartY = useRef<number>(0)

    // Ghost drag handlers
    const handleGhostDragStart = () => {
        setIsDragging(true)
        setIsGhostDragging(true)
    }

    const handleGhostDrag = (
        currentY: number,
        onSnapPreview: (show: boolean) => void = setShowSnapPreview
    ) => {
        if (currentY <= SYSTEM_CONSTANTS.SNAP_THRESHOLD) {
            onSnapPreview(true)
        } else {
            onSnapPreview(false)
        }
    }

    const handleGhostDragEnd = (
        offset: { x: number; y: number },
        windowPosition: { x: number; y: number },
        onMaximize: () => void,
        onUpdatePosition: (pos: { x: number; y: number }) => void
    ) => {
        const newX = windowPosition.x + offset.x
        const newY = windowPosition.y + offset.y

        if (newY <= SYSTEM_CONSTANTS.SNAP_THRESHOLD) {
            onMaximize()
            setIsDragging(false)
            setIsGhostDragging(false)
            setShowSnapPreview(false)
        } else {
            onUpdatePosition({
                x: Math.round(newX),
                y: Math.round(Math.max(0, newY))
            })
            setIsDragging(false)
            setIsGhostDragging(false)
            setShowSnapPreview(false)
        }
    }

    // Main window drag handlers
    const handleMainDragStart = (pointY: number) => {
        setIsDragging(true)
        dragStartY.current = pointY
    }

    const handleMainDrag = (
        info: { point: { x: number; y: number }; offset: { y: number } },
        windowState: {
            isMaximized: boolean
            position: { y: number }
            preMaximizeState?: { size: { width: number; height: number } }
        }
    ) => {
        const deltaY = info.point.y - dragStartY.current

        if (
            windowState.isMaximized &&
            deltaY > SYSTEM_CONSTANTS.RESTORE_DRAG_THRESHOLD
        ) {
            const restoredWidth = windowState.preMaximizeState?.size.width ?? 800
            const restoredHeight = windowState.preMaximizeState?.size.height ?? 600

            setRestorePreview({
                x: Math.max(0, info.point.x - restoredWidth / 2),
                y: Math.max(0, info.point.y - 20),
                width: restoredWidth,
                height: restoredHeight
            })
            setShowSnapPreview(false)
            return
        } else if (windowState.isMaximized) {
            setRestorePreview(null)
            return
        }

        const currentY = windowState.position.y + info.offset.y
        if (currentY <= SYSTEM_CONSTANTS.SNAP_THRESHOLD && !windowState.isMaximized) {
            setShowSnapPreview(true)
        } else {
            setShowSnapPreview(false)
        }
    }

    const handleMainDragEnd = (
        info: { point: { x: number; y: number }; offset: { x: number; y: number } },
        windowState: {
            isMaximized: boolean
            position: { x: number; y: number }
            preMaximizeState?: { size: { width: number; height: number } }
        },
        onMaximize: () => void,
        onUpdatePosition: (pos: { x: number; y: number }) => void
    ) => {
        setIsDragging(false)
        setShowSnapPreview(false)
        setRestorePreview(null)

        if (windowState.isMaximized) {
            if (info.offset.y > SYSTEM_CONSTANTS.RESTORE_DRAG_THRESHOLD) {
                const restoredWidth = windowState.preMaximizeState?.size.width ?? 800
                const newX = Math.max(0, info.point.x - restoredWidth / 2)
                const newY = Math.max(0, info.point.y - 20)

                onMaximize() // Toggle to restore
                setTimeout(() => {
                    onUpdatePosition({ x: Math.round(newX), y: Math.round(newY) })
                }, 0)
            }
            return
        }

        const newY = windowState.position.y + info.offset.y

        if (newY <= SYSTEM_CONSTANTS.SNAP_THRESHOLD) {
            onMaximize()
        } else {
            onUpdatePosition({
                x: Math.round(windowState.position.x + info.offset.x),
                y: Math.round(Math.max(0, newY))
            })
        }
    }

    return {
        // State
        isDragging,
        isGhostDragging,
        showSnapPreview,
        restorePreview,
        dragStartY,

        // Setters
        setShowSnapPreview,

        // Handlers
        handleGhostDragStart,
        handleGhostDrag,
        handleGhostDragEnd,
        handleMainDragStart,
        handleMainDrag,
        handleMainDragEnd
    }
}
