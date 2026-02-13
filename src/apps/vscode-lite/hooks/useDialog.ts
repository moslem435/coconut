import { create } from 'zustand'

interface DialogConfig {
    type: 'alert' | 'confirm' | 'prompt'
    title?: string
    message: string
    defaultValue?: string
    placeholder?: string
    confirmText?: string
    cancelText?: string
}

interface DialogStore {
    isOpen: boolean
    config: DialogConfig | null
    resolve: ((value: any) => void) | null

    // API
    alert: (message: string, title?: string) => Promise<void>
    confirm: (message: string, title?: string) => Promise<boolean>
    prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>

    // Internal
    close: (value: any) => void
}

export const useDialog = create<DialogStore>((set, get) => ({
    isOpen: false,
    config: null,
    resolve: null,

    alert: (message, title = 'Alert') => {
        return new Promise((resolve) => {
            set({
                isOpen: true,
                config: { type: 'alert', message, title, confirmText: 'OK' },
                resolve: () => {
                    set({ isOpen: false, config: null, resolve: null })
                    resolve()
                }
            })
        })
    },

    confirm: (message, title = 'Confirm') => {
        return new Promise((resolve) => {
            set({
                isOpen: true,
                config: { type: 'confirm', message, title, confirmText: 'Yes', cancelText: 'No' },
                resolve: (value: boolean) => {
                    set({ isOpen: false, config: null, resolve: null })
                    resolve(value)
                }
            })
        })
    },

    prompt: (message, defaultValue = '', title = 'Input') => {
        return new Promise((resolve) => {
            set({
                isOpen: true,
                config: { type: 'prompt', message, defaultValue, title, confirmText: 'OK', cancelText: 'Cancel' },
                resolve: (value: string | null) => {
                    set({ isOpen: false, config: null, resolve: null })
                    resolve(value)
                }
            })
        })
    },

    close: (value) => {
        const { resolve } = get()
        if (resolve) resolve(value)
    }
}))
