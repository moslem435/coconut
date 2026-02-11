import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useDialogStore } from '@/os/kernel/useDialogStore'
import { useLanguage } from '@/os/kernel/LanguageContext'
import { X } from 'lucide-react'

export default function GlobalDialogs() {
  const { request, submit, cancel } = useDialogStore()
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (request?.type === 'prompt') {
      setInputValue(request.defaultValue || '')
      // Focus after render
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [request])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (request?.type === 'prompt') submit(inputValue)
      else submit()
    } else if (e.key === 'Escape') {
      cancel()
    }
  }

  if (!request) return null

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <span className="font-medium text-gray-900 dark:text-white/90">{request.title}</span>
                <button onClick={cancel} className="text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>
            
            <div className="p-4 space-y-4">
                {request.message && (
                    <p className="text-sm text-gray-600 dark:text-white/70 whitespace-pre-wrap">{request.message}</p>
                )}

                {request.type === 'prompt' && (
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={request.placeholder}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                )}

                <div className="flex justify-end gap-2 pt-2">
                    {request.type !== 'alert' && (
                        <button 
                            onClick={cancel}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                    )}
                    <button 
                        onClick={() => request.type === 'prompt' ? submit(inputValue) : submit()}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors shadow-lg shadow-blue-500/20"
                    >
                        {t('common.ok')}
                    </button>
                </div>
            </div>
        </motion.div>
    </div>
  )
}
