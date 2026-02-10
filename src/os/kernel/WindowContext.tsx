import { createContext, useContext } from 'react'

export const WindowContext = createContext<string | null>(null)

export const useWindowId = () => {
    return useContext(WindowContext)
}
