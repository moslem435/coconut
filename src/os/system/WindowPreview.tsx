import { memo } from 'react'
import { motion } from 'framer-motion'

interface WindowPreviewProps {
  appId: string
  title: string
  icon: any
  isActive: boolean
}

export const WindowPreview = memo(({ appId, title, icon: Icon, isActive }: WindowPreviewProps) => {
  const isSettings = appId === 'settings'
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 5 }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      className="absolute bottom-[130%] left-1/2 -translate-x-1/2 w-48 aspect-[16/10] rounded-lg overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-[var(--os-border)] bg-[var(--os-bg-window)] flex flex-col z-[300] pointer-events-none cursor-default"
    >
      {/* Mini Titlebar */}
      <div className={`h-6 shrink-0 flex items-center px-2 gap-2 border-b border-[var(--os-border)] ${isActive ? 'bg-[var(--os-accent)] text-[var(--os-accent-contrast)]' : 'bg-[var(--os-header-bg)] text-[var(--os-text-muted)]'}`}>
         {Icon && <Icon size={12} />}
         <span className="text-[10px] font-medium truncate flex-1 leading-none">{title}</span>
      </div>

      {/* Mini Content - Skeleton */}
      <div className="flex-1 p-2 bg-[var(--os-bg-base)] relative overflow-hidden flex flex-col gap-1.5 text-[var(--os-text-primary)]">
         
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
         
         {/* Scanline effect overlay */}
         <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 pointer-events-none" />
      </div>
    </motion.div>
  )
})
