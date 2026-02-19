import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDynamicIslandStore, IslandActivity } from '@/os/kernel/useDynamicIslandStore'
import { X } from 'lucide-react'

export default function CyberFeed() {
  const { activities, removeActivity } = useDynamicIslandStore()
  
  // Sort activities: 
  // 1. Priority (High to Low)
  // 2. CreatedAt (Newest First)
  const sortedActivities = [...activities].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority
    return b.createdAt - a.createdAt
  })

  return (
    <div className="fixed bottom-20 right-4 flex flex-col-reverse gap-3 z-[99999] w-80 pointer-events-none perspective-[1000px]">
      <AnimatePresence mode="popLayout">
        {sortedActivities.map((activity) => (
          <FeedItem key={activity.id} activity={activity} onRemove={() => removeActivity(activity.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function FeedItem({ activity, onRemove }: { activity: IslandActivity; onRemove: () => void }) {
  const isSystem = activity.type === 'system' || activity.type === 'notification'
  const isCall = activity.type === 'call'
  
  // Dynamic border color based on type
  const borderColor = isCall ? 'border-green-500/50' : 
                      activity.type === 'error' ? 'border-[var(--os-danger)]/50' : 
                      activity.type === 'media' ? 'border-purple-500/50' :
                      'border-[var(--os-border-active)]'

  const shadowColor = isCall ? 'shadow-[0_0_15px_rgba(74,222,128,0.2)]' :
                      activity.type === 'error' ? 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
                      'shadow-lg'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, y: 20, rotateX: 15, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, y: 0, rotateX: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`
        pointer-events-auto relative overflow-hidden
        bg-[rgba(var(--os-bg-panel-rgb),0.85)] backdrop-blur-md 
        border ${borderColor}
        ${shadowColor}
        rounded-xl
        font-sans text-xs text-[var(--os-text-primary)]
      `}
    >
      {/* Scanning Line Effect - Optional, kept subtle or removed for system consistency */}
      {/* <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent translate-y-[-100%] animate-[scan_3s_infinite]" /> */}
      
      {/* Corner Accents - Removed for cleaner system look */}
      {/* <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current opacity-50" /> */}
      {/* <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current opacity-50" /> */}

      {/* Main Content */}
      <div className="p-3">
        <div className="flex items-start gap-3">
            {/* Icon Column */}
            <div className="shrink-0 pt-0.5 text-[var(--os-accent)]">
                {activity.icon && (
                    <div className="relative">
                        <div className="relative z-10">
                            {activity.icon}
                        </div>
                    </div>
                )}
            </div>

            {/* Text/Component Column */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-center">
                    <h4 className="font-semibold tracking-wide truncate pr-2">
                        {activity.title}
                    </h4>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="text-[var(--os-text-muted)] hover:text-[var(--os-text-primary)] transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
                
                {activity.description && (
                    <p className="text-[var(--os-text-secondary)] leading-relaxed break-words">
                        {activity.description}
                    </p>
                )}

                {/* Progress Bar if applicable */}
                {typeof activity.progress === 'number' && (
                    <div className="mt-2 h-1 w-full bg-[var(--os-border)] rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${activity.progress}%` }}
                            className="h-full bg-[var(--os-accent)]"
                        />
                    </div>
                )}

                {/* Custom Component (Embedded) */}
                {activity.component && (
                    <div className="mt-3 pt-2 border-t border-[var(--os-border)]">
                        {activity.component}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Timestamp / Footer - Simplified */}
      <div className="bg-[var(--os-bg-base)]/30 px-3 py-1 flex justify-between items-center text-[10px] text-[var(--os-text-muted)] tracking-wider">
        <span className="uppercase">SYS • {activity.type}</span>
        <span>{new Date(activity.createdAt).toLocaleTimeString()}</span>
      </div>
    </motion.div>
  )
}
