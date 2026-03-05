import { create } from 'zustand'

export type MenuType = string // Allow string for custom types
export type Position = { x: number, y: number }
export type ContextMenuData = any // Flexible data object for menu context

interface ContextMenuState {
    visible: boolean
    position: Position
    type: MenuType
    data?: ContextMenuData

    // Actions
    showMenu: (x: number, y: number, type: MenuType, data?: any) => void
    hideMenu: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
    visible: false,
    position: { x: 0, y: 0 },
    type: 'default',
    data: undefined,
    showMenu: (x, y, type, data) => set({ visible: true, position: { x, y }, type, data }),
    hideMenu: () => set({ visible: false })
}))
