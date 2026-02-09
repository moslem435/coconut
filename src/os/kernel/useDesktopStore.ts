import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { APPS_REGISTRY } from '@/os/registry/config'

interface IconPosition {
    x: number
    y: number
}

interface DesktopState {
    iconPositions: Record<string, IconPosition>
    setIconPositions: (positions: Record<string, IconPosition>) => void
    updateIconPosition: (id: string, pos: IconPosition) => void
    organizeIcons: (itemIds: string[], maxRows: number, gridSize: number, padding: number) => void
}

export const useDesktopStore = create<DesktopState>()(
    persist(
        (set) => ({
            iconPositions: {},
            setIconPositions: (positions) => set({ iconPositions: positions }),
            updateIconPosition: (id, pos) => set((state) => ({
                iconPositions: { ...state.iconPositions, [id]: pos }
            })),
            organizeIcons: (itemIds, maxRows, gridSize, padding) => {
                const newPositions: Record<string, IconPosition> = {}

                itemIds.forEach((id, index) => {
                    const col = Math.floor(index / maxRows)
                    const row = index % maxRows
                    newPositions[id] = {
                        x: padding + col * gridSize,
                        y: padding + row * gridSize
                    }
                })

                set({ iconPositions: newPositions })
            }
        }),
        {
            name: 'desktop-storage',
            // Only persist iconPositions
            partialize: (state) => ({ iconPositions: state.iconPositions }),
        }
    )
)
