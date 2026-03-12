'use client'

import React from 'react'
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react'
import { AppIcon } from '@/os/ui/AppIcon'
import { APPS_REGISTRY } from '@/os/registry/config'
import { Tooltip } from '@/os/ui/Tooltip'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { cn } from '@/lib/utils'

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
    colorMode = 'light', // Default to light text (dark background)
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

    // Determine text and icon colors based on colorMode
    // colorMode='dark' means dark text (for light backgrounds)
    // colorMode='light' means light text (for dark backgrounds)
    const isDarkText = colorMode === 'dark'
    
    const textColorClass = isDarkText ? 'text-gray-800' : 'text-white/90'
    const iconColorClass = isDarkText ? 'text-gray-700' : 'text-white/80'
    const hoverBgClass = isDarkText ? 'hover:bg-black/5' : 'hover:bg-white/10'

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
            className={cn(
                "h-8 flex items-center justify-between px-2.5 select-none shrink-0 cursor-grab active:cursor-grabbing group/titlebar transition-colors duration-200 z-50 absolute top-0 left-0 w-full",
                // Removing default bg-black/5 for better immersion
                // Adding a subtle gradient for better text readability
                isDarkText 
                    ? "bg-gradient-to-b from-white/30 to-transparent" 
                    : "bg-gradient-to-b from-black/20 to-transparent"
            )}
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
                    className={cn(
                        "text-xs font-medium tracking-wide transition-opacity drop-shadow-sm",
                        textColorClass
                    )}
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
                        className={cn(
                            "group w-7 h-7 flex items-center justify-center rounded-lg transition-[background-color,transform] duration-150 active:scale-90",
                            hoverBgClass
                        )}
                    >
                        <Minus 
                            size={14} 
                            className={cn("transition-opacity group-hover:opacity-100", iconColorClass)}
                        />
                    </button>
                </Tooltip>

                {/* Maximize/Restore */}
                {isResizable && (
                <Tooltip content={isMaximized ? labels.restore : labels.maximize} side="bottom">
                    <button
                        onClick={onMaximize}
                        aria-label={isMaximized ? labels.restore : labels.maximize}
                        className={cn(
                            "group w-7 h-7 flex items-center justify-center rounded-lg transition-[background-color,transform] duration-150 active:scale-90",
                            hoverBgClass
                        )}
                    >
                        {isMaximized ? (
                            <Minimize2 
                                size={14} 
                                className={cn("transition-opacity group-hover:opacity-100", iconColorClass)}
                            />
                        ) : (
                            <Maximize2 
                                size={14} 
                                className={cn("transition-opacity group-hover:opacity-100", iconColorClass)}
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
                            className={cn(
                                "transition-colors group-hover:text-white group-hover:opacity-100",
                                iconColorClass
                            )}
                        />
                    </button>
                </Tooltip>
            </div>
        </div>
    )
}
