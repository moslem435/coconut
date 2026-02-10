import { create } from 'zustand'

interface SystemState {
    isStartMenuOpen: boolean
    toggleStartMenu: () => void
    setStartMenuOpen: (isOpen: boolean) => void
    
    isActionCenterOpen: boolean
    toggleActionCenter: () => void
    setActionCenterOpen: (isOpen: boolean) => void
    
    isQuickSettingsOpen: boolean
    toggleQuickSettings: () => void
    setQuickSettingsOpen: (isOpen: boolean) => void
}

export const useSystemStore = create<SystemState>((set) => ({
    isStartMenuOpen: false,
    toggleStartMenu: () => set((state) => ({ isStartMenuOpen: !state.isStartMenuOpen })),
    setStartMenuOpen: (isOpen) => set({ isStartMenuOpen: isOpen }),

    isActionCenterOpen: false,
    toggleActionCenter: () => set((state) => ({ isActionCenterOpen: !state.isActionCenterOpen })),
    setActionCenterOpen: (isOpen) => set({ isActionCenterOpen: isOpen }),
    
    isQuickSettingsOpen: false,
    toggleQuickSettings: () => set((state) => ({ isQuickSettingsOpen: !state.isQuickSettingsOpen })),
    setQuickSettingsOpen: (isOpen) => set({ isQuickSettingsOpen: isOpen }),
}))
