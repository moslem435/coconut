import { AppManifest } from '@/os/registry/types'
import { LucideIcon } from 'lucide-react'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'

interface AppIconProps {
    manifest?: AppManifest
    icon?: any
    size?: number
    className?: string
    /** Whether to render the background container (Squircle). Default: true */
    background?: boolean
    /** Force specific background color */
    backgroundColor?: string
}

export function AppIcon({ 
    manifest, 
    icon, 
    size = 24, 
    className = '', 
    background = true,
    backgroundColor
}: AppIconProps) {
    // Try to get system settings, but fallback safely if used outside provider (e.g. tests)
    let iconTheme = 'filled'
    try {
        const settings = useSystemSettings()
        iconTheme = settings.iconTheme
    } catch (e) {
        // Ignore error if context is missing
    }

    const Icon = (manifest?.icon || icon) as LucideIcon
    
    if (!Icon) return null

    // Default theme if not provided
    const theme = manifest?.theme || {
        backgroundColor: '#3b82f6', // blue-500 default
        iconColor: '#ffffff'
        // No default lineColor to allow fallback to backgroundColor prop
    }

    const finalBg = backgroundColor || theme.backgroundColor
    const finalIconColor = theme.iconColor
    // Use lineColor if available, otherwise fallback to backgroundColor (brand color)
    // Priority: theme.lineColor (manifest) > backgroundColor (prop override) > theme.backgroundColor
    const finalLineColor = theme.lineColor || backgroundColor || theme.backgroundColor

    const showBackground = background && iconTheme === 'filled'

    if (showBackground) {
        return (
            <div 
                className={`flex items-center justify-center rounded-xl shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95 ${className}`}
                style={{
                    width: size,
                    height: size,
                    backgroundColor: finalBg,
                    color: finalIconColor
                }}
            >
                <Icon size={Math.round(size * 0.6)} strokeWidth={2} />
            </div>
        )
    }

    // Line Mode Optimization
    // Adjust stroke width based on size for better legibility
    const dynamicStrokeWidth = size >= 48 ? 1.5 : 2

    return (
        <div 
            className={`flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95 ${className}`}
            style={{ 
                width: size, 
                height: size 
            }}
        >
            <Icon 
                size={size} 
                strokeWidth={dynamicStrokeWidth}
                style={{ 
                    color: finalLineColor,
                    // Add subtle drop shadow for contrast against varied wallpapers
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' 
                }} 
            />
        </div>
    )
}
