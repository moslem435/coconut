import { ComponentType } from 'react'

export type AppIcon = ComponentType<{ size?: number; className?: string; color?: string; style?: any }>

export interface AppManifest {
    id: string
    title: string
    icon: AppIcon
    component: ComponentType<any>
    /** Optional splash screen component, rendered before window opens */
    splashScreen?: ComponentType<{ onComplete: () => void }>
    defaultWindowOptions?: {
        width?: number
        height?: number
        isMaximized?: boolean
        isResizable?: boolean
        /** Content color theme for the title bar text/icons */
        titleBarColor?: 'light' | 'dark' | 'auto'
    }
}
