import { create } from 'zustand'

type DialogType = 'alert' | 'confirm' | 'prompt'

interface DialogRequest {
  type: DialogType
  title: string
  message?: string
  defaultValue?: string
  placeholder?: string
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
          resolve
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
          resolve
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
          resolve
        }
      })
    })
  },

  submit: (value) => {
    const { request } = get()
    if (request) {
      if (request.type === 'confirm') {
        request.resolve(true)
      } else if (request.type === 'prompt') {
        request.resolve(value)
      } else {
        request.resolve(undefined)
      }
      set({ request: null })
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
