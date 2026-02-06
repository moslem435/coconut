import { memo } from 'react'
import { motion } from 'framer-motion'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'

interface WindowPreviewProps {
  appId: string
  title: string
  icon: any
  isActive: boolean
  snapshot?: string
  onPeek?: (shouldPeek: boolean) => void
}

export const WindowPreview = memo(({ appId, title, icon: Icon, isActive, snapshot, onPeek }: WindowPreviewProps) => {
  const isSettings = appId === 'settings'
  const { useAnimations } = useSystemSettings()
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 5 }}
      transition={{ duration: useAnimations ? 0.2 : 0, ease: [0.32, 0.72, 0, 1] }}
      className="absolute bottom-[130%] left-1/2 -translate-x-1/2 w-48 aspect-[16/10] z-[300] pointer-events-auto flex flex-col"
      onMouseEnter={() => onPeek?.(true)}
      onMouseLeave={() => onPeek?.(false)}
      onClick={(e) => {
        // Stop propagation to prevent double-firing if parent has onClick
        // But we WANT to trigger the parent taskbar item click logic
        // The parent is a button, so clicking this child will bubble up.
        // However, if we need to do something specific here, we can.
        // Actually, just letting it bubble is fine, as long as it bubbles to the button.
        // But since we have pointer-events-auto, we should verify it bubbles.
      }}
    >
      {/* Visual Container */}
      <div className="w-full h-full rounded-lg overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-[var(--os-border)] bg-[var(--os-bg-window)] flex flex-col cursor-pointer hover:ring-2 ring-[var(--os-accent)] transition-all">
        {/* Mini Titlebar */}
        <div className={`h-6 shrink-0 flex items-center px-2 gap-2 border-b border-[var(--os-border)] ${isActive ? 'bg-[var(--os-accent)] text-[var(--os-accent-contrast)]' : 'bg-[var(--os-header-bg)] text-[var(--os-text-muted)]'}`}>
           {Icon && <Icon size={12} />}
           <span className="text-[10px] font-medium truncate flex-1 leading-none">{title}</span>
        </div>

        {/* Snapshot or Skeleton */}
        <div className="flex-1 bg-[var(--os-bg-base)] relative overflow-hidden flex flex-col text-[var(--os-text-primary)]">
           {snapshot ? (
               <img src={snapshot} className="w-full h-full object-cover" alt="preview" />
           ) : (
               <div className="w-full h-full p-2 flex flex-col gap-1.5">
                  {isSettings ? (
                      <div className="flex gap-1 h-full">
                          {/* Sidebar */}
                          <div className="w-1/4 h-full bg-current opacity-5 rounded-[2px]" />
                          {/* Content */}
                          <div className="flex-1 flex flex-col gap-1">
                              <div className="w-1/2 h-1.5 bg-current opacity-10 rounded-[1px]" />
                              <div className="w-full h-1 bg-current opacity-5 rounded-[1px] mt-1" />
                              <div className="w-full h-1 bg-current opacity-5 rounded-[1px]" />
                              <div className="w-3/4 h-1 bg-current opacity-5 rounded-[1px]" />
                              
                              <div className="mt-auto w-full h-1/3 bg-current opacity-5 rounded-[1px]" />
                          </div>
                      </div>
                  ) : (
                      // Generic / Portfolio
                      <>
                          <div className="w-1/3 h-1.5 bg-current opacity-10 rounded-[1px]" />
                          <div className="w-full flex-1 bg-current opacity-5 rounded-[2px] flex items-center justify-center">
                              {Icon && <Icon size={24} className="opacity-10" />}
                          </div>
                          <div className="flex gap-1 mt-auto">
                              <div className="w-1/4 h-1.5 bg-current opacity-10 rounded-[1px]" />
                              <div className="w-1/4 h-1.5 bg-current opacity-10 rounded-[1px]" />
                          </div>
                      </>
                  )}
               </div>
           )}
           
           {/* Scanline effect overlay */}
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 pointer-events-none" />
        </div>
      </div>

      {/* Invisible Bridge to Taskbar */}
      {/* Height reduced to h-4 (16px) to cover the ~14px gap (30% of 48px) without overlapping the icon too much */}
      <div className="absolute top-full left-0 w-full h-4 bg-transparent" />
    </motion.div>
  )
})
