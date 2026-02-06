import { ComponentType } from 'react'

export interface AppManifest {
    id: string
    title: string
    icon: ComponentType<any>
    component: ComponentType<any>
    /** Optional splash screen component, rendered before window opens */
    splashScreen?: ComponentType<{ onComplete: () => void }>
    defaultWindowOptions?: {
        width?: number
        height?: number
        isMaximized?: boolean
        isResizable?: boolean
    }
}
