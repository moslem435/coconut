interface WindowResizeHandlesProps {
    onResizeStart: (e: React.PointerEvent, direction: string) => void
}

export function WindowResizeHandles({ onResizeStart }: WindowResizeHandlesProps) {
    return (
        <>
            {/* Corner Handles */}
            <div onPointerDown={(e) => onResizeStart(e, 'nw')} className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50" />
            <div onPointerDown={(e) => onResizeStart(e, 'ne')} className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-50" />
            <div onPointerDown={(e) => onResizeStart(e, 'sw')} className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-50" />
            <div onPointerDown={(e) => onResizeStart(e, 'se')} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50" />

            {/* Edge Handles */}
            <div onPointerDown={(e) => onResizeStart(e, 'n')} className="absolute top-0 left-4 right-4 h-2 cursor-n-resize z-40" />
            <div onPointerDown={(e) => onResizeStart(e, 's')} className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize z-40" />
            <div onPointerDown={(e) => onResizeStart(e, 'w')} className="absolute top-4 bottom-4 left-0 w-2 cursor-w-resize z-40" />
            <div onPointerDown={(e) => onResizeStart(e, 'e')} className="absolute top-4 bottom-4 right-0 w-2 cursor-e-resize z-40" />
        </>
    )
}
