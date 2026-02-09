import React from 'react'

interface WindowFrameProps {
    children: React.ReactNode
    isActive: boolean
    isMaximized: boolean
    className?: string
    style?: React.CSSProperties
    onPointerDown?: (e: React.PointerEvent) => void
}

export function WindowFrame({
    children,
    isActive,
    isMaximized,
    className = '',
    style,
    onPointerDown
}: WindowFrameProps) {
    return (
        <div
            onPointerDown={onPointerDown}
            className={`
        flex flex-col overflow-hidden transition-[backdrop-filter,background-color,transform,width,height,border-radius] duration-300 backdrop-blur-2xl
        ${isMaximized ? 'rounded-none' : 'rounded-2xl'}
        ${className}
      `}
            style={{
                backgroundColor: 'var(--os-bg-window)',
                // Optimization: Reduce blur quality for inactive windows to save GPU
                backdropFilter: isActive ? 'var(--os-backdrop-blur)' : 'blur(10px)',
                WebkitBackdropFilter: isActive ? 'var(--os-backdrop-blur)' : 'blur(10px)',
                border: isMaximized ? 'none' : '1px solid var(--os-border)',
                boxShadow: isActive
                    ? 'var(--os-shadow-window-active)'
                    : 'var(--os-shadow-window)',
                willChange: 'transform', // Hint for GPU promotion
                ...style
            }}
        >
            {children}
        </div>
    )
}
