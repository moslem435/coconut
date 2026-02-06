'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'
import { useNotificationStore, Notification } from '@/os/kernel/useNotificationStore'

export default function Notifications() {
  const { notifications, removeNotification } = useNotificationStore()

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
            onDismiss={() => removeNotification(notification.id)} 
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function NotificationItem({ 
  notification, 
  onDismiss 
}: { 
  notification: Notification
  onDismiss: () => void 
}) {
  useEffect(() => {
    const duration = notification.duration || 3000
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [notification, onDismiss])

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle size={18} className="text-green-400" />
      case 'warning': return <AlertTriangle size={18} className="text-yellow-400" />
      case 'error': return <AlertCircle size={18} className="text-red-400" />
      case 'info':
      default: return <Info size={18} className="text-blue-400" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="pointer-events-auto w-80 bg-[var(--os-bg-panel)]/95 backdrop-blur-xl border border-[var(--os-border)] shadow-2xl rounded-xl p-4 flex gap-3 relative overflow-hidden group"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}
    >
      {/* Accent Line */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        notification.type === 'success' ? 'bg-green-500' :
        notification.type === 'warning' ? 'bg-yellow-500' :
        notification.type === 'error' ? 'bg-red-500' :
        'bg-blue-500'
      }`} />

      <div className="mt-0.5">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        {notification.title && (
          <div className="font-semibold text-sm mb-0.5 text-[var(--os-text-primary)]">
            {notification.title}
          </div>
        )}
        <div className="text-xs text-[var(--os-text-secondary)] leading-relaxed break-words">
          {notification.message}
        </div>
      </div>

      <button 
        onClick={onDismiss}
        className="self-start -mt-1 -mr-1 p-1.5 rounded-lg text-[var(--os-text-secondary)] hover:bg-[var(--os-hover-bg)] hover:text-[var(--os-text-primary)] transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}
