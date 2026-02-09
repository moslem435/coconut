'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Power } from 'lucide-react'
import { useSystemSettings } from '@/os/kernel/SystemSettingsContext'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { Tooltip } from '@/os/ui/Tooltip'

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [hasStarted, setHasStarted] = useState(false)
  const { useAnimations } = useSystemSettings()
  const { t } = useLanguage()

  useEffect(() => {
    if (!hasStarted) return

    // Fast boot sequence - 1.5s or instant if animations disabled
    const duration = useAnimations ? 1500 : 0
    
    const timer = setTimeout(() => {
      onComplete()
    }, duration)

    return () => clearTimeout(timer)
  }, [hasStarted, onComplete, useAnimations])

  return (
    <div className="fixed inset-0 z-[10000] bg-black overflow-hidden font-mono select-none cursor-default">
      <AnimatePresence mode="wait">
        {!hasStarted ? (
          <motion.div
            key="standby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: useAnimations ? 0.5 : 0 }}
            className="h-full w-full flex items-center justify-center"
          >
             <div className="relative group cursor-pointer" onClick={() => setHasStarted(true)}>
                <div className={`absolute inset-0 bg-white/5 blur-[30px] rounded-full group-hover:bg-white/10 transition-all duration-500 ${!useAnimations && 'hidden'}`} />
                <Tooltip content={t('boot.start')} side="bottom" offset={20}>
                  <motion.button
                    whileHover={useAnimations ? { scale: 1.05 } : {}}
                    whileTap={useAnimations ? { scale: 0.95 } : {}}
                    className="relative w-20 h-20 rounded-full border border-white/20 flex items-center justify-center bg-black/50 backdrop-blur-sm group-hover:border-white/40 transition-colors"
                  >
                     <Power size={32} className="text-white/40 group-hover:text-white/80 group-hover:drop-shadow-[0_0_8px_white] transition-all" />
                  </motion.button>
                </Tooltip>
             </div>
          </motion.div>
        ) : (
          <motion.div
            key="booting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full flex flex-col items-center justify-center bg-black relative"
          >
             {/* Scanlines */}
             <div className="absolute inset-0 pointer-events-none z-10 opacity-10" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />
             
             {/* Modern Loader */}
             <div className="relative z-20 flex flex-col items-center gap-8">
               <div className="relative w-16 h-16">
                 <motion.div 
                   className="absolute inset-0 border-t-2 border-green-500 rounded-full"
                   animate={{ rotate: 360 }}
                   transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                   style={{ display: useAnimations ? 'block' : 'none' }}
                 />
                 <motion.div 
                   className="absolute inset-2 border-b-2 border-green-800 rounded-full"
                   animate={{ rotate: -360 }}
                   transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                   style={{ display: useAnimations ? 'block' : 'none' }}
                 />
                 {/* Static Fallback when animations off */}
                 {!useAnimations && (
                   <div className="absolute inset-0 border-2 border-green-500 rounded-full opacity-50" />
                 )}
               </div>
               
               <div className="text-green-500/80 text-xs tracking-[0.3em] font-light">
                 {useAnimations ? t('boot.loading') : t('boot.ready')}
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
