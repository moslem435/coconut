import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Package, Terminal, Play, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/os/kernel/LanguageContext'

interface AppLoaderProps {
  status: string // 'booting' | 'installing' | 'restoring' | 'extracting' | 'starting' | 'ready' | 'error'
  label?: string
  progress?: number // 0-100 (optional, if detailed progress is available)
  downloadProgress?: number // 0-100
  downloadLabel?: string
  appName?: string
  appIcon?: string
  onRetry?: () => void
}

export const AppLoader = ({ 
  status, 
  label, 
  progress = 0,
  downloadProgress,
  downloadLabel,
  appName = 'Application', 
  appIcon = '📦',
  onRetry 
}: AppLoaderProps) => {
  const { t } = useLanguage()
  const [dots, setDots] = useState('')

  // Animated dots for text
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Map status to visual elements
  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'booting':
        return { icon: Play, color: 'text-zinc-500', bg: 'bg-zinc-500', text: t('launch.booting') }
      case 'installing':
        return { icon: Package, color: 'text-blue-500', bg: 'bg-blue-500', text: t('launch.installing') }
      case 'restoring':
        return { icon: RefreshCw, color: 'text-purple-500', bg: 'bg-purple-500', text: t('launch.restoring') }
      case 'extracting':
        return { icon: Package, color: 'text-pink-500', bg: 'bg-pink-500', text: t('launch.extracting') }
      case 'starting':
        return { icon: Terminal, color: 'text-orange-500', bg: 'bg-orange-500', text: t('launch.starting') }
      case 'ready':
        return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500', text: t('launch.ready') }
      case 'error':
        return { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500', text: t('launch.error') }
      default:
        return { icon: Loader2, color: 'text-zinc-500', bg: 'bg-zinc-500', text: t('launch.loading') }
    }
  }

  const config = getStatusConfig(status)
  const StatusIcon = config.icon

  // Fake progress simulation based on status if no real progress provided
  const [simulatedProgress, setSimulatedProgress] = useState(0)
  
  // Use a ref to track the highest progress reached to prevent regression
  const maxProgressRef = useRef(0)

  useEffect(() => {
    if (progress > 0) {
      if (progress > maxProgressRef.current) {
        maxProgressRef.current = progress
        setSimulatedProgress(progress)
      }
      return
    }

    let target = 0
    let speed = 50

    if (status === 'booting') { target = 20; speed = 100 }
    else if (status === 'restoring') { target = 40; speed = 50 }
    else if (status === 'extracting') { target = 60; speed = 30 }
    else if (status === 'installing') { target = 70; speed = 200 } // Install is slow
    else if (status === 'starting') { target = 95; speed = 100 }
    else if (status === 'ready') { target = 100; speed = 20 }
    
    // Ensure target never goes below current max progress
    if (target < maxProgressRef.current) {
      // If we switch to a state with lower target (e.g. installing -> starting bug), 
      // we keep the higher progress but update the visual state.
      // However, usually we want to respect the flow. 
      // But if the user says "progress bar goes back", it means we switched states backwards or targets are wrong.
      // We will force progress to never decrease.
      target = maxProgressRef.current
    }

    const timer = setInterval(() => {
      setSimulatedProgress(prev => {
        if (prev >= target) {
          maxProgressRef.current = Math.max(maxProgressRef.current, prev)
          return prev
        }
        
        // Slow down as we get closer
        const remaining = target - prev
        const step = Math.max(0.1, remaining / 20)
        const next = Math.min(target, prev + step)
        
        maxProgressRef.current = Math.max(maxProgressRef.current, next)
        return next
      })
    }, speed)

    return () => clearInterval(timer)
  }, [status, progress])

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-sm transition-colors duration-500">
      
      {/* App Icon Animation */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="mb-8 relative"
      >
        <div className="w-24 h-24 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-5xl relative overflow-hidden group">
          <span className="relative z-10 group-hover:scale-110 transition-transform duration-300 block">{appIcon}</span>
          
          {/* Status Glow */}
          <div className={`absolute inset-0 opacity-20 ${config.bg} blur-xl transition-colors duration-500`} />
        </div>
        
        {/* Status Badge */}
        <motion.div 
          key={status}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2"
        >
          <div className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-1.5 whitespace-nowrap ${config.bg}`}>
            <StatusIcon size={12} className={status === 'installing' || status === 'booting' ? 'animate-spin' : ''} />
            {config.text}
          </div>
        </motion.div>
      </motion.div>

      {/* Text Info */}
      <div className="text-center space-y-2 max-w-sm px-4">
        <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">
          {appName}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium h-5">
          {/* Prefer config.text (localized) over passed label if it's generic, but use label if it provides specific details */}
          {/* Actually, let's stick to config.text for consistency unless label is very specific */}
          {config.text}{status !== 'ready' && status !== 'error' && dots}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-64 mt-8">
        <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${config.bg}`}
            initial={{ width: 0 }}
            animate={{ width: `${simulatedProgress}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          />
        </div>

        {/* Extra download progress bar removed as per user request */}

        <div className="flex justify-between mt-2 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
          <span>{status.toUpperCase()}</span>
          <span>{Math.round(simulatedProgress)}%</span>
        </div>
      </div>

      {/* Retry Button (only on error) */}
      {status === 'error' && onRetry && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onRetry}
          className="mt-8 px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg text-sm font-medium hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
        >
          <RefreshCw size={14} /> Retry
        </motion.button>
      )}

      {/* Tips */}
      <AnimatePresence mode="wait">
        {(status === 'installing' || status === 'ready') && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-8 text-xs text-zinc-400 text-center max-w-md px-4"
          >
            {status === 'installing' 
              ? t('launch.installing.desc')
              : t('launch.ready.desc')
            }
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
