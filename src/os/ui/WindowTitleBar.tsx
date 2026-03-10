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

    // We use theme variables instead of mix-blend-mode for better reliability over iframes
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
            className="h-8 flex items-center justify-between px-2.5 select-none shrink-0 cursor-grab active:cursor-grabbing group/titlebar bg-black/5 backdrop-blur-xl transition-colors duration-200 z-50 absolute top-0 left-0 w-full"
            style={{
                // backgroundColor handled by class
            }}
        >
            {/* Left: Icon + Title */}
            <div className="flex items-center gap-2">
                <div className="relative z-10">
                    <AppIcon 
                        manifest={manifest}
                        icon={Icon}
                        size={16}
                        className="drop-shadow-sm opacity-90"
                    />
                </div>
                <span
                    className="text-xs font-medium tracking-wide transition-opacity text-white/90 drop-shadow-md"
                    style={{ 
                        opacity: isActive ? 1 : 0.8
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
                        className="group w-7 h-7 flex items-center justify-center rounded-lg transition-[background-color,transform] duration-150 active:scale-90 hover:bg-white/10"
                    >
                        <Minus 
                            size={14} 
                            className="text-white/80 transition-opacity group-hover:opacity-100"
                        />
                    </button>
                </Tooltip>

                {/* Maximize/Restore */}
                {isResizable && (
                <Tooltip content={isMaximized ? labels.restore : labels.maximize} side="bottom">
                    <button
                        onClick={onMaximize}
                        aria-label={isMaximized ? labels.restore : labels.maximize}
                        className="group w-7 h-7 flex items-center justify-center rounded-lg transition-[background-color,transform] duration-150 active:scale-90 hover:bg-white/10"
                    >
                        {isMaximized ? (
                            <Minimize2 
                                size={14} 
                                className="text-white/80 transition-opacity group-hover:opacity-100"
                            />
                        ) : (
                            <Maximize2 
                                size={14} 
                                className="text-white/80 transition-opacity group-hover:opacity-100"
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
                        className="group w-7 h-7 flex items-center justify-center rounded-lg transition-[background-color,transform] duration-150 hover:bg-red-500/80 active:scale-90"
                    >
                        <X 
                            size={14} 
                            className="text-white/80 transition-colors group-hover:text-white group-hover:opacity-100"
                        />
                    </button>
                </Tooltip>
            </div>
        </div>
    )
}
