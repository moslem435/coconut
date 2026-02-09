'use client'

import React from 'react'
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react'
import { AppIcon } from '@/os/ui/AppIcon'
import { APPS_REGISTRY } from '@/os/registry/config'
import { Tooltip } from '@/os/ui/Tooltip'

interface WindowTitleBarProps {
    title: string
    icon?: React.ComponentType<any>
    appId?: string
    isActive: boolean
    isMaximized: boolean
    onMinimize: () => void
    onMaximize: () => void
    onClose: () => void
    onPointerDown?: (e: React.PointerEvent) => void
    onContextMenu?: (e: React.MouseEvent) => void
    onHoverMinimize?: () => void
    dragControls?: any
    colorMode?: 'light' | 'dark'
    labels?: {
        minimize: string
        maximize: string
        restore: string
        close: string
    }
}

export function WindowTitleBar({
    title,
    icon: Icon,
    appId,
    isActive,
    isMaximized,
    onMinimize,
    onMaximize,
    onClose,
    onPointerDown,
    onContextMenu,
    onHoverMinimize,
    dragControls,
    colorMode,
    labels = {
        minimize: 'Minimize',
        maximize: 'Maximize',
        restore: 'Restore',
        close: 'Close'
    }
}: WindowTitleBarProps) {
    // Determine colors based on colorMode
    // colorMode = 'dark' means dark text (for light backgrounds)
    // colorMode = 'light' or undefined means light text (for dark backgrounds - default)
    const isDarkText = colorMode === 'dark'
    
    const activeTextColor = isDarkText ? 'rgba(0,0,0,0.9)' : 'var(--os-text-primary)'
    const inactiveTextColor = isDarkText ? 'rgba(0,0,0,0.5)' : 'var(--os-text-muted)'
    const iconColor = isActive ? (isDarkText ? 'rgba(0,0,0,0.9)' : 'var(--os-accent)') : inactiveTextColor
    const buttonColor = isDarkText ? 'rgba(0,0,0,0.7)' : 'var(--os-text-secondary)'
    const buttonHoverBg = isDarkText ? 'rgba(0,0,0,0.1)' : 'var(--os-hover-bg)'

    const manifest = appId ? APPS_REGISTRY[appId] : undefined

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
                <AppIcon 
                    manifest={manifest}
                    icon={Icon}
                    size={20}
                    className="drop-shadow-sm"
                />
                <span
                    className="text-sm font-medium tracking-wide transition-colors"
                    style={{ color: isActive ? activeTextColor : inactiveTextColor }}
                >
                    {title}
                </span>
            </div>

            {/* Right: Window Controls */}
            <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
                {/* Minimize */}
                <Tooltip content={labels.minimize} side="bottom">
                    <button
                        onClick={onMinimize}
                        onMouseEnter={onHoverMinimize}
                        aria-label={labels.minimize}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 active:scale-90"
                        style={{ 
                            color: buttonColor,
                            '--hover-bg': buttonHoverBg
                        } as React.CSSProperties}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = buttonHoverBg)}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                        <Minus size={16} />
                    </button>
                </Tooltip>

                {/* Maximize/Restore */}
                <Tooltip content={isMaximized ? labels.restore : labels.maximize} side="bottom">
                    <button
                        onClick={onMaximize}
                        aria-label={isMaximized ? labels.restore : labels.maximize}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 active:scale-90"
                        style={{ 
                            color: buttonColor,
                            '--hover-bg': buttonHoverBg
                        } as React.CSSProperties}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = buttonHoverBg)}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                        {isMaximized ? (
                            <Minimize2 size={16} />
                        ) : (
                            <Maximize2 size={16} />
                        )}
                    </button>
                </Tooltip>

                {/* Close */}
                <Tooltip content={labels.close} side="bottom">
                    <button
                        onClick={onClose}
                        aria-label={labels.close}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-red-500 hover:text-white active:scale-90"
                        style={{ color: buttonColor }}
                    >
                        <X size={16} />
                    </button>
                </Tooltip>
            </div>
        </div>
    )
}
