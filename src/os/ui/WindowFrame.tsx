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
        flex flex-col overflow-hidden transition-all duration-300 backdrop-blur-2xl
        ${isMaximized ? 'rounded-none' : 'rounded-2xl'}
        ${className}
      `}
            style={{
                backgroundColor: 'var(--os-bg-window)',
                backdropFilter: 'var(--os-backdrop-blur)',
                border: isMaximized ? 'none' : '1px solid var(--os-border)',
                boxShadow: isActive
                    ? '0 20px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0,0,0,0.02)'
                    : '0 10px 30px -15px rgba(0, 0, 0, 0.1)',
                ...style
            }}
        >
            {children}
        </div>
    )
}
