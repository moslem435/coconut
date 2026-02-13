import { createContext, useContext } from 'react'
import { DragControls } from 'framer-motion'

interface WindowContextType {
    windowId: string
    dragControls?: DragControls
}

export const WindowContext = createContext<WindowContextType | null>(null)

export const useWindowContext = () => {
    return useContext(WindowContext)
}

export const useWindowId = () => {
    const context = useContext(WindowContext)
    return context?.windowId || null
}
