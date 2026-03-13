import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavoritesState {
    hiddenIds: string[]
    pinnedIds: string[]
    hideFavorite: (id: string) => void
    showFavorite: (id: string) => void
    pinFavorite: (id: string) => void
    unpinFavorite: (id: string) => void
    resetFavorites: () => void
}

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set) => ({
            hiddenIds: [],
            pinnedIds: [],
            hideFavorite: (id) => set((state) => ({
                hiddenIds: state.hiddenIds.includes(id) ? state.hiddenIds : [...state.hiddenIds, id]
            })),
            showFavorite: (id) => set((state) => ({
                hiddenIds: state.hiddenIds.filter(hid => hid !== id)
            })),
            pinFavorite: (id) => set((state) => ({
                pinnedIds: state.pinnedIds.includes(id) ? state.pinnedIds : [...state.pinnedIds, id]
            })),
            unpinFavorite: (id) => set((state) => ({
                pinnedIds: state.pinnedIds.filter(pid => pid !== id)
            })),
            resetFavorites: () => set({ hiddenIds: [], pinnedIds: [] })
        }),
        {
            name: 'os-favorites-storage',
            version: 2,
            migrate: (persistedState: any) => {
                if (!persistedState || typeof persistedState !== 'object') {
                    return { hiddenIds: [], pinnedIds: [] }
                }
                return {
                    ...persistedState,
                    hiddenIds: Array.isArray(persistedState.hiddenIds) ? persistedState.hiddenIds : [],
                    pinnedIds: Array.isArray(persistedState.pinnedIds) ? persistedState.pinnedIds : []
                }
            }
        }
    )
)
