import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDynamicIslandStore } from '@/os/kernel/useDynamicIslandStore'
import { Check, X, Loader2, Info } from 'lucide-react'

export default function DynamicIsland() {
  const { mode, title, description, icon, progress } = useDynamicIslandStore()

  // Auto-hide handling is done in store for simple cases, but complex interactions might need more logic here

  const variants = {
    idle: {
      width: 120,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'black',
    },
    active: {
      width: 300,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'black',
    },
    loading: {
      width: 200,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'black',
    },
    success: {
      width: 200,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#22c55e', // green-500
    },
    error: {
      width: 200,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#ef4444', // red-500
    }
  }

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none flex justify-center items-start">
      <motion.div
        layout
        initial="idle"
        animate={mode === 'idle' ? 'idle' : mode === 'loading' ? 'loading' : mode === 'success' ? 'success' : mode === 'error' ? 'error' : 'active'}
        variants={variants}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        className="overflow-hidden shadow-2xl flex items-center justify-center relative backdrop-blur-md bg-black/90 border border-white/10"
      >
        <AnimatePresence mode="wait">
          {mode === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="w-full h-full flex items-center justify-center gap-2"
            >
                {/* Idle State: Just a small pill, maybe with a tiny indicator if needed */}
                <div className="w-1 h-1 bg-white/20 rounded-full" />
                <div className="w-1 h-1 bg-white/20 rounded-full" />
            </motion.div>
          )}

          {mode === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 px-4 w-full"
            >
              <Loader2 className="animate-spin text-white" size={18} />
              <span className="text-white text-sm font-medium truncate">{title}</span>
            </motion.div>
          )}

          {mode === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 px-4 w-full justify-center"
            >
              <Check className="text-white" size={18} />
              <span className="text-white text-sm font-medium">{title}</span>
            </motion.div>
          )}
          
          {mode === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 px-4 w-full justify-center"
            >
              <X className="text-white" size={18} />
              <span className="text-white text-sm font-medium">{title}</span>
            </motion.div>
          )}

          {mode === 'active' && (
            <motion.div
              key="active"
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              className="flex items-center gap-4 px-5 w-full h-full"
            >
              <div className="shrink-0 text-white/90">
                {icon || <Info size={24} />}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-white text-sm font-bold truncate">{title}</span>
                {description && (
                    <span className="text-white/60 text-xs truncate">{description}</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
