import { create } from 'zustand'

export type MenuType = 'desktop' | 'taskbar-icon' | 'window-titlebar' | 'default'

interface ContextMenuState {
    visible: boolean
    position: { x: number, y: number }
    type: MenuType
    data?: any // e.g., { windowId: string }
    
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
