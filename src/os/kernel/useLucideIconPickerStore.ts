import { create } from 'zustand'

type PickerRequest = {
  title?: string
  initial?: string
  resolve: (value: string | null) => void
}

type PickerState = {
  request: PickerRequest | null
  open: (opts?: { title?: string; initial?: string }) => Promise<string | null>
  close: (value: string | null) => void
}

export const useLucideIconPickerStore = create<PickerState>((set, get) => ({
  request: null,
  open: (opts) => {
    const current = get().request
    if (current) {
      current.resolve(null)
    }
    return new Promise((resolve) => {
      set({
        request: {
          title: opts?.title,
          initial: opts?.initial,
          resolve
        }
      })
    })
  },
  close: (value) => {
    const req = get().request
    if (!req) return
    req.resolve(value)
    set({ request: null })
  }
}))

