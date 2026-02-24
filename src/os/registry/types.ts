import { ComponentType } from 'react'

export type AppIcon = ComponentType<{ size?: number; className?: string; color?: string; style?: any }>

export interface AppManifest {
    id: string
    title: string
    icon: AppIcon
    /** Theme colors for flat icon styling */
    theme?: {
        backgroundColor: string
        iconColor: string
        /** Optional color override for Line/Classic mode. Defaults to backgroundColor if not set. */
        lineColor?: string
    }
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
        /** If true, the OS title bar is hidden. App must handle dragging. */
        hideTitleBar?: boolean
    }
    /** If true, runs the app in an iframe sandbox */
    sandbox?: boolean
    /** List of permissions required by the app */
    permissions?: string[]
    /** If true, allows multiple instances of the app to be open at once */
    multiInstance?: boolean
}
