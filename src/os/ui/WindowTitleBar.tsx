'use client'

import React from 'react'
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react'
import { AppIcon } from '@/os/ui/AppIcon'
import { APPS_REGISTRY } from '@/os/registry/config'
import { Tooltip } from '@/os/ui/Tooltip'
import { useLanguage } from '@/os/kernel/LanguageContext'

interface WindowTitleBarProps {
    title: string
    icon?: React.ComponentType<any>
    appId?: string
    isDefaultTitle?: boolean
    isActive: boolean
    isMaximized: boolean
    isResizable?: boolean
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
    isDefaultTitle,
    isActive,
    isMaximized,
    isResizable = true,
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
    const { t } = useLanguage()

    // Dynamic contrast colors
    // We use white color with mix-blend-mode: difference to achieve dynamic contrast against any background
    const dynamicTextColor = '#ffffff'
    const dynamicIconColor = '#ffffff'
    
    const manifest = appId ? APPS_REGISTRY[appId] : undefined
    
    const displayTitle = isDefaultTitle && appId ? t(`app.${appId}`) : title

    return (
        <div
            onPointerDown={(e) => {
                onPointerDown?.(e)
                dragControls?.start(e)
            }}
            onContextMenu={onContextMenu}
            onDoubleClick={(e) => {
                e.preventDefault()
                if (isResizable) onMaximize()
            }}
            className="h-10 flex items-center justify-between px-3 select-none shrink-0 cursor-grab active:cursor-grabbing group/titlebar"
            style={{
                backgroundColor: 'transparent',
            }}
        >
            {/* Left: Icon + Title */}
            <div className="flex items-center gap-2.5">
                <div className="relative z-10">
                    <AppIcon 
                        manifest={manifest}
                        icon={Icon}
                        size={20}
                        className="drop-shadow-sm"
                    />
                </div>
                <span
                    className="text-sm font-medium tracking-wide transition-colors mix-blend-difference"
                    style={{ 
                        color: dynamicTextColor,
                        opacity: isActive ? 1 : 0.6
                    }}
                >
                    {displayTitle}
                </span>
            </div>

            {/* Right: Window Controls */}
            <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
                {/* Minimize */}
                <Tooltip content={labels.minimize} side="bottom">
                    <button
                        onClick={onMinimize}
                        aria-label={labels.minimize}
                        className="group w-8 h-8 flex items-center justify-center rounded-lg transition-[background-color,transform] duration-150 active:scale-90 hover:bg-[var(--os-hover-bg)]"
                    >
                        <Minus 
                            size={16} 
                            className="mix-blend-difference transition-colors group-hover:mix-blend-normal group-hover:text-[var(--os-text-primary)]"
                            style={{ color: dynamicIconColor }} 
                        />
                    </button>
                </Tooltip>

                {/* Maximize/Restore */}
                {isResizable && (
                <Tooltip content={isMaximized ? labels.restore : labels.maximize} side="bottom">
                    <button
                        onClick={onMaximize}
                        aria-label={isMaximized ? labels.restore : labels.maximize}
                        className="group w-8 h-8 flex items-center justify-center rounded-lg transition-[background-color,transform] duration-150 active:scale-90 hover:bg-[var(--os-hover-bg)]"
                    >
                        {isMaximized ? (
                            <Minimize2 
                                size={16} 
                                className="mix-blend-difference transition-colors group-hover:mix-blend-normal group-hover:text-[var(--os-text-primary)]"
                                style={{ color: dynamicIconColor }}
                            />
                        ) : (
                            <Maximize2 
                                size={16} 
                                className="mix-blend-difference transition-colors group-hover:mix-blend-normal group-hover:text-[var(--os-text-primary)]"
                                style={{ color: dynamicIconColor }}
                            />
                        )}
                    </button>
                </Tooltip>
                )}

                {/* Close */}
                <Tooltip content={labels.close} side="bottom">
                    <button
                        onClick={onClose}
                        aria-label={labels.close}
                        className="group w-8 h-8 flex items-center justify-center rounded-lg transition-[background-color,transform] duration-150 hover:bg-red-500 active:scale-90"
                    >
                        <X 
                            size={16} 
                            className="mix-blend-difference transition-colors group-hover:mix-blend-normal group-hover:text-white"
                            style={{ color: dynamicIconColor }}
                        />
                    </button>
                </Tooltip>
            </div>
        </div>
    )
}
