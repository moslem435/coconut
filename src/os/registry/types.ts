import { ComponentType } from 'react'

export interface AppManifest {
    id: string
    title: string
    icon: ComponentType<any>
    component: ComponentType<any>
    defaultWindowOptions?: {
        width?: number
        height?: number
        isMaximized?: boolean
        isResizable?: boolean
    }
}
