import { create } from 'zustand'

export type DialogType = 'alert' | 'confirm' | 'prompt' | 'action-sheet'

interface ActionSheetOption {
  label: string
  onClick: () => void
  isDestructive?: boolean
  isCancel?: boolean
}

interface DialogRequest {
  type: DialogType
  title: string
  message?: string
  defaultValue?: string
  placeholder?: string
  options?: ActionSheetOption[]
  resolve: (value: any) => void
}

interface DialogStore {
  request: DialogRequest | null
  
  // Returns void
  openAlert: (title: string, message?: string) => Promise<void>
  // Returns true if confirmed, false if cancelled
  openConfirm: (title: string, message?: string) => Promise<boolean>
  // Returns string if confirmed, null if cancelled
  openPrompt: (title: string, defaultValue?: string, placeholder?: string) => Promise<string | null>
  // Open Action Sheet
  openActionSheet: (title: string, message: string, options: ActionSheetOption[]) => void

  // Actions called by the UI
  submit: (value?: any) => void
  cancel: () => void
}

export const useDialogStore = create<DialogStore>((set, get) => ({
  request: null,

  openAlert: (title, message) => {
    return new Promise((resolve) => {
      set({
        request: {
          type: 'alert',
          title,
          message,
          resolve: (val) => {
            resolve()
            set({ request: null })
          }
        }
      })
    })
  },

  openConfirm: (title, message) => {
    return new Promise((resolve) => {
      set({
        request: {
          type: 'confirm',
          title,
          message,
          resolve: (val) => {
            resolve(val)
            set({ request: null })
          }
        }
      })
    })
  },

  openPrompt: (title, defaultValue = '', placeholder = '') => {
    return new Promise((resolve) => {
      set({
        request: {
          type: 'prompt',
          title,
          defaultValue,
          placeholder,
          resolve: (val) => {
            resolve(val)
            set({ request: null })
          }
        }
      })
    })
  },

  openActionSheet: (title, message, options) => {
    set({
      request: {
        type: 'action-sheet',
        title,
        message,
        options,
        resolve: () => set({ request: null })
      }
    })
  },

  submit: (value) => {
    const { request } = get()
    if (request) {
      request.resolve(value ?? true)
    }
  },

  cancel: () => {
    const { request } = get()
    if (request) {
      if (request.type === 'confirm') {
        request.resolve(false)
      } else if (request.type === 'prompt') {
        request.resolve(null)
      } else {
        request.resolve(undefined)
      }
      set({ request: null })
    }
  }
}))
