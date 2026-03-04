/**
 * Toast Notification Component
 * 
 * Displays temporary notifications for user actions and system events.
 */

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number // milliseconds, 0 = no auto-dismiss
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearAll: () => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7)
    const newToast: Toast = {
      id,
      duration: 5000, // Default 5 seconds
      ...toast
    }
    
    set((state) => ({
      toasts: [...state.toasts, newToast]
    }))
    
    return id
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },
  
  clearAll: () => {
    set({ toasts: [] })
  }
}))

// Helper functions for common toast types
export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    return useToastStore.getState().addToast({ type: 'success', title, message, duration })
  },
  
  error: (title: string, message?: string, duration?: number) => {
    return useToastStore.getState().addToast({ type: 'error', title, message, duration })
  },
  
  warning: (title: string, message?: string, duration?: number) => {
    return useToastStore.getState().addToast({ type: 'warning', title, message, duration })
  },
  
  info: (title: string, message?: string, duration?: number) => {
    return useToastStore.getState().addToast({ type: 'info', title, message, duration })
  },
  
  custom: (toast: Omit<Toast, 'id'>) => {
    return useToastStore.getState().addToast(toast)
  }
}

const ToastIcon = ({ type }: { type: ToastType }) => {
  const iconProps = { size: 20, strokeWidth: 2 }
  
  switch (type) {
    case 'success':
      return <CheckCircle {...iconProps} className="text-green-400" />
    case 'error':
      return <XCircle {...iconProps} className="text-red-400" />
    case 'warning':
      return <AlertCircle {...iconProps} className="text-yellow-400" />
    case 'info':
      return <Info {...iconProps} className="text-blue-400" />
  }
}

const ToastItem = ({ toast: toastItem }: { toast: Toast }) => {
  const removeToast = useToastStore(state => state.removeToast)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (toastItem.duration === 0 || isHovered) return

    const timer = setTimeout(() => {
      removeToast(toastItem.id)
    }, toastItem.duration)

    return () => clearTimeout(timer)
  }, [toastItem.id, toastItem.duration, removeToast, isHovered])

  const bgColor = {
    success: 'bg-green-500/10 border-green-500/30',
    error: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    info: 'bg-blue-500/10 border-blue-500/30'
  }[toastItem.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`${bgColor} border backdrop-blur-md rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px]`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        <ToastIcon type={toastItem.type} />
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white">
            {toastItem.title}
          </div>
          {toastItem.message && (
            <div className="text-xs text-white/70 mt-1">
              {toastItem.message}
            </div>
          )}
          {toastItem.action && (
            <button
              onClick={toastItem.action.onClick}
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 font-medium"
            >
              {toastItem.action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={() => removeToast(toastItem.id)}
          className="text-white/50 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  )
}

export const ToastContainer = () => {
  const toasts = useToastStore(state => state.toasts)

  return (
    <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toastItem => (
          <div key={toastItem.id} className="pointer-events-auto">
            <ToastItem toast={toastItem} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
