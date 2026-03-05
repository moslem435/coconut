import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavoritesState {
    hiddenIds: string[]
    hideFavorite: (id: string) => void
    showFavorite: (id: string) => void
    resetFavorites: () => void
}

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set) => ({
            hiddenIds: [],
            hideFavorite: (id) => set((state) => ({
                hiddenIds: state.hiddenIds.includes(id) ? state.hiddenIds : [...state.hiddenIds, id]
            })),
            showFavorite: (id) => set((state) => ({
                hiddenIds: state.hiddenIds.filter(hid => hid !== id)
            })),
            resetFavorites: () => set({ hiddenIds: [] })
        }),
        {
            name: 'os-favorites-storage'
        }
    )
)
