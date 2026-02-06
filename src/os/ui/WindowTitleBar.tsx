import React from 'react'
import { X, Minus, Square, Maximize2, Minimize2 } from 'lucide-react'

interface WindowTitleBarProps {
    title: string
    icon?: React.ComponentType<any>
    isActive: boolean
    isMaximized: boolean
    onMinimize: () => void
    onMaximize: () => void
    onClose: () => void
    onPointerDown?: (e: React.PointerEvent) => void
    dragControls?: any // Framer motion drag controls
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
    dragControls
}: WindowTitleBarProps) {
    return (
        <div
            onPointerDown={(e) => {
                onPointerDown?.(e)
                dragControls?.start(e)
            }}
            onDoubleClick={(e) => {
                e.preventDefault()
                onMaximize()
            }}
            className={`
        h-9 flex items-center justify-between px-3 select-none shrink-0
        border-b-[1px] transition-colors duration-200
        cursor-grab active:cursor-grabbing
      `}
            style={{
                backgroundColor: isActive ? 'var(--os-accent-glow)' : 'transparent',
                borderColor: 'var(--os-border)',
            }}
        >
            <div className="flex items-center gap-2.5">
                {Icon && <Icon size={14} color={isActive ? 'var(--os-accent)' : 'var(--os-text-muted)'} />}
                <span
                    className="text-xs font-mono tracking-wide transition-colors"
                    style={{ color: isActive ? 'var(--os-text-primary)' : 'var(--os-text-muted)' }}
                >
                    {title}
                </span>
            </div>

            <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
                <WindowControlBtn onClick={onMinimize} icon={Minus} label="Minimize" />
                <WindowControlBtn
                    onClick={onMaximize}
                    icon={isMaximized ? Minimize2 : Square}
                    label="Maximize"
                />
                <WindowControlBtn
                    onClick={onClose}
                    icon={X}
                    label="Close"
                    variant="danger"
                />
            </div>
        </div>
    )
}

function WindowControlBtn({
    onClick,
    icon: Icon,
    variant = 'default',
    label
}: {
    onClick: () => void,
    icon: any,
    variant?: 'default' | 'danger',
    label?: string
}) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            className={`
        w-6 h-6 flex items-center justify-center rounded transition-all duration-200
        hover:bg-opacity-20
      `}
            style={{
                color: variant === 'danger' ? '#ef4444' : 'var(--os-text-secondary)',
            }}
        >
            <Icon size={12} />
            <style jsx>{`
        button:hover {
          background-color: ${variant === 'danger' ? 'rgba(239, 68, 68, 0.2)' : 'var(--os-hover-bg)'};
          color: ${variant === 'danger' ? '#fca5a5' : 'var(--os-text-primary)'} !important;
        }
      `}</style>
        </button>
    )
}
