'use client'

import React from 'react'
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react'

interface WindowTitleBarProps {
    title: string
    icon?: React.ComponentType<any>
    isActive: boolean
    isMaximized: boolean
    onMinimize: () => void
    onMaximize: () => void
    onClose: () => void
    onPointerDown?: (e: React.PointerEvent) => void
    onContextMenu?: (e: React.MouseEvent) => void
    dragControls?: any
}

export function WindowTitleBar({
    title,
    icon: Icon,
    isActive,
    isMaximized,
    onMinimize,
    onMaximize,
    onClose,
    onPointerDown,
    onContextMenu,
    dragControls
}: WindowTitleBarProps) {
    return (
        <div
            onPointerDown={(e) => {
                onPointerDown?.(e)
                dragControls?.start(e)
            }}
            onContextMenu={onContextMenu}
            onDoubleClick={(e) => {
                e.preventDefault()
                onMaximize()
            }}
            className="h-10 flex items-center justify-between px-3 select-none shrink-0 cursor-grab active:cursor-grabbing"
            style={{
                backgroundColor: 'transparent',
            }}
        >
            {/* Left: Icon + Title */}
            <div className="flex items-center gap-2.5">
                {Icon && (
                    <Icon
                        size={16}
                        style={{ color: isActive ? 'var(--os-accent)' : 'var(--os-text-muted)' }}
                    />
                )}
                <span
                    className="text-sm font-medium tracking-wide transition-colors"
                    style={{ color: isActive ? 'var(--os-text-primary)' : 'var(--os-text-muted)' }}
                >
                    {title}
                </span>
            </div>

            {/* Right: Window Controls */}
            <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
                {/* Minimize */}
                <button
                    onClick={onMinimize}
                    aria-label="Minimize"
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-[var(--os-hover-bg)] active:scale-90"
                    style={{ color: 'var(--os-text-secondary)' }}
                >
                    <Minus size={16} />
                </button>

                {/* Maximize/Restore */}
                <button
                    onClick={onMaximize}
                    aria-label={isMaximized ? 'Restore' : 'Maximize'}
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-[var(--os-hover-bg)] active:scale-90"
                    style={{ color: 'var(--os-text-secondary)' }}
                >
                    {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>

                {/* Close */}
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-red-500/20 hover:text-red-400 active:scale-90"
                    style={{ color: 'var(--os-text-secondary)' }}
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    )
}
