import { useEffect, useRef } from 'react'
import { useNotificationStore } from '@/os/kernel/useNotificationStore'
import { useDynamicIslandStore } from '@/os/kernel/useDynamicIslandStore'
import { Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import React from 'react'

export function useNotificationToIslandBridge() {
  const notifications = useNotificationStore(state => state.notifications)
  const { showNotification, showSuccess, showError } = useDynamicIslandStore()
  const lastProcessedIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Only process the latest notification
    if (notifications.length === 0) return

    const latest = notifications[notifications.length - 1]
    
    // Avoid duplicate processing
    if (latest.id === lastProcessedIdRef.current) return
    lastProcessedIdRef.current = latest.id

    // Map notification type to island action
    switch (latest.type) {
      case 'success':
        showSuccess(latest.title || 'Success')
        break
      case 'error':
        showError(latest.title || latest.message || 'Error')
        break
      case 'warning':
        showNotification(
          latest.title || 'Warning', 
          latest.message, 
          <AlertTriangle className="text-yellow-500" size={24} />
        )
        break
      case 'info':
      default:
        showNotification(
          latest.title || 'Info', 
          latest.message, 
          <Info className="text-blue-500" size={24} />
        )
        break
    }

    // Note: We don't remove the notification from the store here,
    // because the store also serves as a history log.
    // The old Notification UI would auto-remove them, but now we just let them stay in history.
    // However, if we want to keep the 'notifications' array clean (active only),
    // we might want to remove it after a delay.
    // For now, we just rely on the Island's internal timer to hide the visual feedback.

  }, [notifications, showNotification, showSuccess, showError])
}
