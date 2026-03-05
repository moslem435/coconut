import { create } from 'zustand'
import { MenuItem } from '../system/context-menu/types'

type MenuProvider = (data: any) => MenuItem[]

interface ContextMenuRegistryState {
    providers: Record<string, MenuProvider[]>
    register: (type: string, provider: MenuProvider) => () => void
    getMenuItems: (type: string, data: any) => MenuItem[]
}

export const useContextMenuRegistry = create<ContextMenuRegistryState>((set, get) => ({
    providers: {},
    
    register: (type, provider) => {
        set((state) => {
            const currentProviders = state.providers[type] || []
            return {
                providers: {
                    ...state.providers,
                    [type]: [...currentProviders, provider]
                }
            }
        })

        // Return unregister function
        return () => {
            set((state) => {
                const currentProviders = state.providers[type] || []
                return {
                    providers: {
                        ...state.providers,
                        [type]: currentProviders.filter(p => p !== provider)
                    }
                }
            })
        }
    },

    getMenuItems: (type, data) => {
        const state = get()
        const providers = state.providers[type] || []
        
        return providers.flatMap(provider => {
            try {
                return provider(data)
            } catch (e) {
                console.error(`Error generating menu items for type ${type}:`, e)
                return []
            }
        })
    }
}))
