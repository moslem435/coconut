import { useState, useRef, useEffect } from 'react'
import { useWindowStore } from '@/os/kernel/useWindowStore'
import { SYSTEM_CONSTANTS } from '@/os/config/constants'

interface ResizeState {
    isResizing: boolean
    direction: string | null
}

export function useWindowResize(
    id: string,
    onSnapPreview?: (show: boolean) => void,
    onMaximize?: () => void
) {
    const [resizeState, setResizeState] = useState<ResizeState>({ isResizing: false, direction: null })
    const windowRef = useRef<HTMLDivElement>(null)

    // Actions
    const updateWindowSize = useWindowStore(state => state.updateWindowSize)
    const updateWindowPosition = useWindowStore(state => state.updateWindowPosition)
    const windowState = useWindowStore(state => state.windows[id])

    const handleResizeStart = (e: React.PointerEvent, direction: string) => {
        e.preventDefault()
        e.stopPropagation()

        // Don't allow resizing if maximized
        if (windowState?.isMaximized) return

        setResizeState({ isResizing: true, direction })

        const startX = e.clientX
        const startY = e.clientY
        const startWidth = windowState.size.width
        const startHeight = windowState.size.height
        const startPosX = windowState.position.x
        const startPosY = windowState.position.y

        const currentGeo = {
            w: startWidth,
            h: startHeight,
            x: startPosX,
            y: startPosY
        }

        const onPointerMove = (moveEvent: PointerEvent) => {
            const deltaX = moveEvent.clientX - startX
            const deltaY = moveEvent.clientY - startY

            let newWidth = startWidth
            let newHeight = startHeight
            let newX = startPosX
            let newY = startPosY

            // Horizontal Resize
            if (direction.includes('e')) {
                newWidth = Math.max(SYSTEM_CONSTANTS.MIN_WINDOW_WIDTH, startWidth + deltaX)
            } else if (direction.includes('w')) {
                const proposedWidth = Math.max(SYSTEM_CONSTANTS.MIN_WINDOW_WIDTH, startWidth - deltaX)
                newX = startPosX + (startWidth - proposedWidth)
                newWidth = proposedWidth
            }

            // Vertical Resize
            if (direction.includes('s')) {
                newHeight = Math.max(SYSTEM_CONSTANTS.MIN_WINDOW_HEIGHT, startHeight + deltaY)
            } else if (direction.includes('n')) {
                const proposedHeight = Math.max(SYSTEM_CONSTANTS.MIN_WINDOW_HEIGHT, startHeight - deltaY)
                newY = startPosY + (startHeight - proposedHeight)
                newHeight = proposedHeight
            }

            // Direct DOM manipulation for performance
            if (windowRef.current) {
                requestAnimationFrame(() => {
                    if (!windowRef.current) return
                    windowRef.current.style.width = `${newWidth}px`
                    windowRef.current.style.height = `${newHeight}px`
                    windowRef.current.style.transform = `translateX(${newX}px) translateY(${newY}px)`
                })
            }

            // Snap detection (North resize)
            if (direction.includes('n')) {
                if (newY <= SYSTEM_CONSTANTS.SNAP_THRESHOLD) {
                    onSnapPreview?.(true)
                } else {
                    onSnapPreview?.(false)
                }
            }

            // Store in ref for finding final value
            currentGeo.w = newWidth
            currentGeo.h = newHeight
            currentGeo.x = newX
            currentGeo.y = newY
        }

        const onPointerUp = () => {
            document.removeEventListener('pointermove', onPointerMove)
            document.removeEventListener('pointerup', onPointerUp)

            // Handle Snap to Maximize
            if (direction.includes('n') && currentGeo.y <= SYSTEM_CONSTANTS.SNAP_THRESHOLD) {
                onMaximize?.()
                onSnapPreview?.(false)

                // Cleanup manual styles
                if (windowRef.current) {
                    windowRef.current.style.width = ''
                    windowRef.current.style.height = ''
                    windowRef.current.style.transform = ''
                }

                // Reset state
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setResizeState({ isResizing: false, direction: null })
                    })
                })
                return
            }

            // Commit changes to global store
            if (currentGeo.w !== startWidth || currentGeo.h !== startHeight) {
                updateWindowSize(id, { width: currentGeo.w, height: currentGeo.h })
            }
            if (currentGeo.x !== startPosX || currentGeo.y !== startPosY) {
                updateWindowPosition(id, { x: currentGeo.x, y: currentGeo.y })
            }

            // Cleanup manual styles
            if (windowRef.current) {
                windowRef.current.style.width = ''
                windowRef.current.style.height = ''
                windowRef.current.style.transform = ''
            }

            // Small delay to ensure React render cycle catches up before re-enabling animations
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setResizeState({ isResizing: false, direction: null })
                })
            })
        }

        document.addEventListener('pointermove', onPointerMove)
        document.addEventListener('pointerup', onPointerUp)
    }

    return {
        isResizing: resizeState.isResizing,
        handleResizeStart,
        windowRef
    }
}
