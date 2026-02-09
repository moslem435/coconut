'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, Trash2, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { useNotificationStore, Notification } from '@/os/kernel/useNotificationStore'
import CalendarWidget from './CalendarWidget'
import { Tooltip } from '@/os/ui/Tooltip'

interface ActionCenterProps {
  isOpen: boolean
  onClose: () => void
  toggleRef: React.RefObject<HTMLDivElement>
}

export default function ActionCenter({ isOpen, onClose, toggleRef }: ActionCenterProps) {
  const { history, clearHistory } = useNotificationStore()
  const menuRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        toggleRef.current &&
        !toggleRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, toggleRef])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-16 right-4 w-96 h-[calc(100vh-120px)] max-h-[600px] flex flex-col gap-4 z-[5000]"
        >
          {/* Notifications Panel */}
          <div className="flex-1 bg-[var(--os-bg-panel)] backdrop-blur-2xl border border-[var(--os-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
             <div className="p-4 border-b border-[var(--os-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Bell size={16} className="text-[var(--os-accent)]" />
                   <h3 className="font-semibold text-sm">Notifications</h3>
                </div>
                {history.length > 0 && (
                   <Tooltip content="Clear All" side="left">
                     <button 
                       onClick={clearHistory}
                       className="p-1.5 text-[var(--os-text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                     >
                       <Trash2 size={14} />
                     </button>
                   </Tooltip>
                )}
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
                {history.length === 0 ? (
                   <div className="flex-1 flex flex-col items-center justify-center text-[var(--os-text-muted)] opacity-50">
                      <Bell size={32} className="mb-2" />
                      <p className="text-xs">No new notifications</p>
                   </div>
                ) : (
                   history.map((n) => (
                      <HistoryItem key={n.id} notification={n} />
                   ))
                )}
             </div>
          </div>

          {/* Calendar Panel */}
          <div className="shrink-0 bg-[var(--os-bg-panel)] backdrop-blur-2xl border border-[var(--os-border)] rounded-2xl shadow-2xl overflow-hidden">
             <CalendarWidget />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function HistoryItem({ notification }: { notification: Notification }) {
   const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle size={16} className="text-green-400" />
      case 'warning': return <AlertTriangle size={16} className="text-yellow-400" />
      case 'error': return <AlertCircle size={16} className="text-red-400" />
      case 'info':
      default: return <Info size={16} className="text-blue-400" />
    }
  }

  const timeString = notification.timestamp 
    ? new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="flex gap-3 p-3 bg-[var(--os-bg-base)]/50 border border-[var(--os-border)] rounded-xl hover:bg-[var(--os-bg-base)] transition-colors">
       <div className="mt-0.5 shrink-0">{getIcon()}</div>
       <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-0.5">
             <span className="font-semibold text-xs text-[var(--os-text-primary)] truncate pr-2">
                {notification.title || 'System Notification'}
             </span>
             <span className="text-[10px] text-[var(--os-text-muted)] whitespace-nowrap">{timeString}</span>
          </div>
          <p className="text-xs text-[var(--os-text-secondary)] leading-relaxed break-words">
             {notification.message}
          </p>
       </div>
    </div>
  )
}
