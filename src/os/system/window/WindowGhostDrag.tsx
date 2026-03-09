import { motion, DragControls } from 'framer-motion'

interface WindowGhostDragProps {
    isGhostDragging: boolean
    dragControls: DragControls
    targetX: number
    targetY: number
    width: number
    height: number
    onDragStart: () => void
    onDrag: (offset: { x: number; y: number }) => void
    onDragEnd: (offset: { x: number; y: number }) => void
}

export function WindowGhostDrag({
    isGhostDragging,
    dragControls,
    targetX,
    targetY,
    width,
    height,
    onDragStart,
    onDrag,
    onDragEnd
}: WindowGhostDragProps) {
    return (
        <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0.05}
            initial={false}
            animate={{
                x: targetX,
                y: targetY,
                width,
                height,
                opacity: isGhostDragging ? 1 : 0
            }}
            style={{
                position: 'fixed',
                zIndex: 6000,
                pointerEvents: isGhostDragging ? 'auto' : 'none',
                border: '2px dashed var(--os-accent)',
                backgroundColor: 'var(--os-accent-glow)',
                boxShadow: '0 0 30px var(--os-accent-dim)',
                borderRadius: '0.75rem'
            }}
            onDragStart={onDragStart}
            onDrag={(_, info) => onDrag(info.offset)}
            onDragEnd={(_, info) => onDragEnd(info.offset)}
        />
    )
}
