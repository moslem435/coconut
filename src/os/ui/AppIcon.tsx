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
    }

    const finalBg = backgroundColor || theme.backgroundColor
    const finalIconColor = theme.iconColor

    // Force line mode if system setting is 'line'
    // But allow override if background is explicitly set to false? 
    // Actually, if system is 'line', we generally want NO background.
    // However, if we are in 'line' mode, we might want to ensure the icon is visible.
    // The existing logic for background=false uses finalBg as the icon color, which is perfect.
    
    const showBackground = background && iconTheme === 'filled'

    if (showBackground) {
        return (
            <div 
                className={`flex items-center justify-center rounded-xl shadow-sm transition-transform ${className}`}
                style={{
                    width: size,
                    height: size,
                    backgroundColor: finalBg,
                    color: finalIconColor
                }}
            >
                <Icon size={size * 0.6} strokeWidth={2} />
            </div>
        )
    }

    return (
        <Icon 
            size={size} 
            className={className} 
            style={{ color: finalBg }} // Without background, use the brand color for the icon itself
        />
    )
}
